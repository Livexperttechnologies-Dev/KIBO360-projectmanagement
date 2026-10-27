import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { dbStore, UserRecord, Role } from "../lib/db";
import { env } from "../config/env";
import { AuditService } from "./audit.service";
import { createOtpAuthUri, createTotpSecret, decryptTotpSecret, encryptTotpSecret, matchingTotpStep } from "../lib/totp";
import { getDesignatedSuperAdmin, isDesignatedSuperAdmin } from "../lib/superAdmin";

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  departmentId?: string;
  twoFactorVerified?: boolean;
  sessionExpiresAt?: number;
}

export class AuthService {
  public static readonly SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  public static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public static generateAccessToken(payload: TokenPayload, twoFactorVerified = false): string {
    return jwt.sign({ ...payload, twoFactorVerified }, env.JWT_ACCESS_SECRET, {
      expiresIn: "15m",
    });
  }

  public static verifyAccessToken(token: string): TokenPayload {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
    if (payload.sessionExpiresAt && payload.sessionExpiresAt <= Date.now()) {
      throw new jwt.TokenExpiredError("Session has expired", new Date(payload.sessionExpiresAt));
    }
    return payload;
  }

  public static generateRefreshToken(
    user: UserRecord,
    ipAddress?: string,
    userAgent?: string,
    twoFactorVerified = false,
    sessionExpiresAt?: Date,
  ): string {
    const rawToken = crypto.randomBytes(40).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const expiresAt = sessionExpiresAt ?? new Date(Date.now() + this.SESSION_LIFETIME_MS);

    dbStore.refreshTokens.push({
      id: `rt-${crypto.randomUUID().slice(0, 8)}`,
      tokenHash,
      userId: user.id,
      expiresAt,
      ipAddress,
      userAgent,
      twoFactorVerified,
      createdAt: new Date(),
    });

    return rawToken;
  }

  public static async login(email: string, password: string, ipAddress?: string, userAgent?: string, authenticatorCode?: string) {
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

    if (user.isInvited) {
      const error: any = new Error("Your account needs a password set by the super admin before you can sign in.");
      error.status = 403;
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

    const globalTwoFactorEnabled = dbStore.securitySettings.find((setting) => setting.id === "global")?.globalTwoFactorEnabled ?? false;
    const isSuperAdmin = isDesignatedSuperAdmin(user.id, user.role);
    let twoFactorVerified = false;

    const ownFactor = this.getAuthenticator(user.id);
    if (isSuperAdmin && ownFactor?.enabled) {
      if (!authenticatorCode) {
        return { requiresTwoFactor: true, requiresEnrollment: false, usesSuperAdminAuthenticator: false, message: "Enter the current code from your Google Authenticator." };
      }
      this.verifyAndConsumeCode(user.id, authenticatorCode);
      twoFactorVerified = true;
    } else if (!isSuperAdmin && globalTwoFactorEnabled) {
      const superAdmin = this.getDesignatedSuperAdmin();
      if (!superAdmin || !this.getAuthenticator(superAdmin.id)?.enabled) {
        const error: any = new Error("Organization 2FA is enabled. Ask the super admin to finish setting up Google Authenticator before users sign in.");
        error.status = 503;
        throw error;
      }
      if (!authenticatorCode) {
        return { requiresTwoFactor: true, requiresEnrollment: false, usesSuperAdminAuthenticator: true, message: "Ask the super admin for the current Google Authenticator code." };
      }
      this.verifySharedSuperAdminCode(authenticatorCode);
      twoFactorVerified = true;
    }

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
    };

    const refreshTokenExpiresAt = new Date(Date.now() + this.SESSION_LIFETIME_MS);
    const accessToken = this.generateAccessToken(
      { ...payload, sessionExpiresAt: refreshTokenExpiresAt.getTime() },
      twoFactorVerified,
    );
    const refreshToken = this.generateRefreshToken(user, ipAddress, userAgent, twoFactorVerified, refreshTokenExpiresAt);

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
      refreshTokenExpiresAt,
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

    const globalTwoFactorEnabled = dbStore.securitySettings.find((setting) => setting.id === "global")?.globalTwoFactorEnabled ?? false;
    const sessionUser = dbStore.findUserById(record.userId);
    const isSuperAdmin = Boolean(sessionUser && isDesignatedSuperAdmin(sessionUser.id, sessionUser.role));
    const superAdminFactorEnabled = Boolean(dbStore.userTwoFactors.find((factor) => factor.userId === record.userId)?.enabled);
    const factorRequired = (globalTwoFactorEnabled && !isSuperAdmin) || (isSuperAdmin && superAdminFactorEnabled);
    if (factorRequired && !record.twoFactorVerified) {
      const error: any = new Error("Please sign in again with your password and authenticator code");
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

    const twoFactorVerified = record.twoFactorVerified ?? false;
    const newAccessToken = this.generateAccessToken(
      { ...payload, sessionExpiresAt: record.expiresAt.getTime() },
      twoFactorVerified,
    );
    const newRefreshToken = this.generateRefreshToken(user, ipAddress, userAgent, twoFactorVerified, record.expiresAt);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      refreshTokenExpiresAt: record.expiresAt,
      user: dbStore.getFullUser(user),
    };
  }

