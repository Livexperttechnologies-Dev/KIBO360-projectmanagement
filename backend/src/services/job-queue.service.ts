import { dbStore, BackgroundJobRecord, JobStatus } from "../lib/db";
import { persistStore } from "../lib/persistence";

export type JobHandler = (payload: any) => Promise<any>;

export class JobQueueService {
  private handlers = new Map<string, JobHandler>();
  private isProcessing = false;

  /**
   * Register a handler for a given job type (e.g. 'SCAN_DEADLINES', 'SEND_NOTIFICATION')
   */
  public registerHandler(jobName: string, handler: JobHandler): void {
    this.handlers.set(jobName, handler);
  }

  /**
   * Enqueue a job into the background queue
   */
  public async addJob(jobName: string, payload?: any, maxAttempts = 3): Promise<BackgroundJobRecord> {
    const job = dbStore.createBackgroundJob(jobName, payload, maxAttempts);
    await persistStore();
    // Process asynchronously without blocking caller
    setImmediate(() => {
      this.processQueue().catch((err) => {
        console.error(`[JobQueueService] Worker error processing job ${job.id}:`, err);
      });
    });
    return job;
  }

  /**
   * Process all pending jobs in the queue
   */
  public async processQueue(): Promise<{ processed: number; errors: number }> {
    if (this.isProcessing) {
      return { processed: 0, errors: 0 };
    }
    this.isProcessing = true;
    let processed = 0;
    let errors = 0;

    try {
      const pendingJobs = dbStore.backgroundJobs.filter((j) => j.status === "PENDING");

      for (const job of pendingJobs) {
        const handler = this.handlers.get(job.jobName);
        if (!handler) {
          dbStore.updateBackgroundJob(job.id, {
            status: "FAILED",
            lastError: `No registered handler for job type: ${job.jobName}`,
            attempts: job.attempts + 1,
            processedAt: new Date(),
          });
          errors++;
          continue;
        }

        dbStore.updateBackgroundJob(job.id, {
          status: "PROCESSING",
          attempts: job.attempts + 1,
        });

        try {
          await handler(job.payload);
          dbStore.updateBackgroundJob(job.id, {
            status: "COMPLETED",
            processedAt: new Date(),
            lastError: undefined,
          });
          processed++;
        } catch (err: any) {
          const errorMessage = err?.message || String(err);
          const currentAttempts = job.attempts;
          const hasMoreAttempts = currentAttempts < job.maxAttempts;

          dbStore.updateBackgroundJob(job.id, {
            status: hasMoreAttempts ? "PENDING" : "FAILED",
            lastError: errorMessage,
            processedAt: new Date(),
          });
          errors++;
        }
      }
    } finally {
      this.isProcessing = false;
      await persistStore();
    }

    return { processed, errors };
  }

  /**
   * Retry a failed job manually
   */
  public async retryJob(jobId: string): Promise<BackgroundJobRecord | null> {
    const job = dbStore.retryBackgroundJob(jobId);
    if (job) {
      await persistStore();
      setImmediate(() => {
        this.processQueue().catch((err) => {
          console.error(`[JobQueueService] Retry error for job ${jobId}:`, err);
        });
      });
    }
    return job;
  }

  /**
   * List jobs for diagnostics
   */
  public getJobs(limit = 50): BackgroundJobRecord[] {
    return dbStore.getBackgroundJobs(limit);
  }
}

export const jobQueueService = new JobQueueService();
