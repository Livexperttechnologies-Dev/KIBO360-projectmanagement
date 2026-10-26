import { env } from "../config/env";

export type DeadlineClassification =
  | "OVERDUE"
  | "APPROACHING"
  | "UPCOMING"
  | "ON_TRACK"
  | "COMPLETED";

export interface DeadlineAnalysis {
  status: DeadlineClassification;
  isOverdue: boolean;
  isApproaching: boolean;
  isUpcoming: boolean;
  isCompleted: boolean;
  daysRemaining: number;
  daysOverdue: number;
  dueDate: Date;
  referenceNow: Date;
  timezone: string;
}

export class DeadlineService {
  /**
   * Returns configured company timezone
   */
  public static getTimezone(): string {
    return env.COMPANY_TIMEZONE || "Asia/Kolkata";
  }

  /**
   * Format a date into ISO string adjusted to the configured company timezone
   */
  public static formatInCompanyTimezone(date: Date, timezone?: string): string {
    const tz = timezone || this.getTimezone();
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  /**
   * Adds specified number of business days (skipping Saturday and Sunday) to a date
   */
  public static addBusinessDays(startDate: Date, businessDays = 1): Date {
    const result = new Date(startDate.getTime());
    let added = 0;

    while (added < businessDays) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay(); // 0 = Sunday, 6 = Saturday
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        added++;
      }
    }

    return result;
  }

  /**
   * Evaluates the deadline status of a task or milestone based on Phase 6 rules:
   * - Completed tasks must NEVER appear in overdue counts or overdue status
   * - Overdue: Incomplete and past due date
   * - Approaching: Incomplete and due within 1 business day
   * - Upcoming: Incomplete and due within 7 calendar days
   * - On Track: Incomplete and due beyond 7 days
   */
  public static analyzeDeadline(
    dueDate: Date | string,
    itemStatus: string,
    refNow: Date = new Date()
  ): DeadlineAnalysis {
    const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
    const nowTime = refNow.getTime();
    const dueTime = due.getTime();
    const tz = this.getTimezone();

    const isCompleted =
      itemStatus === "COMPLETED" ||
      itemStatus === "REACHED" ||
      itemStatus === "CANCELLED";

    const msDiff = dueTime - nowTime;
    const daysRemaining = Math.ceil(msDiff / (24 * 60 * 60 * 1000));
    const daysOverdue = msDiff < 0 ? Math.max(1, Math.floor((nowTime - dueTime) / (24 * 60 * 60 * 1000))) : 0;

    // RULE: Completed items are never overdue or approaching
    if (isCompleted) {
      return {
        status: "COMPLETED",
        isOverdue: false,
        isApproaching: false,
        isUpcoming: false,
        isCompleted: true,
        daysRemaining,
        daysOverdue: 0,
        dueDate: due,
        referenceNow: refNow,
        timezone: tz,
      };
    }

    // Overdue tasks: incomplete and past the due date
    if (dueTime < nowTime) {
      return {
        status: "OVERDUE",
        isOverdue: true,
        isApproaching: false,
        isUpcoming: false,
        isCompleted: false,
        daysRemaining,
        daysOverdue,
        dueDate: due,
        referenceNow: refNow,
        timezone: tz,
      };
    }

    // Approaching tasks: due within one business day (skipping weekends)
    const businessDayThreshold = this.addBusinessDays(refNow, 1).getTime();
    const isApproaching = dueTime <= businessDayThreshold;

    // Upcoming tasks: due within seven calendar days
    const sevenDaysThreshold = nowTime + 7 * 24 * 60 * 60 * 1000;
    const isUpcoming = dueTime <= sevenDaysThreshold;

    let status: DeadlineClassification = "ON_TRACK";
    if (isApproaching) {
      status = "APPROACHING";
    } else if (isUpcoming) {
      status = "UPCOMING";
    }

    return {
      status,
      isOverdue: false,
      isApproaching,
      isUpcoming,
      isCompleted: false,
      daysRemaining,
      daysOverdue: 0,
      dueDate: due,
      referenceNow: refNow,
      timezone: tz,
    };
  }
}
