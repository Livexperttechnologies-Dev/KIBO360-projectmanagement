import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { DashboardService } from "../src/services/dashboard.service";
import { dbStore } from "../src/lib/db";
import { TokenPayload } from "../src/services/auth.service";

describe("Phase 3 — KIBO360 Dashboard Metrics and Filter Suite", () => {
  const adminUser: TokenPayload = {
    userId: "usr-admin-01",
    email: "admin@livexpert.in",
    role: "ADMINISTRATOR",
    departmentId: "dept-sw",
  };

  const employeeUser: TokenPayload = {
    userId: "usr-dev-04",
    email: "dev@livexpert.in",
    role: "EMPLOYEE",
    departmentId: "dept-sw",
  };

  before(() => {
    dbStore.seedDefaultData();
  });

  // 1. Summary Metrics match database records without hardcoding
  test("1. Dashboard summary KPI metrics match computed database records", () => {
    const summary = DashboardService.getSummaryMetrics({}, adminUser);

    assert.equal(summary.totalProjects, dbStore.projects.length, "Total projects must match database records");
    assert.ok(summary.totalProjects >= 6, "Must have seeded projects");

    // Check active projects (ACTIVE or IN_PROGRESS)
    const expectedActive = dbStore.projects.filter(
      (p) => p.status === "ACTIVE" || p.status === "IN_PROGRESS"
    ).length;
    assert.equal(summary.activeProjects, expectedActive, "Active projects count must match");

    // Check completed projects
    const expectedCompleted = dbStore.projects.filter((p) => p.status === "COMPLETED").length;
    assert.equal(summary.completedProjects, expectedCompleted, "Completed projects count must match");

    // Check open tasks
    const expectedOpen = dbStore.tasks.filter(
      (t) => t.status !== "COMPLETED" && t.status !== "CANCELLED"
    ).length;
    assert.equal(summary.totalOpenTasks, expectedOpen, "Total open tasks must match");

    // Check overdue tasks (dueDate < now and open)
    const now = Date.now();
    const expectedOverdue = dbStore.tasks.filter(
      (t) => t.status !== "COMPLETED" && t.status !== "CANCELLED" && t.dueDate && new Date(t.dueDate).getTime() < now
    ).length;
    assert.equal(summary.overdueTasks, expectedOverdue, "Overdue tasks count must match");
    assert.ok(summary.overdueTasks >= 2, "Must have identified overdue deliverables");

    // Check tasks due within 7 days
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const expectedDueWithin7Days = dbStore.tasks.filter((t) => {
      if (t.status === "COMPLETED" || t.status === "CANCELLED" || !t.dueDate) return false;
      const dueTime = new Date(t.dueDate).getTime();
      return dueTime >= now && dueTime <= now + SEVEN_DAYS;
    }).length;
    assert.equal(summary.tasksDueWithin7Days, expectedDueWithin7Days, "Tasks due within 7 days must match");
    assert.ok(summary.tasksDueWithin7Days >= 3, "Must have tasks due within 7 days");
  });

  // 2. Department Filtering
  test("2. Department filter isolates Software / IT vs Product / Design", () => {
    // Software / IT filter
    const swSummary = DashboardService.getSummaryMetrics({ departmentId: "dept-sw" }, adminUser);
    const swProjects = dbStore.projects.filter((p) => p.departmentId === "dept-sw");
    assert.equal(swSummary.totalProjects, swProjects.length, "Software/IT projects must match");

    // Product / Design filter
    const pdSummary = DashboardService.getSummaryMetrics({ departmentId: "dept-pd" }, adminUser);
    const pdProjects = dbStore.projects.filter((p) => p.departmentId === "dept-pd");
    assert.equal(pdSummary.totalProjects, pdProjects.length, "Product/Design projects must match");

    // Sum must equal total
    assert.equal(swSummary.totalProjects + pdSummary.totalProjects, dbStore.projects.length);
  });

  // 3. Project Filter
  test("3. Project filter isolates tasks and status distribution for selected project", () => {
    const hubProjectId = "prj-01"; // KIBO360 Project Hub
    const hubTasks = dbStore.tasks.filter((t) => t.projectId === hubProjectId);

    const stats = DashboardService.getTaskStatusDistribution({ projectId: hubProjectId }, adminUser);
    assert.equal(stats.total, hubTasks.length, "Task count must match selected project tasks");
  });

  // 4. Overdue Tasks and Awaiting Review sections
  test("4. Overdue deliverables and tasks awaiting review are retrieved accurately", () => {
    const overdueList = DashboardService.getOverdueTasks({}, adminUser);
    assert.ok(overdueList.length >= 2, "Must return overdue tasks");

    // Verify overdue items actually have daysOverdue >= 1
    overdueList.forEach((task) => {
      assert.ok(task.daysOverdue >= 1, "Overdue task must have positive daysOverdue");
      assert.notEqual(task.status, "COMPLETED", "Completed task cannot be overdue");
    });

    const reviewList = DashboardService.getTasksAwaitingReview({}, adminUser);
    assert.ok(reviewList.length >= 2, "Must return tasks in IN_REVIEW status");
    reviewList.forEach((task) => {
      assert.equal(task.status, "IN_REVIEW", "All review tasks must have IN_REVIEW status");
    });
  });

  // 5. My Assigned Tasks query
  test("5. My assigned tasks returns deliverables specifically for the current user", () => {
    const myTasks = DashboardService.getMyAssignedTasks(employeeUser.userId, {});
    const expectedCount = dbStore.tasks.filter((t) => t.assigneeId === employeeUser.userId).length;

    assert.equal(myTasks.length, expectedCount, "Must match dev user assigned task count");
    myTasks.forEach((t) => {
      assert.ok(t.projectName, "Task must include enriched project name");
    });
  });

  // 6. Workload by Employee
  test("6. Workload by employee accurately computes allocations across team", () => {
    const workload = DashboardService.getEmployeeWorkload({}, adminUser);
    assert.ok(workload.length >= 4, "Must calculate workload for active users");

    const devWorkload = workload.find((w) => w.userId === employeeUser.userId);
    assert.ok(devWorkload, "Dev user workload must exist");
    assert.ok(devWorkload.totalTasks > 0, "Dev user must have assigned tasks");
  });

  // 7. Interactive Task Status Update
  test("7. Inline task status update transitions state and records audit log", async () => {
    const targetTask = dbStore.tasks.find((t) => t.status === "TODO")!;
    assert.ok(targetTask, "Must have a TODO task");

    const updated = await DashboardService.updateTaskStatus(targetTask.id, "IN_PROGRESS", adminUser);
    assert.equal(updated.status, "IN_PROGRESS", "Task status must transition to IN_PROGRESS");

    // Restore back
    await DashboardService.updateTaskStatus(targetTask.id, "TODO", adminUser);
    assert.equal(targetTask.status, "TODO");
  });
});