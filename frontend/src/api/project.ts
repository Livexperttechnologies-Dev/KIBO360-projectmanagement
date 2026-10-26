import { API_BASE_URL } from "./client";

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: "LEAD" | "CONTRIBUTOR" | "VIEWER";
  joinedAt: string;
  user: {
    id: string;
    email: string;
    role: string;
    name: string;
    jobTitle?: string;
    avatarUrl?: string;
  } | null;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  dueDate: string;
  status: "PENDING" | "REACHED" | "OVERDUE";
  reachedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  key: string;
  description?: string;
  status: "PLANNING" | "ACTIVE" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  startDate?: string;
  targetDate?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  department: { id: string; name: string; code: string } | null;
  owner: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
    jobTitle?: string;
  } | null;
  memberCount: number;
  members: ProjectMember[];
  milestonesCount: number;
  reachedMilestones: number;
  tasksCount: number;
  completedTasks: number;
  progress: number;
  daysLeft: number | null;
  isOverdue: boolean;
  canEdit: boolean;
}

export interface ProjectDetail extends ProjectItem {
  milestones: Milestone[];
  tasksSummary: {
    total: number;
    completed: number;
    open: number;
  };
}

export interface ProjectFilters {
  search?: string;
  departmentId?: string;
  status?: string;
  priority?: string;
  ownerId?: string;
}

export async function fetchProjects(
  filters: ProjectFilters,
  token: string | null
): Promise<ProjectItem[]> {
  const params = new URLSearchParams();
  if (filters.search) params.append("search", filters.search);
  if (filters.departmentId && filters.departmentId !== "all") params.append("departmentId", filters.departmentId);
  if (filters.status && filters.status !== "all") params.append("status", filters.status);
  if (filters.priority && filters.priority !== "all") params.append("priority", filters.priority);
  if (filters.ownerId && filters.ownerId !== "all") params.append("ownerId", filters.ownerId);

  const url = `${API_BASE_URL}/projects${params.toString() ? `?${params.toString()}` : ""}`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to load projects");
  }
  return data.data.projects;
}

export async function fetchProjectById(
  id: string,
  token: string | null
): Promise<ProjectDetail> {
  const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to load project details");
  }
  return data.data.project;
}

export async function createProject(
  payload: any,
  token: string | null
): Promise<ProjectDetail> {
  const res = await fetch(`${API_BASE_URL}/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.details?.[0]?.message || data?.error?.message || "Failed to create project";
    throw new Error(errorMsg);
  }
  return data.data.project;
}

export async function updateProject(
  id: string,
  payload: any,
  token: string | null
): Promise<ProjectDetail> {
  const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data?.error?.details?.[0]?.message || data?.error?.message || "Failed to update project";
    throw new Error(errorMsg);
  }
  return data.data.project;
}

export async function archiveProject(
  id: string,
  token: string | null
): Promise<ProjectDetail> {
  const res = await fetch(`${API_BASE_URL}/projects/${id}/archive`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to archive project");
  }
  return data.data.project;
}

export async function addProjectMember(
  projectId: string,
  payload: { userId: string; role?: string },
  token: string | null
): Promise<ProjectMember[]> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/members`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to add project member");
  }
  return data.data.members;
}

export async function removeProjectMember(
  projectId: string,
  userId: string,
  token: string | null
): Promise<ProjectMember[]> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/members/${userId}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to remove project member");
  }
  return data.data.members;
}

export async function createMilestone(
  projectId: string,
  payload: { title: string; description?: string; dueDate: string },
  token: string | null
): Promise<Milestone> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/milestones`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to create milestone");
  }
  return data.data.milestone;
}

export async function updateMilestone(
  projectId: string,
  milestoneId: string,
  payload: any,
  token: string | null
): Promise<Milestone> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/milestones/${milestoneId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to update milestone");
  }
  return data.data.milestone;
}

export async function deleteMilestone(
  projectId: string,
  milestoneId: string,
  token: string | null
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/milestones/${milestoneId}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data?.error?.message || "Failed to delete milestone");
  }
}
