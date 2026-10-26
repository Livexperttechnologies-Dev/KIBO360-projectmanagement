import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/user.service";
import { AuditService } from "../services/audit.service";
import { dbStore } from "../lib/db";

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { departmentId, role, search } = req.query as {
      departmentId?: string;
      role?: string;
      search?: string;
    };

    const users = UserService.listUsers({ departmentId, role, search });

    res.status(200).json({
      success: true,
      data: {
        users,
        total: users.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = UserService.getUserById(id);

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}

export async function inviteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, firstName, lastName, role, departmentId, jobTitle } = req.body;
    const actorUserId = req.user?.userId;
    const ipAddress = (req.ip || req.socket.remoteAddress) as string | undefined;

    const result = await UserService.inviteUser({
      email,
      firstName,
      lastName,
      role,
      departmentId,
      jobTitle,
      actorUserId,
      ipAddress,
    });

    res.status(201).json({
      success: true,
      message: "User invitation created and notification dispatched.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { isActive } = req.body;
    const actorUserId = req.user?.userId;
    const ipAddress = (req.ip || req.socket.remoteAddress) as string | undefined;

    const updatedUser = await UserService.updateUserStatus(id, isActive, actorUserId, ipAddress);

    res.status(200).json({
      success: true,
      message: `User account has been ${isActive ? "activated" : "deactivated"}.`,
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const actorUserId = req.user?.userId;
    const ipAddress = (req.ip || req.socket.remoteAddress) as string | undefined;

    const updatedUser = await UserService.updateUserProfile({
      userId: id,
      ...req.body,
      actorUserId,
      ipAddress,
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
}

export async function assignDepartment(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { departmentId } = req.body;
    const actorUserId = req.user?.userId;
    const ipAddress = (req.ip || req.socket.remoteAddress) as string | undefined;

    const updatedUser = await UserService.assignDepartment(id, departmentId, actorUserId, ipAddress);

    res.status(200).json({
      success: true,
      message: "Department assigned successfully.",
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
}

export async function listDepartments(_req: Request, res: Response) {
  res.status(200).json({
    success: true,
    data: {
      departments: dbStore.departments,
    },
  });
}

export async function listAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const logs = await AuditService.list(limit);

    res.status(200).json({
      success: true,
      data: {
        logs,
        total: logs.length,
      },
    });
  } catch (error) {
    next(error);
  }
}