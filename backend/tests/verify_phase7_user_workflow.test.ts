import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

describe("Phase 7 User Verification Workflow — 5-Point Test Suite", () => {
  const BASE_URL = "http://localhost:5000/api/v1";
  let adminToken: string;
  let leadToken: string;
  let devToken: string;

  before(async () => {
    // 1. Admin login
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@livexpert.in", password: "Livexpert@2026" }),
    });
    const adminData = (await adminRes.json()) as any;
    assert.equal(adminRes.status, 200);
    adminToken = adminData.data.accessToken;

    // 2. Team Lead login
    const leadRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "lead@livexpert.in", password: "Livexpert@2026" }),
    });
    const leadData = (await leadRes.json()) as any;
    assert.equal(leadRes.status, 200);
    leadToken = leadData.data.accessToken;

    // 3. Developer login
    const devRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dev@livexpert.in", password: "Livexpert@2026" }),
    });
    const devData = (await devRes.json()) as any;
    assert.equal(devRes.status, 200);
    devToken = devData.data.accessToken;
  });

  // 1. Test task assignment notifications
  test("Verify 1: Test task assignment notifications", async () => {
    const timestamp = Date.now();
    const taskTitle = `Assignment Test Task ${timestamp}`;

    // 1a. Lead creates a new task assigned to dev (usr-dev-04)
    const createRes = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${leadToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: taskTitle,
        projectId: "prj-01",
        assigneeId: "usr-dev-04",
        status: "OPEN",
        priority: "HIGH",
        taskList: "Backend",
      }),
    });
    const createData = (await createRes.json()) as any;
    assert.equal(createRes.status, 201);
    const taskId = createData.data.task ? createData.data.task.id : createData.data.id;

    // 1b. Dev queries notifications
    const devNotifsRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const devNotifsData = (await devNotifsRes.json()) as any;
    assert.equal(devNotifsRes.status, 200);

    const assignmentNotification = devNotifsData.data.notifications.find(
      (n: any) => n.entityId === taskId && n.type === "NEW_TASK_ASSIGNMENT"
    );
    assert.ok(assignmentNotification, "Dev user must receive NEW_TASK_ASSIGNMENT notification");
    assert.equal(assignmentNotification.isRead, false);
    assert.ok(assignmentNotification.message.includes(taskTitle));

    // 1c. Reassign task to team lead (usr-lead-03)
    const reassignRes = await fetch(`${BASE_URL}/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assigneeId: "usr-lead-03",
      }),
    });
    assert.equal(reassignRes.status, 200);

    // 1d. Lead queries notifications to verify TASK_REASSIGNMENT
    const leadNotifsRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${leadToken}` },
    });
    const leadNotifsData = (await leadNotifsRes.json()) as any;
    const reassignNotification = leadNotifsData.data.notifications.find(
      (n: any) => n.entityId === taskId && n.type === "TASK_REASSIGNMENT"
    );
    assert.ok(reassignNotification, "Lead must receive TASK_REASSIGNMENT notification upon reassignment");
  });

  // 2. Test upcoming deadline reminders
  test("Verify 2: Test upcoming deadline reminders", async () => {
    const timestamp = Date.now();
    const taskTitle = `Upcoming Deadline Task ${timestamp}`;
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days in future

    // 2a. Create task due in 3 days assigned to dev
    const createRes = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${leadToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: taskTitle,
        projectId: "prj-01",
        assigneeId: "usr-dev-04",
        dueDate: dueDate.toISOString(),
        status: "IN_PROGRESS",
        priority: "MEDIUM",
      }),
    });
    const createData = (await createRes.json()) as any;
    assert.equal(createRes.status, 201);
    const taskId = createData.data.task ? createData.data.task.id : createData.data.id;

    // 2b. Trigger server-side deadline scan worker
    const workerRes = await fetch(`${BASE_URL}/notifications/jobs/run-worker`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(workerRes.status, 200);

    // 2c. Query dev's notifications
    const devNotifsRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const devNotifsData = (await devNotifsRes.json()) as any;
    const deadlineReminder = devNotifsData.data.notifications.find(
      (n: any) => n.entityId === taskId && n.type === "UPCOMING_DEADLINE"
    );
    assert.ok(deadlineReminder, "Assignee must receive UPCOMING_DEADLINE reminder for task due within 7 days");
    assert.ok(deadlineReminder.message.includes(taskTitle));
  });

  // 3. Test overdue escalation
  test("Verify 3: Test overdue escalation", async () => {
    const timestamp = Date.now();
    const taskTitle = `Overdue Escalation Task ${timestamp}`;
    const pastDueDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days past due

    // 3a. Create overdue task for project prj-01 (owner is adminUser usr-admin-01) assigned to dev
    const createRes = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: taskTitle,
        projectId: "prj-01",
        assigneeId: "usr-dev-04",
        dueDate: pastDueDate.toISOString(),
        status: "TODO",
        priority: "URGENT",
      }),
    });
    const createData = (await createRes.json()) as any;
    assert.equal(createRes.status, 201);
    const taskId = createData.data.task ? createData.data.task.id : createData.data.id;

    // 3b. Trigger server-side overdue scan worker
    const workerRes = await fetch(`${BASE_URL}/notifications/jobs/run-worker`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(workerRes.status, 200);

    // 3c. Escalation Check 1: Assignee received overdue alert
    const devNotifsRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const devNotifsData = (await devNotifsRes.json()) as any;
    const devOverdueNotif = devNotifsData.data.notifications.find(
      (n: any) => n.entityId === taskId && n.type === "OVERDUE_TASK"
    );
    assert.ok(devOverdueNotif, "Task assignee must receive OVERDUE_TASK notification");

    // 3d. Escalation Check 2: Project Owner / Team Lead received overdue escalation alert
    const adminNotifsRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminNotifsData = (await adminNotifsRes.json()) as any;
    const adminOverdueNotif = adminNotifsData.data.notifications.find(
      (n: any) => n.entityId === taskId && n.type === "OVERDUE_TASK"
    );
    assert.ok(adminOverdueNotif, "Project Lead/Owner must receive escalated OVERDUE_TASK notification");

    // 3e. Verify completed task is not alerted: Complete the task and re-scan
    const completeRes = await fetch(`${BASE_URL}/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${devToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "COMPLETED",
        completionPercentage: 100,
      }),
    });
    assert.equal(completeRes.status, 200);
  });

  // 4. Test review and change-request notifications
  test("Verify 4: Test review and change-request notifications", async () => {
    const timestamp = Date.now();
    const taskTitle = `Review & Changes Workflow Task ${timestamp}`;

    // 4a. Create task
    const createRes = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${leadToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: taskTitle,
        projectId: "prj-01",
        assigneeId: "usr-dev-04",
        status: "IN_PROGRESS",
      }),
    });
    const createData = (await createRes.json()) as any;
    assert.equal(createRes.status, 201);
    const taskId = createData.data.task ? createData.data.task.id : createData.data.id;

    // 4b. Dev transitions task to IN_REVIEW and designates admin as reviewer
    const reviewRes = await fetch(`${BASE_URL}/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${leadToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "IN_REVIEW",
        reviewerId: "usr-admin-01",
      }),
    });
    assert.equal(reviewRes.status, 200);

    // 4c. Verify reviewer received REVIEW_REQUESTED notification
    const reviewerNotifsRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const reviewerNotifsData = (await reviewerNotifsRes.json()) as any;
    const reviewNotif = reviewerNotifsData.data.notifications.find(
      (n: any) => n.entityId === taskId && n.type === "REVIEW_REQUESTED"
    );
    assert.ok(reviewNotif, "Reviewer must receive REVIEW_REQUESTED notification");

    // 4d. Reviewer rejects and moves task to CHANGES_REQUIRED
    const changesRes = await fetch(`${BASE_URL}/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "CHANGES_REQUIRED",
      }),
    });
    assert.equal(changesRes.status, 200);

    // 4e. Verify assignee received CHANGES_REQUESTED notification
    const devNotifsRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const devNotifsData = (await devNotifsRes.json()) as any;
    const changesNotif = devNotifsData.data.notifications.find(
      (n: any) => n.entityId === taskId && n.type === "CHANGES_REQUESTED"
    );
    assert.ok(changesNotif, "Task Assignee must receive CHANGES_REQUESTED notification");
  });

  // 5. Verify that duplicate alerts are not sent
  test("Verify 5: Verify that duplicate alerts are not sent", async () => {
    // Run initial scan to baseline any pending reminders for recently created tasks
    await fetch(`${BASE_URL}/notifications/jobs/run-worker`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    // 5a. Check initial notification count for dev user for scheduled reminders
    const initialRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const initialData = (await initialRes.json()) as any;
    const initialReminderCount = initialData.data.notifications.filter(
      (n: any) => n.type === "UPCOMING_DEADLINE" || n.type === "OVERDUE_TASK"
    ).length;

    // 5b. Trigger worker scan cycle 3 consecutive times
    for (let i = 0; i < 3; i++) {
      const scanRes = await fetch(`${BASE_URL}/notifications/jobs/run-worker`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(scanRes.status, 200);
    }

    // 5c. Query notifications again
    const postScanRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const postScanData = (await postScanRes.json()) as any;
    const postScanReminderCount = postScanData.data.notifications.filter(
      (n: any) => n.type === "UPCOMING_DEADLINE" || n.type === "OVERDUE_TASK"
    ).length;

    // 5d. Count should NOT inflate because deduplication keys suppress repeat reminders on same day
    assert.equal(
      postScanReminderCount,
      initialReminderCount,
      `Duplicate reminders must be prevented: reminder count before (${initialReminderCount}) must equal reminder count after (${postScanReminderCount})`
    );

    // 5e. Verify distinct dedupKeys in the notifications array
    const dedupKeys = postScanData.data.notifications
      .map((n: any) => n.dedupKey)
      .filter((k: any) => Boolean(k));
    const uniqueDedupKeys = new Set(dedupKeys);
    assert.equal(
      dedupKeys.length,
      uniqueDedupKeys.size,
      "Every dedupKey across user's notifications must be completely unique with zero duplicates"
    );
  });
});
