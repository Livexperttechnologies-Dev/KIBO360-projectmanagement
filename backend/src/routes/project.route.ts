import { Router } from "express";
import {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  archiveProject,
  addMember,
  removeMember,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from "../controllers/project.controller";
import {
  listProjectIssues, createProjectIssue, updateProjectIssue,
  listProjectTimeEntries, createProjectTimeEntry, deleteProjectTimeEntry,
} from "../controllers/project-work.controller";
import { authenticate } from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import {
  createProjectSchema,
  updateProjectSchema,
  addMemberSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
} from "../validations/project.validation";
import { createProjectIssueSchema, updateProjectIssueSchema, createProjectTimeEntrySchema } from "../validations/project-work.validation";

const router = Router();

// All project routes require valid authenticated session
router.use(authenticate);

router.get("/", listProjects);
router.get("/:id", getProjectById);
router.post("/", validateRequest(createProjectSchema), createProject);
router.patch("/:id", validateRequest(updateProjectSchema), updateProject);
router.post("/:id/archive", archiveProject);

// Project Member Management
router.post("/:id/members", validateRequest(addMemberSchema), addMember);
router.delete("/:id/members/:userId", removeMember);

// Project Milestone Management
router.post("/:id/milestones", validateRequest(createMilestoneSchema), createMilestone);
router.patch("/:id/milestones/:milestoneId", validateRequest(updateMilestoneSchema), updateMilestone);
router.delete("/:id/milestones/:milestoneId", deleteMilestone);

// Project issue reporting and work time records
router.get("/:id/issues", listProjectIssues);
router.post("/:id/issues", validateRequest(createProjectIssueSchema), createProjectIssue);
router.patch("/:id/issues/:issueId", validateRequest(updateProjectIssueSchema), updateProjectIssue);
router.get("/:id/time-logs", listProjectTimeEntries);
router.post("/:id/time-logs", validateRequest(createProjectTimeEntrySchema), createProjectTimeEntry);
router.delete("/:id/time-logs/:entryId", deleteProjectTimeEntry);

export default router;
