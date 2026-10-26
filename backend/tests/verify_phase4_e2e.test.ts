import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { ProjectService } from "../src/services/project.service";
import { dbStore } from "../src/lib/db";
import { TokenPayload } from "../src/services/auth.service";

describe("Phase 4 Verification — Interactive E2E Acceptance Workflow", () => {
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

  beforeEach(() => {
    dbStore.seedDefaultData();
  });

  test("Verify 1: Create a test project", async () => {
    const now = Date.now();
    const created = await ProjectService.createProject(
      {
        title: "E2E Verification Project",
        key: "E2E4",
        description: "Validating Phase 4 test scenario",
        departmentId: "dept-sw",
        priority: "HIGH",
        status: "PLANNING",
        startDate: new Date(now).toISOString(),
        targetDate: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      adminUser
    );

    assert.ok(created.id);
    assert.equal(created.key, "E2E4");
    assert.equal(created.status, "PLANNING");
    assert.equal(created.priority, "HIGH");
    assert.equal(created.owner?.id, adminUser.userId);
    assert.equal(created.members.length, 1);
  });

  test("Verify 2: Add team members", async () => {
    const project = await ProjectService.createProject(
      {
        title: "Team Roster Project",
        key: "TEAMR",
        departmentId: "dept-sw",
      },
      adminUser
    );

    // Add devUser as CONTRIBUTOR
    const members1 = await ProjectService.addMember(
      project.id,
      { userId: devUser.userId, role: "CONTRIBUTOR" },
      adminUser
    );
    assert.equal(members1.length, 2);

    // Add leadUser as CONTRIBUTOR
    const members2 = await ProjectService.addMember(
      project.id,
      { userId: "usr-lead-03", role: "CONTRIBUTOR" },
      adminUser
    );
    assert.equal(members2.length, 3);

    // Verify persisted
    const detail = ProjectService.getProjectById(project.id, adminUser);
    assert.equal(detail.members.length, 3);
  });

  test("Verify 3: Set dates and milestones", async () => {
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;

    const project = await ProjectService.createProject(
      {
        title: "Milestone Schedule Project",
        key: "MSCHD",
        departmentId: "dept-sw",
        startDate: new Date(now).toISOString(),
        targetDate: new Date(now + 25 * ONE_DAY).toISOString(),
      },
      adminUser
    );

    // Invalid date outside project boundary rejected
    await assert.rejects(
      async () => {
        await ProjectService.createMilestone(
          project.id,
          { title: "Invalid Milestone", dueDate: new Date(now + 30 * ONE_DAY).toISOString() },
          adminUser
        );
      },
      (err: any) => {
        assert.equal(err.status, 400);
        assert.match(err.message, /Milestone due date cannot be after project due date/i);
        return true;
      }
    );

    // Valid milestones inside boundary
    const m1 = await ProjectService.createMilestone(
      project.id,
      { title: "Milestone 1: Design Review", dueDate: new Date(now + 5 * ONE_DAY).toISOString() },
      adminUser
    );
    const m2 = await ProjectService.createMilestone(
      project.id,
      { title: "Milestone 2: Release Deployment", dueDate: new Date(now + 20 * ONE_DAY).toISOString() },
      adminUser
    );

    assert.ok(m1.id);
    assert.ok(m2.id);

    // Toggle status to REACHED
    const updatedM1 = await ProjectService.updateMilestone(
      project.id,
      m1.id,
      { status: "REACHED" },
      adminUser
    );
    assert.equal(updatedM1?.status, "REACHED");

    // Progress recalculation check
    const refreshed = ProjectService.getProjectById(project.id, adminUser);
    assert.equal(refreshed.progress, 50, "1 of 2 milestones reached = 50% progress");
  });

  test("Verify 4: Edit and archive the project", async () => {
    const project = await ProjectService.createProject(
      {
        title: "Lifecycle Project",
        key: "LFC4",
        departmentId: "dept-sw",
        status: "PLANNING",
      },
      adminUser
    );

    // Edit project
    const edited = await ProjectService.updateProject(
      project.id,
      {
        title: "Lifecycle Project (Updated)",
        status: "ACTIVE",
        priority: "URGENT",
      },
      adminUser
    );
    assert.equal(edited.title, "Lifecycle Project (Updated)");
    assert.equal(edited.status, "ACTIVE");
    assert.equal(edited.priority, "URGENT");

    // Archive project
    const archived = await ProjectService.archiveProject(project.id, adminUser);
    assert.equal(archived.status, "ARCHIVED");

    // Check query by status=ARCHIVED
    const archivedProjects = ProjectService.listProjects({ status: "ARCHIVED" }, adminUser);
    assert.ok(archivedProjects.some((p) => p.id === project.id));
  });

  test("Verify 5: Confirm permission restrictions", async () => {
    // 5.1 Employee cannot create project
    await assert.rejects(
      async () => {
        await ProjectService.createProject(
          { title: "Unauthorized", key: "UNAUTH", departmentId: "dept-sw" },
          devUser
        );
      },
      (err: any) => {
        assert.equal(err.status, 403);
        assert.match(err.message, /Only authorized managers can create projects/i);
        return true;
      }
    );

    // 5.2 Employee cannot edit restricted project (Product/Design prj-03)
    await assert.rejects(
      async () => {
        await ProjectService.updateProject("prj-03", { title: "Tampered" }, devUser);
      },
      (err: any) => {
        assert.equal(err.status, 403);
        assert.match(err.message, /You do not have permission to edit this project/i);
        return true;
      }
    );

    // 5.3 Employee cannot archive restricted project
    await assert.rejects(
      async () => {
        await ProjectService.archiveProject("prj-03", devUser);
      },
      (err: any) => {
        assert.equal(err.status, 403);
        assert.match(err.message, /You do not have permission to archive this project/i);
        return true;
      }
    );

    // 5.4 Employee cannot view project outside department
    assert.throws(
      () => {
        ProjectService.getProjectById("prj-03", devUser);
      },
      (err: any) => {
        assert.equal(err.status, 403);
        assert.match(err.message, /You do not have permission to view this project/i);
        return true;
      }
    );

    // 5.5 Cannot remove project owner from members
    await assert.rejects(
      async () => {
        // prj-01 owner is usr-admin-01
        await ProjectService.removeMember("prj-01", "usr-admin-01", adminUser);
      },
      (err: any) => {
        assert.equal(err.status, 400);
        assert.match(err.message, /Cannot remove the designated project owner from members/i);
        return true;
      }
    );
  });
});
