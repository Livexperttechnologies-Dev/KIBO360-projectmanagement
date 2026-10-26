// ==============================================================================
// KIBO360 Project Hub — Phase 10 Production Launch Checks Test Suite
// Livexpert Technologies Pvt. Ltd.
// Systematically validates all 9 production launch criteria.
// ==============================================================================

import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { dbStore } from "../src/lib/db";
import { BackupRestoreService } from "../scripts/backup-restore";

describe("Phase 10 — Production Launch Checks Suite", () => {
  const BASE_URL = "http://localhost:5000/api/v1";
  let adminToken: string;
  let devToken: string;
  let testProjectId: string;

  const rootDir = fs.existsSync(path.resolve(process.cwd(), "deployment"))
    ? process.cwd()
    : path.resolve(__dirname, "..", "..", "..");

  before(async () => {
    // Authenticate Admin
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@livexpert.in", password: "Livexpert@2026" }),
    });
    assert.equal(adminRes.status, 200, "Admin login must succeed");
    const adminData = (await adminRes.json()) as any;
    adminToken = adminData.data.accessToken;

    // Authenticate Developer
    const devRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dev@livexpert.in", password: "Livexpert@2026" }),
    });
    assert.equal(devRes.status, 200, "Dev login must succeed");
    const devData = (await devRes.json()) as any;
    devToken = devData.data.accessToken;
  });

  // ----------------------------------------------------------------------------
  // Check 1: Login and Logout Work
  // ----------------------------------------------------------------------------
  test("Launch Check 1: Login and logout work seamlessly", async () => {
    // 1a. Test valid login
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "pm@livexpert.in", password: "Livexpert@2026" }),
    });
    assert.equal(loginRes.status, 200);
    const loginData = (await loginRes.json()) as any;
    assert.ok(loginData.data.accessToken, "Login must return access token");
    assert.equal(loginData.data.user.role, "PROJECT_MANAGER");

    // 1b. Test logout
    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${loginData.data.accessToken}`,
      },
    });
    assert.equal(logoutRes.status, 200);
    const logoutData = (await logoutRes.json()) as any;
    assert.equal(logoutData.success, true);
  });

  // ----------------------------------------------------------------------------
  // Check 2: Password Reset Works
  // ----------------------------------------------------------------------------
  test("Launch Check 2: Password reset workflow works with single-use security", async () => {
    // 2a. Request password reset token
    const forgotRes = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "lead@livexpert.in" }),
    });
    assert.equal(forgotRes.status, 200);
    const forgotData = (await forgotRes.json()) as any;
    const resetToken = forgotData.debugToken;
    assert.ok(resetToken, "Reset token must be generated");

    // 2b. Complete password reset with new password
    const newPassword = "Livexpert@New2026!";
    const resetRes = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: resetToken,
        newPassword,
      }),
    });
    assert.equal(resetRes.status, 200);

    // 2c. Log in with new password -> must succeed
    const newLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "lead@livexpert.in", password: newPassword }),
    });
    assert.equal(newLoginRes.status, 200);

    // 2d. Replay defense: reusing the same token must fail
    const replayRes = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: resetToken,
        newPassword: "AnotherPassword123!",
      }),
    });
    assert.equal(replayRes.status, 400, "Consumed password reset token must be rejected");

    // 2e. Restore original password for test consistency
    const restoreForgot = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "lead@livexpert.in" }),
    });
    const restoreToken = ((await restoreForgot.json()) as any).debugToken;
    await fetch(`${BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: restoreToken,
        newPassword: "Livexpert@2026",
      }),
    });
  });

  // ----------------------------------------------------------------------------
  // Check 3: User Roles and Permissions Enforced
  // ----------------------------------------------------------------------------
  test("Launch Check 3: User roles and vertical permissions are strictly enforced", async () => {
    // 3a. Admin can list users
    const adminUsersRes = await fetch(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminUsersRes.status, 200, "Admin must be authorized to query users");

    // 3b. Employee cannot list users
    const employeeUsersRes = await fetch(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    assert.equal(employeeUsersRes.status, 403, "Employee must be forbidden from querying all users");

    // 3c. Employee cannot create a project
    const employeeProjectRes = await fetch(`${BASE_URL}/projects`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${devToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Unauthorized Project Attempt",
        key: "UNAUTH",
        departmentId: "dept-sw",
      }),
    });
    assert.equal(employeeProjectRes.status, 403, "Employee must be forbidden from creating projects");
  });

  // ----------------------------------------------------------------------------
  // Check 4: Projects and Tasks Persist
  // ----------------------------------------------------------------------------
  test("Launch Check 4: Projects and tasks persist across requests", async () => {
    const timestamp = Date.now();
    const uniqueKey = `P${timestamp.toString().slice(-4)}`;
    // 4a. Create a persistent test project
    const projRes = await fetch(`${BASE_URL}/projects`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: `Production Launch Verification Project ${timestamp}`,
        key: uniqueKey,
        departmentId: "dept-sw",
        description: "Project for verifying persistence and task hierarchies",
        priority: "HIGH",
        startDate: new Date().toISOString(),
        dueDate: new Date(timestamp + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
    assert.equal(projRes.status, 201);
    const projData = (await projRes.json()) as any;
    testProjectId = projData.data.project.id;

    // 4b. Create a task in the project
    const taskRes = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Verify Database Persistence On-Disk",
        projectId: testProjectId,
        priority: "URGENT",
        status: "IN_PROGRESS",
        estimatedEffort: 12,
        dueDate: new Date(timestamp + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
    assert.equal(taskRes.status, 201);
    const taskData = (await taskRes.json()) as any;
    const taskId = taskData.data.task.id;

    // 4c. Query task via GET endpoint to confirm retrieval from database
    const getTaskRes = await fetch(`${BASE_URL}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(getTaskRes.status, 200);
    const retrievedTask = ((await getTaskRes.json()) as any).data.task;
    assert.equal(retrievedTask.title, "Verify Database Persistence On-Disk");
    assert.equal(retrievedTask.projectId, testProjectId);
    assert.equal(retrievedTask.priority, "URGENT");
  });

  // ----------------------------------------------------------------------------
  // Check 5: Deadlines and Notifications Work
  // ----------------------------------------------------------------------------
  test("Launch Check 5: Deadlines and notification delivery work reliably", async () => {
    // 5a. Create a task assigned to dev user
    const now = Date.now();
    const taskRes = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: `Notification Delivery Verification Task ${now}`,
        projectId: "prj-01",
        assigneeId: "usr-dev-04",
        status: "OPEN",
        dueDate: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
    assert.equal(taskRes.status, 201);
    const taskData = (await taskRes.json()) as any;
    const taskId = taskData.data.task ? taskData.data.task.id : taskData.data.id;

    // 5b. Dev queries notifications: should receive NEW_TASK_ASSIGNMENT
    const notifsRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    assert.equal(notifsRes.status, 200);
    const notifsData = (await notifsRes.json()) as any;
    const assignmentNotif = notifsData.data.notifications.find(
      (n: any) => n.entityId === taskId && n.type === "NEW_TASK_ASSIGNMENT"
    );
    assert.ok(assignmentNotif, "Assignee must receive NEW_TASK_ASSIGNMENT notification");

    // 5c. Test mark notification as read
    const markReadRes = await fetch(`${BASE_URL}/notifications/${assignmentNotif.id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${devToken}` },
    });
    assert.equal(markReadRes.status, 200);
    const markReadData = (await markReadRes.json()) as any;
    const notifRecord = markReadData.data?.notification || markReadData.data;
    assert.equal(notifRecord.isRead, true);
  });

  // ----------------------------------------------------------------------------
  // Check 6: Reports Match the Database
  // ----------------------------------------------------------------------------
  test("Launch Check 6: Reports and management KPIs strictly match database state", async () => {
    const kpiRes = await fetch(`${BASE_URL}/reports/kpis`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(kpiRes.status, 200);
    const kpiData = (await kpiRes.json()) as any;
    const kpis = kpiData.data;

    // Compare with server tasks
    const tasksRes = await fetch(`${BASE_URL}/tasks?limit=100`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const tasksData = (await tasksRes.json()) as any;
    const rootTasks = tasksData.data.tasks.filter((t: any) => !t.parentTaskId);
    assert.equal(kpis.totalTasks, rootTasks.length, "totalTasks KPI must match root server tasks");

    // Validate ownership coverage formula
    const expectedCoverage =
      kpis.ownershipCoverage.totalOpenTasks > 0
        ? Number(((kpis.ownershipCoverage.openWithAssigneeAndDueDate / kpis.ownershipCoverage.totalOpenTasks) * 100).toFixed(1))
        : 100.0;
    assert.equal(kpis.ownershipCoverage.rate, expectedCoverage);
  });

  // ----------------------------------------------------------------------------
  // Check 7: HTTPS, TLS Certificates & Reverse Proxy Headers
  // ----------------------------------------------------------------------------
  test("Launch Check 7: HTTPS TLS certificates and security headers are configured", async () => {
    // 7a. Verify TLS certificates exist on disk
    const sslDir = path.join(rootDir, "deployment", "ssl");
    const certPath = path.join(sslDir, "kibo360.crt");
    const keyPath = path.join(sslDir, "kibo360.key");

    assert.ok(fs.existsSync(certPath), "TLS certificate file must exist at deployment/ssl/kibo360.crt");
    assert.ok(fs.existsSync(keyPath), "TLS private key file must exist at deployment/ssl/kibo360.key");

    const certContent = fs.readFileSync(certPath, "utf8");
    assert.ok(certContent.includes("BEGIN CERTIFICATE"), "Certificate must be standard PEM encoded X.509");

    // 7b. Verify Nginx virtual host configuration enforces HTTPS redirect and HSTS
    const nginxConfPath = path.join(rootDir, "deployment", "nginx", "kibo360.conf");
    assert.ok(fs.existsSync(nginxConfPath), "Nginx virtual host configuration must exist");
    const nginxContent = fs.readFileSync(nginxConfPath, "utf8");
    assert.ok(nginxContent.includes("listen 443 ssl"), "Nginx config must listen on port 443 with SSL");
    assert.ok(nginxContent.includes("Strict-Transport-Security"), "Nginx config must declare HSTS header");
    assert.ok(nginxContent.includes("return 301 https://"), "Nginx config must redirect port 80 to HTTPS");

    // 7c. Verify backend returns Helmet security headers
    const healthRes = await fetch(`${BASE_URL}/health`);
    assert.equal(healthRes.headers.get("x-content-type-options"), "nosniff");
  });

  // ----------------------------------------------------------------------------
  // Check 8: Secrets Are Not Exposed
  // ----------------------------------------------------------------------------
  test("Launch Check 8: Secrets and sensitive credentials are never exposed", async () => {
    // 8a. User profile queries must never expose password hashes
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(meRes.status, 200);
    const meData = (await meRes.json()) as any;
    assert.equal(meData.data.user.passwordHash, undefined, "passwordHash must never be exposed");
    assert.equal(meData.data.user.password, undefined, "password must never be exposed");

    // 8b. Gitignore must protect local secrets
    const gitignorePath = path.join(rootDir, ".gitignore");
    assert.ok(fs.existsSync(gitignorePath));
    const gitignoreContent = fs.readFileSync(gitignorePath, "utf8");
    assert.ok(gitignoreContent.includes(".env"), ".gitignore must exclude .env files");

    // 8c. Pre-flight environment verifier passes production configuration check
    const prodEnvExample = path.join(rootDir, ".env.production.example");
    const verifyScript = path.join(rootDir, "deployment", "scripts", "verify-env.ts");
    assert.doesNotThrow(() => {
      execSync(`npx tsx "${verifyScript}" "${prodEnvExample}"`, { encoding: "utf8", cwd: rootDir });
    }, "Production environment template must pass all validation checks");
  });

  // ----------------------------------------------------------------------------
  // Check 9: Backups and Recovery Procedures Verified
  // ----------------------------------------------------------------------------
  test("Launch Check 9: Backup creation and disaster recovery restoration work", async () => {
    // 9a. Test snapshot generation
    const snapshot = BackupRestoreService.createSnapshot();
    assert.ok(snapshot.metadata.version === "2.0.0");
    assert.ok(snapshot.metadata.createdAt);
    assert.ok(snapshot.data.users.length > 0);
    assert.ok(snapshot.data.projects.length > 0);
    assert.ok(snapshot.data.tasks.length > 0);

    // 9b. Verify restoration integrity
    const originalUsersCount = dbStore.users.length;
    const restoreResult = BackupRestoreService.restoreSnapshot(snapshot);
    assert.equal(restoreResult.success, true);
    assert.equal(dbStore.users.length, originalUsersCount, "Restoration must match original record count");
  });
});
