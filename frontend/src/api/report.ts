import { API_BASE_URL } from "./client";

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

export interface ProjectStatusItem {
  id: string;
  key: string;
  title: string;
  status: string;
  priority: string;
  department: string;
  owner: string;
  targetDate?: string;
  totalMilestones: number;
  reachedMilestones: number;
  progressPercentage: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
}

export interface ProjectStatusReport {
  statusDistribution: Record<string, number>;
  averageProgress: number;
  totalProjects: number;
  projects: ProjectStatusItem[];
}

export interface TaskStatusBreakdownItem {
  status: string;
  count: number;
  percentage: number;
}

export interface TasksByStatusReport {
  total: number;
  breakdown: TaskStatusBreakdownItem[];
}

export interface OverdueOwnerTask {
  id: string;
  title: string;
  projectKey: string;
  dueDate: string;
  daysOverdue: number;
  priority: string;
}

export interface OverdueOwnerItem {
  userId: string;
  name: string;
  email: string;
  department: string;
  avatarUrl?: string;
  count: number;
  tasks: OverdueOwnerTask[];
}

export interface OverdueByOwnerReport {
  totalOverdue: number;
  owners: OverdueOwnerItem[];
}

export interface UpcomingDeadlineTask {
  id: string;
  title: string;
  projectKey: string;
  projectName: string;
  dueDate: string;
  priority: string;
  status: string;
  daysRemaining: number;
  assignee: {
    id: string;
    name: string;
    avatarUrl?: string;
  } | null;
}

export interface UpcomingDeadlinesReport {
  totalUpcoming: number;
  tasks: UpcomingDeadlineTask[];
}

export interface MilestoneCompletionReport {
  summary: {
    total: number;
    reached: number;
    pending: number;
    overdue: number;
    completionRate: number;
  };
  projects: Array<{
    projectId: string;
    projectKey: string;
    projectTitle: string;
    status: string;
    totalMilestones: number;
    reachedMilestones: number;
    progressPercentage: number;
  }>;
}

export interface EmployeeWorkloadItem {
  userId: string;
  name: string;
  email: string;
  role: string;
  department: string;
  jobTitle: string;
  avatarUrl?: string;
  totalAssignedTasks: number;
  openTasksCount: number;
  completedTasksCount: number;
  overdueTasksCount: number;
  totalEstimatedHours: number;
}

export interface EmployeeWorkloadReport {
  totalEmployees: number;
  employees: EmployeeWorkloadItem[];
}

export interface DepartmentWorkloadItem {
  id: string;
  name: string;
  code: string;
  memberCount: number;
  activeProjects: number;
  totalProjects: number;
  totalTasks: number;
  openTasksCount: number;
  completedTasksCount: number;
  overdueTasksCount: number;
  totalEstimatedHours: number;
}

export interface DepartmentWorkloadReport {
  departments: DepartmentWorkloadItem[];
}

function buildQueryString(filters?: ReportFilters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.dateRange && filters.dateRange !== "all") params.set("dateRange", filters.dateRange);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.departmentId && filters.departmentId !== "all") params.set("departmentId", filters.departmentId);
  if (filters.projectId && filters.projectId !== "all") params.set("projectId", filters.projectId);
  const str = params.toString();
  return str ? `?${str}` : "";
}

export const reportApi = {
  async getKPIs(token: string, filters?: ReportFilters): Promise<ManagementKPIs> {
    const qs = buildQueryString(filters);
    const res = await fetch(`${API_BASE_URL}/reports/kpis${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load management KPIs");
    const data = await res.json();
    return data.data;
  },

  async getProjectStatus(token: string, filters?: ReportFilters): Promise<ProjectStatusReport> {
    const qs = buildQueryString(filters);
    const res = await fetch(`${API_BASE_URL}/reports/project-status${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load project status report");
    const data = await res.json();
    return data.data;
  },

  async getTasksByStatus(token: string, filters?: ReportFilters): Promise<TasksByStatusReport> {
    const qs = buildQueryString(filters);
    const res = await fetch(`${API_BASE_URL}/reports/tasks-by-status${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load tasks by status report");
    const data = await res.json();
    return data.data;
  },

  async getOverdueByOwner(token: string, filters?: ReportFilters): Promise<OverdueByOwnerReport> {
    const qs = buildQueryString(filters);
    const res = await fetch(`${API_BASE_URL}/reports/overdue-by-owner${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load overdue by owner report");
    const data = await res.json();
    return data.data;
  },

  async getUpcomingDeadlines(token: string, filters?: ReportFilters): Promise<UpcomingDeadlinesReport> {
    const qs = buildQueryString(filters);
    const res = await fetch(`${API_BASE_URL}/reports/upcoming-deadlines${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load upcoming deadlines report");
    const data = await res.json();
    return data.data;
  },

  async getMilestoneCompletion(token: string, filters?: ReportFilters): Promise<MilestoneCompletionReport> {
    const qs = buildQueryString(filters);
    const res = await fetch(`${API_BASE_URL}/reports/milestone-completion${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load milestone completion report");
    const data = await res.json();
    return data.data;
  },

  async getEmployeeWorkload(token: string, filters?: ReportFilters): Promise<EmployeeWorkloadReport> {
    const qs = buildQueryString(filters);
    const res = await fetch(`${API_BASE_URL}/reports/workload-employee${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load employee workload report");
    const data = await res.json();
    return data.data;
  },

  async getDepartmentWorkload(token: string, filters?: ReportFilters): Promise<DepartmentWorkloadReport> {
    const qs = buildQueryString(filters);
    const res = await fetch(`${API_BASE_URL}/reports/workload-department${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to load department workload report");
    const data = await res.json();
    return data.data;
  },

  async downloadCSV(
    type: "tasks" | "projects" | "kpis",
    token: string,
    filters?: ReportFilters
  ): Promise<void> {
    const qs = buildQueryString(filters);
    const res = await fetch(`${API_BASE_URL}/reports/export/${type}${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Unauthorized: CSV export restricted");
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kibo360-${type}-report-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
};
