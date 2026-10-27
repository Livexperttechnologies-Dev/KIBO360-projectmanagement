import { Router } from "express";
import {
  login,
  logout,
  refresh,
  resetPassword,
  getMe,
  getTwoFactorSettings,
  startAuthenticatorEnrollment,
  verifyAuthenticatorEnrollment,
  setGlobalTwoFactorEnforcement,
} from "../controllers/auth.controller";
import { validateRequest } from "../middleware/validateRequest";
import { authenticate } from "../middleware/auth";
import { loginLimiter, passwordResetLimiter } from "../middleware/rateLimiter";
import {
  loginSchema,
  resetPasswordSchema,
} from "../validations/auth.validation";

const router = Router();

router.post("/login", loginLimiter, validateRequest(loginSchema), login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.post("/reset-password", passwordResetLimiter, validateRequest(resetPasswordSchema), resetPassword);
router.get("/me", authenticate, getMe);
router.get("/two-factor", authenticate, getTwoFactorSettings);
router.post("/two-factor/enrollment", authenticate, startAuthenticatorEnrollment);
router.post("/two-factor/enrollment/verify", authenticate, verifyAuthenticatorEnrollment);
router.put("/two-factor/enforcement", authenticate, setGlobalTwoFactorEnforcement);

export default router;
