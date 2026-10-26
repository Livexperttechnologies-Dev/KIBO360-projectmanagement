import { dbStore, TaskRecord, ProjectRecord, MilestoneRecord, Role } from "../lib/db";
import { TokenPayload } from "./auth.service";
import { DeadlineService, DeadlineClassification } from "./deadline.service";

export interface CalendarFilters {
  startDate?: string;
  endDate?: string;
  projectId?: string;
  userId?: string;
  assigneeId?: string;
  departmentId?: string;
  status?: string;
  type?: "ALL" | "TASK" | "MILESTONE";
  deadlineStatus?: "ALL" | DeadlineClassification;
}

export interface CalendarEventPrerequisite {
  id: string;
  title: string;
  status: string;
  isCompleted: boolean;
}

export interface CalendarEvent {
  id: string;
  entityId: string;
  type: "TASK" | "MILESTONE";
  title: string;
  description?: string;
  date: string;
  startDate?: string;
  dueDate: string;
  projectId: string;
  projectName: string;
  projectKey: string;
  departmentId?: string;
  departmentName?: string;
  status: string;
  priority?: string;
  assignee?: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
  } | null;
  reviewer?: {
    id: string;
    email: string;
    name: string;
  } | null;
  isBlocked: boolean;
  blockedReasons: string[];
  prerequisites: CalendarEventPrerequisite[];
  subtasksCount?: number;
  completedSubtasksCount?: number;
  completionPercentage?: number;
  deadlineStatus: DeadlineClassification;
  isOverdue: boolean;
  isApproaching: boolean;
  isUpcoming: boolean;
  daysRemaining: number;
  daysOverdue: number;
  reachedAt?: string;
}

export interface CalendarSummary {
  totalEvents: number;
  totalTasks: number;
  totalMilestones: number;
  overdueTasks: number;
  approachingTasks: number;
  upcomingTasks: number;
  completedTasks: number;
  blockedTasks: number;
  timezone: string;
}

export class CalendarService {
  /**
   * Check whether user has permission to see the project
   */
  private static canViewProject(project: ProjectRecord, user: TokenPayload): boolean {
    if (user.role === "ADMINISTRATOR" || user.role === "PROJECT_MANAGER") {
      return true;
    }

    if (project.departmentId && user.departmentId && project.departmentId === user.departmentId) {
      return true;
    }

    if (project.creatorId === user.userId || project.ownerId === user.userId) {
      return true;
    }

    const isMember = dbStore.projectMembers.some(
      (pm) => pm.projectId === project.id && pm.userId === user.userId
    );
    return isMember;
  }

  /**
   * Filter projects based on user permissions and department/project filters
   */
  private static getAuthorizedProjects(filters: CalendarFilters, user: TokenPayload): ProjectRecord[] {
    let projects = [...dbStore.projects];

    // Department boundary enforcement
    if (user.role === "EMPLOYEE" || user.role === "TEAM_LEAD") {
      if (user.departmentId) {
        if (filters.departmentId && filters.departmentId !== "all" && filters.departmentId !== user.departmentId) {
          return [];
        }
        projects = projects.filter((p) => this.canViewProject(p, user));
      }
    }

    if (filters.departmentId && filters.departmentId !== "all") {
      projects = projects.filter((p) => p.departmentId === filters.departmentId);
    }

    if (filters.projectId && filters.projectId !== "all") {
      projects = projects.filter((p) => p.id === filters.projectId);
    }

    return projects;
  }

