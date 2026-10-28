import crypto from "crypto";
import { dbStore, Role, UserRecord, ProfileRecord } from "../lib/db";
import { AuditService } from "./audit.service";
import { AuthService } from "./auth.service";
import { isDesignatedSuperAdmin } from "../lib/superAdmin";

export interface CreateUserParams {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: Role;
  departmentId: string;
  jobTitle?: string;
  actorUserId?: string;
  ipAddress?: string;
}

export interface UpdateProfileParams {
  userId: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  phone?: string;
  bio?: string;
  actorUserId?: string;
  ipAddress?: string;
}

export class UserService {
  private static assertSuperAdmin(actorUserId: string) {
    const actor = dbStore.findUserById(actorUserId);
    if (!actor || !isDesignatedSuperAdmin(actor.id, actor.role)) {
      const error: any = new Error("Only the designated super admin can perform this action.");
      error.status = 403;
      throw error;
    }
  }

  public static async superAdminUpdateUser(params: {
    actorUserId: string; userId: string; email: string; firstName: string; lastName: string; jobTitle?: string; ipAddress?: string;
  }) {
    this.assertSuperAdmin(params.actorUserId);
    const user = dbStore.findUserById(params.userId);
    if (!user) { const error: any = new Error("User not found"); error.status = 404; throw error; }
    const normalizedEmail = params.email.trim().toLowerCase();
    const duplicate = dbStore.findUserByEmail(normalizedEmail);
    if (duplicate && duplicate.id !== user.id) { const error: any = new Error("That email address is already used by another account."); error.status = 409; throw error; }
    const previousEmail = user.email;
    user.email = normalizedEmail;
    user.updatedAt = new Date();
    let profile = dbStore.getProfileByUserId(user.id);
    if (!profile) {
      profile = { id: `prof-${crypto.randomUUID().slice(0, 8)}`, userId: user.id, firstName: "", lastName: "", createdAt: new Date(), updatedAt: new Date() };
      dbStore.profiles.push(profile);
    }
    profile.firstName = params.firstName.trim();
    profile.lastName = params.lastName.trim();
    if (params.jobTitle !== undefined) profile.jobTitle = params.jobTitle.trim();
    profile.updatedAt = new Date();
    dbStore.refreshTokens.filter((record) => record.userId === user.id && !record.revokedAt).forEach((record) => (record.revokedAt = new Date()));
    await AuditService.log({ userId: params.actorUserId, targetId: user.id, action: "SUPER_ADMIN_USER_IDENTITY_UPDATED", entity: "User", details: { previousEmail, email: user.email }, ipAddress: params.ipAddress });
    return dbStore.getFullUser(user);
  }

  public static async superAdminSetPassword(actorUserId: string, userId: string, password: string, ipAddress?: string) {
    this.assertSuperAdmin(actorUserId);
    const user = dbStore.findUserById(userId);
    if (!user) { const error: any = new Error("User not found"); error.status = 404; throw error; }
    user.passwordHash = await AuthService.hashPassword(password);
    user.isInvited = false;
    user.updatedAt = new Date();
    dbStore.refreshTokens.filter((record) => record.userId === user.id && !record.revokedAt).forEach((record) => (record.revokedAt = new Date()));
    await AuditService.log({ userId: actorUserId, targetId: user.id, action: "SUPER_ADMIN_PASSWORD_SET", entity: "Auth", details: { email: user.email }, ipAddress });
    return { success: true };
  }

  public static listUsers(filters?: { departmentId?: string; role?: string; search?: string }, requester?: { role: Role; departmentId?: string }) {
    let users = dbStore.users;

    if (requester && requester.role !== "ADMINISTRATOR" && requester.role !== "MANAGER") {
      users = users.filter((u) => Boolean(requester.departmentId) && u.departmentId === requester.departmentId);
    } else if (filters?.departmentId) {
      users = users.filter((u) => u.departmentId === filters.departmentId);
    }
    if (filters?.role) {
      users = users.filter((u) => u.role === filters.role);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      users = users.filter((u) => {
        const prof = dbStore.getProfileByUserId(u.id);
        const name = prof ? `${prof.firstName} ${prof.lastName}`.toLowerCase() : "";
        return u.email.toLowerCase().includes(q) || name.includes(q);
      });
    }

    return users.map((u) => dbStore.getFullUser(u));
  }

  public static getUserById(userId: string) {
    const user = dbStore.findUserById(userId);
    if (!user) {
      const error: any = new Error("User not found");
      error.status = 404;
      throw error;
    }
    return dbStore.getFullUser(user);
  }

