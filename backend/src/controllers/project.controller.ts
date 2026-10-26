import { Request, Response, NextFunction } from "express";
import { ProjectService } from "../services/project.service";

export async function listProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const { search, departmentId, status, priority, ownerId } = req.query as Record<string, string>;

    const projects = ProjectService.listProjects(
      {
        search,
        departmentId,
        status,
        priority,
        ownerId,
      },
      user
    );

    res.status(200).json({
      success: true,
      data: { projects },
    });
  } catch (error) {
    next(error);
  }
}

export async function getProjectById(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const project = ProjectService.getProjectById(id, user);

    res.status(200).json({
      success: true,
      data: { project },
    });
  } catch (error) {
    next(error);
  }
}

export async function createProject(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const project = await ProjectService.createProject(req.body, user);

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: { project },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProject(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const project = await ProjectService.updateProject(id, req.body, user);

    res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: { project },
    });
  } catch (error) {
    next(error);
  }
}

export async function archiveProject(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const project = await ProjectService.archiveProject(id, user);

    res.status(200).json({
      success: true,
      message: "Project archived successfully",
      data: { project },
    });
  } catch (error) {
    next(error);
  }
}

export async function addMember(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const members = await ProjectService.addMember(projectId, req.body, user);

    res.status(200).json({
      success: true,
      message: "Member added to project successfully",
      data: { members },
    });
  } catch (error) {
    next(error);
  }
}

export async function removeMember(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

    const members = await ProjectService.removeMember(projectId, userId, user);

    res.status(200).json({
      success: true,
      message: "Member removed from project",
      data: { members },
    });
  } catch (error) {
    next(error);
  }
}

export async function createMilestone(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const milestone = await ProjectService.createMilestone(projectId, req.body, user);

    res.status(201).json({
      success: true,
      message: "Milestone created successfully",
      data: { milestone },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMilestone(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const milestoneId = Array.isArray(req.params.milestoneId) ? req.params.milestoneId[0] : req.params.milestoneId;

    const milestone = await ProjectService.updateMilestone(projectId, milestoneId, req.body, user);

    res.status(200).json({
      success: true,
      message: "Milestone updated successfully",
      data: { milestone },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteMilestone(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const milestoneId = Array.isArray(req.params.milestoneId) ? req.params.milestoneId[0] : req.params.milestoneId;

    await ProjectService.deleteMilestone(projectId, milestoneId, user);

    res.status(200).json({
      success: true,
      message: "Milestone deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}
