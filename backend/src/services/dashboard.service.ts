import { dbStore, TaskRecord, ProjectRecord, TaskStatus, Role } from "../lib/db";
import { TokenPayload } from "./auth.service";
import { TaskService } from "./task.service";

export interface DashboardFilters {
  dateRange?: "all" | "today" | "this_week" | "this_month" | "this_quarter";
  departmentId?: string;
  projectId?: string;
  assigneeId?: string;
  status?: string;
}

export class DashboardService {
  /**
   * Helper to check if a date falls within the selected date range filter
   */
  private static matchesDateRange(date: Date | undefined, range?: string): boolean {
    if (!range || range === "all" || !date) return true;

    const target = new Date(date).getTime();
    const now = new Date();

    if (range === "today") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
      return target >= startOfDay && target <= endOfDay;
    }

    if (range === "this_week") {
      const dayOfWeek = now.getDay() || 7; // Sunday is 7
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1).getTime();
      const sunday = monday + 7 * 24 * 60 * 60 * 1000;
      return target >= monday && target <= sunday;
    }

    if (range === "this_month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime();
      return target >= startOfMonth && target <= endOfMonth;
    }

    if (range === "this_quarter") {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1).getTime();
      const endOfQuarter = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0, 23, 59, 59).getTime();
      return target >= startOfQuarter && target <= endOfQuarter;
    }

    return true;
  }

  /**
   * Applies role permissions and filters to project queries
   */
  private static filterProjects(filters: DashboardFilters, user: TokenPayload): ProjectRecord[] {
    let projects = dbStore.projects;

    // Role-based scoping: Team Lead & Employee strictly restricted to their assigned department
    if (user.role === "EMPLOYEE" || user.role === "TEAM_LEAD") {
      if (user.departmentId) {
        if (filters.departmentId && filters.departmentId !== "all" && filters.departmentId !== user.departmentId) {
          // Attempting to query another department yields 0 projects
          return [];
        }
        projects = projects.filter((p) => p.departmentId === user.departmentId || p.creatorId === user.userId);
      }
    }

    // Explicit department filter
    if (filters.departmentId && filters.departmentId !== "all") {
      projects = projects.filter((p) => p.departmentId === filters.departmentId);
    }

    // Explicit project filter
    if (filters.projectId && filters.projectId !== "all") {
      projects = projects.filter((p) => p.id === filters.projectId);
    }

    // Date range filter against targetDate or createdAt
    if (filters.dateRange && filters.dateRange !== "all") {
      projects = projects.filter(
        (p) => this.matchesDateRange(p.targetDate, filters.dateRange) || this.matchesDateRange(p.createdAt, filters.dateRange)
      );
    }

    return projects;
  }

  /**
   * Applies role permissions and filters to task queries
   */
  private static filterTasks(filters: DashboardFilters, user: TokenPayload, scopedProjectIds?: string[]): TaskRecord[] {
    let tasks = dbStore.tasks;

    const allowedProjectIds = scopedProjectIds || this.filterProjects(filters, user).map((p) => p.id);
    tasks = tasks.filter((t) => allowedProjectIds.includes(t.projectId));

    // Explicit Project filter
    if (filters.projectId && filters.projectId !== "all") {
      tasks = tasks.filter((t) => t.projectId === filters.projectId);
    }

    // Explicit Assignee filter
    if (filters.assigneeId && filters.assigneeId !== "all") {
      tasks = tasks.filter((t) => t.assigneeId === filters.assigneeId);
    }

    // Explicit Status filter
    if (filters.status && filters.status !== "all") {
      tasks = tasks.filter((t) => t.status === filters.status);
    }

    // Date range filter against dueDate or createdAt
    if (filters.dateRange && filters.dateRange !== "all") {
      tasks = tasks.filter(
        (t) => this.matchesDateRange(t.dueDate, filters.dateRange) || this.matchesDateRange(t.createdAt, filters.dateRange)
      );
    }

    return tasks;
  }

  /**
   * Component 1: Summary Cards
   */
  public static getSummaryMetrics(filters: DashboardFilters, user: TokenPayload) {
    const projects = this.filterProjects(filters, user);
    const projectIds = projects.map((p) => p.id);
    const tasks = this.filterTasks(filters, user, projectIds);

    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

    // Total projects
    const totalProjects = projects.length;

    // Active projects (ACTIVE or IN_PROGRESS)
    const activeProjects = projects.filter(
      (p) => p.status === "ACTIVE" || p.status === "IN_PROGRESS"
    ).length;

    // Completed projects
    const completedProjects = projects.filter((p) => p.status === "COMPLETED").length;

    // Total open tasks (Not COMPLETED or CANCELLED)
    const totalOpenTasks = tasks.filter(
      (t) => t.status !== "COMPLETED" && t.status !== "CANCELLED"
    ).length;

    // Overdue tasks (dueDate < now and open)
    const overdueTasks = tasks.filter((t) => {
      if (t.status === "COMPLETED" || t.status === "CANCELLED" || !t.dueDate) return false;
      return new Date(t.dueDate).getTime() < now;
    }).length;

    // Tasks due within 7 days (dueDate >= now and <= now + 7 days and open)
    const tasksDueWithin7Days = tasks.filter((t) => {
      if (t.status === "COMPLETED" || t.status === "CANCELLED" || !t.dueDate) return false;
      const dueTime = new Date(t.dueDate).getTime();
      return dueTime >= now && dueTime <= now + SEVEN_DAYS;
    }).length;

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      totalOpenTasks,
      overdueTasks,
      tasksDueWithin7Days,
    };
  }

  /**
   * Component 2: Recent Projects
   */
  public static getRecentProjects(filters: DashboardFilters, user: TokenPayload, limit = 5, page = 1) {
    const projects = this.filterProjects(filters, user);
    const sorted = [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const startIndex = (page - 1) * limit;
    const paginated = sorted.slice(startIndex, startIndex + limit);

    const enriched = paginated.map((p) => {
      const projectTasks = dbStore.tasks.filter((t) => t.projectId === p.id);
      const totalTasks = projectTasks.length;
      const completedTasks = projectTasks.filter((t) => t.status === "COMPLETED").length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      const creator = dbStore.findUserById(p.creatorId);
      const creatorProfile = creator ? dbStore.getProfileByUserId(creator.id) : undefined;
      const department = dbStore.getDepartmentById(p.departmentId);

      return {
        id: p.id,
        key: p.key,
        title: p.title,
        description: p.description,
        status: p.status,
        startDate: p.startDate,
        targetDate: p.targetDate,
        totalTasks,
        completedTasks,
        progress,
        lead: creatorProfile ? `${creatorProfile.firstName} ${creatorProfile.lastName}` : "Livexpert",
        department: department ? department.name : "Unassigned",
      };
    });

    return {
      projects: enriched,
      total: sorted.length,
      page,
      limit,
    };
  }

  /**
   * Component 3: Upcoming Deadlines (Projects & Tasks within next 14 days)
   */
  public static getUpcomingDeadlines(filters: DashboardFilters, user: TokenPayload, limit = 8) {
    const now = Date.now();
    const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

    const projects = this.filterProjects(filters, user);
    const tasks = this.filterTasks(filters, user, projects.map((p) => p.id));

    const deadlines: any[] = [];

    // Project target dates
    projects.forEach((p) => {
      if (p.status !== "COMPLETED" && p.targetDate) {
        const time = new Date(p.targetDate).getTime();
        if (time >= now && time <= now + FOURTEEN_DAYS) {
          const daysLeft = Math.ceil((time - now) / (24 * 60 * 60 * 1000));
          deadlines.push({
            id: p.id,
            type: "PROJECT",
            title: p.title,
            key: p.key,
            dueDate: p.targetDate,
            daysLeft,
            priority: "HIGH",
            status: p.status,
          });
        }
      }
    });

    // Task due dates
    tasks.forEach((t) => {
      if (t.status !== "COMPLETED" && t.status !== "CANCELLED" && t.dueDate) {
        const time = new Date(t.dueDate).getTime();
        if (time >= now && time <= now + FOURTEEN_DAYS) {
          const daysLeft = Math.ceil((time - now) / (24 * 60 * 60 * 1000));
          const project = dbStore.getProjectById(t.projectId);
          deadlines.push({
            id: t.id,
            type: "TASK",
            title: t.title,
            key: project ? project.key : "TASK",
            projectName: project ? project.title : "Project",
            dueDate: t.dueDate,
            daysLeft,
            priority: t.priority,
            status: t.status,
          });
        }
      }
    });

    deadlines.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return deadlines.slice(0, limit);
  }

  /**
   * Component 4: My Assigned Tasks
   */
  public static getMyAssignedTasks(userId: string, filters: DashboardFilters) {
    let myTasks = dbStore.tasks.filter((t) => t.assigneeId === userId);

    if (filters.status && filters.status !== "all") {
      myTasks = myTasks.filter((t) => t.status === filters.status);
    }
    if (filters.projectId && filters.projectId !== "all") {
      myTasks = myTasks.filter((t) => t.projectId === filters.projectId);
    }

    // Sort: open first, then by priority / due date
    myTasks.sort((a, b) => {
      if (a.status === "COMPLETED" && b.status !== "COMPLETED") return 1;
      if (a.status !== "COMPLETED" && b.status === "COMPLETED") return -1;
      const timeA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const timeB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return timeA - timeB;
    });

    return myTasks.map((t) => {
      const project = dbStore.getProjectById(t.projectId);
      return {
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        projectId: t.projectId,
        projectName: project ? project.title : "Unknown Project",
        projectKey: project ? project.key : "PRJ",
      };
    });
  }

  /**
   * Component 5: Tasks Awaiting Review
   */
  public static getTasksAwaitingReview(filters: DashboardFilters, user: TokenPayload) {
    const tasks = this.filterTasks(filters, user).filter(
      (t) =>
        (t.status === "IN_REVIEW" || t.status === "UNDER_REVIEW") &&
        (user.role === "ADMINISTRATOR" || user.role === "PROJECT_MANAGER" || t.reviewerId === user.userId)
    );

    return tasks.map((t) => {
      const project = dbStore.getProjectById(t.projectId);
      const assignee = t.assigneeId ? dbStore.findUserById(t.assigneeId) : undefined;
      const profile = assignee ? dbStore.getProfileByUserId(assignee.id) : undefined;

      return {
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        projectName: project ? project.title : "Project",
        projectKey: project ? project.key : "PRJ",
        assigneeName: profile ? `${profile.firstName} ${profile.lastName}` : "Unassigned",
      };
    });
  }

  /**
   * Component 6: Overdue Tasks Requiring Attention
   */
  public static getOverdueTasks(filters: DashboardFilters, user: TokenPayload) {
    const now = Date.now();
    const tasks = this.filterTasks(filters, user).filter((t) => {
      if (t.status === "COMPLETED" || t.status === "CANCELLED" || !t.dueDate) return false;
      return new Date(t.dueDate).getTime() < now;
    });

    // Sort by most overdue first
    tasks.sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

    return tasks.map((t) => {
      const project = dbStore.getProjectById(t.projectId);
      const assignee = t.assigneeId ? dbStore.findUserById(t.assigneeId) : undefined;
      const profile = assignee ? dbStore.getProfileByUserId(assignee.id) : undefined;
      const daysOverdue = Math.max(1, Math.floor((now - new Date(t.dueDate!).getTime()) / (24 * 60 * 60 * 1000)));

      return {
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        daysOverdue,
        projectName: project ? project.title : "Project",
        projectKey: project ? project.key : "PRJ",
        assigneeName: profile ? `${profile.firstName} ${profile.lastName}` : "Unassigned",
      };
    });
  }

  /**
   * Component 7: Task Status Distribution Chart
   */
  public static getTaskStatusDistribution(filters: DashboardFilters, user: TokenPayload) {
    const tasks = this.filterTasks(filters, user);
    const total = tasks.length;

    const statuses: TaskStatus[] = [
      "OPEN",
      "ASSIGNED",
      "IN_PROGRESS",
      "UNDER_REVIEW",
      "CHANGES_REQUIRED",
      "COMPLETED",
      "BLOCKED",
      "BACKLOG",
      "TODO",
      "IN_REVIEW",
      "CANCELLED",
    ];

    const distribution = statuses.map((status) => {
      const count = tasks.filter((t) => t.status === status).length;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        status,
        label: status.replace("_", " "),
        count,
        percentage,
      };
    });

    return {
      total,
      distribution,
    };
  }

  /**
   * Component 8: Workload by Employee
   */
  public static getEmployeeWorkload(filters: DashboardFilters, user: TokenPayload) {
    let activeUsers = dbStore.users.filter((u) => u.isActive);
    if (user.role === "EMPLOYEE" || user.role === "TEAM_LEAD") {
      if (user.departmentId) {
        activeUsers = activeUsers.filter((u) => u.departmentId === user.departmentId);
      }
    }
    const allFilteredTasks = this.filterTasks(filters, user);

    const workload = activeUsers.map((u) => {
      const profile = dbStore.getProfileByUserId(u.id);
      const department = dbStore.getDepartmentById(u.departmentId);
      const userTasks = allFilteredTasks.filter((t) => t.assigneeId === u.id);

      const totalTasks = userTasks.length;
      const openTasks = userTasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED").length;
      const completedTasks = userTasks.filter((t) => t.status === "COMPLETED").length;
      const overdueTasks = userTasks.filter((t) => {
        if (t.status === "COMPLETED" || t.status === "CANCELLED" || !t.dueDate) return false;
        return new Date(t.dueDate).getTime() < Date.now();
      }).length;

      return {
        userId: u.id,
        email: u.email,
        name: profile ? `${profile.firstName} ${profile.lastName}` : u.email,
        role: u.role,
        department: department ? department.name : "Unassigned",
        totalTasks,
        openTasks,
        completedTasks,
        overdueTasks,
      };
    });

    workload.sort((a, b) => b.openTasks - a.openTasks);
    return workload;
  }

  /**
   * Provides available filter options for dropdown selectors
   */
  public static getFilterOptions(user: TokenPayload) {
    let projects = dbStore.projects;
    let departments = dbStore.departments;
    let activeUsers = dbStore.users.filter((u) => u.isActive);

    if (user.role === "EMPLOYEE" || user.role === "TEAM_LEAD") {
      if (user.departmentId) {
        projects = projects.filter((p) => p.departmentId === user.departmentId || p.creatorId === user.userId);
        departments = departments.filter((d) => d.id === user.departmentId);
        activeUsers = activeUsers.filter((u) => u.departmentId === user.departmentId);
      }
    }

    const employees = activeUsers.map((u) => {
      const p = dbStore.getProfileByUserId(u.id);
      return {
        id: u.id,
        name: p ? `${p.firstName} ${p.lastName}` : u.email,
        email: u.email,
      };
    });

    return {
      departments: departments.map((d) => ({ id: d.id, name: d.name, code: d.code })),
      projects: projects.map((p) => ({ id: p.id, key: p.key, title: p.title })),
      employees,
      statuses: ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "COMPLETED", "CANCELLED"],
    };
  }

  /**
   * Quick status updater for interactive task management
   */
  public static async updateTaskStatus(taskId: string, newStatus: TaskStatus, user: TokenPayload) {
    return TaskService.updateTask(taskId, { status: newStatus }, user);
  }
}
