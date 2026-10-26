import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

describe("Phase 5 User Verification Workflow Suite", () => {
  const BASE_URL = "http://localhost:5000/api/v1";
  let adminToken: string;
  let devToken: string;
  let createdTaskId: string;
  let subtask1Id: string;
  let subtask2Id: string;

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

    // 2. Authenticate Dev Employee (usr-dev-04)
    const devRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dev@livexpert.in", password: "Livexpert@2026" }),
    });
    const devData = (await devRes.json()) as any;
    assert.equal(devRes.status, 200, "Dev login must succeed");
    devToken = devData.data.accessToken;
  });

  // Step 1: Create a task and assign an employee
  test("Step 1: Create a task and assign an employee", async () => {
    const now = Date.now();
    const taskPayload = {
      title: "Full-Stack Telemetry Ingestion Engine",
      description: "Build robust high-throughput telemetry ingestion service with audit logging",
      projectId: "prj-01", // KIBO360 Project Hub
      taskList: "Backend Stream",
      assigneeId: "usr-dev-04", // Assign to Dev Contributor
      reviewerId: "usr-admin-01",
      priority: "MEDIUM",
      status: "OPEN",
      startDate: new Date(now).toISOString(),
      dueDate: new Date(now + 6 * 24 * 60 * 60 * 1000).toISOString(), // Due in 6 days
      estimatedEffort: 32,
      completionPercentage: 0,
    };

    const res = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(taskPayload),
    });

    const data = (await res.json()) as any;
    assert.equal(res.status, 201, "Task creation must return 201 Created");
    assert.ok(data.data.task.id, "Task must have generated id");
    assert.equal(data.data.task.title, taskPayload.title);
    assert.equal(data.data.task.assigneeId, "usr-dev-04");
    assert.equal(data.data.task.priority, "MEDIUM");
    assert.equal(data.data.task.status, "OPEN");

    createdTaskId = data.data.task.id;
  });

  // Step 2: Add subtasks
  test("Step 2: Add subtasks", async () => {
    const now = Date.now();

    // Subtask 1
    const sub1Res = await fetch(`${BASE_URL}/tasks/${createdTaskId}/subtasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: "Define Prisma telemetry schema models",
        status: "OPEN",
        dueDate: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString(), // +2 days <= +6 days parent
      }),
    });
    const sub1Data = (await sub1Res.json()) as any;
    assert.equal(sub1Res.status, 201, "Subtask 1 creation must return 201");
    assert.equal(sub1Data.data.subtask.parentTaskId, createdTaskId);
    subtask1Id = sub1Data.data.subtask.id;

    // Subtask 2
    const sub2Res = await fetch(`${BASE_URL}/tasks/${createdTaskId}/subtasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: "Implement REST ingestion handlers and validation",
        status: "OPEN",
        dueDate: new Date(now + 4 * 24 * 60 * 60 * 1000).toISOString(), // +4 days <= +6 days parent
      }),
    });
    const sub2Data = (await sub2Res.json()) as any;
    assert.equal(sub2Res.status, 201, "Subtask 2 creation must return 201");
    assert.equal(sub2Data.data.subtask.parentTaskId, createdTaskId);
    subtask2Id = sub2Data.data.subtask.id;

    // Verify parent task reflects subtask count
    const detailRes = await fetch(`${BASE_URL}/tasks/${createdTaskId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const detailData = (await detailRes.json()) as any;
    assert.equal(detailRes.status, 200);
    assert.equal(detailData.data.task.subtasks.length, 2, "Parent task must have 2 subtasks");
  });

  // Step 3: Change status and priority
  test("Step 3: Change status and priority", async () => {
    // Update priority from MEDIUM -> URGENT and status from OPEN -> UNDER_REVIEW
    const updateRes = await fetch(`${BASE_URL}/tasks/${createdTaskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        priority: "URGENT",
        status: "UNDER_REVIEW",
        completionPercentage: 80,
      }),
    });

    const updateData = (await updateRes.json()) as any;
    assert.equal(updateRes.status, 200, "Update must return 200 OK");
    assert.equal(updateData.data.task.priority, "URGENT", "Priority must be updated to URGENT");
    assert.equal(updateData.data.task.status, "UNDER_REVIEW", "Status must be updated to UNDER_REVIEW");
    assert.equal(updateData.data.task.completionPercentage, 80);
  });

  // Step 4: Add comments and attachments
  test("Step 4: Add comments and attachments", async () => {
    // 4a. Add comment as Dev Contributor
    const commentRes = await fetch(`${BASE_URL}/tasks/${createdTaskId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${devToken}`,
      },
      body: JSON.stringify({
        content: "Telemetry models and endpoints verified with 100% test coverage.",
      }),
    });
    const commentData = (await commentRes.json()) as any;
    assert.equal(commentRes.status, 201, "Comment creation must return 201");
    assert.equal(commentData.data.comment.content, "Telemetry models and endpoints verified with 100% test coverage.");
    assert.equal(commentData.data.comment.userId, "usr-dev-04");

    // 4b. Add attachment
    const attRes = await fetch(`${BASE_URL}/tasks/${createdTaskId}/attachments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${devToken}`,
      },
      body: JSON.stringify({
        filename: "telemetry_architecture_spec_v1.pdf",
        filesize: 524288,
        mimetype: "application/pdf",
        fileUrl: "/uploads/tasks/telemetry_architecture_spec_v1.pdf",
        accessScope: "PROJECT_MEMBERS",
      }),
    });
    const attData = (await attRes.json()) as any;
    assert.equal(attRes.status, 201, "Attachment creation must return 201");
    assert.equal(attData.data.attachment.filename, "telemetry_architecture_spec_v1.pdf");
    assert.equal(attData.data.attachment.accessScope, "PROJECT_MEMBERS");

    // Verify task details contains both comment and attachment
    const detailRes = await fetch(`${BASE_URL}/tasks/${createdTaskId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const detailData = (await detailRes.json()) as any;
    assert.equal(detailRes.status, 200);
    assert.equal(detailData.data.task.comments.length, 1);
    assert.equal(detailData.data.task.attachments.length, 1);
  });

  // Step 5: Confirm the task appears on the correct dashboards
  test("Step 5: Confirm the task appears on the correct dashboards", async () => {
    // 5a. Check Employee Personal Deliverables: GET /api/v1/dashboard/my-tasks for Dev
    const devDashboardRes = await fetch(`${BASE_URL}/dashboard/my-tasks`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const devDashboardData = (await devDashboardRes.json()) as any;
    assert.equal(devDashboardRes.status, 200);

    const devTasks = devDashboardData.data.tasks;
    const foundInMyTasks = devTasks.some((t: any) => t.id === createdTaskId);
    assert.ok(foundInMyTasks, "Task must appear in dev user's personal dashboard deliverables (/dashboard/my-tasks)");

    // 5b. Check Tasks Awaiting Review: GET /api/v1/dashboard/awaiting-review
    const reviewRes = await fetch(`${BASE_URL}/dashboard/awaiting-review`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const reviewData = (await reviewRes.json()) as any;
    assert.equal(reviewRes.status, 200);
    const foundInReviewQueue = reviewData.data.tasks.some((t: any) => t.id === createdTaskId);
    assert.ok(foundInReviewQueue, "Task must appear in Tasks Awaiting Review dashboard section");

    // 5c. Check MyTasks page API: GET /api/v1/tasks?assigneeId=usr-dev-04
    const myTasksPageRes = await fetch(`${BASE_URL}/tasks?assigneeId=usr-dev-04`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const myTasksPageData = (await myTasksPageRes.json()) as any;
    assert.equal(myTasksPageRes.status, 200);
    const foundInMyTasksPage = myTasksPageData.data.tasks.some((t: any) => t.id === createdTaskId);
    assert.ok(foundInMyTasksPage, "Task must appear on My Tasks page (/my-tasks)");

    // 5d. Check Team Tasks Kanban query: GET /api/v1/tasks?status=UNDER_REVIEW
    const kanbanRes = await fetch(`${BASE_URL}/tasks?status=UNDER_REVIEW`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const kanbanData = (await kanbanRes.json()) as any;
    assert.equal(kanbanRes.status, 200);
    const foundInKanbanColumn = kanbanData.data.tasks.some((t: any) => t.id === createdTaskId);
    assert.ok(foundInKanbanColumn, "Task must appear in the UNDER_REVIEW column on Team Tasks Kanban board");

    // 5e. Check Dashboard Status Distribution includes the task
    const distRes = await fetch(`${BASE_URL}/dashboard/status-stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const distData = (await distRes.json()) as any;
    assert.equal(distRes.status, 200);
    const underReviewStat = distData.data.distribution.find((d: any) => d.status === "UNDER_REVIEW");
    assert.ok(underReviewStat && underReviewStat.count >= 1, "Status distribution must include UNDER_REVIEW tasks");
  });
});
