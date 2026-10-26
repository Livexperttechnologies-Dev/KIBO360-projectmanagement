import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { notificationService } from "../src/services/notification.service";
import { jobQueueService } from "../src/services/job-queue.service";
import { schedulerService } from "../src/services/scheduler.service";
import { dbStore } from "../src/lib/db";

describe("Phase 7 — Notification & Automation Unit & Integration Tests", () => {
  const devUserId = "usr-dev-04";
  const leadUserId = "usr-lead-03";
  const adminUserId = "usr-admin-01";

  test("1. Preferences: Can read and update user notification preferences", () => {
    const prefs = notificationService.getPreferences(devUserId);
    assert.ok(prefs, "Preferences should exist");
    assert.equal(prefs.userId, devUserId);
    assert.equal(prefs.inAppNotifications, true);

    const updated = notificationService.updatePreferences(devUserId, {
      notifyOnDeadlineApproaching: false,
    });
    assert.equal(updated.notifyOnDeadlineApproaching, false);

    // Verify it is respected in isTypeEnabledForUser
    const isEnabled = notificationService.isTypeEnabledForUser(devUserId, "UPCOMING_DEADLINE");
    assert.equal(isEnabled, false, "Should be disabled when user toggles off preference");

    // Re-enable for subsequent tests
    notificationService.updatePreferences(devUserId, {
      notifyOnDeadlineApproaching: true,
    });
    assert.equal(notificationService.isTypeEnabledForUser(devUserId, "UPCOMING_DEADLINE"), true);
  });

  test("2. Deduplication: Deterministic dedupKey prevents duplicate notifications", () => {
    const dedupKey = `TEST_DEDUP:${Date.now()}:${Math.random()}`;

    const ntf1 = notificationService.sendNotification({
      userId: devUserId,
      type: "UPCOMING_DEADLINE",
      title: "Test Deadline",
      message: "First reminder",
      entityType: "TASK",
      entityId: "tsk-03",
      dedupKey,
    });
    assert.ok(ntf1, "First notification should be created");

    const ntf2 = notificationService.sendNotification({
      userId: devUserId,
      type: "UPCOMING_DEADLINE",
      title: "Test Deadline Duplicate",
      message: "Second reminder with same key",
      entityType: "TASK",
      entityId: "tsk-03",
      dedupKey,
    });
    assert.equal(ntf2, null, "Duplicate notification should be prevented and return null");
  });

  test("3. Project Permissions: Unauthorized user cannot receive notifications exposing project details", () => {
    // Check permission logic
    const hasAccessToPrj1 = notificationService.hasProjectAccess(devUserId, "prj-01");
    assert.equal(hasAccessToPrj1, true, "Dev user is member of prj-01");

    // A dummy project dev has no membership in
    const dummyProject = {
      id: "prj-conf-01",
      title: "Confidential Executive Project",
      key: "CONF",
      description: "Restricted executive project",
      status: "ACTIVE" as const,
      priority: "URGENT" as const,
      creatorId: adminUserId,
      ownerId: adminUserId,
      departmentId: "dept-sw",
      startDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    dbStore.projects.push(dummyProject);

    const hasAccessToConf = notificationService.hasProjectAccess(devUserId, dummyProject.id);
    assert.equal(hasAccessToConf, false, "Dev user should not have access to restricted project");

    // Attempt to send notification for this project
    const restrictedNtf = notificationService.sendNotification({
      userId: devUserId,
      type: "NEW_TASK_ASSIGNMENT",
      title: "Confidential Task",
      message: "Secret project task details",
      entityType: "TASK",
      projectId: dummyProject.id,
    });
    assert.equal(restrictedNtf, null, "Notification should be suppressed due to unauthorized project access");
  });

  test("4. JobQueueService: Background jobs execute, update status, and handle errors & retries", async () => {
    let executionCounter = 0;
    jobQueueService.registerHandler("TEST_JOB_SUCCESS", async (payload: any) => {
      executionCounter += payload.increment;
      return { success: true };
    });

    const job = await jobQueueService.addJob("TEST_JOB_SUCCESS", { increment: 5 });
    assert.ok(job.id);
    assert.equal(job.status, "PENDING");

    // Trigger processQueue manually for immediate execution verification
    const result = await jobQueueService.processQueue();
    assert.ok(result.processed >= 1);

    const refreshedJob = dbStore.getBackgroundJobById(job.id);
    assert.equal(refreshedJob?.status, "COMPLETED");
    assert.equal(executionCounter, 5);

    // Test failing job and retry mechanism
    jobQueueService.registerHandler("TEST_JOB_FAIL", async () => {
      throw new Error("Simulated connection timeout to worker");
    });

    const failingJob = await jobQueueService.addJob("TEST_JOB_FAIL", {}, 2);
    await jobQueueService.processQueue();

    let jobState = dbStore.getBackgroundJobById(failingJob.id);
    assert.ok(jobState?.lastError?.includes("Simulated connection timeout"));

    // Process second attempt to reach maxAttempts
    await jobQueueService.processQueue();
    jobState = dbStore.getBackgroundJobById(failingJob.id);
    assert.equal(jobState?.status, "FAILED");

    // Manual retry
    const retried = await jobQueueService.retryJob(failingJob.id);
    assert.equal(retried?.status, "PENDING");
  });

  test("5. Scheduler: Overdue scan notifies both assignee and project lead", async () => {
    const overdueTask = dbStore.tasks.find((t) => t.id === "tsk-06");
    assert.ok(overdueTask, "Seed task tsk-06 should exist");

    // Project owner of prj-02 is leadUser (usr-lead-03), assignee is devUser (usr-dev-04)
    const scanCount = await schedulerService.checkOverdueTasks();
    assert.ok(scanCount >= 1, "Should detect and notify overdue tasks");

    // devUser and leadUser should both have received notifications
    const devNotifs = dbStore.notifications.filter(
      (n) => n.userId === devUserId && n.entityId === "tsk-06" && n.type === "OVERDUE_TASK"
    );
    assert.ok(devNotifs.length > 0, "Assignee must receive overdue notification");

    const leadNotifs = dbStore.notifications.filter(
      (n) => n.userId === leadUserId && n.entityId === "tsk-06" && n.type === "OVERDUE_TASK"
    );
    assert.ok(leadNotifs.length > 0, "Lead/owner must receive overdue notification");
  });

  test("6. Scheduler: Completed tasks are never notified as overdue", async () => {
    // tsk-01 and tsk-02 are COMPLETED and past due date
    const completedTask1 = dbStore.tasks.find((t) => t.id === "tsk-01");
    assert.equal(completedTask1?.status, "COMPLETED");

    const completedNotifs = dbStore.notifications.filter(
      (n) => n.entityId === "tsk-01" && n.type === "OVERDUE_TASK"
    );
    assert.equal(completedNotifs.length, 0, "Completed tasks must never have overdue notifications");
  });

  test("7. Scheduler: Upcoming deadline scan notifies owner before due date", async () => {
    // tsk-03 is due in 2 days (within 7 days)
    const upcomingCount = await schedulerService.checkUpcomingDeadlines();
    assert.ok(upcomingCount >= 1, "Should notify upcoming deadlines");

    const tsk3Notifs = dbStore.notifications.filter(
      (n) => n.entityId === "tsk-03" && n.type === "UPCOMING_DEADLINE"
    );
    assert.ok(tsk3Notifs.length > 0, "Upcoming deadline notification should exist for tsk-03");
  });
});
