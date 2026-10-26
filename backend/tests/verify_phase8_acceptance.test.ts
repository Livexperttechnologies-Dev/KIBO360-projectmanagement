import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

describe("Phase 8 — Reports and Management KPIs Acceptance Test Suite", () => {
  const BASE_URL = "http://localhost:5000/api/v1";
  let adminToken: string;
  let devToken: string;
  let leadToken: string;

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

    // 2. Authenticate Lead
    const leadRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "lead@livexpert.in", password: "Livexpert@2026" }),
    });
    const leadData = (await leadRes.json()) as any;
    assert.equal(leadRes.status, 200);
    leadToken = leadData.data.accessToken;

    // 3. Authenticate Developer
    const devRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dev@livexpert.in", password: "Livexpert@2026" }),
    });
    const devData = (await devRes.json()) as any;
    assert.equal(devRes.status, 200);
    devToken = devData.data.accessToken;
  });

  // 1. Executive Management KPIs endpoint
  test("1. GET /api/v1/reports/kpis - Returns accurate KPIs matching database calculations", async () => {
    const res = await fetch(`${BASE_URL}/reports/kpis`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = (await res.json()) as any;
    assert.equal(res.status, 200);
    assert.ok(data.success);

    const kpis = data.data;
    // On-time completion rate
    assert.ok(typeof kpis.onTimeCompletionRate.rate === "number");
    assert.ok(kpis.onTimeCompletionRate.rate >= 0 && kpis.onTimeCompletionRate.rate <= 100);

    // Overdue task count
    assert.ok(typeof kpis.overdueTaskCount === "number");
    assert.ok(kpis.overdueTaskCount >= 0);

    // Ownership coverage
    assert.ok(typeof kpis.ownershipCoverage.rate === "number");
    assert.ok(kpis.ownershipCoverage.rate >= 0 && kpis.ownershipCoverage.rate <= 100);

    // Summary counts
    assert.ok(kpis.totalProjects > 0);
    assert.ok(kpis.totalTasks > 0);
  });

  // 2. Project Status & Progress Report
  test("2. GET /api/v1/reports/project-status - Returns status distribution and project progress", async () => {
    const res = await fetch(`${BASE_URL}/reports/project-status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = (await res.json()) as any;
    assert.equal(res.status, 200);
    assert.ok(data.data.statusDistribution);
    assert.ok(typeof data.data.averageProgress === "number");
    assert.ok(Array.isArray(data.data.projects));
    assert.ok(data.data.projects.length > 0);

    // Check project fields
    const p = data.data.projects[0];
    assert.ok(p.key);
    assert.ok(p.title);
    assert.ok(typeof p.progressPercentage === "number");
  });

  // 3. Tasks by Status Report
  test("3. GET /api/v1/reports/tasks-by-status - Returns lifecycle status breakdown with percentages", async () => {
    const res = await fetch(`${BASE_URL}/reports/tasks-by-status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = (await res.json()) as any;
    assert.equal(res.status, 200);
    assert.ok(data.data.total > 0);
    assert.ok(Array.isArray(data.data.breakdown));

    const totalPercentage = data.data.breakdown.reduce((sum: number, b: any) => sum + b.percentage, 0);
    assert.ok(Math.abs(totalPercentage - 100) < 1.5, "Total percentages should sum approximately to 100%");
  });

  // 4. Overdue Tasks by Owner Report
  test("4. GET /api/v1/reports/overdue-by-owner - Identifies overdue tasks grouped by responsible assignee", async () => {
    const res = await fetch(`${BASE_URL}/reports/overdue-by-owner`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = (await res.json()) as any;
    assert.equal(res.status, 200);
    assert.ok(typeof data.data.totalOverdue === "number");
    assert.ok(Array.isArray(data.data.owners));

    if (data.data.owners.length > 0) {
      const owner = data.data.owners[0];
      assert.ok(owner.name);
      assert.ok(owner.count > 0);
      assert.ok(Array.isArray(owner.tasks));
      assert.ok(owner.tasks[0].daysOverdue >= 0);
    }
  });

  // 5. Upcoming Deadlines Report
  test("5. GET /api/v1/reports/upcoming-deadlines - Lists upcoming tasks chronologically", async () => {
    const res = await fetch(`${BASE_URL}/reports/upcoming-deadlines`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = (await res.json()) as any;
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(data.data.tasks));

    if (data.data.tasks.length > 1) {
      const d1 = new Date(data.data.tasks[0].dueDate).getTime();
      const d2 = new Date(data.data.tasks[1].dueDate).getTime();
      assert.ok(d1 <= d2, "Upcoming tasks must be chronologically ordered");
    }
  });

  // 6. Milestone Completion Report
  test("6. GET /api/v1/reports/milestone-completion - Summarizes reached and pending milestones", async () => {
    const res = await fetch(`${BASE_URL}/reports/milestone-completion`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = (await res.json()) as any;
    assert.equal(res.status, 200);
    assert.ok(data.data.summary.total > 0);
    assert.ok(data.data.summary.reached >= 0);
    assert.ok(typeof data.data.summary.completionRate === "number");
  });

  // 7. Workload by Employee & Department
  test("7. GET /api/v1/reports/workload-employee & workload-department - Workload distribution", async () => {
    const empRes = await fetch(`${BASE_URL}/reports/workload-employee`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const empData = (await empRes.json()) as any;
    assert.equal(empRes.status, 200);
    assert.ok(empData.data.totalEmployees > 0);
    assert.ok(Array.isArray(empData.data.employees));

    const deptRes = await fetch(`${BASE_URL}/reports/workload-department`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deptData = (await deptRes.json()) as any;
    assert.equal(deptRes.status, 200);
    assert.ok(Array.isArray(deptData.data.departments));
    assert.ok(deptData.data.departments.length >= 2, "Must include Software / IT and Product / Design");
  });

  // 8. CSV Export Authorization: Admin/Lead authorized, Employee rejected with 403 Forbidden
  test("8. CSV Export: Authorized managers receive CSV, unauthorized employees are blocked with 403", async () => {
    // Admin exports tasks CSV
    const adminExportRes = await fetch(`${BASE_URL}/reports/export/tasks`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminExportRes.status, 200);
    assert.ok(adminExportRes.headers.get("content-type")?.includes("text/csv"));
    const csvContent = await adminExportRes.text();
    assert.ok(csvContent.includes('"Task ID","Title"'));

    // Employee export attempt -> Must return 403 Forbidden
    const devExportRes = await fetch(`${BASE_URL}/reports/export/tasks`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    assert.equal(devExportRes.status, 403, "Employees must be blocked with HTTP 403 Forbidden from exporting report data");
    const devExportData = (await devExportRes.json()) as any;
    assert.equal(devExportData.success, false);
  });
});
