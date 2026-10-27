import { Router } from "express";
import {
  listTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  createSubtask,
  addComment,
  deleteComment,
  addAttachment,
  downloadAttachment,
  deleteAttachment,
  addDependency,
  removeDependency,
} from "../controllers/task.controller";
import { authenticate } from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import { taskFileUpload } from "../middleware/upload";
import {
  createTaskSchema,
  updateTaskSchema,
  createSubtaskSchema,
  addCommentSchema,
  addAttachmentSchema,
  addDependencySchema,
} from "../validations/task.validation";

const router = Router();

// All task routes require authentication
router.use(authenticate);

// Task CRUD
router.get("/", listTasks);
router.get("/:id", getTaskById);
router.post("/", validateRequest(createTaskSchema), createTask);
router.patch("/:id", validateRequest(updateTaskSchema), updateTask);
router.delete("/:id", deleteTask);

// Subtasks
router.post("/:id/subtasks", validateRequest(createSubtaskSchema), createSubtask);

// Comments
router.post("/:id/comments", validateRequest(addCommentSchema), addComment);
router.delete("/:id/comments/:commentId", deleteComment);

// Attachments
router.post("/:id/attachments", taskFileUpload.single("file"), validateRequest(addAttachmentSchema), addAttachment);
router.get("/:id/attachments/:attachmentId/download", downloadAttachment);
router.delete("/:id/attachments/:attachmentId", deleteAttachment);

// Dependencies
router.post("/:id/dependencies", validateRequest(addDependencySchema), addDependency);
router.delete("/:id/dependencies/:depId", removeDependency);

export default router;
