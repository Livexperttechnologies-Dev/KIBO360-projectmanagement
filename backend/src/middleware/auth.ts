import { Request, Response, NextFunction } from "express";
import { AuthService, TokenPayload } from "../services/auth.service";
import { dbStore, Role } from "../lib/db";

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token: string | undefined;

    // 1. Authorization header: "Bearer <token>"
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
    // 2. Cookie fallback: "access_token"
    else if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          message: "Authentication required. Please provide a valid access token.",
        },
      });
      return;
    }

    const decoded = AuthService.verifyAccessToken(token);

    // Verify user account is still active in the database
    const user = dbStore.findUserById(decoded.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          message: "User session is no longer valid.",
        },
      });
      return;
    }

    // Acceptance criterion: Deactivated users cannot continue accessing protected data
    if (!user.isActive) {
      res.status(403).json({
        success: false,
        error: {
          message: "Your account has been deactivated. Access revoked.",
        },
      });
      return;
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
    };

    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      res.status(401).json({
        success: false,
        error: {
          message: "Session has expired. Please refresh your token or log in again.",
          code: "TOKEN_EXPIRED",
        },
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: {
        message: "Invalid authentication token.",
      },
    });
  }
};

export const requireRole = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { message: "Authentication required" },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          message: `Access denied. Requires one of [${roles.join(", ")}] roles.`,
          userRole: req.user.role,
        },
      });
      return;
    }

    next();
  };
};