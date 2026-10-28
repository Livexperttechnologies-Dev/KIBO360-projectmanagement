import {
  dbStore,
  ProjectRecord,
  ProjectMemberRecord,
  MilestoneRecord,
  ProjectStatus,
  ProjectPriority,
  MilestoneStatus,
  ProjectMemberRole,
} from "../lib/db";
import { TokenPayload } from "./auth.service";
import { AuditService } from "./audit.service";

export interface ProjectFilters {
  search?: string;
  departmentId?: string;
  status?: string;
  priority?: string;
  ownerId?: string;
}

export class ProjectService {
  /**
   * Helper to check if current user can view a project
   */
  public static canViewProject(project: ProjectRecord, user: TokenPayload): boolean {
    if (user.role === "ADMINISTRATOR" || user.role === "MANAGER") {
      return true;
    }

    // Team lead or Employee: must be in same department OR explicitly a project member OR creator/owner
    if (project.departmentId && user.departmentId && project.departmentId === user.departmentId) {
      return true;
    }

    if (project.creatorId === user.userId || project.ownerId === user.userId) {
      return true;
    }

    const isMember = dbStore.projectMembers.some(
      (pm) => pm.projectId === project.id && pm.userId === user.userId
    );
    return isMember;
  }

  /**
   * Helper to check if current user can edit/archive/manage a project
   */
  public static canEditProject(project: ProjectRecord, user: TokenPayload): boolean {
    if (user.role === "ADMINISTRATOR") {
      return true;
    }

    if (user.role === "MANAGER") {
      // PMs can edit projects in their department or projects they own/created
      if (!project.departmentId || project.departmentId === user.departmentId) return true;
      if (project.ownerId === user.userId || project.creatorId === user.userId) return true;
    }

    // Designated owner or Lead member
    if (project.ownerId === user.userId || project.creatorId === user.userId) {
      return true;
    }

    const leadMember = dbStore.projectMembers.find(
      (pm) => pm.projectId === project.id && pm.userId === user.userId && pm.role === "LEAD"
    );
    return !!leadMember;
  }

  /**
   * List projects with search, filter, and role scoping
   */
  public static listProjects(filters: ProjectFilters, user: TokenPayload) {
    let projects = [...dbStore.projects];

    // Role-based visibility scoping
    if (user.role === "EMPLOYEE" || user.role === "TEAM_LEAD") {
      if (filters.departmentId && filters.departmentId !== "all" && filters.departmentId !== user.departmentId) {
        return [];
      }
      projects = projects.filter((p) => this.canViewProject(p, user));
    }

    // Department filter
    if (filters.departmentId && filters.departmentId !== "all") {
      projects = projects.filter((p) => p.departmentId === filters.departmentId);
    }

    // Status filter
    if (filters.status && filters.status !== "all") {
      projects = filters.status === "ACTIVE"
        ? projects.filter((p) => p.status === "ACTIVE" || p.status === "IN_PROGRESS")
        : projects.filter((p) => p.status === filters.status);
    }

    // Priority filter
    if (filters.priority && filters.priority !== "all") {
      projects = projects.filter((p) => p.priority === filters.priority);
    }

    // Owner filter
    if (filters.ownerId && filters.ownerId !== "all") {
      projects = projects.filter((p) => p.ownerId === filters.ownerId);
    }

    // Search query (title, key, description, owner)
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      projects = projects.filter((p) => {
        const owner = p.ownerId ? dbStore.findUserById(p.ownerId) : undefined;
        const ownerProfile = owner ? dbStore.getProfileByUserId(owner.id) : undefined;
        const ownerName = ownerProfile ? `${ownerProfile.firstName} ${ownerProfile.lastName}` : "";

        return (
          p.title.toLowerCase().includes(q) ||
          p.key.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          ownerName.toLowerCase().includes(q)
        );
      });
    }

