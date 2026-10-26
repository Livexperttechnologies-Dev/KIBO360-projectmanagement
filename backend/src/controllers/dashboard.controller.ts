import { Request, Response, NextFunction } from "express";
import { DashboardService, DashboardFilters } from "../services/dashboard.service";
import { TaskStatus } from "../lib/db";

function parseFilters(req: Request): DashboardFilters {
  const { dateRange, departmentId, projectId, assigneeId, status } = req.query as Record<string, string>;
  return {
    dateRange: dateRange as any,
    departmentId,
    projectId,
    assigneeId,
    status,
  };
}

export async function getOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const filters = parseFilters(req);

    const summary = DashboardService.getSummaryMetrics(filters, user);
    const recentProjects = DashboardService.getRecentProjects(filters, user, 5, 1);
    const upcomingDeadlines = DashboardService.getUpcomingDeadlines(filters, user, 6);
    const myTasks = DashboardService.getMyAssignedTasks(user.userId, filters);
    const awaitingReview = DashboardService.getTasksAwaitingReview(filters, user);
    const overdueTasks = DashboardService.getOverdueTasks(filters, user);
    const statusStats = DashboardService.getTaskStatusDistribution(filters, user);
    const workload = DashboardService.getEmployeeWorkload(filters, user);
    const filterOptions = DashboardService.getFilterOptions(user);

    res.status(200).json({
      success: true,
      data: {
        summary,
        recentProjects,
        upcomingDeadlines,
        myTasks,
        awaitingReview,
        overdueTasks,
        statusStats,
        workload,
        filterOptions,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const filters = parseFilters(req);
    const summary = DashboardService.getSummaryMetrics(filters, user);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRecentProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const filters = parseFilters(req);
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;

    const data = DashboardService.getRecentProjects(filters, user, limit, page);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getUpcomingDeadlines(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const filters = parseFilters(req);
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 8;

    const deadlines = DashboardService.getUpcomingDeadlines(filters, user, limit);

    res.status(200).json({
      success: true,
      data: { deadlines },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const filters = parseFilters(req);

    const tasks = DashboardService.getMyAssignedTasks(user.userId, filters);

    res.status(200).json({
      success: true,
      data: { tasks },
    });
  } catch (error) {
    next(error);
  }
}

export async function getAwaitingReview(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const filters = parseFilters(req);

    const tasks = DashboardService.getTasksAwaitingReview(filters, user);

    res.status(200).json({
      success: true,
      data: { tasks },
    });
  } catch (error) {
    next(error);
  }
}

export async function getOverdueTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const filters = parseFilters(req);

    const tasks = DashboardService.getOverdueTasks(filters, user);

    res.status(200).json({
      success: true,
      data: { tasks },
    });
  } catch (error) {
    next(error);
  }
}

export async function getStatusStats(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const filters = parseFilters(req);

    const stats = DashboardService.getTaskStatusDistribution(filters, user);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

export async function getWorkload(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const filters = parseFilters(req);

    const workload = DashboardService.getEmployeeWorkload(filters, user);

    res.status(200).json({
      success: true,
      data: { workload },
    });
  } catch (error) {
    next(error);
  }
}

export async function getFilterOptions(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const options = DashboardService.getFilterOptions(user);

    res.status(200).json({
      success: true,
      data: options,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTaskStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status } = req.body as { status: TaskStatus };

    const task = await DashboardService.updateTaskStatus(id, status, user);

    res.status(200).json({
      success: true,
      message: "Task status updated successfully",
      data: { task },
    });
  } catch (error) {
    next(error);
  }
}