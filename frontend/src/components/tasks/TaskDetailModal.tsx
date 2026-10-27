import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { useAuth } from "../../contexts/AuthContext";
import {
  fetchTaskById,
  updateTask,
  deleteTask,
  createSubtask,
  addTaskComment,
  deleteTaskComment,
  addTaskAttachment,
  downloadTaskAttachment,
  deleteTaskAttachment,
  addTaskDependency,
  removeTaskDependency,
  fetchTasks,
  TaskDetail,
  TaskItem,
} from "../../api/task";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Paperclip,
  MessageSquare,
  GitBranch,
  Trash2,
  Plus,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  User,
  Calendar,
  CheckSquare,
} from "lucide-react";

interface TaskDetailModalProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated?: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  taskId,
  isOpen,
  onClose,
  onTaskUpdated,
}) => {
  const { token, user } = useAuth();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "subtasks" | "dependencies" | "comments" | "attachments">(
    "overview"
  );

  // Subtask form state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);

  // Comment form state
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  // Attachment form state
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newScope, setNewScope] = useState("PROJECT_MEMBERS");
  const [addingAttachment, setAddingAttachment] = useState(false);

  // Dependency selector state
  const [projectTasks, setProjectTasks] = useState<TaskItem[]>([]);
  const [selectedPrereqId, setSelectedPrereqId] = useState("");
  const [addingDependency, setAddingDependency] = useState(false);

  useEffect(() => {
    if (isOpen && taskId) {
      loadTaskData();
    } else {
      setTask(null);
      setError(null);
    }
  }, [isOpen, taskId]);

  const loadTaskData = async () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTaskById(taskId, token);
      setTask(data);

      // Load other tasks in the same project for dependency options
      if (data.projectId) {
        const res = await fetchTasks({ projectId: data.projectId, limit: 100 }, token);
        setProjectTasks(res.tasks.filter((t) => t.id !== taskId));
      }
    } catch (err: any) {
      setError(err.message || "Failed to load task details");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: any) => {
    if (!task) return;
    setError(null);
    try {
      const updated = await updateTask(task.id, { status: newStatus }, token);
      await loadTaskData();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      setError(err.message || "Failed to update status");
    }
  };

  const handleProgressChange = async (newProgress: number) => {
    if (!task) return;
    setError(null);
    try {
      await updateTask(task.id, { completionPercentage: newProgress }, token);
      await loadTaskData();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      setError(err.message || "Failed to update progress");
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newSubtaskTitle.trim()) return;
    setAddingSubtask(true);
    setError(null);
    try {
      await createSubtask(
        task.id,
        {
          title: newSubtaskTitle.trim(),
          dueDate: newSubtaskDueDate ? new Date(newSubtaskDueDate).toISOString() : undefined,
        },
        token
      );
      setNewSubtaskTitle("");
      setNewSubtaskDueDate("");
      await loadTaskData();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      setError(err.message || "Failed to add subtask");
    } finally {
      setAddingSubtask(false);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, currentStatus: string) => {
    setError(null);
    try {
      const nextStatus = currentStatus === "COMPLETED" ? "OPEN" : "COMPLETED";
      await updateTask(subtaskId, { status: nextStatus, completionPercentage: nextStatus === "COMPLETED" ? 100 : 0 }, token);
      await loadTaskData();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      setError(err.message || "Failed to update subtask");
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newComment.trim()) return;
    setPostingComment(true);
    setError(null);
    try {
      await addTaskComment(task.id, newComment.trim(), token);
      setNewComment("");
      await loadTaskData();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      setError(err.message || "Failed to post comment");
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!task) return;
    setError(null);
    try {
      await deleteTaskComment(task.id, commentId, token);
      await loadTaskData();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      setError(err.message || "Failed to delete comment");
    }
  };

  const handleAddAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newFile) return;
    setAddingAttachment(true);
    setError(null);
    try {
      await addTaskAttachment(task.id, newFile, newScope, token);
      setNewFile(null);
      await loadTaskData();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      setError(err.message || "Failed to attach file");
    } finally {
      setAddingAttachment(false);
    }
  };

  const handleDownloadAttachment = async (attachmentId: string, filename: string) => {
    if (!task) return;
    try {
      const blob = await downloadTaskAttachment(task.id, attachmentId, token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Failed to download attachment");
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!task) return;
    setError(null);
    try {
      await deleteTaskAttachment(task.id, attachmentId, token);
      await loadTaskData();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      setError(err.message || "Failed to remove attachment");
    }
  };

  const handleAddDependency = async () => {
    if (!task || !selectedPrereqId) return;
    setAddingDependency(true);
    setError(null);
    try {
      await addTaskDependency(task.id, selectedPrereqId, token);
      setSelectedPrereqId("");
      await loadTaskData();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      setError(err.message || "Failed to add dependency");
    } finally {
      setAddingDependency(false);
    }
  };

  const handleRemoveDependency = async (prereqId: string) => {
    if (!task) return;
    setError(null);
    try {
      await removeTaskDependency(task.id, prereqId, token);
      await loadTaskData();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err: any) {
      setError(err.message || "Failed to remove dependency");
    }
  };

  const handleDeleteTask = async () => {
    if (!task || !window.confirm("Are you sure you want to delete this task? All subtasks will be cascaded.")) return;
    try {
      await deleteTask(task.id, token);
      if (onTaskUpdated) onTaskUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to delete task");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "coral";
      case "HIGH":
        return "magenta";
      case "MEDIUM":
        return "primary";
      default:
        return "neutral";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "neutral";
      case "IN_PROGRESS":
        return "primary";
      case "UNDER_REVIEW":
        return "magenta";
      case "BLOCKED":
        return "coral";
      default:
        return "neutral";
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? task.title : "Task Details"}
      description={task?.project ? `[${task.project.key}] ${task.project.title} • Task ID: ${task.id}` : undefined}
      size="3xl"
    >
      {loading && !task ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading task data...</div>
      ) : task ? (
        <div className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-red-50 text-red-700 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Blocked dependency banner */}
          {task.isBlocked && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <span className="font-semibold">
                  Blocked: Prerequisite dependencies are incomplete. Complete prerequisite tasks before marking this task as completed.
                </span>
              </div>
              <button
                onClick={() => setActiveTab("dependencies")}
                className="text-[11px] font-bold text-amber-900 underline hover:no-underline"
              >
                View Dependencies
              </button>
            </div>
          )}

          {/* Meta Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getPriorityBadgeVariant(task.priority)} size="sm">
                {task.priority} Priority
              </Badge>
              <Badge variant={getStatusBadgeVariant(task.status)} size="sm">
                {task.status.replace("_", " ")}
              </Badge>
              <span className="text-xs text-slate-500 font-medium px-2 py-0.5 bg-white rounded-lg border border-slate-200">
                {task.taskList}
              </span>
              {task.parentTask && (
                <span className="text-xs text-[#690BA8] font-bold flex items-center gap-1">
                  <GitBranch className="h-3.5 w-3.5" /> Subtask of: {task.parentTask.title}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="text-xs font-bold rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:border-[#690BA8]"
              >
                <option value="OPEN">Open</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="CHANGES_REQUIRED">Changes Required</option>
                <option value="COMPLETED">Completed</option>
                <option value="BLOCKED">Blocked</option>
              </select>

              {(user?.role === "ADMINISTRATOR" || user?.role === "PROJECT_MANAGER") && (
                <button
                  onClick={handleDeleteTask}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Task"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveTab("overview")}
              className={`pb-2.5 px-3 border-b-2 transition-colors ${
                activeTab === "overview"
                  ? "border-[#690BA8] text-[#690BA8]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("subtasks")}
              className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === "subtasks"
                  ? "border-[#690BA8] text-[#690BA8]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Subtasks ({task.subtasks.length})
            </button>
            <button
              onClick={() => setActiveTab("dependencies")}
              className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === "dependencies"
                  ? "border-[#690BA8] text-[#690BA8]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <GitBranch className="h-3.5 w-3.5" />
              Dependencies ({task.dependencies.length})
            </button>
            <button
              onClick={() => setActiveTab("comments")}
              className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === "comments"
                  ? "border-[#690BA8] text-[#690BA8]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Comments ({task.comments.length})
            </button>
            <button
              onClick={() => setActiveTab("attachments")}
              className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === "attachments"
                  ? "border-[#690BA8] text-[#690BA8]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Paperclip className="h-3.5 w-3.5" />
              Attachments ({task.attachments.length})
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/80 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap">
                  {task.description || "No description provided."}
                </p>
              </div>

              {/* Grid Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block mb-1">Assignee</span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <User className="h-3.5 w-3.5 text-[#690BA8]" />
                    <span>{task.assignee ? task.assignee.name : "Unassigned"}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-medium block mb-1">Reviewer</span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span>{task.reviewer ? task.reviewer.name : "None"}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-medium block mb-1">Due Date</span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "Not set"}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-medium block mb-1">Estimated Effort</span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>{task.estimatedEffort ? `${task.estimatedEffort} hrs` : "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Progress Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">Completion Progress</span>
                  <span className="font-bold text-[#690BA8]">{task.completionPercentage}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#690BA8] to-[#E81778] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${task.completionPercentage}%` }}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  {[0, 25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleProgressChange(pct)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-colors ${
                        task.completionPercentage === pct
                          ? "bg-[#690BA8] text-white border-[#690BA8]"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Status Buttons */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 block mb-2">QUICK TRANSITIONS</span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={task.status === "IN_PROGRESS" ? "primary" : "outline"}
                    onClick={() => handleStatusChange("IN_PROGRESS")}
                  >
                    Start Work
                  </Button>
                  <Button
                    size="sm"
                    variant={task.status === "UNDER_REVIEW" ? "primary" : "outline"}
                    onClick={() => handleStatusChange("UNDER_REVIEW")}
                  >
                    Submit for Review
                  </Button>
                  <Button
                    size="sm"
                    variant={task.status === "CHANGES_REQUIRED" ? "primary" : "outline"}
                    onClick={() => handleStatusChange("CHANGES_REQUIRED")}
                  >
                    Request Changes
                  </Button>
                  <Button
                    size="sm"
                    variant={task.status === "COMPLETED" ? "primary" : "gradient"}
                    onClick={() => handleStatusChange("COMPLETED")}
                  >
                    Complete Task
                  </Button>
                  <Button
                    size="sm"
                    variant={task.status === "BLOCKED" ? "danger" : "outline"}
                    onClick={() => handleStatusChange("BLOCKED")}
                  >
                    Mark Blocked
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SUBTASKS */}
          {activeTab === "subtasks" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Subtask Checklist</span>
                <span className="text-[#690BA8]">
                  {task.subtasks.filter((s) => s.status === "COMPLETED").length} of {task.subtasks.length} Completed
                </span>
              </div>

              {/* Subtask items */}
              <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-white">
                {task.subtasks.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No subtasks yet. Break this task down into smaller actionable steps below.
                  </div>
                ) : (
                  task.subtasks.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={sub.status === "COMPLETED"}
                          onChange={() => handleToggleSubtask(sub.id, sub.status)}
                          className="h-4 w-4 rounded border-slate-300 text-[#690BA8] focus:ring-[#690BA8]/20 cursor-pointer"
                        />
                        <div>
                          <p
                            className={`text-xs font-semibold ${
                              sub.status === "COMPLETED" ? "line-through text-slate-400" : "text-slate-800"
                            }`}
                          >
                            {sub.title}
                          </p>
                          {sub.dueDate && (
                            <span className="text-[10px] text-slate-400">
                              Due: {new Date(sub.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {sub.assignee && (
                          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {sub.assignee.name}
                          </span>
                        )}
                        <Badge variant={sub.status === "COMPLETED" ? "neutral" : "primary"} size="sm">
                          {sub.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add subtask form */}
              <form onSubmit={handleAddSubtask} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <span className="text-xs font-bold text-slate-700 block">+ Add New Subtask</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Subtask title..."
                    required
                    className="sm:col-span-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#690BA8]"
                  />
                  <input
                    type="date"
                    value={newSubtaskDueDate}
                    onChange={(e) => setNewSubtaskDueDate(e.target.value)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#690BA8]"
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" variant="gradient" size="sm" isLoading={addingSubtask}>
                    Add Subtask
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: DEPENDENCIES */}
          {activeTab === "dependencies" && (
            <div className="space-y-5">
              {/* Prerequisites */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Prerequisites (Tasks that MUST be completed first)
                </h4>
                {task.dependencies.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-400">
                    No prerequisites assigned. This task is unblocked.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {task.dependencies.map((dep) => (
                      <div
                        key={dep.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-white"
                      >
                        <div className="flex items-center gap-2">
                          {dep.prerequisiteTask?.status === "COMPLETED" ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          )}
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {dep.prerequisiteTask?.title || "Prerequisite task"}
                            </p>
                            <span className="text-[10px] text-slate-400">
                              Status: {dep.prerequisiteTask?.status} • Due:{" "}
                              {dep.prerequisiteTask?.dueDate
                                ? new Date(dep.prerequisiteTask.dueDate).toLocaleDateString()
                                : "N/A"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant={dep.prerequisiteTask?.status === "COMPLETED" ? "neutral" : "coral"}
                            size="sm"
                          >
                            {dep.prerequisiteTask?.status === "COMPLETED" ? "Cleared" : "Blocking"}
                          </Badge>
                          <button
                            onClick={() => handleRemoveDependency(dep.dependsOnTaskId)}
                            className="p-1 text-slate-400 hover:text-red-500"
                            title="Remove dependency"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Dependency */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Add Prerequisite Dependency</span>
                <p className="text-[11px] text-slate-400">
                  Select a task that must be completed before this task can be resolved. Cycle detection prevents circular dependencies.
                </p>
                <div className="flex gap-2">
                  <select
                    value={selectedPrereqId}
                    onChange={(e) => setSelectedPrereqId(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 bg-white focus:outline-none focus:border-[#690BA8]"
                  >
                    <option value="">Select a task...</option>
                    {projectTasks.map((pt) => (
                      <option key={pt.id} value={pt.id}>
                        {pt.title} ({pt.status})
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="gradient"
                    onClick={handleAddDependency}
                    disabled={!selectedPrereqId}
                    isLoading={addingDependency}
                  >
                    Link Dependency
                  </Button>
                </div>
              </div>

              {/* Downstream Dependents */}
              {task.dependentOn && task.dependentOn.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Downstream Tasks (Waiting on this task)
                  </h4>
                  <div className="space-y-1.5">
                    {task.dependentOn.map((dep) => (
                      <div
                        key={dep.id}
                        className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-slate-700">
                          {dep.dependentTask?.title || "Dependent task"}
                        </span>
                        <Badge variant="neutral" size="sm">
                          {dep.dependentTask?.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: COMMENTS */}
          {activeTab === "comments" && (
            <div className="space-y-4">
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {task.comments.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No comments yet. Start the conversation with your team below.
                  </div>
                ) : (
                  task.comments.map((cm) => (
                    <div key={cm.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">{cm.user?.name || "Team Member"}</span>
                          {cm.user?.jobTitle && (
                            <span className="text-slate-400">• {cm.user.jobTitle}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">
                            {new Date(cm.createdAt).toLocaleString()}
                          </span>
                          {(cm.userId === user?.id || user?.role === "ADMINISTRATOR") && (
                            <button
                              onClick={() => handleDeleteComment(cm.id)}
                              className="text-slate-400 hover:text-red-500"
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {cm.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              <form onSubmit={handleAddComment} className="pt-2 border-t border-slate-100 space-y-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment, update status notes, or ask for review..."
                  rows={2}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#690BA8]"
                />
                <div className="flex justify-end">
                  <Button type="submit" variant="gradient" size="sm" isLoading={postingComment}>
                    Post Comment
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 5: ATTACHMENTS */}
          {activeTab === "attachments" && (
            <div className="space-y-4">
              <div className="space-y-2">
                {task.attachments.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No attachments uploaded. Share wireframes, specs, or logs below.
                  </div>
                ) : (
                  task.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-3 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-[#690BA8]" />
                        <div>
                          <p className="text-xs font-bold text-slate-800">{att.filename}</p>
                          <span className="text-[10px] text-slate-400">
                            {formatFileSize(att.filesize)} • Uploaded by {att.uploader?.name || "User"} •{" "}
                            {new Date(att.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="neutral" size="sm">
                          {att.accessScope}
                        </Badge>
                        <button
                          type="button"
                          onClick={() => handleDownloadAttachment(att.id, att.filename)}
                          className="p-1 text-slate-400 hover:text-[#690BA8]"
                          title="Download attachment"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                        {(att.uploaderId === user?.id || user?.role === "ADMINISTRATOR") && (
                          <button
                            onClick={() => handleDeleteAttachment(att.id)}
                            className="p-1 text-slate-400 hover:text-red-500"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Attach File Form */}
              <form onSubmit={handleAddAttachment} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">+ Add Attachment</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                    onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                    required
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 bg-white focus:outline-none focus:border-[#690BA8]"
                  />
                  <select
                    value={newScope}
                    onChange={(e) => setNewScope(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 bg-white focus:outline-none focus:border-[#690BA8]"
                  >
                    <option value="PROJECT_MEMBERS">Project Members</option>
                    <option value="PUBLIC">Public</option>
                    <option value="ASSIGNEE_ONLY">Assignee Only</option>
                  </select>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" variant="gradient" size="sm" isLoading={addingAttachment}>
                    Attach File
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
};
