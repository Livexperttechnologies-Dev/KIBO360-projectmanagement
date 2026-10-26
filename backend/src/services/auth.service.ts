import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { dbStore, UserRecord, Role } from "../lib/db";
import { env } from "../config/env";
import { AuditService } from "./audit.service";
import { EmailService } from "./email.service";

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  departmentId?: string;
}

export class AuthService {
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  public static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: "15m",
    });
  }

  public static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
  }

  public static generateRefreshToken(user: UserRecord, ipAddress?: string, userAgent?: string): string {
    const rawToken = crypto.randomBytes(40).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    dbStore.refreshTokens.push({
      id: `rt-${crypto.randomUUID().slice(0, 8)}`,
      tokenHash,
      userId: user.id,
      expiresAt,
      ipAddress,
      userAgent,
      createdAt: new Date(),
    });

    return rawToken;
  }

  public static async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
    const user = dbStore.findUserByEmail(email);

    if (!user) {
      await AuditService.log({
        action: "LOGIN_FAILED",
        entity: "Auth",
        details: { email, reason: "User not found" },
        ipAddress,
        userAgent,
      });
      const error: any = new Error("Invalid email or password");
      error.status = 401;
      throw error;
    }

    const isMatch = await this.verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      await AuditService.log({
        userId: user.id,
        action: "LOGIN_FAILED",
        entity: "Auth",
        details: { email, reason: "Password mismatch" },
        ipAddress,
        userAgent,
      });
      const error: any = new Error("Invalid email or password");
      error.status = 401;
      throw error;
    }

    // Acceptance criterion: Deactivated users cannot access protected data or login
    if (!user.isActive) {
      await AuditService.log({
        userId: user.id,
        action: "LOGIN_BLOCKED_DEACTIVATED",
        entity: "Auth",
        details: { email, reason: "Account is deactivated" },
        ipAddress,
        userAgent,
      });
      const error: any = new Error("Your account has been deactivated. Please contact an administrator.");
      error.status = 403;
      throw error;
    }

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(user, ipAddress, userAgent);

    await AuditService.log({
      userId: user.id,
      action: "USER_LOGIN_SUCCESS",
      entity: "Auth",
      details: { role: user.role, email: user.email },
      ipAddress,
      userAgent,
    });

    const fullUser = dbStore.getFullUser(user);

    return {
      user: fullUser,
      accessToken,
      refreshToken,
    };
  }

  public static async logout(refreshToken?: string, userId?: string) {
    if (refreshToken) {
      const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
      const record = dbStore.refreshTokens.find((r) => r.tokenHash === tokenHash);
      if (record) {
        record.revokedAt = new Date();
      }
    }

    if (userId) {
      await AuditService.log({
        userId,
        action: "USER_LOGOUT",
        entity: "Auth",
        details: { message: "User session terminated" },
      });
    }

    return { success: true };
  }

  public static async refreshSession(refreshToken: string, ipAddress?: string, userAgent?: string) {
    if (!refreshToken) {
      const error: any = new Error("Refresh token missing");
      error.status = 401;
      throw error;
    }

    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const record = dbStore.refreshTokens.find(
      (r) => r.tokenHash === tokenHash && !r.revokedAt && r.expiresAt > new Date()
    );

    if (!record) {
      const error: any = new Error("Invalid or expired refresh token");
      error.status = 401;
      throw error;
    }

    const user = dbStore.findUserById(record.userId);
    if (!user || !user.isActive) {
      const error: any = new Error("User account is inactive or not found");
      error.status = 403;
      throw error;
    }

    // Revoke old token and issue a fresh pair (Refresh token rotation)
    record.revokedAt = new Date();

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
    };

    const newAccessToken = this.generateAccessToken(payload);
    const newRefreshToken = this.generateRefreshToken(user, ipAddress, userAgent);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: dbStore.getFullUser(user),
    };
  }

  public static async requestPasswordReset(email: string, ipAddress?: string) {
    const user = dbStore.findUserByEmail(email);

    // If user does not exist, return success generically to prevent enumeration
    if (!user) {
      return {
        success: true,
        message: "If an account exists with that email, password reset instructions have been sent.",
      };
    }

    // If user is deactivated, do not send reset
    if (!user.isActive) {
      const error: any = new Error("Cannot reset password for deactivated account. Contact administrator.");
      error.status = 403;
      throw error;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 60); // 1 hour

    dbStore.passwordResetTokens.push({
      id: `pr-${crypto.randomUUID().slice(0, 8)}`,
      tokenHash,
      userId: user.id,
      expiresAt,
      createdAt: new Date(),
    });

    const profile = dbStore.getProfileByUserId(user.id);
    const userName = profile ? `${profile.firstName} ${profile.lastName}` : "User";

    await EmailService.sendPasswordResetEmail({
      to: user.email,
      userName,
      resetToken: rawToken,
      expiresInMinutes: 60,
    });

    await AuditService.log({
      userId: user.id,
      action: "PASSWORD_RESET_REQUESTED",
      entity: "Auth",
      details: { email: user.email },
      ipAddress,
    });

    return {
      success: true,
      message: "Password reset link dispatched. Please check your email or system log.",
      debugToken: process.env.NODE_ENV !== "production" ? rawToken : undefined,
    };
  }

  public static async resetPassword(token: string, newPassword: string, ipAddress?: string) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const record = dbStore.passwordResetTokens.find(
      (r) => r.tokenHash === tokenHash && !r.usedAt && r.expiresAt > new Date()
    );

    if (!record) {
      const error: any = new Error("Password reset link is invalid or has expired.");
      error.status = 400;
      throw error;
    }

    const user = dbStore.findUserById(record.userId);
    if (!user) {
      const error: any = new Error("Account not found");
      error.status = 404;
      throw error;
    }

    // Update password
    user.passwordHash = await this.hashPassword(newPassword);
    user.updatedAt = new Date();
    record.usedAt = new Date();

    // Invalidate all active sessions for security
    dbStore.refreshTokens
      .filter((r) => r.userId === user.id)
      .forEach((r) => (r.revokedAt = new Date()));

    await AuditService.log({
      userId: user.id,
      action: "PASSWORD_RESET_COMPLETED",
      entity: "Auth",
      details: { email: user.email },
      ipAddress,
    });

    return {
      success: true,
      message: "Your password has been successfully reset. You may now log in with your new credentials.",
    };
  }
}