import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Please enter a valid company email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    rememberMe: z.boolean().optional(),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email("Please enter a valid company email address"),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Reset token is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
  }),
});

export const inviteUserSchema = z.object({
  body: z.object({
    email: z.string().email("Please enter a valid company email address"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    role: z.enum(["ADMINISTRATOR", "PROJECT_MANAGER", "TEAM_LEAD", "EMPLOYEE"]),
    departmentId: z.string().min(1, "Department assignment is required"),
    jobTitle: z.string().optional(),
  }),
});

export const updateUserStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean(),
  }),
});

export const updateUserProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    jobTitle: z.string().optional(),
    phone: z.string().optional(),
    bio: z.string().optional(),
  }),
});

export const assignDepartmentSchema = z.object({
  body: z.object({
    departmentId: z.string().min(1, "Department ID is required"),
  }),
});

export const updateUserRoleSchema = z.object({
  body: z.object({
    role: z.enum(["ADMINISTRATOR", "PROJECT_MANAGER", "TEAM_LEAD", "EMPLOYEE"]),
  }),
});