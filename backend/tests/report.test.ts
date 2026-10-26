import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { ReportService } from "../src/services/report.service";
import { dbStore, TaskRecord } from "../src/lib/db";
import { TokenPayload } from "../src/services/auth.service";

describe("Phase 8 — Reports and Management KPIs Unit Tests", () => {
  const adminUser: TokenPayload = {
    userId: "usr-admin-01",
    email: "admin@livexpert.in",
    role: "ADMINISTRATOR",
    departmentId: "dept-sw",
  };

  const devUser: TokenPayload = {
    userId: "usr-dev-04",
    email: "dev@livexpert.in",
    role: "EMPLOYEE",
    departmentId: "dept-sw",
  };

  test("1. KPI Calculation: On-time task completion rate formula", () => {
    const kpis = ReportService.getManagementKPIs({}, adminUser);
    assert.ok(kpis.onTimeCompletionRate.rate >= 0 && kpis.onTimeCompletionRate.rate <= 100);
    assert.ok(typeof kpis.onTimeCompletionRate.completedOnTime === "number");
    assert.ok(typeof kpis.onTimeCompletionRate.totalCompletedWithDueDate === "number");

    // Mathematical formula verification: rate = (completedOnTime / totalCompletedWithDueDate) * 100
    if (kpis.onTimeCompletionRate.totalCompletedWithDueDate > 0) {
      const expectedRate = Number(
        (
          (kpis.onTimeCompletionRate.completedOnTime / kpis.onTimeCompletionRate.totalCompletedWithDueDate) *
          100
        ).toFixed(1)
      );
      assert.equal(kpis.onTimeCompletionRate.rate, expectedRate);
    }
  });

  test("2. KPI Calculation: Overdue task count (past due date, incomplete, timezone aware)", () => {
    const kpis = ReportService.getManagementKPIs({}, adminUser);
    assert.ok(kpis.overdueTaskCount >= 0);

    // Verify overdue tasks in dbStore strictly match
    const nowTime = Date.now();
    const expectedOverdue = dbStore.tasks.filter(
      (t) => !t.parentTaskId && t.status !== "COMPLETED" && t.dueDate && new Date(t.dueDate).getTime() < nowTime
    ).length;
    assert.equal(kpis.overdueTaskCount, expectedOverdue);
  });

  test("3. KPI Calculation: Ownership coverage formula", () => {
    const kpis = ReportService.getManagementKPIs({}, adminUser);
    assert.ok(kpis.ownershipCoverage.rate >= 0 && kpis.ownershipCoverage.rate <= 100);

    // Formula verification: rate = (openWithAssigneeAndDueDate / totalOpenTasks) * 100
    if (kpis.ownershipCoverage.totalOpenTasks > 0) {
      const expectedRate = Number(
        (
          (kpis.ownershipCoverage.openWithAssigneeAndDueDate / kpis.ownershipCoverage.totalOpenTasks) *
          100
        ).toFixed(1)
      );
      assert.equal(kpis.ownershipCoverage.rate, expectedRate);
    }
  });

  test("4. Subtask Double-Counting Protection: Subtasks are excluded from root task KPI totals", () => {
    const rootTasks = dbStore.tasks.filter((t) => !t.parentTaskId);
    const allTasks = dbStore.tasks;

    const kpis = ReportService.getManagementKPIs({}, adminUser);
    assert.equal(kpis.totalTasks, rootTasks.length);
    assert.ok(kpis.totalTasks <= allTasks.length, "Root task total must not include subtasks");
  });

  test("5. Role-based scoping: Employee in Software / IT cannot query Product / Design department", () => {
    // Dev attempts to query Product / Design department (dept-pd)
    const pdProjects = ReportService.getScopedProjects({ departmentId: "dept-pd" }, devUser);
    assert.equal(pdProjects.length, 0, "Employee querying unauthorized department must return 0 records");

    // Admin can query Product / Design department
    const adminPdProjects = ReportService.getScopedProjects({ departmentId: "dept-pd" }, adminUser);
    assert.ok(adminPdProjects.length > 0, "Admin can query Product / Design department");
  });

  test("6. Date Range Filtering: Bounds are computed accurately", () => {
    const bounds7d = ReportService.getDateRangeBounds({ dateRange: "last_7_days" });
    assert.ok(bounds7d.start);
    assert.ok(bounds7d.end);
    const diffDays = Math.round((bounds7d.end!.getTime() - bounds7d.start!.getTime()) / (24 * 60 * 60 * 1000));
    assert.equal(diffDays, 7);

    const boundsMonth = ReportService.getDateRangeBounds({ dateRange: "this_month" });
    assert.ok(boundsMonth.start);
    assert.ok(boundsMonth.end);
    assert.equal(boundsMonth.start!.getDate(), 1);
  });

  test("7. CSV Export Engine: Generates valid CSV for authorized roles and forbids employees", () => {
    // Admin export
    const tasksCSV = ReportService.generateCSV("tasks", {}, adminUser);
    assert.ok(tasksCSV.includes('"Task ID","Title","Project Key"'));
    assert.ok(tasksCSV.includes("\r\n"));

    const projectsCSV = ReportService.generateCSV("projects", {}, adminUser);
    assert.ok(projectsCSV.includes('"Project Code","Title","Department"'));

    const kpisCSV = ReportService.generateCSV("kpis", {}, adminUser);
    assert.ok(kpisCSV.includes('"On-Time Completion Rate"'));
    assert.ok(kpisCSV.includes('"Ownership Coverage"'));

    // Employee export attempt must throw 403 Forbidden
    assert.throws(
      () => {
        ReportService.generateCSV("tasks", {}, devUser);
      },
      (err: any) => err.statusCode === 403
    );
  });
});
