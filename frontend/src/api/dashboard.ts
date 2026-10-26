import { API_BASE_URL } from "./client";

export interface DashboardFilters {
  dateRange?: string;
  departmentId?: string;
  projectId?: string;
  assigneeId?: string;
  status?: string;
}

export interface DashboardSummary {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalOpenTasks: number;
  overdueTasks: number;
  tasksDueWithin7Days: number;
}

export interface RecentProject {
  id: string;
  key: string;
  title: string;
  description?: string;
  status: string;
  startDate?: string;
  targetDate?: string;
  totalTasks: number;
  completedTasks: number;
  progress: number;
  lead: string;
  department: string;
}

export interface UpcomingDeadline {
  id: string;
  type: "PROJECT" | "TASK";
  title: string;
  key: string;
  projectName?: string;
  dueDate: string;
  daysLeft: number;
  priority: string;
  status: string;
}

export interface AssignedTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  projectId: string;
  projectName: string;
  projectKey: string;
}

export interface ReviewTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  projectName: string;
  projectKey: string;
  assigneeName: string;
}

export interface OverdueTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
  daysOverdue: number;
  projectName: string;
  projectKey: string;
  assigneeName: string;
}

export interface StatusDistributionItem {
  status: string;
  label: string;
  count: number;
  percentage: number;
}

export interface EmployeeWorkloadItem {
  userId: string;
  email: string;
  name: string;
  role: string;
  department: string;
  totalTasks: number;
  openTasks: number;
  completedTasks: number;
  overdueTasks: number;
}

export interface FilterOptions {
  departments: { id: string; name: string; code: string }[];
  projects: { id: string; key: string; title: string }[];
  employees: { id: string; name: string; email: string }[];
  statuses: string[];
}

export interface DashboardOverviewResponse {
  summary: DashboardSummary;
  recentProjects: {
    projects: RecentProject[];
    total: number;
    page: number;
    limit: number;
  };
  upcomingDeadlines: UpcomingDeadline[];
  myTasks: AssignedTask[];
  awaitingReview: ReviewTask[];
  overdueTasks: OverdueTask[];
  statusStats: {
    total: number;
    distribution: StatusDistributionItem[];
  };
  workload: EmployeeWorkloadItem[];
  filterOptions: FilterOptions;
}

export async function fetchDashboardOverview(
  filters: DashboardFilters,
  token: string | null
): Promise<DashboardOverviewResponse> {
  const params = new URLSearchParams();
  if (filters.dateRange && filters.dateRange !== "all") params.append("dateRange", filters.dateRange);
  if (filters.departmentId && filters.departmentId !== "all") params.append("departmentId", filters.departmentId);
  if (filters.projectId && filters.projectId !== "all") params.append("projectId", filters.projectId);
  if (filters.assigneeId && filters.assigneeId !== "all") params.append("assigneeId", filters.assigneeId);
  if (filters.status && filters.status !== "all") params.append("status", filters.status);

  const url = `${API_BASE_URL}/dashboard/overview${params.toString() ? `?${params.toString()}` : ""}`;

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to load dashboard data");
  }

  return data.data;
}

export async function updateTaskStatus(
  taskId: string,
  newStatus: string,
  token: string | null
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/dashboard/tasks/${taskId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ status: newStatus }),
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data?.error?.message || "Failed to update task status");
  }
}