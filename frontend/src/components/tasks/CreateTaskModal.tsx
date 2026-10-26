import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { useAuth } from "../../contexts/AuthContext";
import { createTask, TaskItem } from "../../api/task";
import { fetchProjects, ProjectItem } from "../../api/project";
import { fetchUsers } from "../../api/user";
import { AlertCircle } from "lucide-react";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (task: TaskItem) => void;
  defaultProjectId?: string;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultProjectId,
}) => {
  const { token, user } = useAuth();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId || "");
  const [taskList, setTaskList] = useState("Default");
  const [assigneeId, setAssigneeId] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [status, setStatus] = useState<
    "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "UNDER_REVIEW" | "CHANGES_REQUIRED" | "COMPLETED" | "BLOCKED"
  >("OPEN");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimatedEffort, setEstimatedEffort] = useState<number | "">("");

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      if (defaultProjectId) setProjectId(defaultProjectId);
    }
  }, [isOpen, defaultProjectId]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [projList, userList] = await Promise.all([
        fetchProjects({}, token),
        fetchUsers({}, token),
      ]);
      setProjects(projList);
      setUsers(userList);
      if (!projectId && projList.length > 0) {
        setProjectId(projList[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load projects or team members");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Task title is required");
      return;
    }
    if (!projectId) {
      setError("Please select a project");
      return;
    }

    if (startDate && dueDate && new Date(startDate) > new Date(dueDate)) {
      setError("Start date cannot be after due date");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const newTask = await createTask(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          projectId,
          taskList: taskList.trim() || "Default",
          assigneeId: assigneeId || undefined,
          reviewerId: reviewerId || undefined,
          priority,
          status,
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          estimatedEffort: estimatedEffort !== "" ? Number(estimatedEffort) : undefined,
          completionPercentage: status === "COMPLETED" ? 100 : 0,
        },
        token
      );

      // Reset form
      setTitle("");
      setDescription("");
      setTaskList("Default");
      setAssigneeId("");
      setReviewerId("");
      setPriority("MEDIUM");
      setStatus("OPEN");
      setStartDate("");
      setDueDate("");
      setEstimatedEffort("");

      onSuccess(newTask);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Task"
      description="Assign deliverables, set sprint list, priority, and effort estimation."
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Task Title <span className="text-red-500">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Implement PostgreSQL schema migrations and audit logs"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-[#690BA8] focus:outline-none focus:ring-1 focus:ring-[#690BA8]"
            placeholder="Detailed task description, acceptance criteria, notes..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Project <span className="text-red-500">*</span>
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 bg-white focus:border-[#690BA8] focus:outline-none focus:ring-1 focus:ring-[#690BA8]"
              required
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.key}] {p.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Task List / Sprint Stream
            </label>
            <input
              type="text"
              value={taskList}
              onChange={(e) => setTaskList(e.target.value)}
              placeholder="e.g. Backend, Frontend, DevOps"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 bg-white focus:border-[#690BA8] focus:outline-none focus:ring-1 focus:ring-[#690BA8]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Assignee
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 bg-white focus:border-[#690BA8] focus:outline-none focus:ring-1 focus:ring-[#690BA8]"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Reviewer / QA Lead
            </label>
            <select
              value={reviewerId}
              onChange={(e) => setReviewerId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 bg-white focus:border-[#690BA8] focus:outline-none focus:ring-1 focus:ring-[#690BA8]"
            >
              <option value="">None</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email} ({u.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 bg-white focus:border-[#690BA8] focus:outline-none focus:ring-1 focus:ring-[#690BA8]"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Initial Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 bg-white focus:border-[#690BA8] focus:outline-none focus:ring-1 focus:ring-[#690BA8]"
            >
              <option value="OPEN">Open</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="CHANGES_REQUIRED">Changes Required</option>
              <option value="COMPLETED">Completed</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Estimated Effort (hrs)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={estimatedEffort}
              onChange={(e) => setEstimatedEffort(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="e.g. 16"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 bg-white focus:border-[#690BA8] focus:outline-none focus:ring-1 focus:ring-[#690BA8]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 bg-white focus:border-[#690BA8] focus:outline-none focus:ring-1 focus:ring-[#690BA8]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 bg-white focus:border-[#690BA8] focus:outline-none focus:ring-1 focus:ring-[#690BA8]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="gradient" size="sm" isLoading={submitting}>
            Create Task
          </Button>
        </div>
      </form>
    </Modal>
  );
};
