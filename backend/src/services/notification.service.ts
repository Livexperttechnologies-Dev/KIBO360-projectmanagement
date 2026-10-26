import {
  dbStore,
  NotificationRecord,
  NotificationType,
  NotificationPreferenceRecord,
} from "../lib/db";

export class NotificationService {
  /**
   * Check if a recipient is authorized to receive updates about a project
   */
  public hasProjectAccess(userId: string, projectId?: string): boolean {
    if (!projectId) return true;
    const user = dbStore.findUserById(userId);
    if (!user) return false;
    if (user.role === "ADMINISTRATOR") return true;

    const project = dbStore.getProjectById(projectId);
    if (!project) return false;

    // Project owner or creator
    if (project.ownerId === userId || project.creatorId === userId) return true;

    // Project member
    const isMember = dbStore.projectMembers.some(
      (m) => m.projectId === projectId && m.userId === userId
    );
    if (isMember) return true;

    return false;
  }

  /**
   * Determine whether a notification type is enabled in the user's preferences
   */
  public isTypeEnabledForUser(userId: string, type: NotificationType): boolean {
    const prefs = dbStore.getUserNotificationPreferences(userId);
    if (!prefs.inAppNotifications) return false;

    switch (type) {
      case "NEW_TASK_ASSIGNMENT":
      case "TASK_REASSIGNMENT":
        return prefs.notifyOnAssignment;
      case "UPCOMING_DEADLINE":
        return prefs.notifyOnDeadlineApproaching;
      case "OVERDUE_TASK":
        return prefs.notifyOnOverdue;
      case "BLOCKED_TASK":
        return prefs.notifyOnBlockedWork;
      case "REVIEW_REQUESTED":
        return prefs.notifyOnReviewRequested;
      case "CHANGES_REQUESTED":
      case "TASK_APPROVED":
      case "TASK_COMPLETED":
        return prefs.notifyOnChangesRequested;
      case "MILESTONE_APPROACHING":
        return prefs.notifyOnMilestoneApproaching;
      default:
        return true;
    }
  }

