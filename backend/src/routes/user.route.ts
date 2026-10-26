import { Router } from "express";
import {
  listUsers,
  getUserById,
  inviteUser,
  updateUserStatus,
  updateUserProfile,
  assignDepartment,
  listDepartments,
  listAuditLogs,
} from "../controllers/user.controller";
import { authenticate, requireRole } from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import {
  inviteUserSchema,
  updateUserStatusSchema,
  updateUserProfileSchema,
  assignDepartmentSchema,
} from "../validations/auth.validation";

const router = Router();

// General department list
router.get("/departments", authenticate, listDepartments);

// Audit logs (Administrator only)
router.get("/audit-logs", authenticate, requireRole("ADMINISTRATOR"), listAuditLogs);

// User directory (Administrator and Project Manager)
router.get("/", authenticate, requireRole("ADMINISTRATOR", "PROJECT_MANAGER"), listUsers);

// Specific user
router.get("/:id", authenticate, getUserById);

// Admin-only management routes
router.post("/invite", authenticate, requireRole("ADMINISTRATOR"), validateRequest(inviteUserSchema), inviteUser);
router.patch("/:id/status", authenticate, requireRole("ADMINISTRATOR"), validateRequest(updateUserStatusSchema), updateUserStatus);
router.patch("/:id/profile", authenticate, validateRequest(updateUserProfileSchema), updateUserProfile);
router.patch("/:id/department", authenticate, requireRole("ADMINISTRATOR"), validateRequest(assignDepartmentSchema), assignDepartment);

export default router;