    // Enrich projects
    const enriched = projects.map((p) => {
      const department = dbStore.getDepartmentById(p.departmentId);
      const owner = p.ownerId ? dbStore.findUserById(p.ownerId) : undefined;
      const ownerProfile = owner ? dbStore.getProfileByUserId(owner.id) : undefined;

      const members = dbStore.getProjectMembers(p.id);
      const milestones = dbStore.getMilestones(p.id);
      const tasks = dbStore.tasks.filter((t) => t.projectId === p.id);

      const totalMilestones = milestones.length;
      const reachedMilestones = milestones.filter((m) => m.status === "REACHED").length;

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;

      // Progress computation: combined task & milestone progress or tasks progress
      let progress = 0;
      if (totalTasks + totalMilestones > 0) {
        progress = Math.round(((completedTasks + reachedMilestones) / (totalTasks + totalMilestones)) * 100);
      } else if (p.status === "COMPLETED") {
        progress = 100;
      }

      // Deadline calculations
      const now = Date.now();
      let daysLeft: number | null = null;
      let isOverdue = false;
      if (p.targetDate) {
        const dueTime = new Date(p.targetDate).getTime();
        daysLeft = Math.ceil((dueTime - now) / (24 * 60 * 60 * 1000));
        isOverdue = dueTime < now && p.status !== "COMPLETED" && p.status !== "ARCHIVED";
      }

      return {
        id: p.id,
        title: p.title,
        key: p.key,
        description: p.description,
        status: p.status,
        priority: p.priority,
        startDate: p.startDate,
        targetDate: p.targetDate,
        dueDate: p.targetDate,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        department: department ? { id: department.id, name: department.name, code: department.code } : null,
        owner: owner
          ? {
              id: owner.id,
              email: owner.email,
              name: ownerProfile ? `${ownerProfile.firstName} ${ownerProfile.lastName}` : owner.email,
              avatarUrl: ownerProfile?.avatarUrl,
            }
          : null,
        memberCount: members.length,
        members: members.slice(0, 5),
        milestonesCount: totalMilestones,
        reachedMilestones,
        tasksCount: totalTasks,
        completedTasks,
        progress,
        daysLeft,
        isOverdue,
        canEdit: this.canEditProject(p, user),
      };
    });

