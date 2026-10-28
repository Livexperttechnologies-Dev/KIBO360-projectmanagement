import { Request, Response } from "express";
import { notificationService } from "../services/notification.service";
import { jobQueueService } from "../services/job-queue.service";
import { schedulerService } from "../services/scheduler.service";
import { NotificationType, Role } from "../lib/db";
import { persistStore } from "../lib/persistence";
import { isDesignatedSuperAdmin } from "../lib/superAdmin";

const canManageAllNotifications = (user: { userId: string; role: Role }): boolean =>
  user.role === "MANAGER" || isDesignatedSuperAdmin(user.userId, user.role);

export class NotificationController {
  /**
   * GET /api/v1/notifications
   * List notifications for the authenticated user with optional filtering
   */
  public static async listNotifications(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const isReadParam = req.query.isRead;
      const typeParam = req.query.type as NotificationType | undefined;
      const entityTypeParam = req.query.entityType as string | undefined;

      const filters: { isRead?: boolean; type?: NotificationType; entityType?: string } = {};
      if (isReadParam !== undefined) {
        filters.isRead = isReadParam === "true";
      }
      if (typeParam) {
        filters.type = typeParam;
      }
      if (entityTypeParam) {
        filters.entityType = entityTypeParam;
      }

      const canViewAllUsers = canManageAllNotifications(user);
      const backfilledCount = canViewAllUsers
        ? notificationService.ensureAllUsersAssignedTaskNotifications()
        : notificationService.ensureAssignedTaskNotifications(user.userId);
      if (backfilledCount > 0) await persistStore();

      const notifications = canViewAllUsers
        ? notificationService.getAllNotifications(filters)
        : notificationService.getNotifications(user.userId, filters);
      const unreadCount = canViewAllUsers
        ? notificationService.getAllUnreadCount()
        : notificationService.getUnreadCount(user.userId);

      res.status(200).json({
        success: true,
        data: {
          notifications,
          unreadCount,
          total: notifications.length,
        },
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Failed to retrieve notifications",
      });
    }
  }

  /**
   * GET /api/v1/notifications/unread-count
   */
  public static async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const canViewAllUsers = canManageAllNotifications(user);
      const unreadCount = canViewAllUsers
        ? notificationService.getAllUnreadCount()
        : notificationService.getUnreadCount(user.userId);
      res.status(200).json({
        success: true,
        data: { unreadCount },
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Failed to get unread notification count",
      });
    }
  }

  /**
   * PATCH /api/v1/notifications/:id/read
   */
  public static async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const id = req.params.id as string;

      const canManageAll = canManageAllNotifications(user);
      const updated = canManageAll
        ? notificationService.markAnyAsRead(id)
        : notificationService.markAsRead(id, user.userId);
      if (!updated) {
        res.status(404).json({
          success: false,
          message: "Notification not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updated,
        message: "Notification marked as read",
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Failed to mark notification as read",
      });
    }
  }

  /**
   * POST /api/v1/notifications/mark-all-read
   */
  public static async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const canManageAll = canManageAllNotifications(user);
      const updatedCount = canManageAll
        ? notificationService.markAllUsersAsRead()
        : notificationService.markAllAsRead(user.userId);

      res.status(200).json({
        success: true,
        data: { updatedCount },
        message: `Marked ${updatedCount} notifications as read`,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Failed to mark all notifications as read",
      });
    }
  }

  /**
   * DELETE /api/v1/notifications/:id
   */
  public static async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const id = req.params.id as string;

      const canManageAll = canManageAllNotifications(user);
      const deleted = canManageAll
        ? notificationService.deleteAnyNotification(id)
        : notificationService.deleteNotification(id, user.userId);
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: "Notification not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Notification deleted successfully",
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Failed to delete notification",
      });
    }
  }

  /**
   * GET /api/v1/notifications/preferences
   */
  public static async getPreferences(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const preferences = notificationService.getPreferences(user.userId);

      res.status(200).json({
        success: true,
        data: preferences,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Failed to retrieve preferences",
      });
    }
  }

  /**
   * PATCH /api/v1/notifications/preferences
   */
  public static async updatePreferences(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const updates = req.body;

      const updated = notificationService.updatePreferences(user.userId, updates);

      res.status(200).json({
        success: true,
        data: updated,
        message: "Notification preferences updated successfully",
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Failed to update preferences",
      });
    }
  }

  /**
   * GET /api/v1/notifications/jobs
   * Diagnostic endpoint to inspect background queue jobs
   */
  public static async listJobs(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const jobs = jobQueueService.getJobs(limit);

      res.status(200).json({
        success: true,
        data: jobs,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Failed to retrieve background jobs",
      });
    }
  }

  /**
   * POST /api/v1/notifications/jobs/:id/retry
   * Retry a failed background job
   */
  public static async retryJob(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const retried = await jobQueueService.retryJob(id);

      if (!retried) {
        res.status(404).json({
          success: false,
          message: "Job not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: retried,
        message: "Job scheduled for retry",
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Failed to retry job",
      });
    }
  }

  /**
   * POST /api/v1/notifications/jobs/run-worker
   * Manually trigger server-side worker cycle (deadlines, overdues, milestones)
   */
  public static async runWorker(req: Request, res: Response): Promise<void> {
    try {
      const result = await schedulerService.runCycle();
      res.status(200).json({
        success: true,
        data: result,
        message: "Worker scan cycle completed",
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Failed to run worker cycle",
      });
    }
  }
}