  public static async createUser(params: CreateUserParams) {
    if (!params.actorUserId) {
      const error: any = new Error("Only the super admin can create user accounts.");
      error.status = 403;
      throw error;
    }
    this.assertSuperAdmin(params.actorUserId);

    const existing = dbStore.findUserByEmail(params.email);
    if (existing) {
      const error: any = new Error("A user account with this email already exists.");
      error.status = 409;
      throw error;
    }

    // Verify department exists
    const dept = dbStore.getDepartmentById(params.departmentId);
    if (!dept) {
      const error: any = new Error("Invalid department. Please select Software / IT or Product / Design.");
      error.status = 400;
      throw error;
    }

    const passwordHash = await AuthService.hashPassword(params.password);

    const newUser: UserRecord = {
      id: `usr-${crypto.randomUUID().slice(0, 8)}`,
      email: params.email.toLowerCase().trim(),
      passwordHash,
      role: params.role,
      isActive: true,
      isInvited: false,
      departmentId: params.departmentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newProfile: ProfileRecord = {
      id: `prof-${crypto.randomUUID().slice(0, 8)}`,
      userId: newUser.id,
      firstName: params.firstName.trim(),
      lastName: params.lastName.trim(),
      jobTitle: params.jobTitle || `${params.role} at Livexpert`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    dbStore.users.push(newUser);
    dbStore.profiles.push(newProfile);

    await AuditService.log({
      userId: params.actorUserId,
      targetId: newUser.id,
      action: "SUPER_ADMIN_USER_CREATED",
      entity: "User",
      details: {
        email: newUser.email,
        role: newUser.role,
        department: dept.name,
      },
      ipAddress: params.ipAddress,
    });

    return {
      user: dbStore.getFullUser(newUser),
    };
  }

  public static async updateUserStatus(
    userId: string,
    isActive: boolean,
    actorUserId?: string,
    ipAddress?: string
  ) {
    const user = dbStore.findUserById(userId);
    if (!user) {
      const error: any = new Error("User not found");
      error.status = 404;
      throw error;
    }

    if (user.id === actorUserId && !isActive) {
      const error: any = new Error("Administrators cannot deactivate their own active account.");
      error.status = 400;
      throw error;
    }

    const previousStatus = user.isActive;
    user.isActive = isActive;
    user.updatedAt = new Date();

    // Revoke sessions if deactivating
    if (!isActive) {
      dbStore.refreshTokens
        .filter((r) => r.userId === user.id)
        .forEach((r) => (r.revokedAt = new Date()));
    }

    await AuditService.log({
      userId: actorUserId,
      targetId: user.id,
      action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
      entity: "User",
      details: { previousStatus, newStatus: isActive, email: user.email },
      ipAddress,
    });

    return dbStore.getFullUser(user);
  }

  public static async updateUserProfile(params: UpdateProfileParams) {
    const user = dbStore.findUserById(params.userId);
    if (!user) {
      const error: any = new Error("User not found");
      error.status = 404;
      throw error;
    }

    let profile = dbStore.getProfileByUserId(user.id);
    if (!profile) {
      profile = {
        id: `prof-${crypto.randomUUID().slice(0, 8)}`,
        userId: user.id,
        firstName: "",
        lastName: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      dbStore.profiles.push(profile);
    }

    if (params.firstName !== undefined) profile.firstName = params.firstName.trim();
    if (params.lastName !== undefined) profile.lastName = params.lastName.trim();
    if (params.jobTitle !== undefined) profile.jobTitle = params.jobTitle.trim();
    if (params.phone !== undefined) profile.phone = params.phone.trim();
    if (params.bio !== undefined) profile.bio = params.bio.trim();
    profile.updatedAt = new Date();

    await AuditService.log({
      userId: params.actorUserId,
      targetId: user.id,
      action: "USER_PROFILE_UPDATED",
      entity: "Profile",
      details: { updatedFields: Object.keys(params).filter((k) => k !== "userId" && k !== "actorUserId") },
      ipAddress: params.ipAddress,
    });

    return dbStore.getFullUser(user);
  }

  public static async assignDepartment(
    userId: string,
    departmentId: string,
    actorUserId?: string,
    ipAddress?: string
  ) {
    const user = dbStore.findUserById(userId);
    if (!user) {
      const error: any = new Error("User not found");
      error.status = 404;
      throw error;
    }

    const dept = dbStore.getDepartmentById(departmentId);
    if (!dept) {
      const error: any = new Error("Invalid department. Allowed: Software / IT or Product / Design.");
      error.status = 400;
      throw error;
    }

    const previousDeptId = user.departmentId;
    user.departmentId = departmentId;
    user.updatedAt = new Date();

    await AuditService.log({
      userId: actorUserId,
      targetId: user.id,
      action: "DEPARTMENT_ASSIGNED",
      entity: "Department",
      details: { previousDeptId, newDept: dept.name, email: user.email },
      ipAddress,
    });

    return dbStore.getFullUser(user);
  }

  public static async updateUserRole(
    userId: string,
    newRole: Role,
    actorUserId?: string,
    ipAddress?: string
  ) {
    const user = dbStore.findUserById(userId);
    if (!user) {
      const error: any = new Error("User not found");
      error.status = 404;
      throw error;
    }

    if (isDesignatedSuperAdmin(user.id, user.role) && newRole !== "ADMINISTRATOR") {
      const error: any = new Error("The designated super admin must remain an administrator.");
      error.status = 400;
      throw error;
    }

    const previousRole = user.role;
    user.role = newRole;
    user.updatedAt = new Date();

    await AuditService.log({
      userId: actorUserId,
      targetId: user.id,
      action: "ROLE_CHANGED",
      entity: "User",
      details: { previousRole, newRole, email: user.email },
      ipAddress,
    });

    return dbStore.getFullUser(user);
  }
}