  private static getAuthenticator(userId: string) {
    return dbStore.userTwoFactors.find((record) => record.userId === userId);
  }

  private static getDesignatedSuperAdmin() {
    const user = getDesignatedSuperAdmin();
    return user?.isActive ? user : undefined;
  }

  private static verifySharedSuperAdminCode(code: string) {
    const superAdmin = this.getDesignatedSuperAdmin();
    const factor = superAdmin ? this.getAuthenticator(superAdmin.id) : undefined;
    if (!factor?.enabled) {
      const error: any = new Error("The super admin's Google Authenticator is not enrolled");
      error.status = 503;
      throw error;
    }
    const secret = decryptTotpSecret(factor.encryptedSecret);
    // Shared organization codes must be reusable for different users during the same
    // 30-second interval, so validate without consuming the super admin's TOTP step.
    const step = matchingTotpStep(secret, code);
    if (step === undefined) {
      const error: any = new Error("The super admin's authenticator code is invalid or expired. Ask for the current code.");
      error.status = 401;
      throw error;
    }
    return superAdmin;
  }

  private static verifyAndConsumeCode(userId: string, code: string) {
    const factor = this.getAuthenticator(userId);
    if (!factor?.enabled) {
      const error: any = new Error("Authenticator app is not set up for this account");
      error.status = 403;
      throw error;
    }
    const secret = decryptTotpSecret(factor.encryptedSecret);
    const step = matchingTotpStep(secret, code, Date.now(), factor.lastVerifiedStep);
    if (step === undefined) {
      const error: any = new Error("The authenticator code is invalid, expired, or already used");
      error.status = 401;
      throw error;
    }
    factor.lastVerifiedStep = step;
    factor.updatedAt = new Date();
    return factor;
  }

  public static getTwoFactorSettings(userId: string, email: string, role: Role) {
    const globalTwoFactorEnabled = dbStore.securitySettings.find((setting) => setting.id === "global")?.globalTwoFactorEnabled ?? false;
    const isSuperAdmin = isDesignatedSuperAdmin(userId, role);
    const superAdmin = this.getDesignatedSuperAdmin();
    return {
      globalTwoFactorEnabled,
      authenticatorEnrolled: Boolean(this.getAuthenticator(userId)?.enabled),
      superAdminAuthenticatorEnrolled: Boolean(superAdmin && this.getAuthenticator(superAdmin.id)?.enabled),
      usesSuperAdminAuthenticator: globalTwoFactorEnabled && !isSuperAdmin,
      canManageEnforcement: isSuperAdmin,
    };
  }

