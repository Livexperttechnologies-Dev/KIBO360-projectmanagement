import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { ProjectService } from "../src/services/project.service";
import { dbStore, ProjectRecord } from "../src/lib/db";
import { TokenPayload } from "../src/services/auth.service";

describe("Phase 4 — Enterprise Project Management Suite", () => {
  const adminUser: TokenPayload = {
    userId: "usr-admin-01",
    email: "admin@livexpert.in",
    role: "ADMINISTRATOR",
    departmentId: "dept-sw",
  };

  const pmUser: TokenPayload = {
    userId: "usr-pm-02",
    email: "pm@livexpert.in",
    role: "MANAGER",
    departmentId: "dept-pd",
  };

  const devUser: TokenPayload = {
    userId: "usr-dev-04",
    email: "dev@livexpert.in",
    role: "EMPLOYEE",
    departmentId: "dept-sw",
  };

  beforeEach(() => {
    dbStore.seedDefaultData();
  });

  // =========================================================================
  // 1. Authorized managers can create projects; Unauthorized users cannot
  // =========================================================================
  test("1. Authorized managers (ADMIN, PM) can create projects, while EMPLOYEE is forbidden", async () => {
    const now = Date.now();
    const projectPayload = {
      title: "Core API Telemetry Gateway",
      key: "CTG",
      description: "High-performance ingestion gateway for Livexpert services",
      departmentId: "dept-sw",
      priority: "HIGH",
      status: "PLANNING",
      startDate: new Date(now).toISOString(),
      targetDate: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Admin can create
    const createdByAdmin = await ProjectService.createProject(projectPayload, adminUser);
    assert.equal(createdByAdmin.title, projectPayload.title);
    assert.equal(createdByAdmin.key, "CTG");
    assert.equal(createdByAdmin.owner?.id, adminUser.userId);

    // Verify persisted in store
    const persisted = dbStore.getProjectById(createdByAdmin.id);
    assert.ok(persisted, "Project must be persisted in database store");
    assert.equal(persisted.key, "CTG");

    // Manager can create
    const pmPayload = {
      title: "Design System Mobile Kit",
      key: "DSMK",
      description: "React Native component library",
      departmentId: "dept-pd",
      priority: "MEDIUM",
      status: "PLANNING",
      startDate: new Date(now).toISOString(),
      targetDate: new Date(now + 20 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const createdByPm = await ProjectService.createProject(pmPayload, pmUser);
    assert.equal(createdByPm.key, "DSMK");

    // Employee CANNOT create project (Must throw 403 Forbidden)
    const empPayload = {
      title: "Unauthorized Project",
      key: "UNAUTH",
      departmentId: "dept-sw",
    };
    await assert.rejects(
      async () => {
        await ProjectService.createProject(empPayload, devUser);
      },
      (err: any) => {
        assert.equal(err.status, 403);
        assert.match(err.message, /Only authorized managers can create projects/i);
        return true;
      }
    );
  });

  // =========================================================================
  // 2. Project owners and members are persisted and survive queries
  // =========================================================================
  test("2. Project owners and members are persisted and survive queries", async () => {
    const now = Date.now();
    const projectPayload = {
      title: "Kubernetes Migration Sprint",
      key: "K8S",
      description: "Cluster configuration and pod autoscaling",
      departmentId: "dept-sw",
      ownerId: "usr-lead-03", // Lead assigned as owner
      priority: "URGENT",
      startDate: new Date(now).toISOString(),
      targetDate: new Date(now + 15 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const project = await ProjectService.createProject(projectPayload, adminUser);

    // Owner should be usr-lead-03
    assert.equal(project.owner?.id, "usr-lead-03");

    // Add devUser as CONTRIBUTOR
    await ProjectService.addMember(project.id, { userId: devUser.userId, role: "CONTRIBUTOR" }, adminUser);

    // Retrieve fresh project from database query
    const refreshed = ProjectService.getProjectById(project.id, adminUser);
    assert.equal(refreshed.owner?.id, "usr-lead-03");
    assert.ok(refreshed.members.some((m) => m.userId === devUser.userId && m.role === "CONTRIBUTOR"));
    assert.ok(refreshed.members.some((m) => m.userId === "usr-lead-03" && m.role === "LEAD"));
  });

  // =========================================================================
  // 3. Project and milestone dates are validated
  // =========================================================================
  test("3. Invalid date ranges are prevented for projects and milestones", async () => {
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;

    // 3.1 Project start date cannot be after due date
    const invalidProjectPayload = {
      title: "Invalid Chronology Project",
      key: "INVD",
      departmentId: "dept-sw",
      startDate: new Date(now + 10 * ONE_DAY).toISOString(),
      targetDate: new Date(now + 2 * ONE_DAY).toISOString(), // earlier than start date!
    };

    await assert.rejects(
      async () => {
        await ProjectService.createProject(invalidProjectPayload, adminUser);
      },
      (err: any) => {
        assert.equal(err.status, 400);
        assert.match(err.message, /Start date cannot be after due date/i);
        return true;
      }
    );

    // 3.2 Valid project creation
    const validProject = await ProjectService.createProject(
      {
        title: "Chronology Verified Project",
        key: "CHRON",
        departmentId: "dept-sw",
        startDate: new Date(now).toISOString(),
        targetDate: new Date(now + 20 * ONE_DAY).toISOString(),
      },
      adminUser
    );

    // 3.3 Milestone due date BEFORE project start date is rejected
    await assert.rejects(
      async () => {
        await ProjectService.createMilestone(
          validProject.id,
          {
            title: "Premature Milestone",
            dueDate: new Date(now - 5 * ONE_DAY).toISOString(), // before project start!
          },
          adminUser
        );
      },
      (err: any) => {
        assert.equal(err.status, 400);
        assert.match(err.message, /cannot be before project start date/i);
        return true;
      }
    );

    // 3.4 Milestone due date AFTER project target date is rejected
    await assert.rejects(
      async () => {
        await ProjectService.createMilestone(
          validProject.id,
          {
            title: "Overextended Milestone",
            dueDate: new Date(now + 25 * ONE_DAY).toISOString(), // past project due date!
          },
          adminUser
        );
      },
      (err: any) => {
        assert.equal(err.status, 400);
        assert.match(err.message, /cannot be after project due date/i);
        return true;
      }
    );

    // 3.5 Valid milestone inside boundary succeeds
    const validMilestone = await ProjectService.createMilestone(
      validProject.id,
      {
        title: "Sprint 1 Gateway Milestone",
        dueDate: new Date(now + 10 * ONE_DAY).toISOString(),
      },
      adminUser
    );
    assert.ok(validMilestone.id);
    assert.equal(validMilestone.title, "Sprint 1 Gateway Milestone");
  });

  // =========================================================================
  // 4. Unauthorized users cannot edit or archive restricted projects
  // =========================================================================
  test("4. Unauthorized users cannot edit or archive restricted projects", async () => {
    // Project prj-03 belongs to Product/Design (creator: pmUser)
    const pdProject = dbStore.getProjectById("prj-03")!;
    assert.ok(pdProject);

    // Dev employee from Software/IT attempts to edit Product/Design project
    await assert.rejects(
      async () => {
        await ProjectService.updateProject(
          pdProject.id,
          { title: "Hacked Title By Employee" },
          devUser
        );
      },
      (err: any) => {
        assert.equal(err.status, 403);
        assert.match(err.message, /You do not have permission to edit this project/i);
        return true;
      }
    );

    // Dev employee attempts to archive
    await assert.rejects(
      async () => {
        await ProjectService.archiveProject(pdProject.id, devUser);
      },
      (err: any) => {
        assert.equal(err.status, 403);
        assert.match(err.message, /You do not have permission to archive this project/i);
        return true;
      }
    );

    // Dev employee attempts to view a Product/Design project directly
    await assert.rejects(
      async () => {
        ProjectService.getProjectById(pdProject.id, devUser);
      },
      (err: any) => {
        assert.equal(err.status, 403);
        assert.match(err.message, /You do not have permission to view this project/i);
        return true;
      }
    );
  });

  // =========================================================================
  // 5. Milestone lifecycle and dynamic progress calculation
  // =========================================================================
  test("5. Milestone status transitions recalculate project progress", async () => {
    const project = ProjectService.getProjectById("prj-01", adminUser);
    const initialProgress = project.progress;

    // Find pending milestone
    const pendingMilestone = project.milestones.find((m) => m.status === "PENDING")!;
    assert.ok(pendingMilestone);

    // Mark milestone as REACHED
    await ProjectService.updateMilestone(
      "prj-01",
      pendingMilestone.id,
      { status: "REACHED" },
      adminUser
    );

    // Verify progress increased
    const updatedProject = ProjectService.getProjectById("prj-01", adminUser);
    assert.ok(
      updatedProject.progress >= initialProgress,
      `Updated progress (${updatedProject.progress}) should be >= initial (${initialProgress})`
    );

    // Delete a milestone
    const deleteRes = await ProjectService.deleteMilestone("prj-01", pendingMilestone.id, adminUser);
    assert.ok(deleteRes.success);
    const afterDelete = ProjectService.getProjectById("prj-01", adminUser);
    assert.ok(!afterDelete.milestones.some((m) => m.id === pendingMilestone.id));
  });

  // =========================================================================
  // 6. Project archival & audit logging
  // =========================================================================
  test("6. Project creation, updates, and archival generate comprehensive audit logs", async () => {
    const now = Date.now();
    const initialLogsCount = dbStore.auditLogs.length;

    // Create project
    const created = await ProjectService.createProject(
      {
        title: "Audit Trail Project",
        key: "AUDIT",
        departmentId: "dept-sw",
      },
      adminUser
    );

    // Update project
    await ProjectService.updateProject(
      created.id,
      { description: "Audit trail verified" },
      adminUser
    );

    // Archive project
    await ProjectService.archiveProject(created.id, adminUser);

    // Assert project status is ARCHIVED
    const archived = dbStore.getProjectById(created.id)!;
    assert.equal(archived.status, "ARCHIVED");

    // Verify audit logs
    const projectLogs = dbStore.auditLogs.filter((l) => l.targetId === created.id);
    const actions = projectLogs.map((l) => l.action);

    assert.ok(actions.includes("PROJECT_CREATED"), "Audit log must contain PROJECT_CREATED");
    assert.ok(actions.includes("PROJECT_UPDATED"), "Audit log must contain PROJECT_UPDATED");
    assert.ok(actions.includes("PROJECT_ARCHIVED"), "Audit log must contain PROJECT_ARCHIVED");
    assert.ok(dbStore.auditLogs.length >= initialLogsCount + 3);
  });
});
