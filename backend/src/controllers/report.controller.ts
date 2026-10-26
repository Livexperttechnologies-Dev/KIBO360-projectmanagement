import { Request, Response } from "express";
import { ReportService, ReportFilters } from "../services/report.service";

function parseFilters(req: Request): ReportFilters {
  return {
    dateRange: req.query.dateRange as any,
    startDate: req.query.startDate as string | undefined,
    endDate: req.query.endDate as string | undefined,
    departmentId: req.query.departmentId as string | undefined,
    projectId: req.query.projectId as string | undefined,
  };
}

export class ReportController {
  /**
   * GET /api/v1/reports/kpis
   * Executive management KPIs (On-time completion rate, Overdue count, Ownership coverage)
   */
  public static async getKPIs(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const filters = parseFilters(req);
      const data = ReportService.getManagementKPIs(filters, user);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Failed to calculate management KPIs",
      });
    }
  }

  /**
   * GET /api/v1/reports/project-status
   */
  public static async getProjectStatus(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const filters = parseFilters(req);
      const data = ReportService.getProjectStatusReport(filters, user);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Failed to generate project status report",
      });
    }
  }

  /**
   * GET /api/v1/reports/tasks-by-status
   */
  public static async getTasksByStatus(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const filters = parseFilters(req);
      const data = ReportService.getTasksByStatusReport(filters, user);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Failed to generate tasks by status report",
      });
    }
  }

  /**
   * GET /api/v1/reports/overdue-by-owner
   */
  public static async getOverdueByOwner(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const filters = parseFilters(req);
      const data = ReportService.getOverdueByOwnerReport(filters, user);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Failed to generate overdue tasks report",
      });
    }
  }

  /**
   * GET /api/v1/reports/upcoming-deadlines
   */
  public static async getUpcomingDeadlines(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const filters = parseFilters(req);
      const data = ReportService.getUpcomingDeadlinesReport(filters, user);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Failed to generate upcoming deadlines report",
      });
    }
  }

  /**
   * GET /api/v1/reports/milestone-completion
   */
  public static async getMilestoneCompletion(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const filters = parseFilters(req);
      const data = ReportService.getMilestoneCompletionReport(filters, user);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Failed to generate milestone completion report",
      });
    }
  }

  /**
   * GET /api/v1/reports/workload-employee
   */
  public static async getEmployeeWorkload(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const filters = parseFilters(req);
      const data = ReportService.getEmployeeWorkloadReport(filters, user);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Failed to generate employee workload report",
      });
    }
  }

  /**
   * GET /api/v1/reports/workload-department
   */
  public static async getDepartmentWorkload(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const filters = parseFilters(req);
      const data = ReportService.getDepartmentWorkloadReport(filters, user);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Failed to generate department workload report",
      });
    }
  }

  /**
   * GET /api/v1/reports/export/:type
   * CSV export endpoint. Strictly enforces role-based authorization (blocks EMPLOYEE)
   */
  public static async exportCSV(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const typeParam = req.params.type as "tasks" | "projects" | "kpis";
      const filters = parseFilters(req);

      const csvContent = ReportService.generateCSV(typeParam, filters, user);

      const filename = `kibo360-report-${typeParam}-${new Date().toISOString().split("T")[0]}.csv`;
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.status(200).send(csvContent);
    } catch (err: any) {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Failed to export report CSV",
      });
    }
  }
}
