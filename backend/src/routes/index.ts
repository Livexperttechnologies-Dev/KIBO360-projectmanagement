import { Router } from "express";
import healthRouter from "./health.route";
import authRouter from "./auth.route";
import userRouter from "./user.route";
import dashboardRouter from "./dashboard.route";
import projectRouter from "./project.route";
import taskRouter from "./task.route";
import calendarRouter from "./calendar.route";
import notificationRouter from "./notification.route";
import reportRouter from "./report.route";

const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/dashboard", dashboardRouter);
router.use("/projects", projectRouter);
router.use("/tasks", taskRouter);
router.use("/calendar", calendarRouter);
router.use("/notifications", notificationRouter);
router.use("/reports", reportRouter);

export default router;