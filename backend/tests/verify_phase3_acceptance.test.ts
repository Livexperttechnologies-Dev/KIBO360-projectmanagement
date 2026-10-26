import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { DashboardService } from "../src/services/dashboard.service";
import { dbStore, TaskRecord, ProjectRecord } from "../src/lib/db";
import { TokenPayload } from "../src/services/auth.service";

describe("Phase 3 Verification — Formal Acceptance Criteria Test Suite", () => {
  const adminUser: TokenPayload = {
    userId: "usr-admin-01",
    email: "admin@livexpert.in",
    role: "ADMINISTRATOR",
    departmentId: "dept-sw",
  };

  const devEmployee: TokenPayload = {
    userId: "usr-dev-04",
    email: "dev@livexpert.in",
    role: "EMPLOYEE",
    departmentId: "dept-sw",
  };

  beforeEach(() => {
    // Reset to pristine seeded state before each test
    dbStore.seedDefaultData();
  });

  // =========================================================================
  // CRITERION 1: Dashboard numbers change when the underlying data changes
  // =========================================================================
  describe("Criterion 1: Dashboard numbers change dynamically when underlying data changes", () => {
    test("Summary metrics update immediately when a task is completed, added, or overdue", async () => {
      // 1. Initial snapshot
      const initialSummary = DashboardService.getSummaryMetrics({}, adminUser);
      assert.ok(initialSummary.totalProjects >= 6);
      assert.ok(initialSummary.totalOpenTasks > 0);
      assert.ok(initialSummary.overdueTasks > 0);

      // 2. Add an overdue open task to dbStore
      const now = Date.now();
      const newOverdueTask: TaskRecord = {
        id: "task-dynamic-01",
        projectId: "prj-01",
        title: "Dynamic Overdue Hotfix",
        description: "Testing dynamic metric reflection",
        status: "TODO",
        priority: "URGENT",
        assigneeId: devEmployee.userId,
        creatorId: adminUser.userId,
        dueDate: new Date(now - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      dbStore.tasks.push(newOverdueTask);

      // Verify numbers incremented
      const afterAddSummary = DashboardService.getSummaryMetrics({}, adminUser);
      assert.equal(
        afterAddSummary.totalOpenTasks,
        initialSummary.totalOpenTasks + 1,
        "Total open tasks must increment when a task is added"
      );
      assert.equal(
        afterAddSummary.overdueTasks,
        initialSummary.overdueTasks + 1,
        "Overdue tasks count must increment when overdue task is added"
      );

      // 3. Complete the overdue task
      await DashboardService.updateTaskStatus(newOverdueTask.id, "COMPLETED", adminUser);

      // Verify numbers reflect completion
      const afterCompleteSummary = DashboardService.getSummaryMetrics({}, adminUser);
      assert.equal(
        afterCompleteSummary.totalOpenTasks,
        initialSummary.totalOpenTasks,
        "Total open tasks must decrease when task is completed"
      );
      assert.equal(
        afterCompleteSummary.overdueTasks,
        initialSummary.overdueTasks,
        "Overdue tasks must decrease when overdue task is marked COMPLETED"
      );

      // 4. Add a task due within 7 days
      const new7DayTask: TaskRecord = {
        id: "task-dynamic-02",
        projectId: "prj-01",
        title: "Dynamic 7-Day Sprint Task",
        description: "Testing 7-day metric reflection",
        status: "IN_PROGRESS",
        priority: "HIGH",
        assigneeId: devEmployee.userId,
        creatorId: adminUser.userId,
        dueDate: new Date(now + 3 * 24 * 60 * 60 * 1000), // in 3 days
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      dbStore.tasks.push(new7DayTask);

      const after7DaySummary = DashboardService.getSummaryMetrics({}, adminUser);
      assert.equal(
        after7DaySummary.tasksDueWithin7Days,
        initialSummary.tasksDueWithin7Days + 1,
        "Tasks due within 7 days must increment dynamically"
      );

      // 5. Add a new Project and change status to COMPLETED
      const newProject: ProjectRecord = {
        id: "prj-dynamic-01",
        title: "Telemetry Pipeline",
        key: "TEL",
        description: "Realtime analytics pipeline",
        status: "ACTIVE",
        priority: "HIGH",
        departmentId: "dept-sw",
        creatorId: adminUser.userId,
        ownerId: adminUser.userId,
        startDate: new Date(),
        targetDate: new Date(now + 10 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      dbStore.projects.push(newProject);

      const afterProjectAdd = DashboardService.getSummaryMetrics({}, adminUser);
      assert.equal(afterProjectAdd.totalProjects, initialSummary.totalProjects + 1);
      assert.equal(afterProjectAdd.activeProjects, initialSummary.activeProjects + 1);

      // Transition project to COMPLETED
      newProject.status = "COMPLETED";
      const afterProjectComplete = DashboardService.getSummaryMetrics({}, adminUser);
      assert.equal(afterProjectComplete.activeProjects, initialSummary.activeProjects);
      assert.equal(afterProjectComplete.completedProjects, initialSummary.completedProjects + 1);
    });
  });

  // =========================================================================
  // CRITERION 2: Upcoming and overdue tasks display correctly
  // =========================================================================
  describe("Criterion 2: Upcoming and overdue tasks display correctly", () => {
    test("Overdue tasks only include open deliverables past due date with positive daysOverdue", () => {
      const now = Date.now();
      const overdueTasks = DashboardService.getOverdueTasks({}, adminUser);

      assert.ok(overdueTasks.length > 0, "Overdue list must not be empty");

      overdueTasks.forEach((task) => {
        // Must be open
        assert.notEqual(task.status, "COMPLETED", `Task ${task.id} must not be COMPLETED`);
        assert.notEqual(task.status, "CANCELLED", `Task ${task.id} must not be CANCELLED`);

        // Due date must be in the past
        assert.ok(task.dueDate, "Task must have a due date");
        const dueTime = new Date(task.dueDate!).getTime();
        assert.ok(dueTime < now, `Task ${task.title} dueDate (${task.dueDate}) must be before now`);

        // daysOverdue must be >= 1
        assert.ok(task.daysOverdue >= 1, `Task ${task.title} daysOverdue must be >= 1`);

        // Must include required enriched UI fields
        assert.ok(task.title, "Must have task title");
        assert.ok(task.projectName, "Must have project name");
        assert.ok(task.projectKey, "Must have project key");
        assert.ok(task.assigneeName, "Must have assignee name");
      });

      // Verify sorting: earliest due date (most overdue) comes first
      for (let i = 0; i < overdueTasks.length - 1; i++) {
        const timeA = new Date(overdueTasks[i].dueDate!).getTime();
        const timeB = new Date(overdueTasks[i + 1].dueDate!).getTime();
        assert.ok(timeA <= timeB, "Overdue tasks must be sorted chronologically (oldest due first)");
      }
    });

    test("Upcoming deadlines only include deliverables within next 14 days and are chronologically sorted", () => {
      const now = Date.now();
      const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;
      const deadlines = DashboardService.getUpcomingDeadlines({}, adminUser);

      assert.ok(deadlines.length > 0, "Deadlines list must not be empty");

      deadlines.forEach((item) => {
        // Must not be completed
        assert.notEqual(item.status, "COMPLETED");
        assert.notEqual(item.status, "CANCELLED");

        // Due date must be in the future (within 14 days window)
        const dueTime = new Date(item.dueDate).getTime();
        assert.ok(dueTime >= now, `Item ${item.title} dueDate must be in future`);
        assert.ok(dueTime <= now + FOURTEEN_DAYS, `Item ${item.title} dueDate must be within 14 days`);

        // daysLeft must be >= 0 and <= 14
        assert.ok(item.daysLeft >= 0 && item.daysLeft <= 14);

        // Required display fields
        assert.ok(item.title);
        assert.ok(item.type === "PROJECT" || item.type === "TASK");
        assert.ok(item.key);
      });

      // Verify sorted chronologically ascending
      for (let i = 0; i < deadlines.length - 1; i++) {
        const timeA = new Date(deadlines[i].dueDate).getTime();
        const timeB = new Date(deadlines[i + 1].dueDate).getTime();
        assert.ok(timeA <= timeB, "Upcoming deadlines must be sorted chronologically (nearest first)");
      }
    });
  });

  // =========================================================================
  // CRITERION 3: Filters work (Department, Project, Assignee, Status, Date Range)
  // =========================================================================
  describe("Criterion 3: Dashboard filters work accurately", () => {
    test("Department filter strictly isolates Software / IT vs Product / Design", () => {
      const swSummary = DashboardService.getSummaryMetrics({ departmentId: "dept-sw" }, adminUser);
      const pdSummary = DashboardService.getSummaryMetrics({ departmentId: "dept-pd" }, adminUser);
      const allSummary = DashboardService.getSummaryMetrics({}, adminUser);

      assert.equal(
        swSummary.totalProjects + pdSummary.totalProjects,
        allSummary.totalProjects,
        "Department partition must sum to total projects"
      );

      const swRecent = DashboardService.getRecentProjects({ departmentId: "dept-sw" }, adminUser);
      swRecent.projects.forEach((p) => {
        assert.equal(p.department, "Software / IT", "All projects in SW filter must be Software / IT");
      });

      const pdRecent = DashboardService.getRecentProjects({ departmentId: "dept-pd" }, adminUser);
      pdRecent.projects.forEach((p) => {
        assert.equal(p.department, "Product / Design", "All projects in PD filter must be Product / Design");
      });
    });

    test("Project filter isolates tasks, status distribution, and deadlines for that specific project", () => {
      const targetProjectId = "prj-01"; // KIBO360 Project Hub
      const projectTasks = dbStore.tasks.filter((t) => t.projectId === targetProjectId);

      const stats = DashboardService.getTaskStatusDistribution({ projectId: targetProjectId }, adminUser);
      assert.equal(stats.total, projectTasks.length, "Status distribution total must match project task count");

      const upcoming = DashboardService.getUpcomingDeadlines({ projectId: targetProjectId }, adminUser);
      upcoming.forEach((d) => {
        if (d.type === "PROJECT") {
          assert.equal(d.id, targetProjectId);
        } else {
          const task = dbStore.getTaskById(d.id);
          assert.equal(task?.projectId, targetProjectId);
        }
      });
    });

    test("Assignee filter isolates tasks for the selected user", () => {
      const targetAssignee = devEmployee.userId;
      const expectedTasks = dbStore.tasks.filter((t) => t.assigneeId === targetAssignee);

      const stats = DashboardService.getTaskStatusDistribution({ assigneeId: targetAssignee }, adminUser);
      assert.equal(stats.total, expectedTasks.length, "Stats total must match assignee task count");

      const overdue = DashboardService.getOverdueTasks({ assigneeId: targetAssignee }, adminUser);
      overdue.forEach((t) => {
        const raw = dbStore.getTaskById(t.id);
        assert.equal(raw?.assigneeId, targetAssignee);
      });
    });

    test("Status filter isolates tasks by specific lifecycle status", () => {
      const inProgressStats = DashboardService.getTaskStatusDistribution({ status: "IN_PROGRESS" }, adminUser);
      const inProgressCount = dbStore.tasks.filter((t) => t.status === "IN_PROGRESS").length;
      assert.equal(inProgressStats.total, inProgressCount);

      const inProgressTasks = DashboardService.getMyAssignedTasks(devEmployee.userId, { status: "IN_PROGRESS" });
      inProgressTasks.forEach((t) => {
        assert.equal(t.status, "IN_PROGRESS");
      });
    });
  });

  // =========================================================================
  // CRITERION 4: Employees cannot view unauthorized project information
  // =========================================================================
  describe("Criterion 4: Role-based scoping prevents unauthorized project visibility", () => {
    test("Employee in Software / IT cannot see Product / Design projects or tasks", () => {
      // 1. Employee query for recent projects
      const empProjects = DashboardService.getRecentProjects({}, devEmployee);
      assert.ok(empProjects.projects.length > 0, "Employee should see their own department's projects");

      empProjects.projects.forEach((p) => {
        assert.equal(
          p.department,
          "Software / IT",
          "Employee in Software / IT must NEVER see Product / Design projects"
        );
      });

      // 2. Employee query for upcoming deadlines
      const empDeadlines = DashboardService.getUpcomingDeadlines({}, devEmployee);
      empDeadlines.forEach((item) => {
        if (item.type === "PROJECT") {
          const prj = dbStore.getProjectById(item.id);
          assert.equal(prj?.departmentId, "dept-sw");
        } else {
          const task = dbStore.getTaskById(item.id);
          const prj = dbStore.getProjectById(task!.projectId);
          assert.equal(prj?.departmentId, "dept-sw");
        }
      });

      // 3. Employee query for overdue tasks
      const empOverdue = DashboardService.getOverdueTasks({}, devEmployee);
      empOverdue.forEach((item) => {
        const task = dbStore.getTaskById(item.id);
        const prj = dbStore.getProjectById(task!.projectId);
        assert.equal(prj?.departmentId, "dept-sw");
      });
    });

    test("Employee querying unauthorized department returns 0 records (Query parameter bypass prevention)", () => {
      // Dev employee attempts to pass ?departmentId=dept-pd (Product / Design)
      const tamperedSummary = DashboardService.getSummaryMetrics({ departmentId: "dept-pd" }, devEmployee);
      assert.equal(
        tamperedSummary.totalProjects,
        0,
        "Employee attempting to query unauthorized department must receive 0 projects"
      );
      assert.equal(
        tamperedSummary.totalOpenTasks,
        0,
        "Employee attempting to query unauthorized department must receive 0 tasks"
      );

      const tamperedProjects = DashboardService.getRecentProjects({ departmentId: "dept-pd" }, devEmployee);
      assert.equal(tamperedProjects.projects.length, 0, "No unauthorized projects returned");
    });

    test("Employee workload only displays colleagues within their assigned department", () => {
      const empWorkload = DashboardService.getEmployeeWorkload({}, devEmployee);
      assert.ok(empWorkload.length > 0);

      empWorkload.forEach((member) => {
        assert.equal(
          member.department,
          "Software / IT",
          "Workload by employee must only include members from the employee's department"
        );
      });
    });

    test("Filter options exposed to employee only include their department and departmental projects", () => {
      const filterOptions = DashboardService.getFilterOptions(devEmployee);

      // Department dropdown should only include Software / IT
      assert.equal(filterOptions.departments.length, 1);
      assert.equal(filterOptions.departments[0].id, "dept-sw");

      // Projects dropdown should only include Software / IT projects
      filterOptions.projects.forEach((p) => {
        const prj = dbStore.getProjectById(p.id);
        assert.equal(prj?.departmentId, "dept-sw");
      });

      // Employees list should only include colleagues in Software / IT
      filterOptions.employees.forEach((emp) => {
        const userRecord = dbStore.findUserById(emp.id);
        assert.equal(userRecord?.departmentId, "dept-sw");
      });
    });
  });
});
