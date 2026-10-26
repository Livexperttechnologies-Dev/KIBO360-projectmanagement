import { z } from "zod";

export const createProjectSchema = z.object({
  body: z
    .object({
      title: z.string().min(3, "Project title must be at least 3 characters").max(100),
      key: z
        .string()
        .min(2, "Project key must be at least 2 characters")
        .max(10, "Project key cannot exceed 10 characters")
        .regex(/^[A-Za-z0-9_-]+$/, "Project key can only contain letters, numbers, hyphens, and underscores")
        .transform((val) => val.toUpperCase()),
      description: z.string().max(1000).optional(),
      departmentId: z.string().min(1, "Department is required"),
      ownerId: z.string().optional(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
      status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).default("PLANNING"),
      startDate: z.string().optional(),
      targetDate: z.string().optional(),
      dueDate: z.string().optional(),
    })
    .refine(
      (data) => {
        const end = data.dueDate || data.targetDate;
        if (data.startDate && end) {
          return new Date(data.startDate).getTime() <= new Date(end).getTime();
        }
        return true;
      },
      {
        message: "Start date cannot be after due date",
        path: ["startDate"],
      }
    ),
});

export const updateProjectSchema = z.object({
  body: z
    .object({
      title: z.string().min(3).max(100).optional(),
      description: z.string().max(1000).optional(),
      departmentId: z.string().optional(),
      ownerId: z.string().optional(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
      status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(),
      startDate: z.string().optional().nullable(),
      targetDate: z.string().optional().nullable(),
      dueDate: z.string().optional().nullable(),
    })
    .refine(
      (data) => {
        const end = data.dueDate || data.targetDate;
        if (data.startDate && end) {
          return new Date(data.startDate).getTime() <= new Date(end).getTime();
        }
        return true;
      },
      {
        message: "Start date cannot be after due date",
        path: ["startDate"],
      }
    ),
});

export const addMemberSchema = z.object({
  body: z.object({
    userId: z.string().min(1, "User ID is required"),
    role: z.enum(["LEAD", "CONTRIBUTOR", "VIEWER"]).default("CONTRIBUTOR"),
  }),
});

export const createMilestoneSchema = z.object({
  body: z.object({
    title: z.string().min(2, "Milestone title must be at least 2 characters").max(100),
    description: z.string().max(500).optional(),
    dueDate: z.string().min(1, "Milestone due date is required"),
  }),
});

export const updateMilestoneSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    dueDate: z.string().optional(),
    status: z.enum(["PENDING", "REACHED", "OVERDUE"]).optional(),
  }),
});
