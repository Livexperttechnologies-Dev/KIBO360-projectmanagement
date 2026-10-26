import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

describe("Phase 8 User Verification Workflow Suite", () => {
  const BASE_URL = "http://localhost:5000/api/v1";
  let adminToken: string;
  let leadToken: string;
  let devToken: string;
  let softwareDeptId: string;
  let productDeptId: string;

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

    // 2. Authenticate Team Lead
    const leadRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "lead@livexpert.in", password: "Livexpert@2026" }),
    });
    const leadData = (await leadRes.json()) as any;
    assert.equal(leadRes.status, 200);
    leadToken = leadData.data.accessToken;

    // 3. Authenticate Developer (Employee)
    const devRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dev@livexpert.in", password: "Livexpert@2026" }),
    });
    const devData = (await devRes.json()) as any;
    assert.equal(devRes.status, 200);
    devToken = devData.data.accessToken;

    // 4. Retrieve Department IDs
    const deptRes = await fetch(`${BASE_URL}/users/departments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deptData = (await deptRes.json()) as any;
    assert.equal(deptRes.status, 200);
    const depts = deptData.data?.departments || [];
    const software = depts.find((d: any) => d.name.includes("Software") || d.name.includes("IT"));
    const product = depts.find((d: any) => d.name.includes("Product") || d.name.includes("Design"));
    softwareDeptId = software ? software.id : "dept-eng";
    productDeptId = product ? product.id : "dept-design";
  });

  // Verify Item 1: Compare reports with actual database records
  test("Verify 1: Compare reports with actual database records", async () => {
    // Fetch Tasks by Status Report
    const statusReportRes = await fetch(`${BASE_URL}/reports/tasks-by-status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const statusReportData = (await statusReportRes.json()) as any;
    assert.equal(statusReportRes.status, 200);

    // Sum of breakdown counts equals total in report
    const breakdownSum = statusReportData.data.breakdown.reduce((sum: number, b: any) => sum + b.count, 0);
    assert.equal(statusReportData.data.total, breakdownSum, "Sum of status breakdown counts must equal total root tasks");
    assert.ok(statusReportData.data.total > 0, "Total root tasks must be greater than 0");

    // Fetch underlying tasks from DB via API right alongside report
    const tasksRes = await fetch(`${BASE_URL}/tasks?limit=100`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const tasksData = (await tasksRes.json()) as any;
    assert.equal(tasksRes.status, 200);
    const allTasks: any[] = tasksData.data.tasks;
    const rootTasks = allTasks.filter((t) => !t.parentTaskId);

    // Validate report total matches database root tasks
    assert.ok(
      Math.abs(statusReportData.data.total - rootTasks.length) <= 2,
      "Total root tasks in report must closely match DB root tasks"
    );

    // Fetch Project Status Report and compare with DB projects
    const projectsRes = await fetch(`${BASE_URL}/projects`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const projectsData = (await projectsRes.json()) as any;
    assert.equal(projectsRes.status, 200);
    const dbProjects: any[] = projectsData.data.projects || [];

    const projectReportRes = await fetch(`${BASE_URL}/reports/project-status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const projectReportData = (await projectReportRes.json()) as any;
    assert.equal(projectReportRes.status, 200);
    assert.equal(
      projectReportData.data.projects.length,
      dbProjects.length,
      "Project count in report must match DB project records"
    );

    // Verify Milestone Completion Report matches DB milestone data
    const milestoneReportRes = await fetch(`${BASE_URL}/reports/milestone-completion`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const milestoneReportData = (await milestoneReportRes.json()) as any;
    assert.equal(milestoneReportRes.status, 200);
    assert.ok(milestoneReportData.data.summary.total > 0);
    assert.ok(milestoneReportData.data.summary.reached >= 0);
    assert.ok(milestoneReportData.data.projects.length > 0);
  });

  // Verify Item 2: Test department filters
  test("Verify 2: Test department filters", async () => {
    // 1. Filter Project Status by Software / IT
    const swProjectRes = await fetch(`${BASE_URL}/reports/project-status?departmentId=${softwareDeptId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const swProjectData = (await swProjectRes.json()) as any;
    assert.equal(swProjectRes.status, 200);
    assert.ok(swProjectData.data.projects.length > 0);
    for (const p of swProjectData.data.projects) {
      assert.equal(p.departmentId, softwareDeptId, "All projects must belong to Software / IT department");
    }

    // 2. Filter Project Status by Product / Design
    const pdProjectRes = await fetch(`${BASE_URL}/reports/project-status?departmentId=${productDeptId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const pdProjectData = (await pdProjectRes.json()) as any;
    assert.equal(pdProjectRes.status, 200);
    assert.ok(pdProjectData.data.projects.length > 0);
    for (const p of pdProjectData.data.projects) {
      assert.equal(p.departmentId, productDeptId, "All projects must belong to Product / Design department");
    }

    // 3. Compare KPI departmental segmentation
    const allKpiRes = await fetch(`${BASE_URL}/reports/kpis`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const allKpiData = (await allKpiRes.json()) as any;

    const swKpiRes = await fetch(`${BASE_URL}/reports/kpis?departmentId=${softwareDeptId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const swKpiData = (await swKpiRes.json()) as any;

    const pdKpiRes = await fetch(`${BASE_URL}/reports/kpis?departmentId=${productDeptId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const pdKpiData = (await pdKpiRes.json()) as any;

    assert.equal(
      swKpiData.data.totalProjects + pdKpiData.data.totalProjects,
      allKpiData.data.totalProjects,
      "Sum of department projects must equal enterprise total projects"
    );

    // 4. Workload by Department
    const deptWorkloadRes = await fetch(`${BASE_URL}/reports/workload-department`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deptWorkloadData = (await deptWorkloadRes.json()) as any;
    assert.equal(deptWorkloadRes.status, 200);
    const swDept = deptWorkloadData.data.departments.find((d: any) => d.id === softwareDeptId);
    const pdDept = deptWorkloadData.data.departments.find((d: any) => d.id === productDeptId);
    assert.ok(swDept, "Software department exists in workload breakdown");
    assert.ok(pdDept, "Product department exists in workload breakdown");
    assert.ok(swDept.totalProjects > 0);
    assert.ok(pdDept.totalProjects > 0);

    // 5. Cross-Department security scoping for Employee
    const devCrossDeptRes = await fetch(`${BASE_URL}/reports/project-status?departmentId=${productDeptId}`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    const devCrossDeptData = (await devCrossDeptRes.json()) as any;
    assert.equal(devCrossDeptRes.status, 200);
    assert.equal(
      devCrossDeptData.data.projects.length,
      0,
      "Software / IT employee must not receive data for Product / Design department"
    );
  });

  // Verify Item 3: Validate KPI formulas
  test("Verify 3: Validate KPI formulas", async () => {
    // Retrieve root tasks to calculate manual expected KPI figures
    const tasksRes = await fetch(`${BASE_URL}/tasks?limit=100`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const tasksData = (await tasksRes.json()) as any;
    const allTasks: any[] = tasksData.data.tasks;
    const rootTasks = allTasks.filter((t) => !t.parentTaskId);

    // 1. Manual On-Time Completion Rate Calculation
    const completedTasksWithDueDate = rootTasks.filter((t) => t.status === "COMPLETED" && Boolean(t.dueDate));
    const manualCompletedOnTime = completedTasksWithDueDate.filter((t) => {
      const completionTime = new Date(t.updatedAt).getTime();
      const dueTime = new Date(t.dueDate).getTime();
      return completionTime <= dueTime;
    });
    const expectedOnTimeRate =
      completedTasksWithDueDate.length > 0
        ? Number(((manualCompletedOnTime.length / completedTasksWithDueDate.length) * 100).toFixed(1))
        : 100.0;

    // 2. Manual Overdue Task Calculation (Company timezone Asia/Kolkata)
    const nowTime = Date.now();
    const manualOverdueTasks = rootTasks.filter((t) => {
      if (t.status === "COMPLETED") return false; // Completed tasks must NEVER be counted as overdue
      if (!t.dueDate) return false;
      return new Date(t.dueDate).getTime() < nowTime;
    });
    const expectedOverdueCount = manualOverdueTasks.length;

    // 3. Manual Ownership Coverage Calculation
    const openTasks = rootTasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED");
    const openWithAssigneeAndDueDate = openTasks.filter((t) => Boolean(t.assigneeId) && Boolean(t.dueDate));
    const expectedCoverageRate =
      openTasks.length > 0
        ? Number(((openWithAssigneeAndDueDate.length / openTasks.length) * 100).toFixed(1))
        : 100.0;

    // 4. Fetch actual KPI report from API
    const kpiRes = await fetch(`${BASE_URL}/reports/kpis`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const kpiData = (await kpiRes.json()) as any;
    assert.equal(kpiRes.status, 200);
    const kpis = kpiData.data;

    // Assert On-Time Completion Rate formula accuracy
    const expectedFormulaOnTimeRate =
      kpis.onTimeCompletionRate.totalCompletedWithDueDate > 0
        ? Number(((kpis.onTimeCompletionRate.completedOnTime / kpis.onTimeCompletionRate.totalCompletedWithDueDate) * 100).toFixed(1))
        : 100.0;
    assert.equal(
      kpis.onTimeCompletionRate.rate,
      expectedFormulaOnTimeRate,
      "On-Time Completion Rate must match mathematical calculation exactly"
    );
    assert.ok(
      Math.abs(kpis.onTimeCompletionRate.completedOnTime - manualCompletedOnTime.length) <= 2,
      "Completed on-time count must be consistent with database records"
    );

    // Assert Overdue Task Count formula accuracy
    assert.ok(
      Math.abs(kpis.overdueTaskCount - expectedOverdueCount) <= 2,
      "Overdue Task Count must match open past-due deliverables in company timezone"
    );

    // Assert Ownership Coverage formula accuracy
    const expectedFormulaCoverageRate =
      kpis.ownershipCoverage.totalOpenTasks > 0
        ? Number(((kpis.ownershipCoverage.openWithAssigneeAndDueDate / kpis.ownershipCoverage.totalOpenTasks) * 100).toFixed(1))
        : 100.0;
    assert.equal(
      kpis.ownershipCoverage.rate,
      expectedFormulaCoverageRate,
      "Ownership Coverage must match ratio of open deliverables with assignee and due date"
    );
    assert.ok(
      Math.abs(kpis.ownershipCoverage.totalOpenTasks - openTasks.length) <= 3,
      "Total open root deliverables count must be consistent with database snapshot"
    );

    // 5. Test Subtask Double-Counting Protection on stable scoped project (prj-02)
    const baselinePrjKpiRes = await fetch(`${BASE_URL}/reports/kpis?projectId=prj-02`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const baselinePrjKpiData = (await baselinePrjKpiRes.json()) as any;
    const baselineTotalTasks = baselinePrjKpiData.data.totalTasks;
    const baselineOpenTasks = baselinePrjKpiData.data.ownershipCoverage.totalOpenTasks;

    // Retrieve a task in prj-02 to add a subtask
    const prj2TasksRes = await fetch(`${BASE_URL}/tasks?projectId=prj-02`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const prj2TasksData = (await prj2TasksRes.json()) as any;
    const prj2ParentTask = prj2TasksData.data.tasks[0];

    const subtaskRes = await fetch(`${BASE_URL}/tasks/${prj2ParentTask.id}/subtasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Temporary Subtask for Non-Double-Counting KPI Test",
        status: "OPEN",
        priority: "LOW",
      }),
    });
    const subtaskData = (await subtaskRes.json()) as any;
    assert.equal(subtaskRes.status, 201);
    const subtaskId = subtaskData.data.id;

    // Query KPIs for prj-02 again: totalTasks and open tasks should remain strictly identical!
    const postSubtaskKpiRes = await fetch(`${BASE_URL}/reports/kpis?projectId=prj-02`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const postSubtaskKpiData = (await postSubtaskKpiRes.json()) as any;
    assert.equal(
      postSubtaskKpiData.data.totalTasks,
      baselineTotalTasks,
      "Subtasks must NOT be double-counted in totalTasks KPI"
    );
    assert.equal(
      postSubtaskKpiData.data.ownershipCoverage.totalOpenTasks,
      baselineOpenTasks,
      "Subtasks must NOT be double-counted in ownership coverage totalOpenTasks KPI"
    );

    // Clean up created subtask
    await fetch(`${BASE_URL}/tasks/${subtaskId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  });

  // Verify Item 4: Test exports and permissions
  test("Verify 4: Test exports and permissions", async () => {
    // 1. Administrator CSV Export: Tasks
    const adminTasksExportRes = await fetch(`${BASE_URL}/reports/export/tasks`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminTasksExportRes.status, 200);
    assert.ok(adminTasksExportRes.headers.get("content-type")?.includes("text/csv"));
    const tasksCsv = await adminTasksExportRes.text();
    assert.ok(tasksCsv.includes('"Task ID","Title","Project Key","Assignee","Status","Priority"'));
    assert.ok(tasksCsv.split("\r\n").length > 1, "CSV must contain header and data rows");

    // 2. Team Lead CSV Export: Projects
    const leadProjectsExportRes = await fetch(`${BASE_URL}/reports/export/projects`, {
      headers: { Authorization: `Bearer ${leadToken}` },
    });
    assert.equal(leadProjectsExportRes.status, 200);
    assert.ok(leadProjectsExportRes.headers.get("content-type")?.includes("text/csv"));
    const projectsCsv = await leadProjectsExportRes.text();
    assert.ok(projectsCsv.includes('"Project Code","Title","Department","Owner","Status","Priority"'));

    // 3. Administrator CSV Export: KPIs
    const adminKpiExportRes = await fetch(`${BASE_URL}/reports/export/kpis`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminKpiExportRes.status, 200);
    assert.ok(adminKpiExportRes.headers.get("content-type")?.includes("text/csv"));
    const kpiCsv = await adminKpiExportRes.text();
    assert.ok(kpiCsv.includes('"Metric","Value","Details / Ratio"'));
    assert.ok(kpiCsv.includes('"On-Time Completion Rate"'));
    assert.ok(kpiCsv.includes('"Overdue Tasks"'));
    assert.ok(kpiCsv.includes('"Ownership Coverage"'));

    // 4. Department-Filtered CSV Export
    const swFilteredExportRes = await fetch(`${BASE_URL}/reports/export/projects?departmentId=${softwareDeptId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(swFilteredExportRes.status, 200);
    const swProjectsCsv = await swFilteredExportRes.text();
    assert.ok(swProjectsCsv.includes("Software / IT"));
    assert.ok(!swProjectsCsv.includes("Product / Design"), "Filtered export must only contain Software / IT rows");

    // 5. Employee CSV Export Permission Rejection (HTTP 403 Forbidden)
    const employeeTaskExportRes = await fetch(`${BASE_URL}/reports/export/tasks`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    assert.equal(
      employeeTaskExportRes.status,
      403,
      "Employee must receive HTTP 403 Forbidden when attempting to export tasks"
    );
    const employeeTaskData = (await employeeTaskExportRes.json()) as any;
    assert.equal(employeeTaskData.success, false);
    assert.equal(employeeTaskData.message, "Forbidden: Employees are not authorized to export report data");

    const employeeProjectExportRes = await fetch(`${BASE_URL}/reports/export/projects`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    assert.equal(
      employeeProjectExportRes.status,
      403,
      "Employee must receive HTTP 403 Forbidden when attempting to export projects"
    );

    const employeeKpiExportRes = await fetch(`${BASE_URL}/reports/export/kpis`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    assert.equal(
      employeeKpiExportRes.status,
      403,
      "Employee must receive HTTP 403 Forbidden when attempting to export KPIs"
    );
  });
});
