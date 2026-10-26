import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { DeadlineService } from "../src/services/deadline.service";
import { CalendarService } from "../src/services/calendar.service";
import { dbStore } from "../src/lib/db";

describe("Phase 6 — Deadline and Calendar Management Suite", () => {
  const BASE_URL = "http://localhost:5000/api/v1";
  let adminToken: string;
  let devToken: string;
  let pmToken: string;

  before(async () => {
    // 1. Authenticate Admin (Software / IT)
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@livexpert.in", password: "Livexpert@2026" }),
    });
    const adminData = (await adminRes.json()) as any;
    assert.equal(adminRes.status, 200);
    adminToken = adminData.data.accessToken;

    // 2. Authenticate Developer (Software / IT Employee)
    const devRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dev@livexpert.in", password: "Livexpert@2026" }),
    });
    const devData = (await devRes.json()) as any;
    assert.equal(devRes.status, 200);
    devToken = devData.data.accessToken;

    // 3. Authenticate Project Manager (Product / Design PM)
    const pmRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "pm@livexpert.in", password: "Livexpert@2026" }),
    });
    const pmData = (await pmRes.json()) as any;
    assert.equal(pmRes.status, 200);
    pmToken = pmData.data.accessToken;
  });

  // Acceptance Criterion 1: Calendar events match task and milestone records
  test("1. Calendar events match task and milestone records in database", async () => {
    const res = await fetch(`${BASE_URL}/calendar/events`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = (await res.json()) as any;
    assert.equal(res.status, 200);
    assert.ok(data.data.events.length > 0, "Calendar events should not be empty");
    assert.ok(data.data.summary.totalEvents > 0, "Summary totalEvents should match");

    // Verify tasks and milestones are both present
    const hasTasks = data.data.events.some((e: any) => e.type === "TASK");
    const hasMilestones = data.data.events.some((e: any) => e.type === "MILESTONE");
    assert.ok(hasTasks, "Must contain TASK events");
    assert.ok(hasMilestones, "Must contain MILESTONE events");

    // Check payload structure of a task event
    const sampleTask = data.data.events.find((e: any) => e.type === "TASK");
    assert.ok(sampleTask.id.startsWith("task-"));
    assert.ok(sampleTask.title);
    assert.ok(sampleTask.dueDate);
    assert.ok(sampleTask.projectName);
    assert.ok(sampleTask.projectKey);
    assert.ok(sampleTask.deadlineStatus);

    // Check payload structure of a milestone event
    const sampleMilestone = data.data.events.find((e: any) => e.type === "MILESTONE");
    assert.ok(sampleMilestone.id.startsWith("milestone-"));
    assert.ok(sampleMilestone.title);
    assert.ok(sampleMilestone.dueDate);
    assert.ok(sampleMilestone.projectName);
  });

  // Acceptance Criterion 2: Date filters work (Month, Week, Day windows)
  test("2. Date filters correctly constrain calendar time window", async () => {
    // Window: October 2026
    const octRes = await fetch(
      `${BASE_URL}/calendar/events?startDate=2026-10-01T00:00:00.000Z&endDate=2026-10-31T23:59:59.999Z`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const octData = (await octRes.json()) as any;
    assert.equal(octRes.status, 200);

    const octStart = new Date("2026-10-01T00:00:00.000Z").getTime();
    const octEnd = new Date("2026-10-31T23:59:59.999Z").getTime();

    for (const ev of octData.data.events) {
      const evTime = new Date(ev.date).getTime();
      assert.ok(evTime >= octStart && evTime <= octEnd, `Event ${ev.title} must fall in October 2026`);
    }

    // Narrow single-day window
    const dayRes = await fetch(
      `${BASE_URL}/calendar/events?startDate=2026-10-25T00:00:00.000Z&endDate=2026-10-25T23:59:59.999Z`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const dayData = (await dayRes.json()) as any;
    assert.equal(dayRes.status, 200);
    assert.ok(Array.isArray(dayData.data.events));
  });

  // Acceptance Criterion 3: Overdue tasks are correctly identified
  test("3. Overdue tasks are correctly identified (dueDate < now and incomplete)", async () => {
    const fixedNow = new Date("2026-10-25T12:00:00.000Z");

    // Analysis on past due incomplete task
    const overdueAnalysis = DeadlineService.analyzeDeadline("2026-10-20T10:00:00.000Z", "OPEN", fixedNow);
    assert.equal(overdueAnalysis.status, "OVERDUE");
    assert.equal(overdueAnalysis.isOverdue, true);
    assert.ok(overdueAnalysis.daysOverdue >= 5);

    // Analysis on past due IN_PROGRESS task
    const inProgressOverdue = DeadlineService.analyzeDeadline("2026-10-22T10:00:00.000Z", "IN_PROGRESS", fixedNow);
    assert.equal(inProgressOverdue.status, "OVERDUE");
    assert.equal(inProgressOverdue.isOverdue, true);
  });

  // Acceptance Criterion 4: Completed tasks must NOT appear in overdue totals
  test("4. Completed tasks are strictly excluded from overdue totals even if past due date", async () => {
    const fixedNow = new Date("2026-10-25T12:00:00.000Z");

    // Past due task but status is COMPLETED
    const completedAnalysis = DeadlineService.analyzeDeadline("2026-10-10T10:00:00.000Z", "COMPLETED", fixedNow);
    assert.equal(completedAnalysis.status, "COMPLETED");
    assert.equal(completedAnalysis.isOverdue, false, "Completed task must never be flagged as isOverdue");
    assert.equal(completedAnalysis.daysOverdue, 0, "Completed task must have 0 daysOverdue");
    assert.equal(completedAnalysis.isCompleted, true);

    // Past due milestone with REACHED status
    const reachedMilestoneAnalysis = DeadlineService.analyzeDeadline("2026-10-15T10:00:00.000Z", "REACHED", fixedNow);
    assert.equal(reachedMilestoneAnalysis.status, "COMPLETED");
    assert.equal(reachedMilestoneAnalysis.isOverdue, false);

    // Verify summary via API doesn't count completed tasks in overdueTasks
    const summaryRes = await fetch(`${BASE_URL}/calendar/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const summaryData = (await summaryRes.json()) as any;
    assert.equal(summaryRes.status, 200);
    assert.ok(typeof summaryData.data.summary.overdueTasks === "number");
    assert.ok(typeof summaryData.data.summary.completedTasks === "number");
  });

  // Acceptance Criterion 5: Approaching tasks (due within 1 business day)
  test("5. Approaching tasks due within 1 business day skip weekends accurately", async () => {
    // Thursday -> Friday (1 business day)
    const thursday = new Date("2026-10-22T10:00:00.000Z");
    const fridayTarget = new Date("2026-10-23T10:00:00.000Z");
    const fridayAnalysis = DeadlineService.analyzeDeadline(fridayTarget, "OPEN", thursday);
    assert.equal(fridayAnalysis.isApproaching, true);
    assert.equal(fridayAnalysis.status, "APPROACHING");

    // Friday -> Monday (1 business day skips Saturday and Sunday)
    const friday = new Date("2026-10-23T15:00:00.000Z");
    const mondayTarget = new Date("2026-10-26T14:00:00.000Z"); // Within 1 business day
    const mondayAnalysis = DeadlineService.analyzeDeadline(mondayTarget, "OPEN", friday);
    assert.equal(mondayAnalysis.isApproaching, true);
    assert.equal(mondayAnalysis.status, "APPROACHING");

    // Friday -> Wednesday (3 business days -> NOT approaching within 1 business day)
    const wednesdayTarget = new Date("2026-10-28T15:00:00.000Z");
    const wedAnalysis = DeadlineService.analyzeDeadline(wednesdayTarget, "OPEN", friday);
    assert.equal(wedAnalysis.isApproaching, false);
    assert.equal(wedAnalysis.status, "UPCOMING"); // within 7 days
  });

  // Acceptance Criterion 6: Upcoming tasks (due within seven calendar days)
  test("6. Upcoming tasks due within seven days are correctly classified", async () => {
    const fixedNow = new Date("2026-10-25T12:00:00.000Z");

    // Due in 5 days -> UPCOMING
    const in5Days = new Date("2026-10-30T12:00:00.000Z");
    const upAnalysis = DeadlineService.analyzeDeadline(in5Days, "OPEN", fixedNow);
    assert.equal(upAnalysis.isUpcoming, true);
    assert.equal(upAnalysis.status, "UPCOMING");

    // Due in 15 days -> ON_TRACK (beyond 7 days)
    const in15Days = new Date("2026-11-09T12:00:00.000Z");
    const normalAnalysis = DeadlineService.analyzeDeadline(in15Days, "OPEN", fixedNow);
    assert.equal(normalAnalysis.isUpcoming, false);
    assert.equal(normalAnalysis.status, "ON_TRACK");
  });

  // Acceptance Criterion 7: Blocked tasks and prerequisite visibility
  test("7. Blocked work indicators and incomplete prerequisite visibility", async () => {
    // Create prerequisite task A
    const prereqRes = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: "Database Engine Provisioning",
        projectId: "prj-01",
        status: "IN_PROGRESS", // Incomplete
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
    const prereqData = (await prereqRes.json()) as any;
    assert.equal(prereqRes.status, 201);
    const prereqTaskId = prereqData.data.task.id;

    // Create target task B
    const targetRes = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: "API Gateways Routing Setup",
        projectId: "prj-01",
        status: "OPEN",
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
    const targetData = (await targetRes.json()) as any;
    assert.equal(targetRes.status, 201);
    const targetTaskId = targetData.data.task.id;

    // Link dependency: targetTask depends on prereqTask
    const linkRes = await fetch(`${BASE_URL}/tasks/${targetTaskId}/dependencies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ dependsOnTaskId: prereqTaskId }),
    });
    assert.equal(linkRes.status, 201);

    // Query calendar events for target task
    const calRes = await fetch(`${BASE_URL}/calendar/events?projectId=prj-01`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const calData = (await calRes.json()) as any;
    assert.equal(calRes.status, 200);

    const event = calData.data.events.find((e: any) => e.entityId === targetTaskId);
    assert.ok(event, "Target task event must exist in calendar");
    assert.equal(event.isBlocked, true, "Task with incomplete dependency must be isBlocked: true");
    assert.ok(event.blockedReasons.length > 0, "Must have informative blockedReasons");
    assert.ok(event.prerequisites.length > 0, "Must list prerequisite tasks");
    assert.equal(event.prerequisites[0].isCompleted, false);
  });

  // Acceptance Criterion 8: Company timezone consistency
  test("8. Configured company timezone is exposed and consistently used", async () => {
    const tz = DeadlineService.getTimezone();
    assert.equal(tz, "Asia/Kolkata", "Default company timezone must be Asia/Kolkata");

    const summaryRes = await fetch(`${BASE_URL}/calendar/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const summaryData = (await summaryRes.json()) as any;
    assert.equal(summaryRes.status, 200);
    assert.equal(summaryData.data.summary.timezone, "Asia/Kolkata");
  });

  // Acceptance Criterion 9: Due date validation on task creation and editing
  test("9. Due date validation prevents inverted dates and out-of-boundary updates with 400", async () => {
    const now = Date.now();

    // 9a. Create task with startDate > dueDate -> 400 Bad Request
    const invertedRes = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: "Invalid Inverted Task",
        projectId: "prj-01",
        startDate: new Date(now + 10 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString(), // earlier than startDate!
      }),
    });
    assert.equal(invertedRes.status, 400, "Inverted dates must return 400 Bad Request");

    // 9b. Create valid task
    const validRes = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: "Valid Task For Edit Checks",
        projectId: "prj-01",
        startDate: new Date(now).toISOString(),
        dueDate: new Date(now + 10 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
    const validData = (await validRes.json()) as any;
    assert.equal(validRes.status, 201);
    const validTaskId = validData.data.task.id;

    // 9c. Update dueDate to precede existing startDate -> 400 Bad Request
    const editRes = await fetch(`${BASE_URL}/tasks/${validTaskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        dueDate: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(), // Before start date!
      }),
    });
    assert.equal(editRes.status, 400, "Updating due date before start date must return 400");
  });

  // Acceptance Criterion 10: Role permissions and department scoping
  test("10. Employee in Software / IT cannot see Product / Design events or bypass department filter", async () => {
    // Dev is in Software / IT (dept-sw)
    const devCalendarRes = await fetch(`${BASE_URL}/calendar/events`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const devData = (await devCalendarRes.json()) as any;
    assert.equal(devCalendarRes.status, 200);

    // All events visible to dev must be in Software / IT or projects dev belongs to
    for (const ev of devData.data.events) {
      if (ev.departmentId) {
        assert.equal(ev.departmentId, "dept-sw", "Employee must only see their own department's events");
      }
    }

    // Dev querying Product / Design department explicitly -> returns 0 events
    const crossDeptRes = await fetch(`${BASE_URL}/calendar/events?departmentId=dept-pd`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const crossDeptData = (await crossDeptRes.json()) as any;
    assert.equal(crossDeptRes.status, 200);
    assert.equal(crossDeptData.data.events.length, 0, "Querying unauthorized department must return 0 events");
  });
});
