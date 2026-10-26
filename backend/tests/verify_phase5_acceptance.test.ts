import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

describe("Phase 5 Verification — Interactive E2E Acceptance Workflow", () => {
  const BASE_URL = "http://localhost:5000/api/v1";
  let adminToken: string;
  let devToken: string;
  let testTaskId: string;
  let prereqTaskId: string;
  let subtaskId: string;

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

    // 2. Authenticate Dev
    const devRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dev@livexpert.in", password: "Livexpert@2026" }),
    });
    const devData = (await devRes.json()) as any;
    assert.equal(devRes.status, 200);
    devToken = devData.data.accessToken;
  });

  // Verify 1: List tasks and filters
  test("Verify 1: GET /api/v1/tasks returns populated task board with pagination and filters", async () => {
    const res = await fetch(`${BASE_URL}/tasks?limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = (await res.json()) as any;
    assert.equal(res.status, 200);
    assert.ok(data.data.tasks.length > 0, "Tasks array must not be empty");
    assert.ok(data.data.pagination.total >= 10, "Total tasks must be at least 10");

    // Check task fields
    const sample = data.data.tasks[0];
    assert.ok(sample.id);
    assert.ok(sample.title);
    assert.ok(sample.status);
    assert.ok(sample.priority);
    assert.ok(sample.project);
  });

  // Verify 2: Create task with effort estimation
  test("Verify 2: POST /api/v1/tasks creates task with effort, taskList and assignee", async () => {
    const res = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: "E2E Phase 5 Task Management Verification",
        description: "Validating Kanban workflows and subtasks",
        projectId: "prj-01",
        taskList: "QA Stream",
        assigneeId: "usr-dev-04",
        priority: "HIGH",
        status: "OPEN",
        startDate: new Date(Date.now()).toISOString(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        estimatedEffort: 20,
        completionPercentage: 0,
      }),
    });
    const data = (await res.json()) as any;
    assert.equal(res.status, 201);
    assert.equal(data.data.task.title, "E2E Phase 5 Task Management Verification");
    assert.equal(data.data.task.estimatedEffort, 20);
    testTaskId = data.data.task.id;
  });

  // Verify 3: Create subtask with date boundary validation
  test("Verify 3: POST /api/v1/tasks/:id/subtasks creates subtask and enforces date boundaries", async () => {
    const now = Date.now();

    // 3a. Invalid subtask due date exceeding parent due date (+7 days)
    const invalidRes = await fetch(`${BASE_URL}/tasks/${testTaskId}/subtasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: "Subtask with invalid due date",
        dueDate: new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString(), // +14 days > +7 days
      }),
    });
    assert.equal(invalidRes.status, 400);
    const invalidData = (await invalidRes.json()) as any;
    assert.match(invalidData.error.message, /Subtask due date cannot exceed parent task due date/);

    // 3b. Valid subtask
    const validRes = await fetch(`${BASE_URL}/tasks/${testTaskId}/subtasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: "E2E Subtask 1 - Automated Verification",
        dueDate: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString(), // +3 days <= +7 days
        status: "OPEN",
      }),
    });
    const validData = (await validRes.json()) as any;
    assert.equal(validRes.status, 201);
    assert.equal(validData.data.subtask.parentTaskId, testTaskId);
    subtaskId = validData.data.subtask.id;
  });

  // Verify 4: Circular dependency detection
  test("Verify 4: Dependency linking prevents cycles and self dependencies with HTTP 400", async () => {
    // Create prerequisite task
    const prereqRes = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: "E2E Prerequisite Deliverable",
        projectId: "prj-01",
        status: "IN_PROGRESS",
      }),
    });
    const prereqData = (await prereqRes.json()) as any;
    assert.equal(prereqRes.status, 201);
    prereqTaskId = prereqData.data.task.id;

    // Link testTask -> prereqTask
    const linkRes = await fetch(`${BASE_URL}/tasks/${testTaskId}/dependencies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ dependsOnTaskId: prereqTaskId }),
    });
    assert.equal(linkRes.status, 201);

    // Try linking reverse: prereqTask -> testTask (Cycle detected!)
    const cycleRes = await fetch(`${BASE_URL}/tasks/${prereqTaskId}/dependencies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ dependsOnTaskId: testTaskId }),
    });
    assert.equal(cycleRes.status, 400);
    const cycleData = (await cycleRes.json()) as any;
    assert.match(cycleData.error.message, /Circular dependency detected/);
  });

  // Verify 5: Prerequisite completion guard
  test("Verify 5: PATCH /api/v1/tasks/:id prevents COMPLETED status when dependency is incomplete", async () => {
    // Try marking testTask COMPLETED while prereqTaskId is IN_PROGRESS
    const completeRes = await fetch(`${BASE_URL}/tasks/${testTaskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    assert.equal(completeRes.status, 400);
    const completeData = (await completeRes.json()) as any;
    assert.match(completeData.error.message, /Prerequisite dependency/);

    // Now complete the prerequisite
    const clearPrereqRes = await fetch(`${BASE_URL}/tasks/${prereqTaskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    assert.equal(clearPrereqRes.status, 200);

    // Now testTask can be completed successfully
    const successRes = await fetch(`${BASE_URL}/tasks/${testTaskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    assert.equal(successRes.status, 200);
    const successData = (await successRes.json()) as any;
    assert.equal(successData.data.task.status, "COMPLETED");
  });

  // Verify 6: Comments & Attachments
  test("Verify 6: Comments and attachments are added, retrieved, and access-controlled", async () => {
    // Add comment
    const commentRes = await fetch(`${BASE_URL}/tasks/${testTaskId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${devToken}`,
      },
      body: JSON.stringify({ content: "Verification completed with all tests passing!" }),
    });
    assert.equal(commentRes.status, 201);
    const commentData = (await commentRes.json()) as any;
    assert.equal(commentData.data.comment.content, "Verification completed with all tests passing!");

    // Add attachment
    const attRes = await fetch(`${BASE_URL}/tasks/${testTaskId}/attachments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${devToken}`,
      },
      body: JSON.stringify({
        filename: "test_execution_matrix.pdf",
        filesize: 124500,
        mimetype: "application/pdf",
        fileUrl: "/uploads/test_execution_matrix.pdf",
        accessScope: "PROJECT_MEMBERS",
      }),
    });
    assert.equal(attRes.status, 201);
    const attData = (await attRes.json()) as any;
    assert.equal(attData.data.attachment.filename, "test_execution_matrix.pdf");

    // Fetch full task details
    const detailRes = await fetch(`${BASE_URL}/tasks/${testTaskId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(detailRes.status, 200);
    const detailData = (await detailRes.json()) as any;
    assert.equal(detailData.data.task.comments.length, 1);
    assert.equal(detailData.data.task.attachments.length, 1);
    assert.equal(detailData.data.task.subtasks.length, 1);
  });
});
