import { API_BASE_URL } from "./client";

export type NotificationType =
  | "NEW_TASK_ASSIGNMENT"
  | "TASK_REASSIGNMENT"
  | "UPCOMING_DEADLINE"
  | "OVERDUE_TASK"
  | "BLOCKED_TASK"
  | "REVIEW_REQUESTED"
  | "CHANGES_REQUESTED"
  | "TASK_APPROVED"
  | "TASK_COMPLETED"
  | "MILESTONE_APPROACHING";

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: "TASK" | "MILESTONE" | "PROJECT";
  entityId?: string;
  projectId?: string;
  isRead: boolean;
  dedupKey?: string;
  readAt?: string;
  createdAt: string;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  notifyOnAssignment: boolean;
  notifyOnDeadlineApproaching: boolean;
  notifyOnOverdue: boolean;
  notifyOnBlockedWork: boolean;
  notifyOnReviewRequested: boolean;
  notifyOnChangesRequested: boolean;
  notifyOnMilestoneApproaching: boolean;
  updatedAt: string;
}

export interface BackgroundJobItem {
  id: string;
  jobName: string;
  payload?: any;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  unreadCount: number;
  total: number;
}

export const notificationApi = {
  /**
   * List notifications with optional filters
   */
  async getNotifications(
    token: string,
    filters?: { isRead?: boolean; type?: NotificationType; entityType?: string }
  ): Promise<NotificationListResponse> {
    const params = new URLSearchParams();
    if (filters?.isRead !== undefined) params.set("isRead", String(filters.isRead));
    if (filters?.type) params.set("type", filters.type);
    if (filters?.entityType) params.set("entityType", filters.entityType);

    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE_URL}/notifications${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error("Failed to load notifications");
    }
    const data = await res.json();
    return data.data;
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(token: string): Promise<number> {
    const res = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.data.unreadCount || 0;
  },

  /**
   * Mark individual notification as read
   */
  async markAsRead(id: string, token: string): Promise<NotificationItem> {
    const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error("Failed to mark notification as read");
    }
    const data = await res.json();
    return data.data;
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(token: string): Promise<number> {
    const res = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error("Failed to mark all notifications as read");
    }
    const data = await res.json();
    return data.data.updatedCount;
  },

  /**
   * Delete a notification
   */
  async deleteNotification(id: string, token: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/notifications/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error("Failed to delete notification");
    }
  },

  /**
   * Get notification preferences
   */
  async getPreferences(token: string): Promise<NotificationPreferences> {
    const res = await fetch(`${API_BASE_URL}/notifications/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error("Failed to fetch notification preferences");
    }
    const data = await res.json();
    return data.data;
  },

  /**
   * Update notification preferences
   */
  async updatePreferences(
    updates: Partial<NotificationPreferences>,
    token: string
  ): Promise<NotificationPreferences> {
    const res = await fetch(`${API_BASE_URL}/notifications/preferences`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      throw new Error("Failed to update notification preferences");
    }
    const data = await res.json();
    return data.data;
  },

  /**
   * Diagnostic: list background queue jobs
   */
  async getBackgroundJobs(token: string, limit = 50): Promise<BackgroundJobItem[]> {
    const res = await fetch(`${API_BASE_URL}/notifications/jobs?limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error("Failed to fetch background jobs");
    }
    const data = await res.json();
    return data.data;
  },

  /**
   * Diagnostic: retry a background job
   */
  async retryBackgroundJob(id: string, token: string): Promise<BackgroundJobItem> {
    const res = await fetch(`${API_BASE_URL}/notifications/jobs/${id}/retry`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error("Failed to retry background job");
    }
    const data = await res.json();
    return data.data;
  },

  /**
   * Run background scan cycle on demand
   */
  async runWorkerCycle(token: string): Promise<{ upcoming: number; overdue: number; milestones: number }> {
    const res = await fetch(`${API_BASE_URL}/notifications/jobs/run-worker`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error("Failed to run worker cycle");
    }
    const data = await res.json();
    return data.data;
  },
};
