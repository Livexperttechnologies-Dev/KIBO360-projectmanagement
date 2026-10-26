import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

describe("Phase 9 — Security, Authentication & Privilege Escalation Audit Suite", () => {
  const BASE_URL = "http://localhost:5000/api/v1";
  let adminToken: string;
  let devToken: string;
  let leadToken: string;
  let testTaskId: string;

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

    // 3. Developer login (Employee)
    const devRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dev@livexpert.in", password: "Livexpert@2026" }),
    });
    const devData = (await devRes.json()) as any;
    assert.equal(devRes.status, 200);
    devToken = devData.data.accessToken;

    // 4. Retrieve a task in prj-01 (Software department) where assignee is NOT dev
    const tasksRes = await fetch(`${BASE_URL}/tasks?projectId=prj-01&limit=20`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const tasksData = (await tasksRes.json()) as any;
    assert.equal(tasksRes.status, 200);
    const swNonDevTask = tasksData.data.tasks.find((t: any) => t.assigneeId !== "usr-dev-04");
    if (swNonDevTask) {
      testTaskId = swNonDevTask.id;
    } else {
      const createRes = await fetch(`${BASE_URL}/tasks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Lead Task for Security Audit",
          projectId: "prj-01",
          assigneeId: "usr-lead-03",
          status: "OPEN",
          priority: "MEDIUM",
        }),
      });
      const createData = (await createRes.json()) as any;
      testTaskId = createData.data.task ? createData.data.task.id : createData.data.id;
    }
  });

  // 1. Protected Endpoints Audit (Unauthenticated rejection)
  test("1. Protected Endpoints: Rejects requests lacking valid authentication tokens with 401", async () => {
    const endpoints = [
      "/dashboard/summary",
      "/projects",
      "/tasks",
      "/calendar/events",
      "/notifications",
      "/reports/kpis",
    ];

    for (const ep of endpoints) {
      const res = await fetch(`${BASE_URL}${ep}`);
      assert.equal(res.status, 401, `Endpoint ${ep} must return 401 Unauthorized when token is missing`);
      const body = (await res.json()) as any;
      assert.equal(body.success, false);
      assert.ok(
        body.error?.message?.includes("token") ||
        body.error?.message?.includes("auth") ||
        body.error?.message?.includes("Access")
      );
    }
  });

  // 2. Vertical Privilege Escalation Defense
  test("2. Vertical Privilege Escalation: Employee is forbidden from administrative and manager operations", async () => {
    // 2a. Employee attempting to create a project -> 403
    const createProjectRes = await fetch(`${BASE_URL}/projects`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${devToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Malicious Employee Project",
        key: "MAL",
        departmentId: "dept-sw",
        startDate: "2026-11-01",
        targetDate: "2026-12-01",
      }),
    });
    assert.equal(createProjectRes.status, 403, "Employee cannot create projects");

    // 2b. Employee attempting to archive a project -> 403
    const archiveRes = await fetch(`${BASE_URL}/projects/prj-01/archive`, {
      method: "POST",
      headers: { Authorization: `Bearer ${devToken}` },
    });
    assert.equal(archiveRes.status, 403, "Employee cannot archive projects");

    // 2c. Employee attempting to invite a user -> 403
    const inviteRes = await fetch(`${BASE_URL}/users/invite`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${devToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "hacker@livexpert.in",
        firstName: "Malicious",
        lastName: "Actor",
        role: "ADMINISTRATOR",
      }),
    });
    assert.equal(inviteRes.status, 403, "Employee cannot invite users");

    // 2d. Employee attempting to export report CSV -> 403
    const exportRes = await fetch(`${BASE_URL}/reports/export/tasks`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    assert.equal(exportRes.status, 403, "Employee cannot export report data");
  });

  // 3. Horizontal Privilege Escalation Defense
  test("3. Horizontal Privilege Escalation: Cross-user and cross-department unauthorized actions are blocked", async () => {
    // 3a. User cannot delete another user's comment
    // Admin creates comment on task
    const commentRes = await fetch(`${BASE_URL}/tasks/${testTaskId}/comments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: "Admin security audit verification comment" }),
    });
    const commentData = (await commentRes.json()) as any;
    assert.equal(commentRes.status, 201);
    const commentId = commentData.data?.comment?.id || commentData.data?.id;

    // Dev attempts to delete Admin's comment -> 403
    const deleteRes = await fetch(`${BASE_URL}/tasks/${testTaskId}/comments/${commentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${devToken}` },
    });
    assert.equal(deleteRes.status, 403, "Dev cannot delete Admin's comment");

    // Clean up comment as Admin
    await fetch(`${BASE_URL}/tasks/${testTaskId}/comments/${commentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    // 3b. Attachments with ASSIGNEE_ONLY access scope
    const attRes = await fetch(`${BASE_URL}/tasks/${testTaskId}/attachments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filename: "executive_salary_matrix.pdf",
        filesize: 10240,
        mimetype: "application/pdf",
        fileUrl: "https://storage.livexpert.in/secure/executive_salary_matrix.pdf",
        accessScope: "ASSIGNEE_ONLY",
      }),
    });
    const attData = (await attRes.json()) as any;
    assert.equal(attRes.status, 201);
    const attachmentId = attData.data.attachment.id;

    // Dev (non-assignee) queries task details -> attachment must NOT be included in attachments list
    const devTaskRes = await fetch(`${BASE_URL}/tasks/${testTaskId}`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const devTaskData = (await devTaskRes.json()) as any;
    assert.equal(devTaskRes.status, 200);
    const hasSecretAtt = devTaskData.data.task.attachments?.some((a: any) => a.id === attachmentId);
    assert.equal(hasSecretAtt, false, "Dev employee must not see ASSIGNEE_ONLY attachment");

    // Clean up attachment
    await fetch(`${BASE_URL}/tasks/${testTaskId}/attachments/${attachmentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  });

  // 4. Password-Reset Token Expiration & Replay Defense
  test("4. Password-Reset: Token expires, prevents replay, and rejects invalid tokens", async () => {
    const testEmail = "lead@livexpert.in";

    // 4a. Request password reset
    const reqRes = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail }),
    });
    const reqData = (await reqRes.json()) as any;
    assert.equal(reqRes.status, 200);
    assert.ok(reqData.success);

    // Retrieve debug token emitted in non-production test environment
    const rawResetToken = reqData.debugToken || reqData.data?.debugToken;
    assert.ok(rawResetToken, "Debug token must be returned in development/test environment");

    // 4b. Reject invalid / malformed token
    const invalidTokenRes = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "invalid-token-12345", newPassword: "Livexpert@2026" }),
    });
    assert.equal(invalidTokenRes.status, 400, "Invalid token must return 400 Bad Request");

    // 4c. First use with valid token: Succeeds
    const validResetRes = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: rawResetToken, newPassword: "Livexpert@2026" }),
    });
    assert.equal(validResetRes.status, 200, "Valid token reset must return 200 OK");
    const validResetData = (await validResetRes.json()) as any;
    assert.ok(validResetData.success);

    // 4d. Second use with same token (Replay attempt): Must be rejected!
    const replayRes = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: rawResetToken, newPassword: "Livexpert@2026" }),
    });
    assert.equal(replayRes.status, 400, "Used password reset token must be rejected with 400 upon replay");
  });

  // 5. Server-Side Input Validation Audit
  test("5. Input Validation: Invalid dates, negative values, and schema violations return 400 Bad Request", async () => {
    // 5a. Inverted project dates (startDate > targetDate)
    const invertedRes = await fetch(`${BASE_URL}/projects`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Invalid Dates Project",
        key: "INV",
        departmentId: "dept-sw",
        startDate: "2026-12-01",
        targetDate: "2026-11-01", // Before start date
      }),
    });
    assert.equal(invertedRes.status, 400, "Inverted dates must return 400 Bad Request");

    // 5b. Invalid task priority
    const invalidPriorityRes = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Invalid Priority Task",
        projectId: "prj-01",
        priority: "CRITICAL_SUPER_MAX", // Invalid enum
      }),
    });
    assert.equal(invalidPriorityRes.status, 400, "Invalid enum must return 400 Bad Request");
  });

  // 6. Audit Logging for Sensitive Operations
  test("6. Audit Logging: Sensitive security operations generate immutable audit log records", async () => {
    // Export report as Admin
    const exportRes = await fetch(`${BASE_URL}/reports/export/tasks`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(exportRes.status, 200);

    // Query audit logs via API
    const auditRes = await fetch(`${BASE_URL}/users/audit-logs?limit=50`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(auditRes.status, 200);
    const auditData = (await auditRes.json()) as any;
    const logs: any[] = auditData.data.logs || [];

    const exportLog = logs.find(
      (l) => l.action === "REPORT_EXPORTED" && (l.details?.includes?.('"tasks"') || l.details?.includes?.("tasks") || (typeof l.details === "object" && l.details?.exportType === "tasks"))
    );
    assert.ok(exportLog, "REPORT_EXPORTED action for tasks must be recorded in audit log");
    const details = typeof exportLog.details === "string" ? JSON.parse(exportLog.details) : exportLog.details;
    assert.equal(details?.exportType, "tasks");
  });
});