  /**
   * Retrieve aggregated calendar events (tasks and milestones)
   */
  public static getCalendarEvents(
    filters: CalendarFilters,
    user: TokenPayload,
    refNow: Date = new Date()
  ): { events: CalendarEvent[]; summary: CalendarSummary } {
    const projects = this.getAuthorizedProjects(filters, user);
    const projectMap = new Map(projects.map((p) => [p.id, p]));
    const allowedProjectIds = new Set(projects.map((p) => p.id));

    const events: CalendarEvent[] = [];
    const targetUserId = filters.userId || filters.assigneeId;

    const filterType = filters.type ? filters.type.toUpperCase() : "ALL";
    const filterDeadline = filters.deadlineStatus ? filters.deadlineStatus.toUpperCase() : "ALL";

    // 1. Process Tasks
    if (filterType === "ALL" || filterType === "TASK") {
      const tasks = dbStore.tasks.filter((t) => {
        if (!allowedProjectIds.has(t.projectId)) return false;
        if (!t.dueDate) return false;

        // User / Assignee filter
        if (targetUserId && targetUserId !== "all" && t.assigneeId !== targetUserId) {
          return false;
        }

        // Status filter
        if (filters.status && filters.status !== "all" && t.status !== filters.status) {
          return false;
        }

        return true;
      });

      for (const t of tasks) {
        const project = projectMap.get(t.projectId);
        const department = project?.departmentId ? dbStore.getDepartmentById(project.departmentId) : undefined;

        const assignee = t.assigneeId ? dbStore.findUserById(t.assigneeId) : undefined;
        const assigneeProfile = assignee ? dbStore.getProfileByUserId(assignee.id) : undefined;

        const reviewer = t.reviewerId ? dbStore.findUserById(t.reviewerId) : undefined;
        const reviewerProfile = reviewer ? dbStore.getProfileByUserId(reviewer.id) : undefined;

        // Subtasks & Dependencies
        const subtasks = dbStore.getTaskSubtasks(t.id);
        const completedSubtasks = subtasks.filter((s) => s.status === "COMPLETED").length;

        const dependencies = dbStore.getTaskDependencies(t.id);
        const prerequisites: CalendarEventPrerequisite[] = dependencies.map((d) => {
          const prereqTask = d.prerequisiteTask || dbStore.getTaskById(d.dependsOnTaskId);
          return {
            id: d.dependsOnTaskId,
            title: prereqTask ? prereqTask.title : "Prerequisite Task",
            status: prereqTask ? prereqTask.status : "UNKNOWN",
            isCompleted: prereqTask ? prereqTask.status === "COMPLETED" : false,
          };
        });

        const blockedReasons: string[] = [];
        if (t.status === "BLOCKED") {
          blockedReasons.push("Task status is explicitly set to Blocked");
        }
        const incompletePrereqs = prerequisites.filter((p) => !p.isCompleted);
        if (incompletePrereqs.length > 0) {
          blockedReasons.push(
            `Blocked by ${incompletePrereqs.length} incomplete prerequisite(s): ${incompletePrereqs
              .map((p) => p.title)
              .join(", ")}`
          );
        }
        const isBlocked = blockedReasons.length > 0;

        const deadline = DeadlineService.analyzeDeadline(t.dueDate!, t.status, refNow);

        events.push({
          id: `task-${t.id}`,
          entityId: t.id,
          type: "TASK",
          title: t.title,
          description: t.description,
          date: t.dueDate!.toISOString(),
          startDate: t.startDate ? t.startDate.toISOString() : undefined,
          dueDate: t.dueDate!.toISOString(),
          projectId: t.projectId,
          projectName: project ? project.title : "Project",
          projectKey: project ? project.key : "PRJ",
          departmentId: project?.departmentId,
          departmentName: department ? department.name : undefined,
          status: t.status,
          priority: t.priority,
          assignee: assignee
            ? {
                id: assignee.id,
                email: assignee.email,
                name: assigneeProfile
                  ? `${assigneeProfile.firstName} ${assigneeProfile.lastName}`
                  : assignee.email,
                avatarUrl: assigneeProfile?.avatarUrl,
              }
            : null,
          reviewer: reviewer
            ? {
                id: reviewer.id,
                email: reviewer.email,
                name: reviewerProfile
                  ? `${reviewerProfile.firstName} ${reviewerProfile.lastName}`
                  : reviewer.email,
              }
            : null,
          isBlocked,
          blockedReasons,
          prerequisites,
          subtasksCount: subtasks.length,
          completedSubtasksCount: completedSubtasks,
          completionPercentage: t.completionPercentage ?? 0,
          deadlineStatus: deadline.status,
          isOverdue: deadline.isOverdue,
          isApproaching: deadline.isApproaching,
          isUpcoming: deadline.isUpcoming,
          daysRemaining: deadline.daysRemaining,
          daysOverdue: deadline.daysOverdue,
        });
      }
    }

    // 2. Process Milestones
    if (filterType === "ALL" || filterType === "MILESTONE") {
      for (const project of projects) {
        // If assignee filter is applied, skip milestones as milestones are project-level
        if (targetUserId && targetUserId !== "all") {
          continue;
        }

        const department = project.departmentId ? dbStore.getDepartmentById(project.departmentId) : undefined;
        const milestones = dbStore.getMilestones(project.id);

        for (const m of milestones) {
          if (!m.dueDate) continue;

          // Status filter
          if (filters.status && filters.status !== "all" && m.status !== filters.status) {
            continue;
          }

          const deadline = DeadlineService.analyzeDeadline(m.dueDate, m.status, refNow);

          events.push({
            id: `milestone-${m.id}`,
            entityId: m.id,
            type: "MILESTONE",
            title: m.title,
            description: m.description,
            date: m.dueDate.toISOString(),
            dueDate: m.dueDate.toISOString(),
            projectId: project.id,
            projectName: project.title,
            projectKey: project.key,
            departmentId: project.departmentId,
            departmentName: department ? department.name : undefined,
            status: m.status,
            priority: project.priority,
            assignee: null,
            reviewer: null,
            isBlocked: false,
            blockedReasons: [],
            prerequisites: [],
            deadlineStatus: deadline.status,
            isOverdue: deadline.isOverdue,
            isApproaching: deadline.isApproaching,
            isUpcoming: deadline.isUpcoming,
            daysRemaining: deadline.daysRemaining,
            daysOverdue: deadline.daysOverdue,
            reachedAt: m.reachedAt ? m.reachedAt.toISOString() : undefined,
          });
        }
      }
    }

    // 3. Compute Summary Before Window Slicing
    const allComputedTasks = events.filter((e) => e.type === "TASK");
    const allComputedMilestones = events.filter((e) => e.type === "MILESTONE");

    const overdueTasks = allComputedTasks.filter((t) => t.isOverdue).length;
    const approachingTasks = allComputedTasks.filter((t) => t.isApproaching).length;
    const upcomingTasks = allComputedTasks.filter((t) => t.isUpcoming).length;
    const completedTasks = allComputedTasks.filter((t) => t.status === "COMPLETED").length;
    const blockedTasks = allComputedTasks.filter((t) => t.isBlocked).length;

    const summary: CalendarSummary = {
      totalEvents: events.length,
      totalTasks: allComputedTasks.length,
      totalMilestones: allComputedMilestones.length,
      overdueTasks,
      approachingTasks,
      upcomingTasks,
      completedTasks,
      blockedTasks,
      timezone: DeadlineService.getTimezone(),
    };

    // 4. Apply Date Window Filter (startDate & endDate)
    let filteredEvents = events;

    if (filters.startDate) {
      const startTime = new Date(filters.startDate).getTime();
      filteredEvents = filteredEvents.filter((e) => new Date(e.date).getTime() >= startTime);
    }

    if (filters.endDate) {
      const endTime = new Date(filters.endDate).getTime();
      filteredEvents = filteredEvents.filter((e) => new Date(e.date).getTime() <= endTime);
    }

    // 5. Apply Deadline Classification Filter if specified
    if (filterDeadline !== "ALL") {
      filteredEvents = filteredEvents.filter((e) => e.deadlineStatus === filterDeadline);
    }

    // 6. Chronological Sorting
    filteredEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      events: filteredEvents,
      summary,
    };
  }

  /**
   * Quick summary metrics for calendar widgets and navigation badges
   */
  public static getCalendarSummary(
    filters: CalendarFilters,
    user: TokenPayload,
    refNow: Date = new Date()
  ): CalendarSummary {
    const { summary } = this.getCalendarEvents(filters, user, refNow);
    return summary;
  }
}
