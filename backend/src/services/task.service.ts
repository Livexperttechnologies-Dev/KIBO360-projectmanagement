import {
  dbStore,
  TaskRecord,
  TaskStatus,
  TaskPriority,
  AttachmentAccessScope,
} from "../lib/db";
import { TokenPayload } from "./auth.service";
import { AuditService } from "./audit.service";
import { ProjectService } from "./project.service";
import { notificationService } from "./notification.service";

export interface TaskFilters {
  projectId?: string;
  assigneeId?: string;
  reviewerId?: string;
  priority?: string;
  status?: string;
  taskList?: string;
  search?: string;
  parentTaskId?: string;
  isSubtask?: string;
  page?: number;
  limit?: number;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  projectId: string;
  taskList?: string;
  assigneeId?: string | null;
  reviewerId?: string | null;
  parentTaskId?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  startDate?: string | null;
  dueDate?: string | null;
  estimatedEffort?: number | null;
  completionPercentage?: number;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string | null;
  projectId?: string;
  taskList?: string;
  assigneeId?: string | null;
  reviewerId?: string | null;
  parentTaskId?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  startDate?: string | null;
  dueDate?: string | null;
  estimatedEffort?: number | null;
  completionPercentage?: number;
}

export class TaskService {
  /**
   * Check if user can view tasks in the project
   */
  public static canAccessProject(projectId: string, user: TokenPayload): boolean {
    const project = dbStore.getProjectById(projectId);
    if (!project) return false;
    return ProjectService.canViewProject(project, user);
  }

  /**
   * Check if user has management permissions over the task
   */
  public static canManageTask(task: TaskRecord, user: TokenPayload): boolean {
    if (user.role === "ADMINISTRATOR") return true;

    const project = dbStore.getProjectById(task.projectId);
    if (!project) return false;

    if (user.role === "PROJECT_MANAGER") {
      if (project.departmentId && project.departmentId === user.departmentId) return true;
      if (project.ownerId === user.userId || project.creatorId === user.userId) return true;
    }

    // Project owner or Lead member
    if (project.ownerId === user.userId || task.creatorId === user.userId) return true;

    const member = dbStore.projectMembers.find(
      (pm) => pm.projectId === task.projectId && pm.userId === user.userId
    );
    if (member && member.role === "LEAD") return true;

    return false;
  }

  /**
   * Validate whether user has permission to update specified task fields
   */
  public static canEditTaskFields(
    task: TaskRecord,
    user: TokenPayload,
    updates: UpdateTaskDto
  ): { allowed: boolean; reason?: string } {
    if (this.canManageTask(task, user)) {
      return { allowed: true };
    }

    // Task assignee can only update status and completion percentage
    if (task.assigneeId === user.userId) {
      const restrictedFields: (keyof UpdateTaskDto)[] = [
        "title",
        "description",
        "projectId",
        "assigneeId",
        "reviewerId",
        "priority",
        "taskList",
        "startDate",
        "dueDate",
        "estimatedEffort",
      ];

      for (const field of restrictedFields) {
        if (updates[field] !== undefined) {
          return {
            allowed: false,
            reason: "Assignees are only permitted to update task status and completion progress",
          };
        }
      }

      return { allowed: true };
    }

    return {
      allowed: false,
      reason: "You do not have permission to modify this task",
    };
  }

