import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { DeadlineService } from "../src/services/deadline.service";

describe("Phase 6 User Verification Workflow Suite", () => {
  const BASE_URL = "http://localhost:5000/api/v1";
  let adminToken: string;
  let devToken: string;

  let overdueTaskId: string;
  let approachingTaskId: string;
  let upcomingTaskId: string;
  let futureTaskId: string;

  before(async () => {
    // 1. Authenticate Admin
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@livexpert.in", password: "Livexpert@2026" }),
    });
    const adminData = (await adminRes.json()) as any;
    assert.equal(adminRes.status, 200, "Admin login must succeed");
    adminToken = adminData.data.accessToken;

    // 2. Authenticate Developer
    const devRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dev@livexpert.in", password: "Livexpert@2026" }),
    });
    const devData = (await devRes.json()) as any;
    assert.equal(devRes.status, 200, "Dev login must succeed");
    devToken = devData.data.accessToken;
  });

  // Verification Item 1: Create tasks with different due dates
  test("Verify 1: Create tasks with different due dates (Overdue, Approaching, Upcoming, Future)", async () => {
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    const ONE_DAY = 24 * ONE_HOUR;

    // Task 1: Overdue Task (due 3 days ago)
    const overdueRes = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: "Telemetry DB Compression Migration",
        description: "Compress legacy telemetry logs for optimal storage",
        projectId: "prj-01",
        priority: "HIGH",
        status: "OPEN",
        dueDate: new Date(now - 3 * ONE_DAY).toISOString(),
        estimatedEffort: 8,
      }),
    });
    const overdueData = (await overdueRes.json()) as any;
    assert.equal(overdueRes.status, 201, "Overdue task creation must return 201");
    assert.ok(overdueData.data.task.id);
    overdueTaskId = overdueData.data.task.id;

    // Task 2: Approaching Task (due in 12 hours - within 1 business day)
    const approachingRes = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: "Sprint 45 Readiness Health Check",
        description: "Verify pipeline readiness and health checks for next sprint",
        projectId: "prj-01",
        priority: "URGENT",
        status: "ASSIGNED",
        assigneeId: "usr-dev-04",
        dueDate: new Date(now + 12 * ONE_HOUR).toISOString(),
        estimatedEffort: 4,
      }),
    });
    const approachingData = (await approachingRes.json()) as any;
    assert.equal(approachingRes.status, 201, "Approaching task creation must return 201");
    assert.ok(approachingData.data.task.id);
    approachingTaskId = approachingData.data.task.id;

    // Task 3: Upcoming Task (due in 4 days - within 7 days)
    const upcomingRes = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: "PostgreSQL Replica Node Sync",
        description: "Set up streaming replica for real-time reporting queries",
        projectId: "prj-01",
        priority: "MEDIUM",
        status: "IN_PROGRESS",
        assigneeId: "usr-dev-04",
        dueDate: new Date(now + 4 * ONE_DAY).toISOString(),
        estimatedEffort: 16,
      }),
    });
    const upcomingData = (await upcomingRes.json()) as any;
    assert.equal(upcomingRes.status, 201, "Upcoming task creation must return 201");
    assert.ok(upcomingData.data.task.id);
    upcomingTaskId = upcomingData.data.task.id;

    // Task 4: Future Task (due in 25 days - on track)
    const futureRes = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: "Annual SOC2 Security Audit Prep",
        description: "Consolidate audit logs and access matrices",
        projectId: "prj-01",
        priority: "LOW",
        status: "OPEN",
        dueDate: new Date(now + 25 * ONE_DAY).toISOString(),
        estimatedEffort: 40,
      }),
    });
    const futureData = (await futureRes.json()) as any;
    assert.equal(futureRes.status, 201, "Future task creation must return 201");
    assert.ok(futureData.data.task.id);
    futureTaskId = futureData.data.task.id;
  });

  // Verification Item 2: Test the calendar
  test("Verify 2: Test the calendar (Events retrieval, Month/Week/Day windows, deadline classifications)", async () => {
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;

    // 2a. Month window query covers all created deliverables
    const monthStart = new Date(now - 10 * ONE_DAY).toISOString();
    const monthEnd = new Date(now + 35 * ONE_DAY).toISOString();

    const monthRes = await fetch(
      `${BASE_URL}/calendar/events?startDate=${monthStart}&endDate=${monthEnd}&projectId=prj-01`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const monthData = (await monthRes.json()) as any;
    assert.equal(monthRes.status, 200, "Calendar month window query must succeed");

    const events = monthData.data.events;
    const taskIds = events.map((e: any) => e.entityId);

    assert.ok(taskIds.includes(overdueTaskId), "Overdue task must appear in calendar window");
    assert.ok(taskIds.includes(approachingTaskId), "Approaching task must appear in calendar window");
    assert.ok(taskIds.includes(upcomingTaskId), "Upcoming task must appear in calendar window");
    assert.ok(taskIds.includes(futureTaskId), "Future task must appear in calendar window");

    // 2b. Verify correct deadline classification on calendar events
    const overdueEv = events.find((e: any) => e.entityId === overdueTaskId);
    assert.equal(overdueEv.deadlineStatus, "OVERDUE", "Task due in past must have OVERDUE status");
    assert.equal(overdueEv.isOverdue, true);

    const approachingEv = events.find((e: any) => e.entityId === approachingTaskId);
    assert.equal(approachingEv.deadlineStatus, "APPROACHING", "Task due in 12h must have APPROACHING status");
    assert.equal(approachingEv.isApproaching, true);

    const upcomingEv = events.find((e: any) => e.entityId === upcomingTaskId);
    assert.equal(upcomingEv.deadlineStatus, "UPCOMING", "Task due in 4d must have UPCOMING status");
    assert.equal(upcomingEv.isUpcoming, true);

    const futureEv = events.find((e: any) => e.entityId === futureTaskId);
    assert.equal(futureEv.deadlineStatus, "ON_TRACK", "Task due in 25d must have ON_TRACK status");

    // 2c. Week window query: isolate tasks due this week
    const weekStart = new Date(now - ONE_DAY).toISOString();
    const weekEnd = new Date(now + 6 * ONE_DAY).toISOString();
    const weekRes = await fetch(
      `${BASE_URL}/calendar/events?startDate=${weekStart}&endDate=${weekEnd}&projectId=prj-01`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const weekData = (await weekRes.json()) as any;
    assert.equal(weekRes.status, 200);

    const weekTaskIds = weekData.data.events.map((e: any) => e.entityId);
    assert.ok(weekTaskIds.includes(approachingTaskId), "Week view must contain approaching task");
    assert.ok(weekTaskIds.includes(upcomingTaskId), "Week view must contain upcoming task");
    assert.ok(!weekTaskIds.includes(futureTaskId), "Week view must NOT contain task due in 25 days");

    // 2d. Filter by type=TASK vs type=MILESTONE
    const taskOnlyRes = await fetch(`${BASE_URL}/calendar/events?type=TASK&projectId=prj-01`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const taskOnlyData = (await taskOnlyRes.json()) as any;
    assert.ok(taskOnlyData.data.events.every((e: any) => e.type === "TASK"));

    const milestoneOnlyRes = await fetch(`${BASE_URL}/calendar/events?type=MILESTONE&projectId=prj-01`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const milestoneOnlyData = (await milestoneOnlyRes.json()) as any;
    assert.ok(milestoneOnlyData.data.events.every((e: any) => e.type === "MILESTONE"));
  });

  // Verification Item 3: Test timezone handling
  test("Verify 3: Test timezone handling (Consistent company timezone rules, IST UTC+05:30 localization)", async () => {
    // 3a. Verify configured company timezone from API
    const summaryRes = await fetch(`${BASE_URL}/calendar/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const summaryData = (await summaryRes.json()) as any;
    assert.equal(summaryRes.status, 200);
    assert.equal(summaryData.data.summary.timezone, "Asia/Kolkata", "Company timezone must be Asia/Kolkata");

    // 3b. Verify date formatting across UTC boundary into Asia/Kolkata (IST UTC+05:30)
    // 2026-10-25 20:00:00 UTC is 2026-10-26 01:30:00 IST (+5:30 hours!)
    const lateUtcDate = new Date("2026-10-25T20:00:00.000Z");
    const formattedInIst = DeadlineService.formatInCompanyTimezone(lateUtcDate, "Asia/Kolkata");
    assert.equal(
      formattedInIst,
      "2026-10-26",
      "Late UTC time 20:00 must localize into the next calendar day 2026-10-26 in Asia/Kolkata"
    );

    // 3c. Verify business day calculation handles weekend skips consistently
    // Friday afternoon -> +1 business day is Monday afternoon
    const friday = new Date("2026-10-23T15:00:00.000Z");
    const nextBusinessDay = DeadlineService.addBusinessDays(friday, 1);
    assert.equal(nextBusinessDay.getDay(), 1, "Adding 1 business day to Friday must yield Monday (day 1)");
    assert.equal(nextBusinessDay.getDate(), 26, "Date must advance from 23rd to 26th");
  });

  // Verification Item 4: Mark a task completed and confirm overdue metrics update
  test("Verify 4: Mark a task completed and confirm overdue metrics update", async () => {
    // 4a. Capture overdue tasks count prior to completion
    const summaryBeforeRes = await fetch(`${BASE_URL}/calendar/summary?projectId=prj-01`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const summaryBefore = ((await summaryBeforeRes.json()) as any).data.summary;
    const initialOverdueCount = summaryBefore.overdueTasks;
    const initialCompletedCount = summaryBefore.completedTasks;
    assert.ok(initialOverdueCount >= 1, "There must be at least 1 overdue task before test");

    // 4b. Complete the overdue task
    const completeRes = await fetch(`${BASE_URL}/tasks/${overdueTaskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: "COMPLETED",
        completionPercentage: 100,
      }),
    });
    const completeData = (await completeRes.json()) as any;
    assert.equal(completeRes.status, 200, "Updating task to COMPLETED must return 200 OK");
    assert.equal(completeData.data.task.status, "COMPLETED");

    // 4c. Verify calendar summary metrics dynamically updated
    const summaryAfterRes = await fetch(`${BASE_URL}/calendar/summary?projectId=prj-01`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const summaryAfter = ((await summaryAfterRes.json()) as any).data.summary;

    assert.ok(
      summaryAfter.overdueTasks <= initialOverdueCount - 1,
      "Overdue count must decrease after task is marked COMPLETED"
    );
    assert.ok(
      summaryAfter.completedTasks >= initialCompletedCount + 1,
      "Completed count must increment after task is marked COMPLETED"
    );

    // 4d. Verify the completed task on the calendar event endpoint
    const calRes = await fetch(`${BASE_URL}/calendar/events?projectId=prj-01`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const calData = (await calRes.json()) as any;
    assert.equal(calRes.status, 200);

    const completedEvent = calData.data.events.find((e: any) => e.entityId === overdueTaskId);
    assert.ok(completedEvent, "Task must remain visible on calendar");
    assert.equal(completedEvent.status, "COMPLETED");
    assert.equal(completedEvent.deadlineStatus, "COMPLETED", "Deadline status must transition to COMPLETED");
    assert.equal(completedEvent.isOverdue, false, "Completed task must NOT be flagged as isOverdue");
    assert.equal(completedEvent.daysOverdue, 0, "Completed task must have 0 daysOverdue");
  });
});
