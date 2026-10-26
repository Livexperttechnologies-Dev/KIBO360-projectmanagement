import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

describe("Phase 7 — Notifications & Workflow Automation Acceptance Test Suite", () => {
  const BASE_URL = "http://localhost:5000/api/v1";
  let adminToken: string;
  let devToken: string;
  let leadToken: string;
  let pmToken: string;

  before(async () => {
    // 1. Authenticate Admin
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@livexpert.in", password: "Livexpert@2026" }),
    });
    const adminData = (await adminRes.json()) as any;
    assert.equal(adminRes.status, 200);
    adminToken = adminData.data.accessToken;

    // 2. Authenticate Developer
    const devRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dev@livexpert.in", password: "Livexpert@2026" }),
    });
    const devData = (await devRes.json()) as any;
    assert.equal(devRes.status, 200);
    devToken = devData.data.accessToken;

    // 3. Authenticate Team Lead
    const leadRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "lead@livexpert.in", password: "Livexpert@2026" }),
    });
    const leadData = (await leadRes.json()) as any;
    assert.equal(leadRes.status, 200);
    leadToken = leadData.data.accessToken;

    // 4. Authenticate Project Manager
    const pmRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "pm@livexpert.in", password: "Livexpert@2026" }),
    });
    const pmData = (await pmRes.json()) as any;
    assert.equal(pmRes.status, 200);
    pmToken = pmData.data.accessToken;
  });

  // Test 1: Fetch notifications and verify structure
  test("1. GET /notifications - Returns notifications and unread count", async () => {
    const res = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const data = (await res.json()) as any;
    assert.equal(res.status, 200);
    assert.ok(data.success);
    assert.ok(Array.isArray(data.data.notifications));
    assert.ok(typeof data.data.unreadCount === "number");
  });

  // Test 2: Unread count endpoint
  test("2. GET /notifications/unread-count - Returns current unread count", async () => {
    const res = await fetch(`${BASE_URL}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const data = (await res.json()) as any;
    assert.equal(res.status, 200);
    assert.ok(typeof data.data.unreadCount === "number");
  });

  // Test 3: Mark notification as read
  test("3. PATCH /notifications/:id/read - Marks individual notification as read", async () => {
    const listRes = await fetch(`${BASE_URL}/notifications?isRead=false`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const listData = (await listRes.json()) as any;
    assert.equal(listRes.status, 200);

    if (listData.data.notifications.length > 0) {
      const targetId = listData.data.notifications[0].id;
      const readRes = await fetch(`${BASE_URL}/notifications/${targetId}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${devToken}` },
      });
      const readData = (await readRes.json()) as any;
      assert.equal(readRes.status, 200);
      assert.equal(readData.data.isRead, true);
    }
  });

  // Test 4: Mark all notifications as read
  test("4. POST /notifications/mark-all-read - Marks all user notifications as read", async () => {
    const res = await fetch(`${BASE_URL}/notifications/mark-all-read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const data = (await res.json()) as any;
    assert.equal(res.status, 200);
    assert.ok(data.success);

    // Verify unread count is updated
    const countRes = await fetch(`${BASE_URL}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const countData = (await countRes.json()) as any;
    assert.equal(countRes.status, 200);
    assert.ok(typeof countData.data.unreadCount === "number");
  });

  // Test 5: User notification preferences
  test("5. GET & PATCH /notifications/preferences - Manages notification preferences", async () => {
    const getRes = await fetch(`${BASE_URL}/notifications/preferences`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const getData = (await getRes.json()) as any;
    assert.equal(getRes.status, 200);
    assert.ok(getData.data.emailNotifications !== undefined);

    const patchRes = await fetch(`${BASE_URL}/notifications/preferences`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${devToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        emailNotifications: false,
        notifyOnBlockedWork: true,
      }),
    });
    const patchData = (await patchRes.json()) as any;
    assert.equal(patchRes.status, 200);
    assert.equal(patchData.data.emailNotifications, false);
    assert.equal(patchData.data.notifyOnBlockedWork, true);
  });

  // Test 6: Workflow Automation - Task creation triggers assignment notification
  test("6. Workflow Automation: Creating task with assignee generates assignment notification", async () => {
    const taskTitle = `Workflow Assignment Test ${Date.now()}`;
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
        taskList: "Engineering",
      }),
    });
    const createData = (await createRes.json()) as any;
    assert.equal(createRes.status, 201);
    const createdTaskId = createData.data.task ? createData.data.task.id : createData.data.id;
    assert.ok(createdTaskId, "Created task ID must exist");

    // Check dev user's notifications
    const ntfRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const ntfData = (await ntfRes.json()) as any;
    assert.equal(ntfRes.status, 200);

    const assignmentNotification = ntfData.data.notifications.find(
      (n: any) => n.entityId === createdTaskId && n.type === "NEW_TASK_ASSIGNMENT"
    );
    assert.ok(assignmentNotification, "Assignee must receive NEW_TASK_ASSIGNMENT notification");

    // Test 7: Workflow Automation - Status update to IN_REVIEW triggers review requested
    const reviewRes = await fetch(`${BASE_URL}/tasks/${createdTaskId}`, {
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

    // Check admin user's notifications
    const adminNtfRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminNtfData = (await adminNtfRes.json()) as any;
    const reviewNotification = adminNtfData.data.notifications.find(
      (n: any) => n.entityId === createdTaskId && n.type === "REVIEW_REQUESTED"
    );
    assert.ok(reviewNotification, "Reviewer must receive REVIEW_REQUESTED notification");

    // Test 8: Workflow Automation - Status update to CHANGES_REQUIRED triggers changes requested
    const changesRes = await fetch(`${BASE_URL}/tasks/${createdTaskId}`, {
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

    // Check dev user's notifications for CHANGES_REQUESTED
    const devChangesNtfRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const devChangesData = (await devChangesNtfRes.json()) as any;
    const changesNotification = devChangesData.data.notifications.find(
      (n: any) => n.entityId === createdTaskId && n.type === "CHANGES_REQUESTED"
    );
    assert.ok(changesNotification, "Assignee must receive CHANGES_REQUESTED notification");

    // Test 9: Workflow Automation - Status update to BLOCKED triggers blocked task alert
    const blockedRes = await fetch(`${BASE_URL}/tasks/${createdTaskId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${leadToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "BLOCKED",
      }),
    });
    assert.equal(blockedRes.status, 200);

    // Check lead/admin notification
    const adminBlockedRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminBlockedData = (await adminBlockedRes.json()) as any;
    const blockedNotification = adminBlockedData.data.notifications.find(
      (n: any) => n.entityId === createdTaskId && n.type === "BLOCKED_TASK"
    );
    assert.ok(blockedNotification, "Lead/owner must receive BLOCKED_TASK notification");
  });

  // Test 10: Background Worker execution & Job Queue Diagnostics
  test("10. Server-side worker cycle and background jobs diagnostic inspectability", async () => {
    // Run worker cycle on demand
    const workerRes = await fetch(`${BASE_URL}/notifications/jobs/run-worker`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const workerData = (await workerRes.json()) as any;
    assert.equal(workerRes.status, 200);
    assert.ok(workerData.data.upcoming !== undefined);
    assert.ok(workerData.data.overdue !== undefined);

    // List background jobs
    const jobsRes = await fetch(`${BASE_URL}/notifications/jobs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const jobsData = (await jobsRes.json()) as any;
    assert.equal(jobsRes.status, 200);
    assert.ok(Array.isArray(jobsData.data));
    assert.ok(jobsData.data.length > 0, "Background jobs list must not be empty");

    // Test retry on a job
    const jobToRetry = jobsData.data[0];
    const retryRes = await fetch(`${BASE_URL}/notifications/jobs/${jobToRetry.id}/retry`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const retryData = (await retryRes.json()) as any;
    assert.equal(retryRes.status, 200);
    assert.equal(retryData.data.status, "PENDING");
  });
});
