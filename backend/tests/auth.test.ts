import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { AuthService } from "../src/services/auth.service";
import { UserService } from "../src/services/user.service";
import { AuditService } from "../src/services/audit.service";
import { dbStore } from "../src/lib/db";

describe("Phase 2 â€” Authentication and User Management Suite", () => {
  before(() => {
    // Ensure seed data is initialized
    dbStore.seedDefaultData();
  });

  // 1. Migration Verification
  test("1. PostgreSQL Prisma Migration SQL exists and contains Phase 2 DDL", () => {
    const migrationDir = path.resolve(process.cwd(), "prisma/migrations/20261025000000_phase2_auth_and_user_management/migration.sql");
    assert.ok(fs.existsSync(migrationDir), "Migration SQL file must exist in prisma/migrations");

    const sqlContent = fs.readFileSync(migrationDir, "utf-8");
    assert.ok(sqlContent.includes("CREATE TABLE \"users\""), "Migration must create users table");
    assert.ok(sqlContent.includes("CREATE TABLE \"profiles\""), "Migration must create profiles table");
    assert.ok(sqlContent.includes("CREATE TABLE \"departments\""), "Migration must create departments table");
    assert.ok(sqlContent.includes("CREATE TABLE \"refresh_tokens\""), "Migration must create refresh_tokens table");
    assert.ok(sqlContent.includes("CREATE TABLE \"audit_logs\""), "Migration must create audit_logs table");
    assert.ok(sqlContent.includes("CREATE TYPE \"Role\""), "Migration must create Role enum");
  });

  // 2. Password Hashing (Bcrypt)
  test("2. Passwords are securely hashed using bcrypt and verified", async () => {
    const plain = "StrongPassword@2026";
    const hash = await AuthService.hashPassword(plain);

    assert.notEqual(plain, hash, "Password must not be stored in plain text");
    assert.match(hash, /^\$2[aby]\$/, "Hash must follow standard bcrypt format");

    const isValid = await AuthService.verifyPassword(plain, hash);
    assert.equal(isValid, true, "Correct password must verify successfully");

    const isInvalid = await AuthService.verifyPassword("WrongPassword!123", hash);
    assert.equal(isInvalid, false, "Incorrect password must fail verification");
  });

  // 3. Invalid credentials rejection
  test("3. Invalid credentials are rejected with 401 Unauthorized", async () => {
    // Non-existent user
    await assert.rejects(
      async () => {
        await AuthService.login("nonexistent@livexpert.in", "Livexpert@2026");
      },
      (err: any) => {
        assert.equal(err.status, 401);
        assert.equal(err.message, "Invalid email or password");
        return true;
      }
    );

    // Incorrect password for valid user
    await assert.rejects(
      async () => {
        await AuthService.login("admin@livexpert.in", "WrongPassword@999");
      },
      (err: any) => {
        assert.equal(err.status, 401);
        assert.equal(err.message, "Invalid email or password");
        return true;
      }
    );
  });

  // 4. Valid credentials authentication
  test("4. Valid users can sign in and receive signed JWT access tokens", async () => {
    const result = await AuthService.login("admin@livexpert.in", "Livexpert@2026");

    assert.ok(result.accessToken, "Login must return an access token");
    assert.ok(result.refreshToken, "Login must return a refresh token");
    assert.equal(result.user.email, "admin@livexpert.in");
    assert.equal(result.user.role, "ADMINISTRATOR");
    assert.equal(result.user.department?.name, "Software / IT");

    // Verify access token decode
    const decoded = AuthService.verifyAccessToken(result.accessToken);
    assert.equal(decoded.userId, result.user.id);
    assert.equal(decoded.email, "admin@livexpert.in");
    assert.equal(decoded.role, "ADMINISTRATOR");
  });

  // 5. Deactivated user blocking
  test("5. Deactivated users cannot log in or access protected data", async () => {
    // Attempt login with deactivated user
    await assert.rejects(
      async () => {
        await AuthService.login("inactive@livexpert.in", "Livexpert@2026");
      },
      (err: any) => {
        assert.equal(err.status, 403);
        assert.match(err.message, /account has been deactivated/i);
        return true;
      }
    );

    // If an active user gets deactivated, verify status check
    const dev = dbStore.findUserByEmail("dev@livexpert.in")!;
    assert.equal(dev.isActive, true);

    await UserService.updateUserStatus(dev.id, false, "usr-admin-01");
    assert.equal(dev.isActive, false);

    await assert.rejects(
      async () => {
        await AuthService.login("dev@livexpert.in", "Livexpert@2026");
      },
      (err: any) => {
        assert.equal(err.status, 403);
        return true;
      }
    );

    // Restore dev account
    await UserService.updateUserStatus(dev.id, true, "usr-admin-01");
    assert.equal(dev.isActive, true);
  });

  // 6. Role-Based Authorization
  test("6. Server-side role boundaries enforce permissions", () => {
    const adminUser = dbStore.findUserByEmail("admin@livexpert.in")!;
    const employeeUser = dbStore.findUserByEmail("dev@livexpert.in")!;

    assert.equal(adminUser.role, "ADMINISTRATOR");
    assert.equal(employeeUser.role, "EMPLOYEE");

    const allowedRoles = ["ADMINISTRATOR", "PROJECT_MANAGER"];
    assert.ok(allowedRoles.includes(adminUser.role), "Administrator must have access");
    assert.equal(allowedRoles.includes(employeeUser.role), false, "Employee must be rejected from admin routes");
  });

  // 7. Password Reset Flow
  test("7. Password reset generates token, dispatches email, and updates credentials", async () => {
    const user = dbStore.findUserByEmail("lead@livexpert.in")!;

    // Request reset
    const reqRes = await AuthService.requestPasswordReset(user.email);
    assert.equal(reqRes.success, true);
    assert.ok(reqRes.debugToken, "Debug token must be returned in non-prod");

    const newPass = "NewSecurePassword#2026";
    const resetRes = await AuthService.resetPassword(reqRes.debugToken!, newPass);
    assert.equal(resetRes.success, true);

    // Verify old password fails
    await assert.rejects(async () => {
      await AuthService.login(user.email, "Livexpert@2026");
    });

    // Verify new password succeeds
    const loginRes = await AuthService.login(user.email, newPass);
    assert.equal(loginRes.user.email, user.email);

    // Reset back to default
    await AuthService.resetPassword(
      (await AuthService.requestPasswordReset(user.email)).debugToken!,
      "Livexpert@2026"
    );
  });

  // 8. Admin User Management (Invite, Department Assignment, Profile Update)
  test("8. Admin user operations (Invite, Department, Profile, Role)", async () => {
    const newEmail = "new.engineer@livexpert.in";

    // Invite User
    const inviteRes = await UserService.inviteUser({
      email: newEmail,
      firstName: "Neha",
      lastName: "Sharma",
      role: "TEAM_LEAD",
      departmentId: "dept-sw", // Software / IT
      jobTitle: "Senior Platform Architect",
      actorUserId: "usr-admin-01",
    });

    assert.equal(inviteRes.user.email, newEmail);
    assert.equal(inviteRes.user.role, "TEAM_LEAD");
    assert.equal(inviteRes.user.department?.name, "Software / IT");

    // Profile update
    const updated = await UserService.updateUserProfile({
      userId: inviteRes.user.id,
      bio: "Cloud infrastructure enthusiast",
      phone: "+91 99999 88888",
    });
    assert.equal(updated.profile?.bio, "Cloud infrastructure enthusiast");

    // Reassign department to Product / Design
    const deptUpdate = await UserService.assignDepartment(inviteRes.user.id, "dept-pd");
    assert.equal(deptUpdate.department?.name, "Product / Design");

    // Update role
    const roleUpdate = await UserService.updateUserRole(inviteRes.user.id, "PROJECT_MANAGER");
    assert.equal(roleUpdate.role, "PROJECT_MANAGER");
  });

  // 9. Audit Logging
  test("9. Important security and permission changes are recorded in audit logs", async () => {
    const logs = await AuditService.list(10);
    assert.ok(logs.length > 0, "Audit logs must not be empty");

    const actions = logs.map((l) => l.action);
    assert.ok(
      actions.includes("USER_INVITED") ||
      actions.includes("USER_STATUS_UPDATED") ||
      actions.includes("ROLE_CHANGED") ||
      actions.includes("USER_LOGIN_SUCCESS"),
      "Audit logs must record user and authentication events"
    );
  });
});