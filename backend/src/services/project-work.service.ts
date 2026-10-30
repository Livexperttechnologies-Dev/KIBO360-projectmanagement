import { dbStore, ProjectIssueStatus, TaskPriority } from "../lib/db";
import { TokenPayload } from "./auth.service";
import { ProjectService } from "./project.service";
import { AuditService } from "./audit.service";
import { areProjectWorkTablesAvailable } from "../lib/persistence";

function fail(message: string, status: number): never {
  const error: any = new Error(message);
  error.status = status;
  throw error;
}

function visibleProject(projectId: string, user: TokenPayload) {
  const project = dbStore.getProjectById(projectId);
  if (!project) fail("Project not found", 404);
  if (!ProjectService.canViewProject(project, user)) fail("You do not have access to this project", 403);
  if (!areProjectWorkTablesAvailable()) fail("Project issue and time-log database migration is pending. Apply the checked-in Prisma migrations, then restart the backend.", 503);
  return project;
}

function displayUser(userId?: string) {
  if (!userId) return null;
  const user = dbStore.findUserById(userId);
  if (!user) return null;
  const profile = dbStore.getProfileByUserId(user.id);
  return { id: user.id, name: profile ? `${profile.firstName} ${profile.lastName}`.trim() : user.email, email: user.email };
}

export class ProjectWorkService {
  static listIssues(projectId: string, user: TokenPayload) {
    visibleProject(projectId, user);
    return dbStore.projectIssues
      .filter((issue) => issue.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((issue) => ({ ...issue, reporter: displayUser(issue.reporterId), assignee: displayUser(issue.assigneeId), task: issue.taskId ? dbStore.getTaskById(issue.taskId) || null : null }));
  }

  static async createIssue(projectId: string, input: { title: string; description?: string; taskId?: string | null; priority?: TaskPriority }, user: TokenPayload) {
    visibleProject(projectId, user);
    if (input.taskId && dbStore.getTaskById(input.taskId)?.projectId !== projectId) fail("Selected task does not belong to this project", 400);
    const issue = dbStore.createProjectIssue({
      projectId, taskId: input.taskId || undefined, reporterId: user.userId,
      title: input.title, description: input.description || "", priority: input.priority || "MEDIUM", status: "OPEN",
    });
    await AuditService.log({ userId: user.userId, targetId: issue.id, action: "PROJECT_ISSUE_REPORTED", entity: "ProjectIssue", details: { projectId, taskId: issue.taskId, title: issue.title } });
    return { ...issue, reporter: displayUser(issue.reporterId), assignee: null, task: issue.taskId ? dbStore.getTaskById(issue.taskId) || null : null };
  }

  static async updateIssue(projectId: string, issueId: string, updates: { title?: string; description?: string; taskId?: string | null; assigneeId?: string | null; priority?: TaskPriority; status?: ProjectIssueStatus }, user: TokenPayload) {
    const project = visibleProject(projectId, user);
    const issue = dbStore.projectIssues.find((record) => record.id === issueId && record.projectId === projectId);
    if (!issue) fail("Issue not found", 404);
    const canManage = ProjectService.canEditProject(project, user);
    if (!canManage && issue.reporterId !== user.userId) fail("You cannot update this issue", 403);
    if (!canManage && (updates.assigneeId !== undefined || updates.priority !== undefined)) fail("Only project managers can change issue assignment or priority", 403);
    if (updates.taskId && dbStore.getTaskById(updates.taskId)?.projectId !== projectId) fail("Selected task does not belong to this project", 400);
    if (updates.assigneeId && !dbStore.findUserById(updates.assigneeId)) fail("Assignee not found", 404);
    const updated = dbStore.updateProjectIssue(issueId, {
      ...updates,
      taskId: updates.taskId === null ? undefined : updates.taskId,
      assigneeId: updates.assigneeId === null ? undefined : updates.assigneeId,
    });
    await AuditService.log({ userId: user.userId, targetId: issueId, action: "PROJECT_ISSUE_UPDATED", entity: "ProjectIssue", details: { projectId, updates } });
    return { ...updated!, reporter: displayUser(updated!.reporterId), assignee: displayUser(updated!.assigneeId), task: updated!.taskId ? dbStore.getTaskById(updated!.taskId) || null : null };
  }

  static listTimeEntries(projectId: string, user: TokenPayload) {
    visibleProject(projectId, user);
    return dbStore.projectTimeEntries
      .filter((entry) => entry.projectId === projectId)
      .sort((a, b) => b.workDate.getTime() - a.workDate.getTime() || b.createdAt.getTime() - a.createdAt.getTime())
      .map((entry) => ({ ...entry, user: displayUser(entry.userId), task: dbStore.getTaskById(entry.taskId) || null }));
  }

  static async createTimeEntry(projectId: string, input: { taskId: string; workDate: string; durationMinutes: number; note?: string }, user: TokenPayload) {
    visibleProject(projectId, user);
    if (dbStore.getTaskById(input.taskId)?.projectId !== projectId) fail("Selected task does not belong to this project", 400);
    const entry = dbStore.createProjectTimeEntry({ projectId, taskId: input.taskId, userId: user.userId, workDate: new Date(input.workDate), durationMinutes: input.durationMinutes, note: input.note || undefined });
    await AuditService.log({ userId: user.userId, targetId: entry.id, action: "PROJECT_TIME_RECORDED", entity: "ProjectTimeEntry", details: { projectId, taskId: entry.taskId, durationMinutes: entry.durationMinutes } });
    return { ...entry, user: displayUser(entry.userId), task: dbStore.getTaskById(entry.taskId) || null };
  }

  static async deleteTimeEntry(projectId: string, entryId: string, user: TokenPayload) {
    const project = visibleProject(projectId, user);
    const entry = dbStore.projectTimeEntries.find((record) => record.id === entryId && record.projectId === projectId);
    if (!entry) fail("Time entry not found", 404);
    if (entry.userId !== user.userId && !ProjectService.canEditProject(project, user)) fail("You can only delete your own time entries", 403);
    dbStore.deleteProjectTimeEntry(entryId);
    await AuditService.log({ userId: user.userId, targetId: entryId, action: "PROJECT_TIME_ENTRY_DELETED", entity: "ProjectTimeEntry", details: { projectId } });
  }
}
