import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

describe("Phase 6 Verification — Formal Acceptance Criteria Test Suite", () => {
  const BASE_URL = "http://localhost:5000/api/v1";
  let adminToken: string;
  let devToken: string;

  before(async () => {
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@livexpert.in", password: "Livexpert@2026" }),
    });
    const adminData = (await adminRes.json()) as any;
    assert.equal(adminRes.status, 200);
    adminToken = adminData.data.accessToken;

    const devRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dev@livexpert.in", password: "Livexpert@2026" }),
    });
    const devData = (await devRes.json()) as any;
    assert.equal(devRes.status, 200);
    devToken = devData.data.accessToken;
  });

  // Acceptance Criterion 1: Calendar events match task and milestone records
  test("Criterion 1: Calendar events match task and milestone records", async () => {
    const res = await fetch(`${BASE_URL}/calendar/events`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;

    const events = data.data.events;
    assert.ok(events.length > 0, "Calendar must return scheduled events");

    const tasks = events.filter((e: any) => e.type === "TASK");
    const milestones = events.filter((e: any) => e.type === "MILESTONE");

    assert.ok(tasks.length > 0, "Tasks must be present in calendar events");
    assert.ok(milestones.length > 0, "Milestones must be present in calendar events");

    // Check task attributes
    const task = tasks[0];
    assert.ok(task.id);
    assert.ok(task.entityId);
    assert.ok(task.title);
    assert.ok(task.dueDate);
    assert.ok(task.projectName);
    assert.ok(task.projectKey);
    assert.ok(task.status);
    assert.ok(task.deadlineStatus);

    // Check milestone attributes
    const milestone = milestones[0];
    assert.ok(milestone.id);
    assert.ok(milestone.entityId);
    assert.ok(milestone.title);
    assert.ok(milestone.dueDate);
    assert.ok(milestone.projectName);
    assert.ok(milestone.status);
  });

  // Acceptance Criterion 2: Date filters work
  test("Criterion 2: Date filters work (Time window queries and filtering)", async () => {
    const start = new Date("2026-10-01T00:00:00.000Z").toISOString();
    const end = new Date("2026-10-31T23:59:59.999Z").toISOString();

    const res = await fetch(`${BASE_URL}/calendar/events?startDate=${start}&endDate=${end}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;

    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();

    for (const ev of data.data.events) {
      const evTime = new Date(ev.date).getTime();
      assert.ok(
        evTime >= startTime && evTime <= endTime,
        `Event ${ev.title} on ${ev.date} must be within filtered October date bounds`
      );
    }
  });

  // Acceptance Criterion 3: Overdue tasks are correctly identified
  test("Criterion 3: Overdue tasks are correctly identified", async () => {
    // 3a. Create an overdue task (past due date)
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const taskRes = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: "Legacy Audit Ingestion Script",
        projectId: "prj-01",
        status: "OPEN", // incomplete
        dueDate: pastDate,
      }),
    });
    const taskData = (await taskRes.json()) as any;
    assert.equal(taskRes.status, 201);
    const overdueTaskId = taskData.data.task.id;

    // 3b. Query calendar and verify deadline classification
    const calRes = await fetch(`${BASE_URL}/calendar/events?projectId=prj-01`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const calData = (await calRes.json()) as any;
    assert.equal(calRes.status, 200);

    const overdueEvent = calData.data.events.find((e: any) => e.entityId === overdueTaskId);
    assert.ok(overdueEvent, "Overdue task must be returned in calendar events");
    assert.equal(overdueEvent.deadlineStatus, "OVERDUE");
    assert.equal(overdueEvent.isOverdue, true);
    assert.ok(overdueEvent.daysOverdue >= 5);
  });

  // Acceptance Criterion 4: Completed tasks are excluded from overdue totals
  test("Criterion 4: Completed tasks are excluded from overdue totals", async () => {
    // 4a. Get current summary for isolated project prj-05
    const initialSummaryRes = await fetch(`${BASE_URL}/calendar/summary?projectId=prj-05`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const initialSummary = ((await initialSummaryRes.json()) as any).data.summary;

    // 4b. Create a task with a past due date and immediately mark it COMPLETED in prj-05
    const pastDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const completedTaskRes = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: "Historical Setup Job Completed",
        projectId: "prj-05",
        status: "COMPLETED",
        completionPercentage: 100,
        dueDate: pastDate,
      }),
    });
    const completedTaskData = (await completedTaskRes.json()) as any;
    assert.equal(completedTaskRes.status, 201);
    const completedTaskId = completedTaskData.data.task.id;

    // 4c. Verify in calendar events
    const calRes = await fetch(`${BASE_URL}/calendar/events?projectId=prj-05`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const calData = (await calRes.json()) as any;
    assert.equal(calRes.status, 200);

    const completedEvent = calData.data.events.find((e: any) => e.entityId === completedTaskId);
    assert.ok(completedEvent);
    assert.equal(completedEvent.deadlineStatus, "COMPLETED");
    assert.equal(completedEvent.isOverdue, false, "Completed task must NOT have isOverdue: true");
    assert.equal(completedEvent.daysOverdue, 0);

    // 4d. Verify summary overdue count DID NOT INCREMENT
    const afterSummaryRes = await fetch(`${BASE_URL}/calendar/summary?projectId=prj-05`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const afterSummary = ((await afterSummaryRes.json()) as any).data.summary;
    assert.equal(
      afterSummary.overdueTasks,
      initialSummary.overdueTasks,
      "Completed tasks must be strictly excluded from overdue totals"
    );
  });

  // Acceptance Criterion 5: Calendar remains responsive
  test("Criterion 5: Calendar remains responsive under multiple query parameter combinations", async () => {
    const t0 = performance.now();

    // Query 1: Default
    const res1 = await fetch(`${BASE_URL}/calendar/events`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res1.status, 200);

    // Query 2: With project and urgency filter
    const res2 = await fetch(`${BASE_URL}/calendar/events?projectId=prj-01&deadlineStatus=OVERDUE`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res2.status, 200);

    // Query 3: With type filter MILESTONE
    const res3 = await fetch(`${BASE_URL}/calendar/events?type=MILESTONE`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res3.status, 200);

    // Query 4: Summary endpoint
    const res4 = await fetch(`${BASE_URL}/calendar/summary?projectId=prj-01`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res4.status, 200);

    const elapsed = performance.now() - t0;
    assert.ok(elapsed < 1000, `Calendar endpoints must execute in under 1 second (took ${elapsed.toFixed(1)}ms)`);
  });
});