  /**
   * List tasks with filtering, search, and pagination
   */
  public static listTasks(filters: TaskFilters, user: TokenPayload) {
    let tasks = dbStore.tasks.slice();

    // 1. Scope tasks by accessible projects
    tasks = tasks.filter((t) => this.canAccessProject(t.projectId, user));

    // 2. Filter by project
    if (filters.projectId && filters.projectId !== "all") {
      tasks = tasks.filter((t) => t.projectId === filters.projectId);
    }

    // 3. Filter by assignee
    if (filters.assigneeId && filters.assigneeId !== "all") {
      tasks = tasks.filter((t) => t.assigneeId === filters.assigneeId);
    }

    // 4. Filter by reviewer
    if (filters.reviewerId && filters.reviewerId !== "all") {
      tasks = tasks.filter((t) => t.reviewerId === filters.reviewerId);
    }

    // 5. Filter by priority
    if (filters.priority && filters.priority !== "all") {
      tasks = tasks.filter((t) => t.priority === filters.priority);
    }

    // 6. Filter by status
    if (filters.status && filters.status !== "all") {
      tasks = tasks.filter((t) => t.status === filters.status);
    }

    // 7. Filter by taskList
    if (filters.taskList && filters.taskList !== "all") {
      tasks = tasks.filter((t) => (t.taskList || "Default").toLowerCase() === filters.taskList!.toLowerCase());
    }

    // 8. Filter subtasks vs root tasks
    if (filters.parentTaskId) {
      tasks = tasks.filter((t) => t.parentTaskId === filters.parentTaskId);
    } else if (filters.isSubtask === "false") {
      tasks = tasks.filter((t) => !t.parentTaskId);
    } else if (filters.isSubtask === "true") {
      tasks = tasks.filter((t) => !!t.parentTaskId);
    }

    // 9. Search in title and description
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      tasks = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    // Sort: open items first, then by priority / dueDate
    tasks.sort((a, b) => {
      const isACompleted = a.status === "COMPLETED";
      const isBCompleted = b.status === "COMPLETED";
      if (isACompleted && !isBCompleted) return 1;
      if (!isACompleted && isBCompleted) return -1;
      const timeA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const timeB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return timeA - timeB;
    });

    const total = tasks.length;
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filters.limit) || 50));
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedTasks = tasks.slice(startIndex, startIndex + limit);

    const enrichedTasks = paginatedTasks.map((t) => this.enrichTaskSummary(t));

    return {
      tasks: enrichedTasks,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Get single task with full details (subtasks, comments, attachments, dependencies)
   */
  public static getTaskById(taskId: string, user: TokenPayload) {
    const task = dbStore.getTaskById(taskId);
    if (!task) {
      const error: any = new Error("Task not found");
      error.statusCode = 404;
      throw error;
    }

    if (!this.canAccessProject(task.projectId, user)) {
      const error: any = new Error("Forbidden: You do not have access to this project's tasks");
      error.statusCode = 403;
      throw error;
    }

    const project = dbStore.getProjectById(task.projectId);
    const assignee = task.assigneeId ? dbStore.findUserById(task.assigneeId) : undefined;
    const assigneeProfile = assignee ? dbStore.getProfileByUserId(assignee.id) : undefined;

    const reviewer = task.reviewerId ? dbStore.findUserById(task.reviewerId) : undefined;
    const reviewerProfile = reviewer ? dbStore.getProfileByUserId(reviewer.id) : undefined;

    const creator = dbStore.findUserById(task.creatorId);
    const creatorProfile = creator ? dbStore.getProfileByUserId(creator.id) : undefined;

    const parentTask = task.parentTaskId ? dbStore.getTaskById(task.parentTaskId) : undefined;

    // Subtasks
    const subtasks = dbStore.getTaskSubtasks(task.id).map((sub) => {
      const subAssignee = sub.assigneeId ? dbStore.findUserById(sub.assigneeId) : undefined;
      const subProfile = subAssignee ? dbStore.getProfileByUserId(subAssignee.id) : undefined;
      return {
        id: sub.id,
        title: sub.title,
        status: sub.status,
        priority: sub.priority,
        completionPercentage: sub.completionPercentage,
        dueDate: sub.dueDate,
        assignee: subAssignee
          ? {
              id: subAssignee.id,
              name: subProfile ? `${subProfile.firstName} ${subProfile.lastName}` : subAssignee.email,
              avatarUrl: subProfile?.avatarUrl,
            }
          : null,
      };
    });

    // Comments
    const comments = dbStore.getTaskComments(task.id);

    // Attachments (filter ASSIGNEE_ONLY if user is not assignee or admin/PM)
    let attachments = dbStore.getTaskAttachments(task.id);
    if (user.role === "EMPLOYEE" && task.assigneeId !== user.userId) {
      attachments = attachments.filter((a) => a.accessScope !== "ASSIGNEE_ONLY");
    }

    // Dependencies (Prerequisites that this task depends on)
    const dependencies = dbStore.getTaskDependencies(task.id);

    // Dependents (Tasks that depend on this task)
    const dependentOn = dbStore.getTaskDependentOn(task.id);

    // Is blocked: true if any prerequisite is not COMPLETED
    const isBlocked = dependencies.some((d) => d.prerequisiteTask && d.prerequisiteTask.status !== "COMPLETED");

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      taskList: task.taskList,
      startDate: task.startDate,
      dueDate: task.dueDate,
      estimatedEffort: task.estimatedEffort,
      completionPercentage: task.completionPercentage,
      projectId: task.projectId,
      creatorId: task.creatorId,
      assigneeId: task.assigneeId,
      reviewerId: task.reviewerId,
      parentTaskId: task.parentTaskId,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      isBlocked,
      project: project
        ? {
            id: project.id,
            title: project.title,
            key: project.key,
            status: project.status,
          }
        : null,
      assignee: assignee
        ? {
            id: assignee.id,
            email: assignee.email,
            role: assignee.role,
            name: assigneeProfile ? `${assigneeProfile.firstName} ${assigneeProfile.lastName}` : assignee.email,
            avatarUrl: assigneeProfile?.avatarUrl,
            jobTitle: assigneeProfile?.jobTitle,
          }
        : null,
      reviewer: reviewer
        ? {
            id: reviewer.id,
            email: reviewer.email,
            role: reviewer.role,
            name: reviewerProfile ? `${reviewerProfile.firstName} ${reviewerProfile.lastName}` : reviewer.email,
            avatarUrl: reviewerProfile?.avatarUrl,
            jobTitle: reviewerProfile?.jobTitle,
          }
        : null,
      creator: creator
        ? {
            id: creator.id,
            email: creator.email,
            role: creator.role,
            name: creatorProfile ? `${creatorProfile.firstName} ${creatorProfile.lastName}` : creator.email,
            avatarUrl: creatorProfile?.avatarUrl,
          }
        : null,
      parentTask: parentTask
        ? {
            id: parentTask.id,
            title: parentTask.title,
            status: parentTask.status,
            dueDate: parentTask.dueDate,
          }
        : null,
      subtasks,
      comments,
      attachments,
      dependencies,
      dependentOn,
    };
  }

  /**
   * Create a new task or subtask
   */
  public static async createTask(data: CreateTaskDto, user: TokenPayload): Promise<TaskRecord> {
    if (!this.canAccessProject(data.projectId, user)) {
      const error: any = new Error("Forbidden: You do not have permission to create tasks in this project");
      error.statusCode = 403;
      throw error;
    }

    // Validate startDate <= dueDate if both are provided
    if (data.startDate && data.dueDate) {
      if (new Date(data.startDate).getTime() > new Date(data.dueDate).getTime()) {
        const error: any = new Error("Start date cannot be after due date");
        error.statusCode = 400;
        throw error;
      }
    }

    // Subtask date boundary validation
    if (data.parentTaskId) {
      const parentTask = dbStore.getTaskById(data.parentTaskId);
      if (!parentTask) {
        const error: any = new Error("Parent task not found");
        error.statusCode = 404;
        throw error;
      }
      if (parentTask.projectId !== data.projectId) {
        const error: any = new Error("Subtask must belong to the same project as the parent task");
        error.statusCode = 400;
        throw error;
      }

      if (data.dueDate && parentTask.dueDate) {
        if (new Date(data.dueDate).getTime() > new Date(parentTask.dueDate).getTime()) {
          const error: any = new Error("Subtask due date cannot exceed parent task due date");
          error.statusCode = 400;
          throw error;
        }
      }

      if (data.startDate && parentTask.startDate) {
        if (new Date(data.startDate).getTime() < new Date(parentTask.startDate).getTime()) {
          const error: any = new Error("Subtask start date cannot precede parent task start date");
          error.statusCode = 400;
          throw error;
        }
      }
    }

    const newTask = dbStore.createTask({
      title: data.title,
      description: data.description,
      status: data.status || "OPEN",
      priority: data.priority || "MEDIUM",
      taskList: data.taskList || "Default",
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      estimatedEffort: data.estimatedEffort ?? undefined,
      completionPercentage: data.completionPercentage ?? 0,
      projectId: data.projectId,
      creatorId: user.userId,
      assigneeId: data.assigneeId || undefined,
      reviewerId: data.reviewerId || undefined,
      parentTaskId: data.parentTaskId || undefined,
    });

    await AuditService.log({
      userId: user.userId,
      targetId: newTask.id,
      action: "TASK_CREATED",
      entity: "Task",
      details: {
        title: newTask.title,
        projectId: newTask.projectId,
        status: newTask.status,
        assigneeId: newTask.assigneeId,
        parentTaskId: newTask.parentTaskId,
      },
    });

    // Notify assignee on new task assignment
    if (newTask.assigneeId) {
      notificationService.notifyTaskAssigned(newTask.id, newTask.assigneeId, user.userId);
    }

    return newTask;
  }

  /**
   * Update task fields with permission checks, dependency enforcement, and date validation
   */
  public static async updateTask(
    taskId: string,
    updates: UpdateTaskDto,
    user: TokenPayload
  ): Promise<TaskRecord> {
    const task = dbStore.getTaskById(taskId);
    if (!task) {
      const error: any = new Error("Task not found");
      error.statusCode = 404;
      throw error;
    }

    if (!this.canAccessProject(task.projectId, user)) {
      const error: any = new Error("Forbidden: You do not have access to this project");
      error.statusCode = 403;
      throw error;
    }

    // Permission check
    const permission = this.canEditTaskFields(task, user, updates);
    if (!permission.allowed) {
      const error: any = new Error(permission.reason || "Forbidden: Cannot update this task");
      error.statusCode = 403;
      throw error;
    }

    // Inverted date checks for the task itself
    const effectiveStartDate =
      updates.startDate !== undefined
        ? (updates.startDate ? new Date(updates.startDate) : undefined)
        : task.startDate;
    const effectiveDueDate =
      updates.dueDate !== undefined
        ? (updates.dueDate ? new Date(updates.dueDate) : undefined)
        : task.dueDate;

    if (effectiveStartDate && effectiveDueDate) {
      if (effectiveStartDate.getTime() > effectiveDueDate.getTime()) {
        const error: any = new Error("Start date cannot be after due date");
        error.statusCode = 400;
        throw error;
      }
    }

    // Date boundary checks if this is a subtask
    if (task.parentTaskId) {
      const parentTask = dbStore.getTaskById(task.parentTaskId);
      if (parentTask) {
        const nextDueDate = updates.dueDate !== undefined ? updates.dueDate : task.dueDate?.toISOString();
        if (nextDueDate && parentTask.dueDate) {
          if (new Date(nextDueDate).getTime() > new Date(parentTask.dueDate).getTime()) {
            const error: any = new Error("Subtask due date cannot exceed parent task due date");
            error.statusCode = 400;
            throw error;
          }
        }
        const nextStartDate = updates.startDate !== undefined ? updates.startDate : task.startDate?.toISOString();
        if (nextStartDate && parentTask.startDate) {
          if (new Date(nextStartDate).getTime() < new Date(parentTask.startDate).getTime()) {
            const error: any = new Error("Subtask start date cannot precede parent task start date");
            error.statusCode = 400;
            throw error;
          }
        }
      }
    }

    // Date boundary checks if this task has subtasks
    const subtasks = dbStore.getTaskSubtasks(task.id);
    if (subtasks.length > 0 && updates.dueDate) {
      const newDueDateMs = new Date(updates.dueDate).getTime();
      for (const sub of subtasks) {
        if (sub.dueDate && new Date(sub.dueDate).getTime() > newDueDateMs) {
          const error: any = new Error(
            `Cannot set parent task due date earlier than existing subtask '${sub.title}' due date`
          );
          error.statusCode = 400;
          throw error;
        }
      }
    }

    // Dependency check if status is changing to COMPLETED
    if (updates.status === "COMPLETED" && task.status !== "COMPLETED") {
      const prereqs = dbStore.getTaskDependencies(task.id);
      for (const dep of prereqs) {
        if (dep.prerequisiteTask && dep.prerequisiteTask.status !== "COMPLETED") {
          const error: any = new Error(
            `Cannot complete task: Prerequisite dependency '${dep.prerequisiteTask.title}' is not completed yet.`
          );
          error.statusCode = 400;
          throw error;
        }
      }
      if (updates.completionPercentage === undefined) {
        updates.completionPercentage = 100;
      }
    }

    const patch: Partial<TaskRecord> = {};
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.description !== undefined) patch.description = updates.description || undefined;
    if (updates.taskList !== undefined) patch.taskList = updates.taskList;
    if (updates.assigneeId !== undefined) patch.assigneeId = updates.assigneeId || undefined;
    if (updates.reviewerId !== undefined) patch.reviewerId = updates.reviewerId || undefined;
    if (updates.priority !== undefined) patch.priority = updates.priority;
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.startDate !== undefined) patch.startDate = updates.startDate ? new Date(updates.startDate) : undefined;
    if (updates.dueDate !== undefined) patch.dueDate = updates.dueDate ? new Date(updates.dueDate) : undefined;
    if (updates.estimatedEffort !== undefined) patch.estimatedEffort = updates.estimatedEffort ?? undefined;
    if (updates.completionPercentage !== undefined) patch.completionPercentage = updates.completionPercentage;

    const previousStatus = task.status;
    const previousAssigneeId = task.assigneeId;

    const updated = dbStore.updateTask(task.id, patch);
    if (!updated) {
      const error: any = new Error("Failed to update task");
      error.statusCode = 500;
      throw error;
    }

    await AuditService.log({
      userId: user.userId,
      targetId: task.id,
      action: "TASK_UPDATED",
      entity: "Task",
      details: {
        taskId: task.id,
        previousStatus: previousStatus,
        newStatus: updated.status,
        updatedFields: Object.keys(patch),
      },
    });

    // Notify on assignment changes
    if (updates.assigneeId !== undefined && updates.assigneeId !== previousAssigneeId) {
      if (previousAssigneeId && updates.assigneeId) {
        notificationService.notifyTaskReassigned(task.id, previousAssigneeId, updates.assigneeId, user.userId);
      } else if (updates.assigneeId) {
        notificationService.notifyTaskAssigned(task.id, updates.assigneeId, user.userId);
      }
    }

    // Notify on status changes
    if (updates.status && updates.status !== previousStatus) {
      if (updates.status === "IN_REVIEW" || updates.status === "UNDER_REVIEW") {
        notificationService.notifyReviewRequested(task.id, updates.reviewerId || updated.reviewerId, user.userId);
      } else if (updates.status === "CHANGES_REQUIRED") {
        notificationService.notifyChangesRequested(task.id, updated.assigneeId, user.userId);
      } else if (updates.status === "BLOCKED") {
        notificationService.notifyBlockedTask(task.id, "Task status changed to BLOCKED", user.userId);
      }
    }

    return updated;
  }

  /**
   * Delete task, cascading subtasks, comments, attachments, dependencies
   */
  public static async deleteTask(taskId: string, user: TokenPayload): Promise<boolean> {
    const task = dbStore.getTaskById(taskId);
    if (!task) {
      const error: any = new Error("Task not found");
      error.statusCode = 404;
      throw error;
    }

    if (!this.canManageTask(task, user)) {
      const error: any = new Error("Forbidden: You do not have permission to delete this task");
      error.statusCode = 403;
      throw error;
    }

    const success = dbStore.deleteTask(taskId);

    await AuditService.log({
      userId: user.userId,
      targetId: taskId,
      action: "TASK_DELETED",
      entity: "Task",
      details: {
        title: task.title,
        projectId: task.projectId,
      },
    });

    return success;
  }

  /**
   * Add dependency (prerequisite) with cycle detection
   */
  public static async addDependency(taskId: string, dependsOnTaskId: string, user: TokenPayload) {
    if (taskId === dependsOnTaskId) {
      const error: any = new Error("Task cannot depend on itself");
      error.statusCode = 400;
      throw error;
    }

    const task = dbStore.getTaskById(taskId);
    if (!task) {
      const error: any = new Error("Task not found");
      error.statusCode = 404;
      throw error;
    }

    const prerequisiteTask = dbStore.getTaskById(dependsOnTaskId);
    if (!prerequisiteTask) {
      const error: any = new Error("Prerequisite task not found");
      error.statusCode = 404;
      throw error;
    }

    if (!this.canAccessProject(task.projectId, user)) {
      const error: any = new Error("Forbidden: You do not have access to this project");
      error.statusCode = 403;
      throw error;
    }

    // Check for circular dependency
    if (dbStore.hasDependencyCycle(taskId, dependsOnTaskId)) {
      const error: any = new Error(
        "Circular dependency detected: Task cannot depend on a task that directly or indirectly depends on it."
      );
      error.statusCode = 400;
      throw error;
    }

    const dep = dbStore.addTaskDependency(taskId, dependsOnTaskId);

    await AuditService.log({
      userId: user.userId,
      targetId: taskId,
      action: "TASK_DEPENDENCY_ADDED",
      entity: "TaskDependency",
      details: { taskId, dependsOnTaskId },
    });

    return dep;
  }

  /**
   * Remove dependency
   */
  public static async removeDependency(taskId: string, dependsOnTaskId: string, user: TokenPayload) {
    const task = dbStore.getTaskById(taskId);
    if (!task) {
      const error: any = new Error("Task not found");
      error.statusCode = 404;
      throw error;
    }

    if (!this.canAccessProject(task.projectId, user)) {
      const error: any = new Error("Forbidden: You do not have access to this project");
      error.statusCode = 403;
      throw error;
    }

    const success = dbStore.removeTaskDependency(taskId, dependsOnTaskId);

    await AuditService.log({
      userId: user.userId,
      targetId: taskId,
      action: "TASK_DEPENDENCY_REMOVED",
      entity: "TaskDependency",
      details: { taskId, dependsOnTaskId },
    });

    return success;
  }

  /**
   * Add comment to a task
   */
  public static async addComment(taskId: string, content: string, user: TokenPayload) {
    const task = dbStore.getTaskById(taskId);
    if (!task) {
      const error: any = new Error("Task not found");
      error.statusCode = 404;
      throw error;
    }

    if (!this.canAccessProject(task.projectId, user)) {
      const error: any = new Error("Forbidden: You do not have access to this project");
      error.statusCode = 403;
      throw error;
    }

    const comment = dbStore.createTaskComment({
      taskId,
      userId: user.userId,
      content,
    });

    const userRecord = dbStore.findUserById(user.userId);
    const profile = userRecord ? dbStore.getProfileByUserId(userRecord.id) : undefined;

    return {
      ...comment,
      user: userRecord
        ? {
            id: userRecord.id,
            email: userRecord.email,
            role: userRecord.role,
            name: profile ? `${profile.firstName} ${profile.lastName}` : userRecord.email,
            avatarUrl: profile?.avatarUrl,
            jobTitle: profile?.jobTitle,
          }
        : null,
    };
  }

  /**
   * Delete comment
   */
  public static async deleteComment(taskId: string, commentId: string, user: TokenPayload) {
    const comment = dbStore.taskComments.find((c) => c.id === commentId && c.taskId === taskId);
    if (!comment) {
      const error: any = new Error("Comment not found");
      error.statusCode = 404;
      throw error;
    }

    if (
      comment.userId !== user.userId &&
      user.role !== "ADMINISTRATOR" &&
      user.role !== "PROJECT_MANAGER"
    ) {
      const error: any = new Error("Forbidden: You can only delete your own comments");
      error.statusCode = 403;
      throw error;
    }

    return dbStore.deleteTaskComment(commentId);
  }

  /**
   * Add attachment to a task
   */
  public static async addAttachment(
    taskId: string,
    data: {
      filename: string;
      filesize: number;
      mimetype: string;
      fileUrl: string;
      accessScope?: AttachmentAccessScope;
    },
    user: TokenPayload
  ) {
    const task = dbStore.getTaskById(taskId);
    if (!task) {
      const error: any = new Error("Task not found");
      error.statusCode = 404;
      throw error;
    }

    if (!this.canAccessProject(task.projectId, user)) {
      const error: any = new Error("Forbidden: You do not have access to this project");
      error.statusCode = 403;
      throw error;
    }

    const attachment = dbStore.createTaskAttachment({
      taskId,
      uploaderId: user.userId,
      filename: data.filename,
      filesize: data.filesize,
      mimetype: data.mimetype,
      fileUrl: data.fileUrl,
      accessScope: data.accessScope || "PROJECT_MEMBERS",
    });

    const uploader = dbStore.findUserById(user.userId);
    const profile = uploader ? dbStore.getProfileByUserId(uploader.id) : undefined;

    return {
      ...attachment,
      uploader: uploader
        ? {
            id: uploader.id,
            email: uploader.email,
            name: profile ? `${profile.firstName} ${profile.lastName}` : uploader.email,
            avatarUrl: profile?.avatarUrl,
          }
        : null,
    };
  }

  /**
   * Delete attachment
   */
  public static async deleteAttachment(taskId: string, attachmentId: string, user: TokenPayload) {
    const attachment = dbStore.taskAttachments.find(
      (a) => a.id === attachmentId && a.taskId === taskId
    );
    if (!attachment) {
      const error: any = new Error("Attachment not found");
      error.statusCode = 404;
      throw error;
    }

    if (
      attachment.uploaderId !== user.userId &&
      user.role !== "ADMINISTRATOR" &&
      user.role !== "PROJECT_MANAGER"
    ) {
      const error: any = new Error("Forbidden: You can only delete your own attachments");
      error.statusCode = 403;
      throw error;
    }

    return dbStore.deleteTaskAttachment(attachmentId);
  }

  /**
   * Helper: Enrich task summary with project, assignee, and counters
   */
  private static enrichTaskSummary(t: TaskRecord) {
    const project = dbStore.getProjectById(t.projectId);
    const assignee = t.assigneeId ? dbStore.findUserById(t.assigneeId) : undefined;
    const assigneeProfile = assignee ? dbStore.getProfileByUserId(assignee.id) : undefined;

    const reviewer = t.reviewerId ? dbStore.findUserById(t.reviewerId) : undefined;
    const reviewerProfile = reviewer ? dbStore.getProfileByUserId(reviewer.id) : undefined;

    const subtasks = dbStore.getTaskSubtasks(t.id);
    const completedSubtasks = subtasks.filter((s) => s.status === "COMPLETED").length;
    const commentsCount = dbStore.taskComments.filter((c) => c.taskId === t.id).length;
    const attachmentsCount = dbStore.taskAttachments.filter((a) => a.taskId === t.id).length;
    const dependencies = dbStore.getTaskDependencies(t.id);
    const isBlocked = dependencies.some((d) => d.prerequisiteTask && d.prerequisiteTask.status !== "COMPLETED");

    return {
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      taskList: t.taskList,
      startDate: t.startDate,
      dueDate: t.dueDate,
      estimatedEffort: t.estimatedEffort,
      completionPercentage: t.completionPercentage,
      projectId: t.projectId,
      creatorId: t.creatorId,
      assigneeId: t.assigneeId,
      reviewerId: t.reviewerId,
      parentTaskId: t.parentTaskId,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      isBlocked,
      project: project
        ? {
            id: project.id,
            title: project.title,
            key: project.key,
          }
        : null,
      assignee: assignee
        ? {
            id: assignee.id,
            email: assignee.email,
            name: assigneeProfile ? `${assigneeProfile.firstName} ${assigneeProfile.lastName}` : assignee.email,
            avatarUrl: assigneeProfile?.avatarUrl,
            jobTitle: assigneeProfile?.jobTitle,
          }
        : null,
      reviewer: reviewer
        ? {
            id: reviewer.id,
            email: reviewer.email,
            name: reviewerProfile ? `${reviewerProfile.firstName} ${reviewerProfile.lastName}` : reviewer.email,
            avatarUrl: reviewerProfile?.avatarUrl,
          }
        : null,
      subtasksCount: subtasks.length,
      completedSubtasksCount: completedSubtasks,
      commentsCount,
      attachmentsCount,
      dependenciesCount: dependencies.length,
    };
  }
}