  public static async startAuthenticatorEnrollment(userId: string, password: string) {
    const user = dbStore.findUserById(userId);
    if (!user || !(await this.verifyPassword(password, user.passwordHash))) {
      const error: any = new Error("Current password is incorrect");
      error.status = 401;
      throw error;
    }
    let factor = this.getAuthenticator(userId);
    const secret = createTotpSecret();
    if (!factor) {
      factor = {
        id: `2fa-${crypto.randomUUID()}`,
        userId,
        encryptedSecret: encryptTotpSecret(secret),
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      dbStore.userTwoFactors.push(factor);
    } else {
      factor.encryptedSecret = encryptTotpSecret(secret);
      factor.enabled = false;
      factor.lastVerifiedStep = undefined;
      factor.updatedAt = new Date();
    }
    return { secret, otpauthUri: createOtpAuthUri(user.email, secret) };
  }

  public static async verifyAuthenticatorEnrollment(userId: string, password: string, code: string) {
    const user = dbStore.findUserById(userId);
    if (!user || !(await this.verifyPassword(password, user.passwordHash))) {
      const error: any = new Error("Current password is incorrect");
      error.status = 401;
      throw error;
    }
    const factor = this.getAuthenticator(userId);
    if (!factor) {
      const error: any = new Error("Start authenticator setup before verifying a code");
      error.status = 400;
      throw error;
    }
    const secret = decryptTotpSecret(factor.encryptedSecret);
    const step = matchingTotpStep(secret, code, Date.now(), factor.lastVerifiedStep);
    if (step === undefined) {
      const error: any = new Error("The authenticator code is invalid, expired, or already used");
      error.status = 401;
      throw error;
    }
    factor.enabled = true;
    factor.lastVerifiedStep = step;
    factor.updatedAt = new Date();
    await AuditService.log({ userId, action: "AUTHENTICATOR_ENROLLED", entity: "Auth" });
    return { success: true };
  }

  public static async setGlobalTwoFactorEnforcement(userId: string, email: string, role: Role, enabled: boolean, code: string) {
    if (!isDesignatedSuperAdmin(userId, role)) {
      const error: any = new Error("Only the designated super admin can change organization-wide 2FA");
      error.status = 403;
      throw error;
    }
    this.verifyAndConsumeCode(userId, code);
    const setting = dbStore.securitySettings.find((record) => record.id === "global");
    if (!setting) {
      dbStore.securitySettings.push({ id: "global", globalTwoFactorEnabled: enabled, updatedBy: userId, updatedAt: new Date() });
    } else {
      setting.globalTwoFactorEnabled = enabled;
      setting.updatedBy = userId;
      setting.updatedAt = new Date();
    }
    // Force all existing sessions to reauthenticate under the new policy.
    dbStore.refreshTokens.filter((record) => !record.revokedAt).forEach((record) => (record.revokedAt = new Date()));
    await AuditService.log({
      userId,
      action: enabled ? "GLOBAL_2FA_ENABLED" : "GLOBAL_2FA_DISABLED",
      entity: "SecuritySetting",
    });
    return { globalTwoFactorEnabled: enabled };
  }

  public static async resetPasswordWithAuthenticator(email: string, code: string, newPassword: string, ipAddress?: string) {
    const user = dbStore.findUserByEmail(email);
    if (!user || !user.isActive) {
      const error: any = new Error("Account or authenticator code is invalid");
      error.status = 401;
      throw error;
    }
    // Password recovery always requires a personal authenticator code.
    const globalTwoFactorEnabled = dbStore.securitySettings.find((setting) => setting.id === "global")?.globalTwoFactorEnabled ?? false;
    const isSuperAdmin = isDesignatedSuperAdmin(user.id, user.role);
    if (globalTwoFactorEnabled && !isSuperAdmin) this.verifySharedSuperAdminCode(code);
    else this.verifyAndConsumeCode(user.id, code);
    user.passwordHash = await this.hashPassword(newPassword);
    user.updatedAt = new Date();
    dbStore.passwordResetTokens.filter((record) => record.userId === user.id && !record.usedAt).forEach((record) => (record.usedAt = new Date()));
    dbStore.refreshTokens.filter((record) => record.userId === user.id && !record.revokedAt).forEach((record) => (record.revokedAt = new Date()));
    await AuditService.log({
      userId: user.id,
      action: "PASSWORD_RESET_COMPLETED_WITH_AUTHENTICATOR",
      entity: "Auth",
      details: { email: user.email },
      ipAddress,
    });
    return { success: true, message: "Password reset complete. Sign in with your new password and authenticator code." };
  }

}
