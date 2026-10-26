import { dbStore } from "../lib/db";
import { notificationService } from "./notification.service";
import { jobQueueService } from "./job-queue.service";

export class SchedulerService {
  private timer: NodeJS.Timeout | null = null;
  private readonly intervalMs = 60 * 1000; // Runs every minute in production background

  constructor() {
    this.registerJobHandlers();
  }

  private registerJobHandlers() {
    jobQueueService.registerHandler("CHECK_UPCOMING_DEADLINES", async () => {
      return this.checkUpcomingDeadlines();
    });

    jobQueueService.registerHandler("CHECK_OVERDUE_TASKS", async () => {
      return this.checkOverdueTasks();
    });

    jobQueueService.registerHandler("CHECK_APPROACHING_MILESTONES", async () => {
      return this.checkApproachingMilestones();
    });

    jobQueueService.registerHandler("RUN_ALL_SCHEDULES", async () => {
      const u = await this.checkUpcomingDeadlines();
      const o = await this.checkOverdueTasks();
      const m = await this.checkApproachingMilestones();
      return { upcoming: u, overdue: o, milestones: m };
    });
  }

  /**
   * Scan tasks due within seven days (and not completed) and send reminders
   */
  public async checkUpcomingDeadlines(): Promise<number> {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    let notifiedCount = 0;

    for (const task of dbStore.tasks) {
      if (task.status === "COMPLETED") continue;
      if (!task.dueDate || !task.assigneeId) continue;

      const dueDate = new Date(task.dueDate);
      // If dueDate is in the future but within 7 days
      if (dueDate > now && dueDate <= sevenDaysFromNow) {
        const ntf = notificationService.notifyUpcomingDeadline(task.id, task.assigneeId, dueDate);
        if (ntf) notifiedCount++;
      }
    }

    return notifiedCount;
  }

  /**
   * Scan tasks past due date (and not completed) and notify both assignee and project lead
   */
  public async checkOverdueTasks(): Promise<number> {
    const now = new Date();
    let notifiedCount = 0;

    for (const task of dbStore.tasks) {
      // Completed tasks MUST NOT receive overdue notifications
      if (task.status === "COMPLETED") continue;
      if (!task.dueDate) continue;

      const dueDate = new Date(task.dueDate);
      if (dueDate < now) {
        // 1. Notify assignee
        if (task.assigneeId) {
          const ntfAssignee = notificationService.notifyOverdueTask(task.id, task.assigneeId, dueDate);
          if (ntfAssignee) notifiedCount++;
        }

        // 2. Notify project owner / team lead
        const project = dbStore.getProjectById(task.projectId);
        if (project?.ownerId && project.ownerId !== task.assigneeId) {
          const ntfLead = notificationService.notifyOverdueTask(task.id, project.ownerId, dueDate);
          if (ntfLead) notifiedCount++;
        }
      }
    }

    return notifiedCount;
  }

  /**
   * Scan project milestones due within 7 days and notify project owner
   */
  public async checkApproachingMilestones(): Promise<number> {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    let notifiedCount = 0;

    for (const milestone of dbStore.milestones) {
      if (milestone.status === "REACHED") continue;
      if (!milestone.dueDate) continue;

      const dueDate = new Date(milestone.dueDate);
      if (dueDate > now && dueDate <= sevenDaysFromNow) {
        const project = dbStore.getProjectById(milestone.projectId);
        if (project?.ownerId) {
          const ntf = notificationService.notifyMilestoneApproaching(milestone.id, project.ownerId, dueDate);
          if (ntf) notifiedCount++;
        }
      }
    }

    return notifiedCount;
  }

  /**
   * Execute full background scan cycle immediately (returns results)
   */
  public async runCycle(): Promise<{ upcoming: number; overdue: number; milestones: number }> {
    const upcoming = await this.checkUpcomingDeadlines();
    const overdue = await this.checkOverdueTasks();
    const milestones = await this.checkApproachingMilestones();
    return { upcoming, overdue, milestones };
  }

  /**
   * Start the background scheduler timer loop
   */
  public start(): void {
    if (this.timer) return;
    this.timer = setInterval(async () => {
      try {
        await jobQueueService.addJob("RUN_ALL_SCHEDULES", { triggeredAt: new Date() });
      } catch (err) {
        console.error("[SchedulerService] Error triggering RUN_ALL_SCHEDULES:", err);
      }
    }, this.intervalMs);
    // Also run an initial check
    this.runCycle().catch((err) => {
      console.error("[SchedulerService] Error on initial cycle:", err);
    });
  }

  /**
   * Stop background scheduler timer loop
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Check if the scheduler timer is actively running
   */
  public isRunning(): boolean {
    return this.timer !== null;
  }
}

export const schedulerService = new SchedulerService();
