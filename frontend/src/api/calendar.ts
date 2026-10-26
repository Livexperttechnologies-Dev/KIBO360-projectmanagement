import { API_BASE_URL } from "./client";

export type DeadlineClassification =
  | "OVERDUE"
  | "APPROACHING"
  | "UPCOMING"
  | "ON_TRACK"
  | "COMPLETED";

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
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
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

export const calendarApi = {
  /**
   * Fetch calendar events with filtering
   */
  async getEvents(
    filters: CalendarFilters,
    token: string
  ): Promise<{ events: CalendarEvent[]; summary: CalendarSummary }> {
    const params = new URLSearchParams();

    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
    if (filters.projectId && filters.projectId !== "all") params.set("projectId", filters.projectId);
    if (filters.userId && filters.userId !== "all") params.set("userId", filters.userId);
    if (filters.assigneeId && filters.assigneeId !== "all") params.set("assigneeId", filters.assigneeId);
    if (filters.departmentId && filters.departmentId !== "all") params.set("departmentId", filters.departmentId);
    if (filters.status && filters.status !== "all") params.set("status", filters.status);
    if (filters.type && filters.type !== "ALL") params.set("type", filters.type);
    if (filters.deadlineStatus && filters.deadlineStatus !== "ALL") params.set("deadlineStatus", filters.deadlineStatus);

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const response = await fetch(`${API_BASE_URL}/calendar/events${queryString}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || "Failed to load calendar events");
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Fetch calendar deadline summary
   */
  async getSummary(filters: CalendarFilters, token: string): Promise<CalendarSummary> {
    const params = new URLSearchParams();
    if (filters.projectId && filters.projectId !== "all") params.set("projectId", filters.projectId);
    if (filters.departmentId && filters.departmentId !== "all") params.set("departmentId", filters.departmentId);

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const response = await fetch(`${API_BASE_URL}/calendar/summary${queryString}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load calendar summary");
    }

    const data = await response.json();
    return data.data.summary;
  },
};
