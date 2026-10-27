import { Request, Response, NextFunction } from "express";
import { TaskService } from "../services/task.service";
import path from "path";
import { uploadDirectory } from "../middleware/upload";

export async function listTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const {
      projectId,
      assigneeId,
      reviewerId,
      priority,
      status,
      taskList,
      search,
      parentTaskId,
      isSubtask,
      page,
      limit,
    } = req.query as Record<string, string>;

    const result = TaskService.listTasks(
      {
        projectId,
        assigneeId,
        reviewerId,
        priority,
        status,
        taskList,
        search,
        parentTaskId,
        isSubtask,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 50,
      },
      user
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTaskById(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const task = TaskService.getTaskById(id, user);

    res.status(200).json({
      success: true,
      data: { task },
    });
  } catch (error) {
    next(error);
  }
}

export async function createTask(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const task = await TaskService.createTask(req.body, user);

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: { task },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const task = await TaskService.updateTask(id, req.body, user);

    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: { task },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    await TaskService.deleteTask(id, user);

    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function createSubtask(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const parentTaskId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const parentTask = TaskService.getTaskById(parentTaskId, user);

    const subtask = await TaskService.createTask(
      {
        ...req.body,
        projectId: parentTask.projectId,
        parentTaskId: parentTaskId,
      },
      user
    );

    res.status(201).json({
      success: true,
      message: "Subtask created successfully",
      data: { subtask },
    });
  } catch (error) {
    next(error);
  }
}

export async function addComment(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const taskId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const comment = await TaskService.addComment(taskId, req.body.content, user);

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: { comment },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteComment(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const taskId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const commentId = Array.isArray(req.params.commentId) ? req.params.commentId[0] : req.params.commentId;

    await TaskService.deleteComment(taskId, commentId, user);

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function addAttachment(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const taskId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!req.file) {
      const error: any = new Error("Choose a file to upload");
      error.statusCode = 400;
      throw error;
    }
    const attachment = await TaskService.addAttachment(taskId, {
      filename: req.file.originalname,
      filesize: req.file.size,
      mimetype: req.file.mimetype,
      fileUrl: req.file.filename,
      accessScope: req.body.accessScope,
    }, user);

    res.status(201).json({
      success: true,
      message: "Attachment uploaded successfully",
      data: { attachment },
    });
  } catch (error) {
    next(error);
  }
}

export async function downloadAttachment(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const taskId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const attachmentId = Array.isArray(req.params.attachmentId) ? req.params.attachmentId[0] : req.params.attachmentId;
    const attachment = TaskService.getAttachmentForDownload(taskId, attachmentId, user);
    res.download(path.join(uploadDirectory, path.basename(attachment.fileUrl)), attachment.filename);
  } catch (error) {
    next(error);
  }
}

export async function deleteAttachment(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const taskId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const attachmentId = Array.isArray(req.params.attachmentId) ? req.params.attachmentId[0] : req.params.attachmentId;

    await TaskService.deleteAttachment(taskId, attachmentId, user);

    res.status(200).json({
      success: true,
      message: "Attachment deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function addDependency(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const taskId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const dep = await TaskService.addDependency(taskId, req.body.dependsOnTaskId, user);

    res.status(201).json({
      success: true,
      message: "Dependency added successfully",
      data: { dependency: dep },
    });
  } catch (error) {
    next(error);
  }
}

export async function removeDependency(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const taskId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const dependsOnTaskId = Array.isArray(req.params.depId) ? req.params.depId[0] : req.params.depId;

    await TaskService.removeDependency(taskId, dependsOnTaskId, user);

    res.status(200).json({
      success: true,
      message: "Dependency removed successfully",
    });
  } catch (error) {
    next(error);
  }
}
