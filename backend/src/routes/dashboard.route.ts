import { Router } from "express";
import {
  getOverview,
  getSummary,
  getRecentProjects,
  getUpcomingDeadlines,
  getMyTasks,
  getAwaitingReview,
  getOverdueTasks,
  getStatusStats,
  getWorkload,
  getFilterOptions,
  updateTaskStatus,
} from "../controllers/dashboard.controller";
import { authenticate } from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import { updateTaskStatusSchema } from "../validations/task.validation";

const router = Router();

router.get("/overview", authenticate, getOverview);
router.get("/summary", authenticate, getSummary);
router.get("/recent-projects", authenticate, getRecentProjects);
router.get("/upcoming-deadlines", authenticate, getUpcomingDeadlines);
router.get("/my-tasks", authenticate, getMyTasks);
router.get("/awaiting-review", authenticate, getAwaitingReview);
router.get("/overdue", authenticate, getOverdueTasks);
router.get("/status-stats", authenticate, getStatusStats);
router.get("/workload", authenticate, getWorkload);
router.get("/filters", authenticate, getFilterOptions);
router.patch("/tasks/:id/status", authenticate, validateRequest(updateTaskStatusSchema), updateTaskStatus);

export default router;
