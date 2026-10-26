import { Router } from "express";
import {
  login,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
  getMe,
} from "../controllers/auth.controller";
import { validateRequest } from "../middleware/validateRequest";
import { authenticate } from "../middleware/auth";
import { loginLimiter, passwordResetLimiter } from "../middleware/rateLimiter";
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validations/auth.validation";

const router = Router();

router.post("/login", loginLimiter, validateRequest(loginSchema), login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.post("/forgot-password", passwordResetLimiter, validateRequest(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", passwordResetLimiter, validateRequest(resetPasswordSchema), resetPassword);
router.get("/me", authenticate, getMe);

export default router;