import { Request, Response, NextFunction } from "express";
import { CalendarService, CalendarFilters } from "../services/calendar.service";

export class CalendarController {
  /**
   * GET /api/v1/calendar/events
   */
  public static async getEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: CalendarFilters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        projectId: req.query.projectId as string,
        userId: req.query.userId as string,
        assigneeId: req.query.assigneeId as string,
        departmentId: req.query.departmentId as string,
        status: req.query.status as string,
        type: req.query.type as any,
        deadlineStatus: req.query.deadlineStatus as any,
      };

      const result = CalendarService.getCalendarEvents(filters, req.user!);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/calendar/summary
   */
  public static async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: CalendarFilters = {
        projectId: req.query.projectId as string,
        userId: req.query.userId as string,
        assigneeId: req.query.assigneeId as string,
        departmentId: req.query.departmentId as string,
        status: req.query.status as string,
        type: req.query.type as any,
      };

      const summary = CalendarService.getCalendarSummary(filters, req.user!);

      res.status(200).json({
        success: true,
        data: { summary },
      });
    } catch (error) {
      next(error);
    }
  }
}
