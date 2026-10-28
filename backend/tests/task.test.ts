import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { TaskService } from "../src/services/task.service";
import { dbStore } from "../src/lib/db";
import { TokenPayload } from "../src/services/auth.service";

describe("Phase 5 — Task and Subtask Management Suite", () => {
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

  before(() => {
    dbStore.seedDefaultData();
  });

  // 1. Task Persistence & Creation
  test("1. Task creation, assignment, and effort estimation persist in database", async () => {
    const newTask = await TaskService.createTask(
      {
        title: "Implement Phase 5 Kanban board layout",
        description: "Develop 7-column Kanban board with quick status transitions",
        projectId: "prj-01",
        taskList: "Frontend",
        assigneeId: devUser.userId,
        reviewerId: adminUser.userId,
        priority: "HIGH",
        status: "OPEN",
        startDate: new Date(Date.now()).toISOString(),
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        estimatedEffort: 20,
        completionPercentage: 0,
      },
      adminUser
    );

    assert.ok(newTask.id, "Task must have a generated ID");
    assert.equal(newTask.title, "Implement Phase 5 Kanban board layout");
    assert.equal(newTask.assigneeId, devUser.userId);
    assert.equal(newTask.estimatedEffort, 20);
    assert.equal(newTask.completionPercentage, 0);

    // Retrieve via getTaskById
    const fetched = TaskService.getTaskById(newTask.id, adminUser);
    assert.equal(fetched.id, newTask.id);
    assert.equal(fetched.project?.id, "prj-01");
    assert.equal(fetched.assignee?.id, devUser.userId);
    assert.equal(fetched.reviewer?.id, adminUser.userId);
  });

  // 2. Status Transitions & Dependency Completion Guard
  test("2. Task cannot be marked COMPLETED if prerequisite dependency is incomplete", async () => {
    // Create Task A (Prerequisite, incomplete)
    const taskA = await TaskService.createTask(
      {
        title: "Prerequisite Task A",
        projectId: "prj-01",
        status: "IN_PROGRESS",
      },
      adminUser
    );

    // Create Task B (Dependent on Task A)
    const taskB = await TaskService.createTask(
      {
        title: "Dependent Task B",
        projectId: "prj-01",
        status: "OPEN",
      },
      adminUser
    );

    // Add dependency: Task B depends on Task A
    await TaskService.addDependency(taskB.id, taskA.id, adminUser);

    // Try to mark Task B as COMPLETED while Task A is still IN_PROGRESS
    await assert.rejects(
      async () => {
        await TaskService.updateTask(taskB.id, { status: "COMPLETED" }, adminUser);
      },
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Prerequisite dependency 'Prerequisite Task A' is not completed yet/);
        return true;
      },
      "Should reject completing task when prerequisite is incomplete"
    );

    // Now complete Task A
    await TaskService.updateTask(taskA.id, { status: "COMPLETED" }, adminUser);

    // Now Task B can be marked COMPLETED successfully
    const completedTaskB = await TaskService.updateTask(taskB.id, { status: "COMPLETED" }, adminUser);
    assert.equal(completedTaskB.status, "COMPLETED");
    assert.equal(completedTaskB.completionPercentage, 100);
  });

  // 3. Circular Dependency Detection
  test("3. Circular dependency detection blocks self and cyclic dependencies with 400", async () => {
    const taskX = await TaskService.createTask({ title: "Cycle Task X", projectId: "prj-01" }, adminUser);
    const taskY = await TaskService.createTask({ title: "Cycle Task Y", projectId: "prj-01" }, adminUser);
    const taskZ = await TaskService.createTask({ title: "Cycle Task Z", projectId: "prj-01" }, adminUser);

    // 3a. Self dependency
    await assert.rejects(
      async () => {
        await TaskService.addDependency(taskX.id, taskX.id, adminUser);
      },
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Task cannot depend on itself/);
        return true;
      }
    );

    // 3b. Direct cycle: X depends on Y, then Y tries to depend on X
    await TaskService.addDependency(taskX.id, taskY.id, adminUser);
    await assert.rejects(
      async () => {
        await TaskService.addDependency(taskY.id, taskX.id, adminUser);
      },
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Circular dependency detected/);
        return true;
      }
    );

    // 3c. Transitive cycle: Y depends on Z, then Z tries to depend on X (X -> Y -> Z -> X)
    await TaskService.addDependency(taskY.id, taskZ.id, adminUser);
    await assert.rejects(
      async () => {
        await TaskService.addDependency(taskZ.id, taskX.id, adminUser);
      },
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Circular dependency detected/);
        return true;
      }
    );
  });

  // 4. Subtasks & Date Boundaries
  test("4. Subtask dates are validated against parent task start and due dates", async () => {
    const now = Date.now();
    const parentTask = await TaskService.createTask(
      {
        title: "Parent Milestone Task",
        projectId: "prj-01",
        startDate: new Date(now).toISOString(),
        dueDate: new Date(now + 10 * 24 * 60 * 60 * 1000).toISOString(), // +10 days
      },
      adminUser
    );

    // 4a. Due date exceeds parent task due date
    await assert.rejects(
      async () => {
        await TaskService.createTask(
          {
            title: "Overextended Subtask",
            projectId: "prj-01",
            parentTaskId: parentTask.id,
            dueDate: new Date(now + 15 * 24 * 60 * 60 * 1000).toISOString(), // +15 days > +10 days
          },
          adminUser
        );
      },
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Subtask due date cannot exceed parent task due date/);
        return true;
      }
    );

    // 4b. Valid subtask within boundary succeeds
    const validSubtask = await TaskService.createTask(
      {
        title: "Subtask 1 - Valid Date Range",
        projectId: "prj-01",
        parentTaskId: parentTask.id,
        startDate: new Date(now + 1 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(now + 8 * 24 * 60 * 60 * 1000).toISOString(), // +8 days <= +10 days
      },
      adminUser
    );
    assert.ok(validSubtask.id);
    assert.equal(validSubtask.parentTaskId, parentTask.id);

    // 4c. Parent task due date cannot be updated earlier than existing subtask due date (+8 days)
    await assert.rejects(
      async () => {
        await TaskService.updateTask(
          parentTask.id,
          { dueDate: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString() }, // +5 days < +8 days subtask
          adminUser
        );
      },
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Cannot set parent task due date earlier than existing subtask/);
        return true;
      }
    );
  });

  // 5. Role & Ownership Permissions
  test("5. Role permissions enforce field restrictions for assignees and block unauthorized users", async () => {
    // Create task assigned to devUser in prj-01
    const task = await TaskService.createTask(
      {
        title: "Dev Feature Task",
        projectId: "prj-01",
        assigneeId: devUser.userId,
        status: "OPEN",
        priority: "MEDIUM",
      },
      adminUser
    );

    // 5a. Assignee CAN update status and completion percentage
    const updatedByDev = await TaskService.updateTask(
      task.id,
      {
        status: "IN_PROGRESS",
        completionPercentage: 50,
      },
      devUser
    );
    assert.equal(updatedByDev.status, "IN_PROGRESS");
    assert.equal(updatedByDev.completionPercentage, 50);

    // 5b. Assignee CANNOT update restricted fields (priority, title, dueDate)
    await assert.rejects(
      async () => {
        await TaskService.updateTask(
          task.id,
          {
            priority: "URGENT",
          },
          devUser
        );
      },
      (err: any) => {
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /Assignees are only permitted to update task status and completion progress/);
        return true;
      }
    );

    // 5c. Unauthorized user (devUser from Software/IT) attempting to access tasks in Product/Design prj-03
    await assert.rejects(
      async () => {
        // prj-03 is owned by pmUser in Product / Design (dept-pd)
        await TaskService.createTask(
          {
            title: "Intruder task",
            projectId: "prj-03",
          },
          devUser
        );
      },
      (err: any) => {
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
  });

  // 6. Comments & Attachments Access Control
  test("6. Comments and attachments are access-controlled and enriched with user profiles", async () => {
    const task = await TaskService.createTask(
      {
        title: "Comment and Attachment Verification Task",
        projectId: "prj-01",
        assigneeId: devUser.userId,
      },
      adminUser
    );

    // 6a. Add comment
    const comment = await TaskService.addComment(task.id, "Ready for technical code review.", devUser);
    assert.ok(comment.id);
    assert.equal(comment.content, "Ready for technical code review.");
    assert.equal(comment.user?.id, devUser.userId);

    // 6b. Add attachment
    const attachment = await TaskService.addAttachment(
      task.id,
      {
        filename: "test_report.pdf",
        filesize: 10240,
        mimetype: "application/pdf",
        fileUrl: "/uploads/tasks/test_report.pdf",
        accessScope: "PROJECT_MEMBERS",
      },
      devUser
    );
    assert.ok(attachment.id);
    assert.equal(attachment.filename, "test_report.pdf");

    // 6c. Verify enriched task details include comments and attachments
    const details = TaskService.getTaskById(task.id, adminUser);
    assert.equal(details.comments.length, 1);
    assert.equal(details.attachments.length, 1);

    // 6d. Deleting comment: Author can delete
    const deleteSuccess = await TaskService.deleteComment(task.id, comment.id, devUser);
    assert.equal(deleteSuccess, true);
    assert.equal(dbStore.taskComments.find((c) => c.id === comment.id), undefined);
  });

  // 7. Cascading Deletion & Audit Trail
  test("7. Task deletion cascades subtasks, comments, attachments and logs audit events", async () => {
    const parent = await TaskService.createTask({ title: "Parent for Deletion", projectId: "prj-01" }, adminUser);
    const subtask = await TaskService.createTask(
      { title: "Subtask for Deletion", projectId: "prj-01", parentTaskId: parent.id },
      adminUser
    );
    await TaskService.addComment(parent.id, "Comment will be cascaded", adminUser);
    await TaskService.addAttachment(
      parent.id,
      {
        filename: "cascade.png",
        filesize: 500,
        mimetype: "image/png",
        fileUrl: "/uploads/cascade.png",
      },
      adminUser
    );

    // Delete parent task
    const deleted = await TaskService.deleteTask(parent.id, adminUser);
    assert.equal(deleted, true);

    // Verify parent is deleted
    assert.equal(dbStore.getTaskById(parent.id), undefined);

    // Verify subtask is cascaded
    assert.equal(dbStore.getTaskById(subtask.id), undefined);

    // Verify audit logs recorded TASK_DELETED
    const deleteAudit = dbStore.auditLogs.find((a) => a.action === "TASK_DELETED" && a.targetId === parent.id);
    assert.ok(deleteAudit, "Audit log must record TASK_DELETED");
  });
});
