import { API_BASE_URL } from "./client";

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status:
    | "OPEN"
    | "ASSIGNED"
    | "IN_PROGRESS"
    | "UNDER_REVIEW"
    | "CHANGES_REQUIRED"
    | "COMPLETED"
    | "BLOCKED"
    | "TODO"
    | "BACKLOG"
    | "IN_REVIEW"
    | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  taskList: string;
  startDate?: string;
  dueDate?: string;
  estimatedEffort?: number;
  completionPercentage: number;
  projectId: string;
  creatorId: string;
  assigneeId?: string;
  reviewerId?: string;
  parentTaskId?: string;
  createdAt: string;
  updatedAt: string;
  isBlocked: boolean;
  project: {
    id: string;
    title: string;
    key: string;
  } | null;
  assignee: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
    jobTitle?: string;
  } | null;
  reviewer: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
  } | null;
  subtasksCount: number;
  completedSubtasksCount: number;
  commentsCount: number;
  attachmentsCount: number;
  dependenciesCount: number;
}

export interface TaskSubtask {
  id: string;
  title: string;
  status: string;
  priority: string;
  completionPercentage: number;
  dueDate?: string;
  assignee: {
    id: string;
    name: string;
    avatarUrl?: string;
  } | null;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
    jobTitle?: string;
  } | null;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  uploaderId: string;
  filename: string;
  filesize: number;
  mimetype: string;
  fileUrl: string;
  accessScope: string;
  createdAt: string;
  uploader: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
  } | null;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  createdAt: string;
  prerequisiteTask?: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate?: string;
  } | null;
}

export interface TaskDetail extends TaskItem {
  parentTask?: {
    id: string;
    title: string;
    status: string;
    dueDate?: string;
  } | null;
  creator: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
  } | null;
  subtasks: TaskSubtask[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  dependencies: TaskDependency[];
  dependentOn: Array<{
    id: string;
    taskId: string;
    dependsOnTaskId: string;
    dependentTask?: {
      id: string;
      title: string;
      status: string;
      priority: string;
      dueDate?: string;
    } | null;
  }>;
}

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

export interface TasksResponse {
  tasks: TaskItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export async function fetchTasks(
  filters: TaskFilters,
  token: string | null
): Promise<TasksResponse> {
  const params = new URLSearchParams();
  if (filters.projectId && filters.projectId !== "all") params.append("projectId", filters.projectId);
  if (filters.assigneeId && filters.assigneeId !== "all") params.append("assigneeId", filters.assigneeId);
  if (filters.reviewerId && filters.reviewerId !== "all") params.append("reviewerId", filters.reviewerId);
  if (filters.priority && filters.priority !== "all") params.append("priority", filters.priority);
  if (filters.status && filters.status !== "all") params.append("status", filters.status);
  if (filters.taskList && filters.taskList !== "all") params.append("taskList", filters.taskList);
  if (filters.search) params.append("search", filters.search);
  if (filters.parentTaskId) params.append("parentTaskId", filters.parentTaskId);
  if (filters.isSubtask !== undefined) params.append("isSubtask", filters.isSubtask);
  if (filters.page) params.append("page", String(filters.page));
  if (filters.limit) params.append("limit", String(filters.limit));

  const url = `${API_BASE_URL}/tasks${params.toString() ? `?${params.toString()}` : ""}`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to load tasks");
  }

  return data.data;
}

export async function fetchTaskById(id: string, token: string | null): Promise<TaskDetail> {
  const res = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to load task details");
  }

  return data.data.task;
}

export async function createTask(taskData: any, token: string | null): Promise<TaskItem> {
  const res = await fetch(`${API_BASE_URL}/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify(taskData),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to create task");
  }

  return data.data.task;
}

export async function updateTask(id: string, updates: any, token: string | null): Promise<TaskItem> {
  const res = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify(updates),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to update task");
  }

  return data.data.task;
}

export async function deleteTask(id: string, token: string | null): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to delete task");
  }

  return true;
}

export async function createSubtask(
  parentTaskId: string,
  subtaskData: any,
  token: string | null
): Promise<TaskItem> {
  const res = await fetch(`${API_BASE_URL}/tasks/${parentTaskId}/subtasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify(subtaskData),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to create subtask");
  }

  return data.data.subtask;
}

export async function addTaskComment(
  taskId: string,
  content: string,
  token: string | null
): Promise<TaskComment> {
  const res = await fetch(`${API_BASE_URL}/tasks/${taskId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify({ content }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to post comment");
  }

  return data.data.comment;
}

export async function deleteTaskComment(
  taskId: string,
  commentId: string,
  token: string | null
): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/tasks/${taskId}/comments/${commentId}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to delete comment");
  }

  return true;
}

export async function addTaskAttachment(
  taskId: string,
  file: File,
  accessScope: string,
  token: string | null
): Promise<TaskAttachment> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("accessScope", accessScope);
  const res = await fetch(`${API_BASE_URL}/tasks/${taskId}/attachments`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to upload attachment");
  }

  return data.data.attachment;
}

export async function downloadTaskAttachment(taskId: string, attachmentId: string, token: string | null): Promise<Blob> {
  const res = await fetch(`${API_BASE_URL}/tasks/${taskId}/attachments/${attachmentId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error?.message || "Failed to download attachment");
  }
  return res.blob();
}

export async function deleteTaskAttachment(
  taskId: string,
  attachmentId: string,
  token: string | null
): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/tasks/${taskId}/attachments/${attachmentId}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to delete attachment");
  }

  return true;
}

export async function addTaskDependency(
  taskId: string,
  dependsOnTaskId: string,
  token: string | null
): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/tasks/${taskId}/dependencies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify({ dependsOnTaskId }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to add dependency");
  }

  return data.data.dependency;
}

export async function removeTaskDependency(
  taskId: string,
  depId: string,
  token: string | null
): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/tasks/${taskId}/dependencies/${depId}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to remove dependency");
  }

  return true;
}
