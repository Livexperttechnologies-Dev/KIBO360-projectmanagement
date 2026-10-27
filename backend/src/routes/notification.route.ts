import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// Notification management
router.get("/", NotificationController.listNotifications);
router.get("/unread-count", NotificationController.getUnreadCount);
router.patch("/:id/read", NotificationController.markAsRead);
router.post("/mark-all-read", NotificationController.markAllAsRead);
router.delete("/:id", NotificationController.deleteNotification);

// User notification preferences
router.get("/preferences", NotificationController.getPreferences);
router.patch("/preferences", NotificationController.updatePreferences);

// Background jobs diagnostics & execution
router.get("/jobs", requireRole("ADMINISTRATOR"), NotificationController.listJobs);
router.post("/jobs/:id/retry", requireRole("ADMINISTRATOR"), NotificationController.retryJob);
router.post("/jobs/run-worker", requireRole("ADMINISTRATOR"), NotificationController.runWorker);

export default router;
