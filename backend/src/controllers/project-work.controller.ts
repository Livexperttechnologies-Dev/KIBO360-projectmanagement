import { Request, Response, NextFunction } from "express";
import { ProjectWorkService } from "../services/project-work.service";

const param = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value || "";

export async function listProjectIssues(req: Request, res: Response, next: NextFunction) {
  try { res.status(200).json({ success: true, data: { issues: ProjectWorkService.listIssues(param(req.params.id), req.user!) } }); }
  catch (error) { next(error); }
}

export async function createProjectIssue(req: Request, res: Response, next: NextFunction) {
  try { const issue = await ProjectWorkService.createIssue(param(req.params.id), req.body, req.user!); res.status(201).json({ success: true, message: "Issue reported", data: { issue } }); }
  catch (error) { next(error); }
}

export async function updateProjectIssue(req: Request, res: Response, next: NextFunction) {
  try { const issue = await ProjectWorkService.updateIssue(param(req.params.id), param(req.params.issueId), req.body, req.user!); res.status(200).json({ success: true, message: "Issue updated", data: { issue } }); }
  catch (error) { next(error); }
}

export async function listProjectTimeEntries(req: Request, res: Response, next: NextFunction) {
  try { res.status(200).json({ success: true, data: { entries: ProjectWorkService.listTimeEntries(param(req.params.id), req.user!) } }); }
  catch (error) { next(error); }
}

export async function createProjectTimeEntry(req: Request, res: Response, next: NextFunction) {
  try { const entry = await ProjectWorkService.createTimeEntry(param(req.params.id), req.body, req.user!); res.status(201).json({ success: true, message: "Time recorded", data: { entry } }); }
  catch (error) { next(error); }
}

export async function deleteProjectTimeEntry(req: Request, res: Response, next: NextFunction) {
  try { await ProjectWorkService.deleteTimeEntry(param(req.params.id), param(req.params.entryId), req.user!); res.status(200).json({ success: true, message: "Time entry deleted" }); }
  catch (error) { next(error); }
}
