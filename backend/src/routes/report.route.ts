import { Router } from "express";
import { ReportController } from "../controllers/report.controller";
import { authenticate } from "../middleware/auth";
import { exportLimiter } from "../middleware/rateLimiter";

const router = Router();

// All report routes require authentication
router.use(authenticate);

// Executive KPIs and Report Endpoints
router.get("/kpis", ReportController.getKPIs);
router.get("/project-status", ReportController.getProjectStatus);
router.get("/tasks-by-status", ReportController.getTasksByStatus);
router.get("/overdue-by-owner", ReportController.getOverdueByOwner);
router.get("/upcoming-deadlines", ReportController.getUpcomingDeadlines);
router.get("/milestone-completion", ReportController.getMilestoneCompletion);
router.get("/workload-employee", ReportController.getEmployeeWorkload);
router.get("/workload-department", ReportController.getDepartmentWorkload);

// CSV Export (Authorization enforced in service/controller)
router.get("/export/:type", exportLimiter, ReportController.exportCSV);

export default router;
