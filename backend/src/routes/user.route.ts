import { Router } from "express";
import {
  listUsers,
  getUserById,
  createUser,
  updateUserStatus,
  updateUserProfile,
  assignDepartment,
  listDepartments,
  listAuditLogs,
  superAdminUpdateUser,
  superAdminSetPassword,
  updateUserRole,
} from "../controllers/user.controller";
import { authenticate, requireRole, requireSuperAdmin } from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import {
  createUserSchema,
  updateUserStatusSchema,
  updateUserProfileSchema,
  assignDepartmentSchema,
  superAdminUserUpdateSchema,
  superAdminSetPasswordSchema,
  updateUserRoleSchema,
} from "../validations/auth.validation";

const router = Router();

// General department list
router.get("/departments", authenticate, listDepartments);

// Audit logs (Administrator only)
router.get("/audit-logs", authenticate, requireRole("ADMINISTRATOR"), listAuditLogs);

// User directory (Administrator and Manager)
router.get("/", authenticate, requireRole("ADMINISTRATOR", "MANAGER", "TEAM_LEAD", "EMPLOYEE"), listUsers);

// Specific user
router.get("/:id", authenticate, getUserById);

// Admin-only management routes
router.post("/", authenticate, requireSuperAdmin, validateRequest(createUserSchema), createUser);
router.patch("/:id/status", authenticate, requireRole("ADMINISTRATOR"), validateRequest(updateUserStatusSchema), updateUserStatus);
router.patch("/:id/super-admin-details", authenticate, requireSuperAdmin, validateRequest(superAdminUserUpdateSchema), superAdminUpdateUser);
router.put("/:id/password", authenticate, requireSuperAdmin, validateRequest(superAdminSetPasswordSchema), superAdminSetPassword);
router.patch("/:id/role", authenticate, requireSuperAdmin, validateRequest(updateUserRoleSchema), updateUserRole);
router.patch(
  "/:id/profile",
  authenticate,
  (req, res, next) => {
    if (req.params.id !== req.user?.userId && req.user?.role !== "ADMINISTRATOR") {
      res.status(403).json({ success: false, error: { message: "You can only edit your own profile" } });
      return;
    }
    next();
  },
  validateRequest(updateUserProfileSchema),
  updateUserProfile
);
router.patch("/:id/department", authenticate, requireRole("ADMINISTRATOR"), validateRequest(assignDepartmentSchema), assignDepartment);

export default router;