  /**
   * Create a notification with preference enforcement, project access verification, and deduplication
   */
  public sendNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    entityType: "TASK" | "MILESTONE" | "PROJECT";
    entityId?: string;
    projectId?: string;
    dedupKey?: string;
  }): NotificationRecord | null {
    // 1. Verify project permission before notifying
    if (data.projectId && !this.hasProjectAccess(data.userId, data.projectId)) {
      console.warn(
        `[NotificationService] Suppressed notification for user ${data.userId}: unauthorized for project ${data.projectId}`
      );
      return null;
    }

    // 2. Check user notification preferences
    if (!this.isTypeEnabledForUser(data.userId, data.type)) {
      return null;
    }

    // 3. Deduplication check
    if (data.dedupKey && dbStore.hasNotificationWithDedupKey(data.dedupKey)) {
      return null;
    }

    // 4. Create record
    return dbStore.createNotification({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      entityType: data.entityType,
      entityId: data.entityId,
      projectId: data.projectId,
      dedupKey: data.dedupKey,
    });
  }

  // --- Specific Notification Event Triggers ---

  /**
   * 1. Notify the task owner/assignee when assigned
   */
  public notifyTaskAssigned(taskId: string, assigneeId: string, actorId?: string): NotificationRecord | null {
    if (assigneeId === actorId) return null; // Avoid self-notification
    const task = dbStore.getTaskById(taskId);
    if (!task) return null;

    const actor = actorId ? dbStore.findUserById(actorId) : undefined;
    const actorName = actor ? actor.email.split("@")[0] : "A manager";

    return this.sendNotification({
      userId: assigneeId,
      type: "NEW_TASK_ASSIGNMENT",
      title: "New Task Assignment",
      message: `${actorName} assigned you to task: "${task.title}"`,
      entityType: "TASK",
      entityId: task.id,
      projectId: task.projectId,
      dedupKey: `ASSIGNMENT:${task.id}:${assigneeId}`,
    });
  }

  /**
   * 2. Notify the old and new assignees on task reassignment
   */
  public notifyTaskReassigned(
    taskId: string,
    oldAssigneeId: string,
    newAssigneeId: string,
    actorId?: string
  ): void {
    const task = dbStore.getTaskById(taskId);
    if (!task) return;

    const actor = actorId ? dbStore.findUserById(actorId) : undefined;
    const actorName = actor ? actor.email.split("@")[0] : "A manager";

    // Notify new assignee
    if (newAssigneeId && newAssigneeId !== actorId) {
      this.sendNotification({
        userId: newAssigneeId,
        type: "TASK_REASSIGNMENT",
        title: "Task Reassigned To You",
        message: `${actorName} reassigned task "${task.title}" to you`,
        entityType: "TASK",
        entityId: task.id,
        projectId: task.projectId,
        dedupKey: `REASSIGNMENT_NEW:${task.id}:${newAssigneeId}:${Date.now()}`,
      });
    }

    // Optionally inform old assignee
    if (oldAssigneeId && oldAssigneeId !== actorId && oldAssigneeId !== newAssigneeId) {
      this.sendNotification({
        userId: oldAssigneeId,
        type: "TASK_REASSIGNMENT",
        title: "Task Reassigned",
        message: `Task "${task.title}" has been reassigned to another team member`,
        entityType: "TASK",
        entityId: task.id,
        projectId: task.projectId,
        dedupKey: `REASSIGNMENT_OLD:${task.id}:${oldAssigneeId}:${Date.now()}`,
      });
    }
  }

  /**
   * 3. Remind the owner before the due date (Upcoming deadline within 7 days)
   */
  public notifyUpcomingDeadline(taskId: string, recipientId: string, dueDate: Date): NotificationRecord | null {
    const task = dbStore.getTaskById(taskId);
    if (!task || task.status === "COMPLETED") return null;

    const dateStr = new Date(dueDate).toISOString().split("T")[0];
    return this.sendNotification({
      userId: recipientId,
      type: "UPCOMING_DEADLINE",
      title: "Upcoming Deadline",
      message: `Task "${task.title}" is due on ${dateStr}`,
      entityType: "TASK",
      entityId: task.id,
      projectId: task.projectId,
      dedupKey: `UPCOMING_DEADLINE:${task.id}:${recipientId}:${dateStr}`,
    });
  }

  /**
   * 4. Notify the owner and team lead when a task becomes overdue
   */
  public notifyOverdueTask(taskId: string, recipientId: string, dueDate: Date): NotificationRecord | null {
    const task = dbStore.getTaskById(taskId);
    if (!task || task.status === "COMPLETED") return null;

    const dateStr = new Date(dueDate).toISOString().split("T")[0];
    return this.sendNotification({
      userId: recipientId,
      type: "OVERDUE_TASK",
      title: "Task Overdue",
      message: `Task "${task.title}" was due on ${dateStr} and is now overdue!`,
      entityType: "TASK",
      entityId: task.id,
      projectId: task.projectId,
      dedupKey: `OVERDUE_TASK:${task.id}:${recipientId}:${dateStr}`,
    });
  }

  /**
   * 5. Notify the responsible lead when work is blocked
   */
  public notifyBlockedTask(taskId: string, blockerNotes?: string, actorId?: string): void {
    const task = dbStore.getTaskById(taskId);
    if (!task) return;

    const project = dbStore.getProjectById(task.projectId);
    const recipientsToNotify = new Set<string>();

    // 1) Project owner / team lead
    if (project?.ownerId && project.ownerId !== actorId) {
      recipientsToNotify.add(project.ownerId);
    }
    // 2) Task reviewer or creator
    if (task.reviewerId && task.reviewerId !== actorId) {
      recipientsToNotify.add(task.reviewerId);
    }
    if (task.creatorId && task.creatorId !== actorId) {
      recipientsToNotify.add(task.creatorId);
    }

    const noteText = blockerNotes ? `: ${blockerNotes}` : "";
    for (const recipientId of recipientsToNotify) {
      this.sendNotification({
        userId: recipientId,
        type: "BLOCKED_TASK",
        title: "Task Blocked",
        message: `Task "${task.title}" is marked as blocked${noteText}`,
        entityType: "TASK",
        entityId: task.id,
        projectId: task.projectId,
        dedupKey: `BLOCKED_TASK:${task.id}:${recipientId}:${Date.now()}`,
      });
    }
  }

  /**
   * 6. Notify the reviewer when a task enters Under Review
   */
  public notifyReviewRequested(taskId: string, reviewerId?: string, actorId?: string): NotificationRecord | null {
    const task = dbStore.getTaskById(taskId);
    if (!task) return null;

    // If no reviewer specified on task, fallback to project owner
    const project = dbStore.getProjectById(task.projectId);
    const targetReviewerId = reviewerId || task.reviewerId || project?.ownerId;
    if (!targetReviewerId || targetReviewerId === actorId) return null;

    const actor = actorId ? dbStore.findUserById(actorId) : undefined;
    const actorName = actor ? actor.email.split("@")[0] : "Assignee";

    return this.sendNotification({
      userId: targetReviewerId,
      type: "REVIEW_REQUESTED",
      title: "Review Requested",
      message: `${actorName} requested your review on task "${task.title}"`,
      entityType: "TASK",
      entityId: task.id,
      projectId: task.projectId,
      dedupKey: `REVIEW_REQUESTED:${task.id}:${targetReviewerId}:${Date.now()}`,
    });
  }

  /**
   * 7. Notify the task owner/assignee when changes are requested or task approved
   */
  public notifyChangesRequested(
    taskId: string,
    assigneeId?: string,
    actorId?: string,
    comments?: string
  ): NotificationRecord | null {
    const task = dbStore.getTaskById(taskId);
    if (!task) return null;

    const targetAssigneeId = assigneeId || task.assigneeId;
    if (!targetAssigneeId || targetAssigneeId === actorId) return null;

    const noteText = comments ? ` Feedback: "${comments}"` : "";

    return this.sendNotification({
      userId: targetAssigneeId,
      type: "CHANGES_REQUESTED",
      title: "Changes Requested",
      message: `Changes were requested on task "${task.title}".${noteText}`,
      entityType: "TASK",
      entityId: task.id,
      projectId: task.projectId,
      dedupKey: `CHANGES_REQUESTED:${task.id}:${targetAssigneeId}:${Date.now()}`,
    });
  }

  /**
   * 8. Notify project members when a project milestone is approaching (within 7 days)
   */
  public notifyMilestoneApproaching(milestoneId: string, recipientId: string, dueDate: Date): NotificationRecord | null {
    const milestone = dbStore.milestones.find((m) => m.id === milestoneId);
    if (!milestone || milestone.status === "REACHED") return null;

    const dateStr = new Date(dueDate).toISOString().split("T")[0];
    return this.sendNotification({
      userId: recipientId,
      type: "MILESTONE_APPROACHING",
      title: "Milestone Approaching",
      message: `Milestone "${milestone.title}" is due on ${dateStr}`,
      entityType: "MILESTONE",
      entityId: milestone.id,
      projectId: milestone.projectId,
      dedupKey: `MILESTONE_APPROACHING:${milestone.id}:${recipientId}:${dateStr}`,
    });
  }

  // --- Read and Preference API methods ---

  public getNotifications(
    userId: string,
    filters?: { isRead?: boolean; type?: NotificationType; entityType?: string }
  ): NotificationRecord[] {
    return dbStore.getNotifications(userId, filters);
  }

  public getUnreadCount(userId: string): number {
    return dbStore.getUnreadNotificationCount(userId);
  }

  public markAsRead(id: string, userId: string): NotificationRecord | null {
    return dbStore.markNotificationAsRead(id, userId);
  }

  public markAllAsRead(userId: string): number {
    return dbStore.markAllNotificationsAsRead(userId);
  }

  public deleteNotification(id: string, userId: string): boolean {
    return dbStore.deleteNotification(id, userId);
  }

  public getPreferences(userId: string): NotificationPreferenceRecord {
    return dbStore.getUserNotificationPreferences(userId);
  }

  public updatePreferences(
    userId: string,
    updates: Partial<Omit<NotificationPreferenceRecord, "id" | "userId" | "updatedAt">>
  ): NotificationPreferenceRecord {
    return dbStore.updateUserNotificationPreferences(userId, updates);
  }
}

export const notificationService = new NotificationService();
