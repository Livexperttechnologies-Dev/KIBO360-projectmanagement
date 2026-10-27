import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { dbStore } from "../lib/db";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: AuthService.SESSION_LIFETIME_MS,
};

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, authenticatorCode } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];

    const result = await AuthService.login(email, password, ipAddress, userAgent, authenticatorCode);

    if ("requiresTwoFactor" in result && result.requiresTwoFactor) {
      res.status(200).json({
        success: true,
        data: {
          requiresTwoFactor: true,
          requiresEnrollment: Boolean(result.requiresEnrollment),
          usesSuperAdminAuthenticator: Boolean(result.usesSuperAdminAuthenticator),
          ...(result.message ? { message: result.message } : {}),
          ...("setupSecret" in result && result.setupSecret && "setupUri" in result && result.setupUri ? { setupSecret: result.setupSecret, setupUri: result.setupUri } : {}),
        },
      });
      return;
    }

    // Set secure HTTP-only cookies
    res.cookie("refresh_token", result.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: Math.max(0, (result.refreshTokenExpiresAt?.getTime() ?? Date.now() + AuthService.SESSION_LIFETIME_MS) - Date.now()),
    });
    res.cookie("access_token", result.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15 mins
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
    const userId = req.user?.userId;

    await AuthService.logout(refreshToken, userId);

    res.clearCookie("access_token");
    res.clearCookie("refresh_token");

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];

    const result = await AuthService.refreshSession(refreshToken, ipAddress, userAgent);

    res.cookie("refresh_token", result.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: Math.max(0, result.refreshTokenExpiresAt.getTime() - Date.now()),
    });
    res.cookie("access_token", result.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, authenticatorCode, newPassword } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress;

    const result = await AuthService.resetPasswordWithAuthenticator(email, authenticatorCode, newPassword, ipAddress);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTwoFactorSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    res.status(200).json({ success: true, data: AuthService.getTwoFactorSettings(user.userId, user.email, user.role) });
  } catch (error) {
    next(error);
  }
}

export async function startAuthenticatorEnrollment(req: Request, res: Response, next: NextFunction) {
  try {
    const setup = await AuthService.startAuthenticatorEnrollment(req.user!.userId, req.body.password);
    res.status(200).json({ success: true, data: setup });
  } catch (error) {
    next(error);
  }
}

export async function verifyAuthenticatorEnrollment(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await AuthService.verifyAuthenticatorEnrollment(req.user!.userId, req.body.password, req.body.authenticatorCode);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function setGlobalTwoFactorEnforcement(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const result = await AuthService.setGlobalTwoFactorEnforcement(
      user.userId,
      user.email,
      user.role,
      req.body.enabled,
      req.body.authenticatorCode
    );
    res.status(200).json({ success: true, data: result, message: "Organization-wide authenticator policy updated" });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: { message: "Unauthenticated" } });
      return;
    }

    const user = dbStore.findUserById(req.user.userId);
    if (!user) {
      res.status(404).json({ success: false, error: { message: "User not found" } });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: dbStore.getFullUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
}
