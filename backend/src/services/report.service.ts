import {
  dbStore,
  TaskRecord,
  ProjectRecord,
  MilestoneRecord,
  UserRecord,
  DepartmentRecord,
  TaskStatus,
  ProjectStatus,
} from "../lib/db";
import { TokenPayload } from "./auth.service";
import { AuditService } from "./audit.service";

export interface ReportFilters {
  dateRange?: "all" | "last_7_days" | "last_30_days" | "this_month" | "this_quarter" | "custom";
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  projectId?: string;
}

export interface ManagementKPIs {
  onTimeCompletionRate: {
    rate: number;
    completedOnTime: number;
    totalCompletedWithDueDate: number;
  };
  overdueTaskCount: number;
  ownershipCoverage: {
    rate: number;
    openWithAssigneeAndDueDate: number;
    totalOpenTasks: number;
  };
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  milestoneCompletion: {
    rate: number;
    reached: number;
    total: number;
  };
}

export class ReportService {
  /**
   * Determine date range boundaries based on preset or explicit dates
   */
  public static getDateRangeBounds(filters: ReportFilters): { start?: Date; end?: Date } {
    const now = new Date();
    const range = filters.dateRange || "all";

    if (range === "custom" && (filters.startDate || filters.endDate)) {
      return {
        start: filters.startDate ? new Date(filters.startDate) : undefined,
        end: filters.endDate ? new Date(filters.endDate) : undefined,
      };
    }

    if (range === "last_7_days") {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start, end: now };
    }

    if (range === "last_30_days") {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { start, end: now };
    }

