import crypto from "crypto";
import { dbStore, Role, UserRecord, ProfileRecord } from "../lib/db";
import { AuditService } from "./audit.service";
import { EmailService } from "./email.service";
import { AuthService } from "./auth.service";

export interface InviteUserParams {
  email: string;
  firstName: string;
  lastName: string;
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
  public static listUsers(filters?: { departmentId?: string; role?: string; search?: string }) {
    let users = dbStore.users;

    if (filters?.departmentId) {
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

  public static async inviteUser(params: InviteUserParams) {
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

    // Temporary password & token
    const tempPassword = `Lx#${crypto.randomBytes(4).toString("hex")}!26`;
    const passwordHash = await AuthService.hashPassword(tempPassword);

    const newUser: UserRecord = {
      id: `usr-${crypto.randomUUID().slice(0, 8)}`,
      email: params.email.toLowerCase().trim(),
      passwordHash,
      role: params.role,
      isActive: true,
      isInvited: true,
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

    const actor = params.actorUserId ? dbStore.findUserById(params.actorUserId) : undefined;
    const actorName = actor ? actor.email : "System Administrator";

    await EmailService.sendUserInviteEmail({
      to: newUser.email,
      userName: `${newProfile.firstName} ${newProfile.lastName}`,
      invitedBy: actorName,
      temporaryToken: tempPassword,
    });

    await AuditService.log({
      userId: params.actorUserId,
      targetId: newUser.id,
      action: "USER_INVITED",
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
      temporaryPassword: process.env.NODE_ENV !== "production" ? tempPassword : undefined,
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