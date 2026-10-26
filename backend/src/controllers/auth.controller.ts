import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { dbStore } from "../lib/db";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];

    const result = await AuthService.login(email, password, ipAddress, userAgent);

    // Set secure HTTP-only cookies
    res.cookie("refresh_token", result.refreshToken, COOKIE_OPTIONS);
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

    res.cookie("refresh_token", result.refreshToken, COOKIE_OPTIONS);
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

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress;

    const result = await AuthService.requestPasswordReset(email, ipAddress);

    res.status(200).json({
      success: true,
      message: result.message,
      ...(result.debugToken ? { debugToken: result.debugToken } : {}),
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, newPassword } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress;

    const result = await AuthService.resetPassword(token, newPassword, ipAddress);

    res.status(200).json({
      success: true,
      message: result.message,
    });
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