    // Default sort: recent updates first
    enriched.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return enriched;
  }

  /**
   * Get single project details by ID with members and milestones
   */
  public static getProjectById(id: string, user: TokenPayload) {
    const project = dbStore.getProjectById(id);
    if (!project) {
      const err: any = new Error("Project not found");
      err.status = 404;
      throw err;
    }

    if (!this.canViewProject(project, user)) {
      const err: any = new Error("You do not have permission to view this project");
      err.status = 403;
      throw err;
    }

    const department = dbStore.getDepartmentById(project.departmentId);
    const owner = project.ownerId ? dbStore.findUserById(project.ownerId) : undefined;
    const ownerProfile = owner ? dbStore.getProfileByUserId(owner.id) : undefined;

    const members = dbStore.getProjectMembers(project.id);
    const milestones = dbStore.getMilestones(project.id);
    const tasks = dbStore.tasks.filter((t) => t.projectId === project.id);

    const totalMilestones = milestones.length;
    const reachedMilestones = milestones.filter((m) => m.status === "REACHED").length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;

    let progress = 0;
    if (totalTasks + totalMilestones > 0) {
      progress = Math.round(((completedTasks + reachedMilestones) / (totalTasks + totalMilestones)) * 100);
    } else if (project.status === "COMPLETED") {
      progress = 100;
    }

    return {
      id: project.id,
      title: project.title,
      key: project.key,
      description: project.description,
      status: project.status,
      priority: project.priority,
      startDate: project.startDate,
      targetDate: project.targetDate,
      dueDate: project.targetDate,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      department: department ? { id: department.id, name: department.name, code: department.code } : null,
      owner: owner
        ? {
            id: owner.id,
            email: owner.email,
            name: ownerProfile ? `${ownerProfile.firstName} ${ownerProfile.lastName}` : owner.email,
            avatarUrl: ownerProfile?.avatarUrl,
            jobTitle: ownerProfile?.jobTitle,
          }
        : null,
      members,
      milestones,
      tasksSummary: {
        total: totalTasks,
        completed: completedTasks,
        open: totalTasks - completedTasks,
      },
      progress,
      canEdit: this.canEditProject(project, user),
    };
  }

  /**
   * Create a new project (Authorized Managers only)
   */
  public static async createProject(data: any, user: TokenPayload) {
    if (user.role !== "ADMINISTRATOR" && user.role !== "MANAGER") {
      const err: any = new Error("Only authorized managers can create projects");
      err.status = 403;
      throw err;
    }

    // Key uniqueness
    const key = data.key.toUpperCase();
    if (dbStore.projects.some((p) => p.key === key)) {
      const err: any = new Error(`Project code '${key}' is already in use`);
      err.status = 400;
      throw err;
    }

    // Date range validation
    const targetDate = data.dueDate || data.targetDate;
    if (data.startDate && targetDate) {
      if (new Date(data.startDate).getTime() > new Date(targetDate).getTime()) {
        const err: any = new Error("Start date cannot be after due date");
        err.status = 400;
        throw err;
      }
    }

    const ownerId = data.ownerId || user.userId;

    const newProject: ProjectRecord = {
      id: `prj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: data.title,
      key,
      description: data.description,
      status: data.status || "PLANNING",
      priority: data.priority || "MEDIUM",
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      targetDate: targetDate ? new Date(targetDate) : undefined,
      creatorId: user.userId,
      ownerId,
      departmentId: data.departmentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    dbStore.projects.push(newProject);

    // Automatically add owner as Lead member
    dbStore.addProjectMember(newProject.id, ownerId, "LEAD");

    await AuditService.log({
      userId: user.userId,
      targetId: newProject.id,
      action: "PROJECT_CREATED",
      entity: "Project",
      details: { title: newProject.title, key: newProject.key, departmentId: newProject.departmentId },
    });

    return this.getProjectById(newProject.id, user);
  }

  /**
   * Update an existing project
   */
  public static async updateProject(id: string, data: any, user: TokenPayload) {
    const project = dbStore.getProjectById(id);
    if (!project) {
      const err: any = new Error("Project not found");
      err.status = 404;
      throw err;
    }

    if (!this.canEditProject(project, user)) {
      const err: any = new Error("You do not have permission to edit this project");
      err.status = 403;
      throw err;
    }

    // Date validation
    const newStartDate = data.startDate !== undefined ? (data.startDate ? new Date(data.startDate) : undefined) : project.startDate;
    const newTargetDate = (data.dueDate || data.targetDate) !== undefined
      ? (data.dueDate || data.targetDate ? new Date(data.dueDate || data.targetDate) : undefined)
      : project.targetDate;

    if (newStartDate && newTargetDate && newStartDate.getTime() > newTargetDate.getTime()) {
      const err: any = new Error("Start date cannot be after due date");
      err.status = 400;
      throw err;
    }

    // Validate against existing milestones
    const existingMilestones = dbStore.getMilestones(project.id);
    for (const m of existingMilestones) {
      const mTime = new Date(m.dueDate).getTime();
      if (newStartDate && mTime < newStartDate.getTime()) {
        const err: any = new Error(`Project start date cannot be later than existing milestone '${m.title}' (${new Date(m.dueDate).toISOString().split("T")[0]})`);
        err.status = 400;
        throw err;
      }
      if (newTargetDate && mTime > newTargetDate.getTime()) {
        const err: any = new Error(`Project due date cannot be earlier than existing milestone '${m.title}' (${new Date(m.dueDate).toISOString().split("T")[0]})`);
        err.status = 400;
        throw err;
      }
    }

    // Apply updates
    if (data.title !== undefined) project.title = data.title;
    if (data.description !== undefined) project.description = data.description;
    if (data.status !== undefined) project.status = data.status;
    if (data.priority !== undefined) project.priority = data.priority;
    if (data.departmentId !== undefined) project.departmentId = data.departmentId;
    if (data.startDate !== undefined) project.startDate = newStartDate;
    if (data.targetDate !== undefined || data.dueDate !== undefined) project.targetDate = newTargetDate;

    if (data.ownerId !== undefined && data.ownerId !== project.ownerId) {
      project.ownerId = data.ownerId;
      // Add new owner as LEAD
      dbStore.addProjectMember(project.id, data.ownerId, "LEAD");
    }

    project.updatedAt = new Date();

    await AuditService.log({
      userId: user.userId,
      targetId: project.id,
      action: "PROJECT_UPDATED",
      entity: "Project",
      details: { updates: data },
    });

    return this.getProjectById(project.id, user);
  }

  /**
   * Archive a project
   */
  public static async archiveProject(id: string, user: TokenPayload) {
    const project = dbStore.getProjectById(id);
    if (!project) {
      const err: any = new Error("Project not found");
      err.status = 404;
      throw err;
    }

    if (!this.canEditProject(project, user)) {
      const err: any = new Error("You do not have permission to archive this project");
      err.status = 403;
      throw err;
    }

    project.status = "ARCHIVED";
    project.updatedAt = new Date();

    await AuditService.log({
      userId: user.userId,
      targetId: project.id,
      action: "PROJECT_ARCHIVED",
      entity: "Project",
      details: { title: project.title, key: project.key },
    });

    return this.getProjectById(project.id, user);
  }

  /**
   * Add a project member
   */
  public static async addMember(projectId: string, data: { userId: string; role?: ProjectMemberRole }, user: TokenPayload) {
    const project = dbStore.getProjectById(projectId);
    if (!project) {
      const err: any = new Error("Project not found");
      err.status = 404;
      throw err;
    }

    if (!this.canEditProject(project, user)) {
      const err: any = new Error("You do not have permission to manage members for this project");
      err.status = 403;
      throw err;
    }

    const targetUser = dbStore.findUserById(data.userId);
    if (!targetUser) {
      const err: any = new Error("User not found");
      err.status = 404;
      throw err;
    }

    const member = dbStore.addProjectMember(projectId, data.userId, data.role || "CONTRIBUTOR");

    await AuditService.log({
      userId: user.userId,
      targetId: member.id,
      action: "PROJECT_MEMBER_ADDED",
      entity: "ProjectMember",
      details: { projectId, userId: data.userId, role: data.role || "CONTRIBUTOR" },
    });

    return dbStore.getProjectMembers(projectId);
  }

  /**
   * Remove a project member
   */
  public static async removeMember(projectId: string, userId: string, user: TokenPayload) {
    const project = dbStore.getProjectById(projectId);
    if (!project) {
      const err: any = new Error("Project not found");
      err.status = 404;
      throw err;
    }

    if (!this.canEditProject(project, user)) {
      const err: any = new Error("You do not have permission to manage members for this project");
      err.status = 403;
      throw err;
    }

    if (project.ownerId === userId) {
      const err: any = new Error("Cannot remove the designated project owner from members");
      err.status = 400;
      throw err;
    }

    const removed = dbStore.removeProjectMember(projectId, userId);
    if (!removed) {
      const err: any = new Error("Member not found on this project");
      err.status = 404;
      throw err;
    }

    await AuditService.log({
      userId: user.userId,
      targetId: projectId,
      action: "PROJECT_MEMBER_REMOVED",
      entity: "ProjectMember",
      details: { projectId, userId },
    });

    return dbStore.getProjectMembers(projectId);
  }

  /**
   * Create a milestone with date boundary validation
   */
  public static async createMilestone(projectId: string, data: { title: string; description?: string; dueDate: string }, user: TokenPayload) {
    const project = dbStore.getProjectById(projectId);
    if (!project) {
      const err: any = new Error("Project not found");
      err.status = 404;
      throw err;
    }

    if (!this.canEditProject(project, user)) {
      const err: any = new Error("You do not have permission to create milestones for this project");
      err.status = 403;
      throw err;
    }

    const dueTime = new Date(data.dueDate).getTime();

    // Validate milestone dueDate against project boundaries
    if (project.startDate && dueTime < new Date(project.startDate).getTime()) {
      const err: any = new Error("Milestone due date cannot be before project start date");
      err.status = 400;
      throw err;
    }

    if (project.targetDate && dueTime > new Date(project.targetDate).getTime()) {
      const err: any = new Error("Milestone due date cannot be after project due date");
      err.status = 400;
      throw err;
    }

    const milestone = dbStore.createMilestone({
      projectId,
      title: data.title,
      description: data.description,
      dueDate: new Date(data.dueDate),
      status: "PENDING",
    });

    await AuditService.log({
      userId: user.userId,
      targetId: milestone.id,
      action: "MILESTONE_CREATED",
      entity: "Milestone",
      details: { title: milestone.title, dueDate: milestone.dueDate, projectId },
    });

    return milestone;
  }

  /**
   * Update a milestone
   */
  public static async updateMilestone(projectId: string, milestoneId: string, data: any, user: TokenPayload) {
    const project = dbStore.getProjectById(projectId);
    if (!project) {
      const err: any = new Error("Project not found");
      err.status = 404;
      throw err;
    }

    if (!this.canEditProject(project, user)) {
      const err: any = new Error("You do not have permission to edit milestones for this project");
      err.status = 403;
      throw err;
    }

    const milestone = dbStore.getMilestoneById(milestoneId);
    if (!milestone || milestone.projectId !== projectId) {
      const err: any = new Error("Milestone not found");
      err.status = 404;
      throw err;
    }

    if (data.dueDate) {
      const dueTime = new Date(data.dueDate).getTime();
      if (project.startDate && dueTime < new Date(project.startDate).getTime()) {
        const err: any = new Error("Milestone due date cannot be before project start date");
        err.status = 400;
        throw err;
      }
      if (project.targetDate && dueTime > new Date(project.targetDate).getTime()) {
        const err: any = new Error("Milestone due date cannot be after project due date");
        err.status = 400;
        throw err;
      }
      data.dueDate = new Date(data.dueDate);
    }

    if (data.status === "REACHED" && milestone.status !== "REACHED") {
      data.reachedAt = new Date();
    } else if (data.status && data.status !== "REACHED") {
      data.reachedAt = undefined;
    }

    const updated = dbStore.updateMilestone(milestoneId, data);

    await AuditService.log({
      userId: user.userId,
      targetId: milestoneId,
      action: "MILESTONE_UPDATED",
      entity: "Milestone",
      details: { updates: data, projectId },
    });

    return updated;
  }

  /**
   * Delete a milestone
   */
  public static async deleteMilestone(projectId: string, milestoneId: string, user: TokenPayload) {
    const project = dbStore.getProjectById(projectId);
    if (!project) {
      const err: any = new Error("Project not found");
      err.status = 404;
      throw err;
    }

    if (!this.canEditProject(project, user)) {
      const err: any = new Error("You do not have permission to delete milestones for this project");
      err.status = 403;
      throw err;
    }

    const milestone = dbStore.getMilestoneById(milestoneId);
    if (!milestone || milestone.projectId !== projectId) {
      const err: any = new Error("Milestone not found");
      err.status = 404;
      throw err;
    }

    dbStore.deleteMilestone(milestoneId);

    await AuditService.log({
      userId: user.userId,
      targetId: milestoneId,
      action: "MILESTONE_DELETED",
      entity: "Milestone",
      details: { title: milestone.title, projectId },
    });

    return { success: true };
  }
}
