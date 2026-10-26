import { z } from "zod";

const taskStatuses = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "UNDER_REVIEW",
  "CHANGES_REQUIRED",
  "COMPLETED",
  "BLOCKED",
  "BACKLOG",
  "TODO",
  "IN_REVIEW",
  "CANCELLED",
] as const;

const taskPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const createTaskSchema = z.object({
  body: z
    .object({
      title: z.string().min(2, "Task title must be at least 2 characters").max(150),
      description: z.string().max(2000).optional(),
      projectId: z.string().min(1, "Project ID is required"),
      taskList: z.string().max(50).default("Default"),
      assigneeId: z.string().optional().nullable(),
      reviewerId: z.string().optional().nullable(),
      parentTaskId: z.string().optional().nullable(),
      priority: z.enum(taskPriorities).default("MEDIUM"),
      status: z.enum(taskStatuses).default("OPEN"),
      startDate: z.string().optional().nullable(),
      dueDate: z.string().optional().nullable(),
      estimatedEffort: z.number().min(0, "Estimated effort cannot be negative").optional().nullable(),
      completionPercentage: z.number().min(0).max(100, "Completion must be between 0 and 100").default(0),
    })
    .refine(
      (data) => {
        if (data.startDate && data.dueDate) {
          return new Date(data.startDate).getTime() <= new Date(data.dueDate).getTime();
        }
        return true;
      },
      {
        message: "Start date cannot be after due date",
        path: ["startDate"],
      }
    ),
});

export const updateTaskSchema = z.object({
  body: z
    .object({
      title: z.string().min(2).max(150).optional(),
      description: z.string().max(2000).optional().nullable(),
      projectId: z.string().optional(),
      taskList: z.string().max(50).optional(),
      assigneeId: z.string().optional().nullable(),
      reviewerId: z.string().optional().nullable(),
      parentTaskId: z.string().optional().nullable(),
      priority: z.enum(taskPriorities).optional(),
      status: z.enum(taskStatuses).optional(),
      startDate: z.string().optional().nullable(),
      dueDate: z.string().optional().nullable(),
      estimatedEffort: z.number().min(0).optional().nullable(),
      completionPercentage: z.number().min(0).max(100).optional(),
    })
    .refine(
      (data) => {
        if (data.startDate && data.dueDate) {
          return new Date(data.startDate).getTime() <= new Date(data.dueDate).getTime();
        }
        return true;
      },
      {
        message: "Start date cannot be after due date",
        path: ["startDate"],
      }
    ),
});

export const createSubtaskSchema = z.object({
  body: z
    .object({
      title: z.string().min(2, "Subtask title must be at least 2 characters").max(150),
      description: z.string().max(2000).optional(),
      assigneeId: z.string().optional().nullable(),
      priority: z.enum(taskPriorities).default("MEDIUM"),
      status: z.enum(taskStatuses).default("OPEN"),
      startDate: z.string().optional().nullable(),
      dueDate: z.string().optional().nullable(),
      estimatedEffort: z.number().min(0).optional().nullable(),
      completionPercentage: z.number().min(0).max(100).default(0),
    })
    .refine(
      (data) => {
        if (data.startDate && data.dueDate) {
          return new Date(data.startDate).getTime() <= new Date(data.dueDate).getTime();
        }
        return true;
      },
      {
        message: "Start date cannot be after due date",
        path: ["startDate"],
      }
    ),
});

export const addCommentSchema = z.object({
  body: z.object({
    content: z.string().min(1, "Comment content cannot be empty").max(2000),
  }),
});

export const addAttachmentSchema = z.object({
  body: z.object({
    filename: z.string().min(1, "Filename is required").max(255),
    filesize: z.number().min(1, "Filesize must be greater than 0"),
    mimetype: z.string().min(1, "MIME type is required"),
    fileUrl: z.string().min(1, "File URL is required"),
    accessScope: z.enum(["PUBLIC", "PROJECT_MEMBERS", "ASSIGNEE_ONLY"]).default("PROJECT_MEMBERS"),
  }),
});

export const addDependencySchema = z.object({
  body: z.object({
    dependsOnTaskId: z.string().min(1, "Dependency task ID is required"),
  }),
});
