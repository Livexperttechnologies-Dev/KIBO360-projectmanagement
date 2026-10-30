import { z } from "zod";

const issueBody = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(4000).default(""),
  taskId: z.string().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});

export const createProjectIssueSchema = z.object({ body: issueBody });
export const updateProjectIssueSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3).max(160).optional(),
    description: z.string().trim().max(4000).optional(),
    taskId: z.string().optional().nullable(),
    assigneeId: z.string().optional().nullable(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  }).refine((body) => Object.keys(body).length > 0, "At least one field is required"),
});

export const createProjectTimeEntrySchema = z.object({
  body: z.object({
    taskId: z.string().min(1),
    workDate: z.string().datetime({ offset: true }),
    durationMinutes: z.number().int().min(1).max(1440),
    note: z.string().trim().max(1000).optional(),
  }),
});