    if (range === "this_month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }

    if (range === "this_quarter") {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), currentQuarter * 3, 1);
      const end = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0, 23, 59, 59, 999);
      return { start, end };
    }

    return {};
  }

  /**
   * Helper to verify if a date falls within specified bounds
   */
  public static isWithinDateBounds(date: Date | undefined, bounds: { start?: Date; end?: Date }): boolean {
    if (!date) return false;
    const time = new Date(date).getTime();
    if (bounds.start && time < bounds.start.getTime()) return false;
    if (bounds.end && time > bounds.end.getTime()) return false;
    return true;
  }

  /**
   * Scopes projects according to user role permissions and filters
   */
  public static getScopedProjects(filters: ReportFilters, user: TokenPayload): ProjectRecord[] {
    let projects = dbStore.projects.slice();

    // Role-based visibility scoping
    if (user.role === "EMPLOYEE") {
      if (filters.departmentId && filters.departmentId !== "all" && filters.departmentId !== user.departmentId) {
        return []; // Forbidden from viewing unauthorized departments
      }
      projects = projects.filter((p) => {
        const matchesDept = p.departmentId === user.departmentId;
        const isMember = dbStore.projectMembers.some((pm) => pm.projectId === p.id && pm.userId === user.userId);
        const isOwnerOrCreator = p.ownerId === user.userId || p.creatorId === user.userId;
        return matchesDept || isMember || isOwnerOrCreator;
      });
    } else if (user.role === "TEAM_LEAD") {
      if (filters.departmentId && filters.departmentId !== "all" && filters.departmentId !== user.departmentId) {
        return []; // Scoped to their assigned department
      }
      if (user.departmentId) {
        projects = projects.filter(
          (p) =>
            p.departmentId === user.departmentId ||
            p.ownerId === user.userId ||
            p.creatorId === user.userId ||
            dbStore.projectMembers.some((pm) => pm.projectId === p.id && pm.userId === user.userId)
        );
      }
    }

    // Explicit department filter (Admin / PM or matching department)
    if (filters.departmentId && filters.departmentId !== "all") {
      projects = projects.filter((p) => p.departmentId === filters.departmentId);
    }

    // Explicit project filter
    if (filters.projectId && filters.projectId !== "all") {
      projects = projects.filter((p) => p.id === filters.projectId);
    }

    return projects;
  }

  /**
   * Scopes tasks according to authorized projects and filters
   */
  public static getScopedTasks(
    filters: ReportFilters,
    user: TokenPayload,
    scopedProjects?: ProjectRecord[]
  ): TaskRecord[] {
    const projects = scopedProjects || this.getScopedProjects(filters, user);
    const projectIds = new Set(projects.map((p) => p.id));

    let tasks = dbStore.tasks.filter((t) => projectIds.has(t.projectId));

    if (filters.projectId && filters.projectId !== "all") {
      tasks = tasks.filter((t) => t.projectId === filters.projectId);
    }

    return tasks;
  }

  /**
   * 1. Management KPIs
   * Calculates on-time completion rate, overdue count, and ownership coverage without double-counting subtasks
   */
  public static getManagementKPIs(filters: ReportFilters, user: TokenPayload): ManagementKPIs {
    const projects = this.getScopedProjects(filters, user);
    const tasks = this.getScopedTasks(filters, user, projects);
    const bounds = this.getDateRangeBounds(filters);

    // Filter to root tasks only to avoid double-counting subtasks and parent tasks in the same KPI!
    const rootTasks = tasks.filter((t) => !t.parentTaskId);

    // Date-scoped tasks for time-sensitive metrics
    const hasDateFilter = bounds.start || bounds.end;

    // --- On-Time Completion Rate ---
    // Formula: Tasks completed on or before their due date divided by all tasks completed with a due date during the selected period.
    const completedTasksWithDueDate = rootTasks.filter((t) => {
      if (t.status !== "COMPLETED" || !t.dueDate) return false;
      if (hasDateFilter) {
        const completedDate = t.updatedAt || t.dueDate;
        return this.isWithinDateBounds(completedDate, bounds);
      }
      return true;
    });

    const completedOnTime = completedTasksWithDueDate.filter((t) => {
      const completionTime = new Date(t.updatedAt).getTime();
      const dueTime = new Date(t.dueDate!).getTime();
      return completionTime <= dueTime;
    });

    const onTimeRate =
      completedTasksWithDueDate.length > 0
        ? Number(((completedOnTime.length / completedTasksWithDueDate.length) * 100).toFixed(1))
        : 100.0;

    // --- Overdue Task Count ---
    // Formula: Tasks that are not completed and whose due date is earlier than the current time in the configured timezone.
    const nowTime = Date.now();
    const overdueTasks = rootTasks.filter((t) => {
      if (t.status === "COMPLETED") return false; // Completed tasks must not appear in overdue counts
      if (!t.dueDate) return false;
      return new Date(t.dueDate).getTime() < nowTime;
    });

    // --- Ownership Coverage ---
    // Formula: Open tasks with an assigned owner and due date divided by all open tasks.
    const openTasks = rootTasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED");
    const openWithAssigneeAndDueDate = openTasks.filter((t) => Boolean(t.assigneeId) && Boolean(t.dueDate));
    const coverageRate =
      openTasks.length > 0
        ? Number(((openWithAssigneeAndDueDate.length / openTasks.length) * 100).toFixed(1))
        : 100.0;

    // --- Milestones Summary ---
    const scopedProjectIds = new Set(projects.map((p) => p.id));
    const milestones = dbStore.milestones.filter((m) => scopedProjectIds.has(m.projectId));
    const reachedMilestones = milestones.filter((m) => m.status === "REACHED");
    const milestoneRate =
      milestones.length > 0
        ? Number(((reachedMilestones.length / milestones.length) * 100).toFixed(1))
        : 100.0;

    return {
      onTimeCompletionRate: {
        rate: onTimeRate,
        completedOnTime: completedOnTime.length,
        totalCompletedWithDueDate: completedTasksWithDueDate.length,
      },
      overdueTaskCount: overdueTasks.length,
      ownershipCoverage: {
        rate: coverageRate,
        openWithAssigneeAndDueDate: openWithAssigneeAndDueDate.length,
        totalOpenTasks: openTasks.length,
      },
      totalProjects: projects.length,
      activeProjects: projects.filter((p) => p.status === "ACTIVE" || p.status === "IN_PROGRESS").length,
      totalTasks: rootTasks.length,
      completedTasks: rootTasks.filter((t) => t.status === "COMPLETED").length,
      milestoneCompletion: {
        rate: milestoneRate,
        reached: reachedMilestones.length,
        total: milestones.length,
      },
    };
  }

  /**
   * 2. Project Status and Progress Report
   */
  public static getProjectStatusReport(filters: ReportFilters, user: TokenPayload) {
    const projects = this.getScopedProjects(filters, user);
    const tasks = this.getScopedTasks(filters, user, projects);

    const statusCounts: Record<ProjectStatus, number> = {
      PLANNING: 0,
      ACTIVE: 0,
      IN_PROGRESS: 0,
      ON_HOLD: 0,
      COMPLETED: 0,
      ARCHIVED: 0,
    };

    projects.forEach((p) => {
      if (statusCounts[p.status] !== undefined) {
        statusCounts[p.status]++;
      }
    });

    const projectDetails = projects.map((project) => {
      const owner = project.ownerId ? dbStore.findUserById(project.ownerId) : undefined;
      const ownerProfile = owner ? dbStore.getProfileByUserId(owner.id) : undefined;
      const department = dbStore.getDepartmentById(project.departmentId);

      const projectMilestones = dbStore.getMilestones(project.id);
      const reachedCount = projectMilestones.filter((m) => m.status === "REACHED").length;
      const milestoneProgress =
        projectMilestones.length > 0 ? Math.round((reachedCount / projectMilestones.length) * 100) : 0;

      const projectTasks = tasks.filter((t) => t.projectId === project.id && !t.parentTaskId);
      const completedTasks = projectTasks.filter((t) => t.status === "COMPLETED").length;
      const overdueTasks = projectTasks.filter(
        (t) => t.status !== "COMPLETED" && t.dueDate && new Date(t.dueDate).getTime() < Date.now()
      ).length;

      return {
        id: project.id,
        key: project.key,
        title: project.title,
        status: project.status,
        priority: project.priority,
        departmentId: project.departmentId,
        department: department?.name || "Unassigned",
        owner: ownerProfile ? `${ownerProfile.firstName} ${ownerProfile.lastName}` : owner?.email || "Unassigned",
        targetDate: project.targetDate,
        totalMilestones: projectMilestones.length,
        reachedMilestones: reachedCount,
        progressPercentage: milestoneProgress,
        totalTasks: projectTasks.length,
        completedTasks,
        overdueTasks,
      };
    });

    const avgProgress =
      projectDetails.length > 0
        ? Math.round(projectDetails.reduce((sum, p) => sum + p.progressPercentage, 0) / projectDetails.length)
        : 0;

    return {
      statusDistribution: statusCounts,
      averageProgress: avgProgress,
      totalProjects: projects.length,
      projects: projectDetails,
    };
  }

  /**
   * 3. Tasks by Status Report
   */
  public static getTasksByStatusReport(filters: ReportFilters, user: TokenPayload) {
    const tasks = this.getScopedTasks(filters, user).filter((t) => !t.parentTaskId);

    const counts: Record<string, number> = {
      OPEN: 0,
      ASSIGNED: 0,
      IN_PROGRESS: 0,
      UNDER_REVIEW: 0,
      CHANGES_REQUIRED: 0,
      BLOCKED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };

    tasks.forEach((t) => {
      const statusKey = t.status === "IN_REVIEW" ? "UNDER_REVIEW" : t.status;
      if (counts[statusKey] !== undefined) {
        counts[statusKey]++;
      } else {
        counts.OPEN++;
      }
    });

    const total = tasks.length;
    const breakdown = Object.entries(counts).map(([status, count]) => ({
      status,
      count,
      percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
    }));

    return {
      total,
      breakdown,
    };
  }

  /**
   * 4. Overdue Tasks by Owner/Assignee Report
   */
  public static getOverdueByOwnerReport(filters: ReportFilters, user: TokenPayload) {
    const tasks = this.getScopedTasks(filters, user).filter((t) => !t.parentTaskId);
    const nowTime = Date.now();

    const overdueTasks = tasks.filter((t) => {
      if (t.status === "COMPLETED") return false;
      if (!t.dueDate) return false;
      return new Date(t.dueDate).getTime() < nowTime;
    });

    const ownerMap = new Map<
      string,
      {
        userId: string;
        name: string;
        email: string;
        department: string;
        avatarUrl?: string;
        count: number;
        tasks: Array<{
          id: string;
          title: string;
          projectKey: string;
          dueDate: Date;
          daysOverdue: number;
          priority: string;
        }>;
      }
    >();

    overdueTasks.forEach((task) => {
      const assigneeId = task.assigneeId || "unassigned";
      let entry = ownerMap.get(assigneeId);

      if (!entry) {
        if (assigneeId === "unassigned") {
          entry = {
            userId: "unassigned",
            name: "Unassigned",
            email: "N/A",
            department: "Unassigned",
            count: 0,
            tasks: [],
          };
        } else {
          const u = dbStore.findUserById(assigneeId);
          const p = u ? dbStore.getProfileByUserId(u.id) : undefined;
          const dept = u ? dbStore.getDepartmentById(u.departmentId) : undefined;
          entry = {
            userId: assigneeId,
            name: p ? `${p.firstName} ${p.lastName}` : u?.email || "Unknown",
            email: u?.email || "N/A",
            department: dept?.name || "Unassigned",
            avatarUrl: p?.avatarUrl,
            count: 0,
            tasks: [],
          };
        }
        ownerMap.set(assigneeId, entry);
      }

      const project = dbStore.getProjectById(task.projectId);
      const daysOverdue = Math.max(
        1,
        Math.floor((nowTime - new Date(task.dueDate!).getTime()) / (24 * 60 * 60 * 1000))
      );

      entry.count++;
      entry.tasks.push({
        id: task.id,
        title: task.title,
        projectKey: project?.key || "PRJ",
        dueDate: task.dueDate!,
        daysOverdue,
        priority: task.priority,
      });
    });

    const owners = Array.from(ownerMap.values()).sort((a, b) => b.count - a.count);

    return {
      totalOverdue: overdueTasks.length,
      owners,
    };
  }

  /**
   * 5. Upcoming Deadlines Report
   */
  public static getUpcomingDeadlinesReport(filters: ReportFilters, user: TokenPayload) {
    const tasks = this.getScopedTasks(filters, user).filter((t) => !t.parentTaskId);
    const nowTime = Date.now();
    const bounds = this.getDateRangeBounds(filters);

    // Default to next 14 days if no custom date filter provided
    const upperLimit = bounds.end ? bounds.end.getTime() : nowTime + 14 * 24 * 60 * 60 * 1000;
    const lowerLimit = bounds.start ? bounds.start.getTime() : nowTime;

    const upcomingTasks = tasks
      .filter((t) => {
        if (t.status === "COMPLETED") return false;
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate).getTime();
        return due >= lowerLimit && due <= upperLimit;
      })
      .map((task) => {
        const project = dbStore.getProjectById(task.projectId);
        const assignee = task.assigneeId ? dbStore.findUserById(task.assigneeId) : undefined;
        const assigneeProfile = assignee ? dbStore.getProfileByUserId(assignee.id) : undefined;
        const dueTime = new Date(task.dueDate!).getTime();
        const daysRemaining = Math.max(0, Math.ceil((dueTime - nowTime) / (24 * 60 * 60 * 1000)));

        return {
          id: task.id,
          title: task.title,
          projectKey: project?.key || "PRJ",
          projectName: project?.title || "Unknown Project",
          dueDate: task.dueDate!,
          priority: task.priority,
          status: task.status,
          daysRemaining,
          assignee: assignee
            ? {
                id: assignee.id,
                name: assigneeProfile
                  ? `${assigneeProfile.firstName} ${assigneeProfile.lastName}`
                  : assignee.email,
                avatarUrl: assigneeProfile?.avatarUrl,
              }
            : null,
        };
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return {
      totalUpcoming: upcomingTasks.length,
      tasks: upcomingTasks,
    };
  }

  /**
   * 6. Milestone Completion Report
   */
  public static getMilestoneCompletionReport(filters: ReportFilters, user: TokenPayload) {
    const projects = this.getScopedProjects(filters, user);
    const projectIds = new Set(projects.map((p) => p.id));
    const nowTime = Date.now();

    const milestones = dbStore.milestones.filter((m) => projectIds.has(m.projectId));

    const total = milestones.length;
    const reached = milestones.filter((m) => m.status === "REACHED").length;
    const overdue = milestones.filter(
      (m) => m.status !== "REACHED" && new Date(m.dueDate).getTime() < nowTime
    ).length;
    const pending = total - reached - overdue;

    const projectBreakdown = projects.map((p) => {
      const pMilestones = milestones.filter((m) => m.projectId === p.id);
      const pReached = pMilestones.filter((m) => m.status === "REACHED").length;
      const progress = pMilestones.length > 0 ? Math.round((pReached / pMilestones.length) * 100) : 0;

      return {
        projectId: p.id,
        projectKey: p.key,
        projectTitle: p.title,
        status: p.status,
        totalMilestones: pMilestones.length,
        reachedMilestones: pReached,
        progressPercentage: progress,
        milestones: pMilestones.map((m) => ({
          id: m.id,
          title: m.title,
          dueDate: m.dueDate,
          status: m.status,
        })),
      };
    });

    return {
      summary: {
        total,
        reached,
        pending: Math.max(0, pending),
        overdue,
        completionRate: total > 0 ? Number(((reached / total) * 100).toFixed(1)) : 100.0,
      },
      projects: projectBreakdown,
    };
  }

  /**
   * 7. Workload by Employee Report
   */
  public static getEmployeeWorkloadReport(filters: ReportFilters, user: TokenPayload) {
    const tasks = this.getScopedTasks(filters, user).filter((t) => !t.parentTaskId);
    const nowTime = Date.now();

    // Scope users by visible departments
    let users = dbStore.users.slice();
    if (user.role === "EMPLOYEE" || user.role === "TEAM_LEAD") {
      if (user.departmentId) {
        users = users.filter((u) => u.departmentId === user.departmentId);
      }
    } else if (filters.departmentId && filters.departmentId !== "all") {
      users = users.filter((u) => u.departmentId === filters.departmentId);
    }

    const employeeWorkload = users.map((u) => {
      const profile = dbStore.getProfileByUserId(u.id);
      const dept = dbStore.getDepartmentById(u.departmentId);

      const assignedTasks = tasks.filter((t) => t.assigneeId === u.id);
      const openTasks = assignedTasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED");
      const completedTasks = assignedTasks.filter((t) => t.status === "COMPLETED");
      const overdueTasks = assignedTasks.filter(
        (t) => t.status !== "COMPLETED" && t.dueDate && new Date(t.dueDate).getTime() < nowTime
      );
      const totalEstimatedEffort = assignedTasks.reduce((sum, t) => sum + (t.estimatedEffort || 0), 0);

      return {
        userId: u.id,
        name: profile ? `${profile.firstName} ${profile.lastName}` : u.email,
        email: u.email,
        role: u.role,
        department: dept?.name || "Unassigned",
        jobTitle: profile?.jobTitle || "Contributor",
        avatarUrl: profile?.avatarUrl,
        totalAssignedTasks: assignedTasks.length,
        openTasksCount: openTasks.length,
        completedTasksCount: completedTasks.length,
        overdueTasksCount: overdueTasks.length,
        totalEstimatedHours: totalEstimatedEffort,
      };
    });

    return {
      totalEmployees: employeeWorkload.length,
      employees: employeeWorkload.sort((a, b) => b.openTasksCount - a.openTasksCount),
    };
  }

  /**
   * 8. Department Workload Report
   */
  public static getDepartmentWorkloadReport(filters: ReportFilters, user: TokenPayload) {
    const projects = this.getScopedProjects(filters, user);
    const tasks = this.getScopedTasks(filters, user, projects).filter((t) => !t.parentTaskId);
    const nowTime = Date.now();

    let departments = dbStore.departments.slice();
    if (user.role === "EMPLOYEE" || user.role === "TEAM_LEAD") {
      if (user.departmentId) {
        departments = departments.filter((d) => d.id === user.departmentId);
      }
    } else if (filters.departmentId && filters.departmentId !== "all") {
      departments = departments.filter((d) => d.id === filters.departmentId);
    }

    const deptReport = departments.map((dept) => {
      const deptProjects = projects.filter((p) => p.departmentId === dept.id);
      const deptProjectIds = new Set(deptProjects.map((p) => p.id));
      const deptTasks = tasks.filter((t) => deptProjectIds.has(t.projectId));

      const openTasks = deptTasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED");
      const completedTasks = deptTasks.filter((t) => t.status === "COMPLETED");
      const overdueTasks = deptTasks.filter(
        (t) => t.status !== "COMPLETED" && t.dueDate && new Date(t.dueDate).getTime() < nowTime
      );
      const totalEstimatedHours = deptTasks.reduce((sum, t) => sum + (t.estimatedEffort || 0), 0);
      const memberCount = dbStore.users.filter((u) => u.departmentId === dept.id).length;

      return {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        memberCount,
        activeProjects: deptProjects.filter((p) => p.status === "ACTIVE" || p.status === "IN_PROGRESS").length,
        totalProjects: deptProjects.length,
        totalTasks: deptTasks.length,
        openTasksCount: openTasks.length,
        completedTasksCount: completedTasks.length,
        overdueTasksCount: overdueTasks.length,
        totalEstimatedHours,
      };
    });

    return {
      departments: deptReport,
    };
  }

  /**
   * Secure CSV Export Engine
   * Validates authorization and generates CSV payload
   */
  public static generateCSV(
    type: "tasks" | "projects" | "kpis",
    filters: ReportFilters,
    user: TokenPayload
  ): string {
    // Role Authorization: Only Admin, PM, Lead can export. Employees are rejected!
    if (user.role === "EMPLOYEE") {
      const error: any = new Error("Forbidden: Employees are not authorized to export report data");
      error.statusCode = 403;
      throw error;
    }

    AuditService.log({
      userId: user.userId,
      action: "REPORT_EXPORTED",
      entity: "Report",
      details: {
        exportType: type,
        filters,
        role: user.role,
      },
    }).catch((err) => console.error("[AuditService] Failed to log report export:", err));

    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '""';
      const str = String(value).replace(/"/g, '""');
      return `"${str}"`;
    };

    if (type === "tasks") {
      const tasks = this.getScopedTasks(filters, user).filter((t) => !t.parentTaskId);
      const nowTime = Date.now();
      const headers = [
        "Task ID",
        "Title",
        "Project Key",
        "Assignee",
        "Status",
        "Priority",
        "Start Date",
        "Due Date",
        "Estimated Hours",
        "Completion %",
        "Completed On Time",
        "Is Overdue",
      ];

      const rows = tasks.map((t) => {
        const project = dbStore.getProjectById(t.projectId);
        const assignee = t.assigneeId ? dbStore.findUserById(t.assigneeId) : undefined;
        const assigneeProfile = assignee ? dbStore.getProfileByUserId(assignee.id) : undefined;
        const assigneeName = assigneeProfile
          ? `${assigneeProfile.firstName} ${assigneeProfile.lastName}`
          : assignee?.email || "Unassigned";

        const isOverdue = t.status !== "COMPLETED" && t.dueDate && new Date(t.dueDate).getTime() < nowTime;
        const completedOnTime =
          t.status === "COMPLETED" && t.dueDate
            ? new Date(t.updatedAt).getTime() <= new Date(t.dueDate).getTime()
              ? "YES"
              : "NO"
            : "N/A";

        return [
          t.id,
          t.title,
          project?.key || "PRJ",
          assigneeName,
          t.status,
          t.priority,
          t.startDate ? new Date(t.startDate).toISOString().split("T")[0] : "",
          t.dueDate ? new Date(t.dueDate).toISOString().split("T")[0] : "",
          t.estimatedEffort || 0,
          t.completionPercentage || 0,
          completedOnTime,
          isOverdue ? "YES" : "NO",
        ]
          .map(escapeCSV)
          .join(",");
      });

      return [headers.map(escapeCSV).join(","), ...rows].join("\r\n");
    }

    if (type === "projects") {
      const projects = this.getScopedProjects(filters, user);
      const headers = [
        "Project Code",
        "Title",
        "Department",
        "Owner",
        "Status",
        "Priority",
        "Start Date",
        "Target Date",
        "Total Milestones",
        "Reached Milestones",
        "Progress %",
      ];

      const rows = projects.map((p) => {
        const owner = p.ownerId ? dbStore.findUserById(p.ownerId) : undefined;
        const ownerProfile = owner ? dbStore.getProfileByUserId(owner.id) : undefined;
        const dept = dbStore.getDepartmentById(p.departmentId);
        const milestones = dbStore.getMilestones(p.id);
        const reached = milestones.filter((m) => m.status === "REACHED").length;
        const progress = milestones.length > 0 ? Math.round((reached / milestones.length) * 100) : 0;

        return [
          p.key,
          p.title,
          dept?.name || "Unassigned",
          ownerProfile ? `${ownerProfile.firstName} ${ownerProfile.lastName}` : owner?.email || "Unassigned",
          p.status,
          p.priority,
          p.startDate ? new Date(p.startDate).toISOString().split("T")[0] : "",
          p.targetDate ? new Date(p.targetDate).toISOString().split("T")[0] : "",
          milestones.length,
          reached,
          `${progress}%`,
        ]
          .map(escapeCSV)
          .join(",");
      });

      return [headers.map(escapeCSV).join(","), ...rows].join("\r\n");
    }

    // Default: KPIs
    const kpis = this.getManagementKPIs(filters, user);
    const headers = ["Metric", "Value", "Details / Ratio"];
    const rows = [
      ["On-Time Completion Rate", `${kpis.onTimeCompletionRate.rate}%`, `${kpis.onTimeCompletionRate.completedOnTime} / ${kpis.onTimeCompletionRate.totalCompletedWithDueDate} completed tasks`],
      ["Overdue Tasks", String(kpis.overdueTaskCount), "Incomplete deliverables past due date"],
      ["Ownership Coverage", `${kpis.ownershipCoverage.rate}%`, `${kpis.ownershipCoverage.openWithAssigneeAndDueDate} / ${kpis.ownershipCoverage.totalOpenTasks} open tasks with owner & deadline`],
      ["Active Projects", String(kpis.activeProjects), `${kpis.totalProjects} total projects`],
      ["Milestone Completion Rate", `${kpis.milestoneCompletion.rate}%`, `${kpis.milestoneCompletion.reached} / ${kpis.milestoneCompletion.total} milestones reached`],
      ["Total Tasks (Root)", String(kpis.totalTasks), `${kpis.completedTasks} completed`],
    ].map((r) => r.map(escapeCSV).join(","));

    return [headers.map(escapeCSV).join(","), ...rows].join("\r\n");
  }
}
