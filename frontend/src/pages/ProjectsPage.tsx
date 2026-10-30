import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderKanban,
  Plus,
  Search,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Archive,
  UserPlus,
  Trash2,
  Edit3,
  Flag,
  ArrowRight,
  ShieldCheck,
  Building,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { TablePagination } from "../components/ui/TablePagination";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Spinner } from "../components/ui/Spinner";
import { useAuth } from "../contexts/AuthContext";
import { downloadTaskAttachment, fetchTaskById, fetchTasks, TaskAttachment, TaskItem } from "../api/task";
import {
  ProjectItem,
  ProjectDetail,
  ProjectFilters,
  fetchProjects,
  fetchProjectById,
  createProject,
  updateProject,
  archiveProject,
  addProjectMember,
  removeProjectMember,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  ProjectIssueItem,
  ProjectTimeEntryItem,
  fetchProjectIssues,
  createProjectIssue,
  updateProjectIssue,
  fetchProjectTimeEntries,
  createProjectTimeEntry,
  deleteProjectTimeEntry,
} from "../api/project";
import { API_BASE_URL } from "../api/client";

export const ProjectsPage: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Project List State
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Dropdown Reference Data
  const [availableEmployees, setAvailableEmployees] = useState<{ id: string; name: string; email: string }[]>([]);
  const [availableDepts, setAvailableDepts] = useState<{ id: string; name: string; code: string }[]>([]);

  // Create Project Modal State
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [createSubmitting, setCreateSubmitting] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState<string>("");
  const [newKey, setNewKey] = useState<string>("");
  const [newDescription, setNewDescription] = useState<string>("");
  const [newDepartmentId, setNewDepartmentId] = useState<string>("");
  const [newOwnerId, setNewOwnerId] = useState<string>("");
  const [newPriority, setNewPriority] = useState<string>("MEDIUM");
  const [newStatus, setNewStatus] = useState<string>("PLANNING");
  const [newStartDate, setNewStartDate] = useState<string>("");
  const [newTargetDate, setNewTargetDate] = useState<string>("");

  // Details & Manage Modal State
  const [selectedProject, setSelectedProject] = useState<ProjectDetail | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "tasks" | "overview" | "milestones" | "members" | "users" | "reports" | "documents" | "timeLogs" | "issues">("overview");
  const [projectTasks, setProjectTasks] = useState<TaskItem[]>([]);
  const [projectTasksError, setProjectTasksError] = useState<string | null>(null);
  const [projectDocuments, setProjectDocuments] = useState<Array<{ taskId: string; taskTitle: string; attachment: TaskAttachment }>>([]);
  const [projectDocumentsLoading, setProjectDocumentsLoading] = useState(false);
  const [projectDocumentsLoaded, setProjectDocumentsLoaded] = useState(false);
  const [projectDocumentsError, setProjectDocumentsError] = useState<string | null>(null);

  // Edit Project State inside Modal
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("");
  const [editPriority, setEditPriority] = useState<string>("");
  const [editOwnerId, setEditOwnerId] = useState<string>("");
  const [editStartDate, setEditStartDate] = useState<string>("");
  const [editTargetDate, setEditTargetDate] = useState<string>("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState<boolean>(false);

  // Milestone Add State inside Modal
  const [newMilestoneTitle, setNewMilestoneTitle] = useState<string>("");
  const [newMilestoneDesc, setNewMilestoneDesc] = useState<string>("");
  const [newMilestoneDate, setNewMilestoneDate] = useState<string>("");
  const [milestoneError, setMilestoneError] = useState<string | null>(null);
  const [milestoneSubmitting, setMilestoneSubmitting] = useState<boolean>(false);

  // Member Add State inside Modal
  const [newMemberUserId, setNewMemberUserId] = useState<string>("");
  const [newMemberRole, setNewMemberRole] = useState<"LEAD" | "CONTRIBUTOR" | "VIEWER">("CONTRIBUTOR");
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberSubmitting, setMemberSubmitting] = useState<boolean>(false);

  // Check if current user can create projects
  const canCreateProject = user?.role === "ADMINISTRATOR" || user?.role === "MANAGER";
  const canViewProjectDashboard = user?.role === "ADMINISTRATOR" || user?.role === "MANAGER";

  // Load project filters reference options
  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const res = await fetch(`${API_BASE_URL}/dashboard/filters`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          setAvailableEmployees(json.data.employees || []);
          setAvailableDepts(json.data.departments || []);
          if (json.data.departments?.length > 0 && !newDepartmentId) {
            setNewDepartmentId(json.data.departments[0].id);
          }
        }
      } catch {
        // Fallback default
      }
    }
    if (token) {
      loadFilterOptions();
    }
  }, [token]);

  // Load projects from API
  const loadProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchProjects(
        {
          search: search || undefined,
          departmentId: deptFilter !== "all" ? deptFilter : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          priority: priorityFilter !== "all" ? priorityFilter : undefined,
        },
        token
      );
      setProjects(data);
    } catch (err: any) {
      setError(err.message || "Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      loadProjects();
    }, 200);
    return () => clearTimeout(handler);
  }, [search, statusFilter, deptFilter, priorityFilter, token]);

  // Open Project Details Modal
  const handleOpenDetails = async (projectId: string, initialTab: "dashboard" | "tasks" | "overview" = "overview") => {
    setIsDetailsOpen(true);
    setDetailsLoading(true);
    setSelectedProject(null);
    setProjectTasks([]);
    setProjectTasksError(null);
    setProjectDocuments([]);
    setProjectDocumentsLoaded(false);
    setProjectDocumentsError(null);
    setActiveTab(canViewProjectDashboard ? initialTab : "overview");
    setEditError(null);
    setMilestoneError(null);
    setMemberError(null);

    try {
      const detail = await fetchProjectById(projectId, token);
      setSelectedProject(detail);
      setEditTitle(detail.title);
      setEditDescription(detail.description || "");
      setEditStatus(detail.status);
      setEditPriority(detail.priority);
      setEditOwnerId(detail.owner?.id || "");
      setEditStartDate(detail.startDate ? detail.startDate.split("T")[0] : "");
      setEditTargetDate(detail.targetDate ? detail.targetDate.split("T")[0] : "");
      try {
        const firstPage = await fetchTasks({ projectId, limit: 100, page: 1 }, token);
        const taskPages = await Promise.all(
          Array.from({ length: Math.max(0, firstPage.pagination.totalPages - 1) }, (_, index) =>
            fetchTasks({ projectId, limit: 100, page: index + 2 }, token)
          )
        );
        setProjectTasks([...firstPage.tasks, ...taskPages.flatMap((page) => page.tasks)]);
      } catch (err: any) {
        setProjectTasksError(err.message || "Could not load project tasks");
      }
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const loadProjectDocuments = async () => {
    if (!selectedProject || projectDocumentsLoaded || projectDocumentsLoading) return;
    setProjectDocumentsLoading(true);
    setProjectDocumentsError(null);
    try {
      const tasksWithAttachments = projectTasks.filter((task) => task.attachmentsCount > 0);
      const taskDetails = await Promise.all(tasksWithAttachments.map((task) => fetchTaskById(task.id, token)));
      setProjectDocuments(taskDetails.flatMap((task) => task.attachments.map((attachment) => ({
        taskId: task.id,
        taskTitle: task.title,
        attachment,
      }))));
      setProjectDocumentsLoaded(true);
    } catch (err: any) {
      setProjectDocumentsError(err.message || "Could not load project documents");
    } finally {
      setProjectDocumentsLoading(false);
    }
  };

  // Handle Create Project
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (newStartDate && newTargetDate && new Date(newStartDate) > new Date(newTargetDate)) {
      setCreateError("Start date cannot be after due date");
      return;
    }

    setCreateSubmitting(true);
    try {
      await createProject(
        {
          title: newTitle.trim(),
          key: newKey.trim(),
          description: newDescription.trim() || undefined,
          departmentId: newDepartmentId,
          ownerId: newOwnerId || undefined,
          priority: newPriority,
          status: newStatus,
          startDate: newStartDate ? new Date(newStartDate).toISOString() : undefined,
          targetDate: newTargetDate ? new Date(newTargetDate).toISOString() : undefined,
        },
        token
      );

      // Reset and close
      setNewTitle("");
      setNewKey("");
      setNewDescription("");
      setNewStartDate("");
      setNewTargetDate("");
      setIsCreateOpen(false);
      loadProjects();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create project");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Handle Edit Project
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    setEditError(null);

    if (editStartDate && editTargetDate && new Date(editStartDate) > new Date(editTargetDate)) {
      setEditError("Start date cannot be after due date");
      return;
    }

    setEditSubmitting(true);
    try {
      const updated = await updateProject(
        selectedProject.id,
        {
          title: editTitle.trim(),
          description: editDescription.trim() || undefined,
          status: editStatus,
          priority: editPriority,
          ownerId: editOwnerId || undefined,
          startDate: editStartDate ? new Date(editStartDate).toISOString() : null,
          targetDate: editTargetDate ? new Date(editTargetDate).toISOString() : null,
        },
        token
      );
      setSelectedProject(updated);
      loadProjects();
    } catch (err: any) {
      setEditError(err.message || "Failed to update project");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handle Archive Project
  const handleArchive = async () => {
    if (!selectedProject) return;
    if (!window.confirm(`Are you sure you want to archive project '${selectedProject.title}'?`)) return;

    try {
      const archived = await archiveProject(selectedProject.id, token);
      setSelectedProject(archived);
      loadProjects();
    } catch (err: any) {
      setEditError(err.message || "Failed to archive project");
    }
  };

  // Handle Add Milestone
  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    setMilestoneError(null);

    if (!newMilestoneTitle.trim() || !newMilestoneDate) {
      setMilestoneError("Title and Due Date are required for a milestone");
      return;
    }

    // Client-side boundary check
    const mDate = new Date(newMilestoneDate).getTime();
    if (selectedProject.startDate && mDate < new Date(selectedProject.startDate).getTime()) {
      setMilestoneError("Milestone due date cannot be before project start date");
      return;
    }
    if (selectedProject.targetDate && mDate > new Date(selectedProject.targetDate).getTime()) {
      setMilestoneError("Milestone due date cannot be after project due date");
      return;
    }

    setMilestoneSubmitting(true);
    try {
      await createMilestone(
        selectedProject.id,
        {
          title: newMilestoneTitle.trim(),
          description: newMilestoneDesc.trim() || undefined,
          dueDate: new Date(newMilestoneDate).toISOString(),
        },
        token
      );

      // Refresh project detail
      const refreshed = await fetchProjectById(selectedProject.id, token);
      setSelectedProject(refreshed);
      setNewMilestoneTitle("");
      setNewMilestoneDesc("");
      setNewMilestoneDate("");
      loadProjects();
    } catch (err: any) {
      setMilestoneError(err.message || "Failed to add milestone");
    } finally {
      setMilestoneSubmitting(false);
    }
  };

  // Toggle Milestone Status
  const handleToggleMilestone = async (milestoneId: string, currentStatus: string) => {
    if (!selectedProject) return;
    const nextStatus = currentStatus === "REACHED" ? "PENDING" : "REACHED";

    try {
      await updateMilestone(
        selectedProject.id,
        milestoneId,
        { status: nextStatus },
        token
      );
      const refreshed = await fetchProjectById(selectedProject.id, token);
      setSelectedProject(refreshed);
      loadProjects();
    } catch (err: any) {
      setMilestoneError(err.message || "Failed to update milestone status");
    }
  };

  // Delete Milestone
  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!selectedProject) return;
    if (!window.confirm("Are you sure you want to delete this milestone?")) return;

    try {
      await deleteMilestone(selectedProject.id, milestoneId, token);
      const refreshed = await fetchProjectById(selectedProject.id, token);
      setSelectedProject(refreshed);
      loadProjects();
    } catch (err: any) {
      setMilestoneError(err.message || "Failed to delete milestone");
    }
  };

  // Handle Add Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newMemberUserId) return;
    setMemberError(null);

    setMemberSubmitting(true);
    try {
      await addProjectMember(
        selectedProject.id,
        { userId: newMemberUserId, role: newMemberRole },
        token
      );
      const refreshed = await fetchProjectById(selectedProject.id, token);
      setSelectedProject(refreshed);
      setNewMemberUserId("");
      loadProjects();
    } catch (err: any) {
      setMemberError(err.message || "Failed to add project member");
    } finally {
      setMemberSubmitting(false);
    }
  };

  // Handle Remove Member
  const handleRemoveMember = async (userId: string) => {
    if (!selectedProject) return;
    if (!window.confirm("Remove this member from the project?")) return;

    try {
      await removeProjectMember(selectedProject.id, userId, token);
      const refreshed = await fetchProjectById(selectedProject.id, token);
      setSelectedProject(refreshed);
      loadProjects();
    } catch (err: any) {
      setMemberError(err.message || "Failed to remove member");
    }
  };

  // Status Badge Styling Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
      case "IN_PROGRESS":
        return <Badge variant="primary" size="sm">Active</Badge>;
      case "PLANNING":
        return <Badge variant="neutral" size="sm">Planning</Badge>;
      case "ON_HOLD":
        return <Badge variant="warning" size="sm">On Hold</Badge>;
      case "COMPLETED":
        return <Badge variant="success" size="sm">Completed</Badge>;
      case "ARCHIVED":
        return <Badge variant="neutral" size="sm" className="bg-slate-200 text-slate-700">Archived</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">Urgent</span>;
      case "HIGH":
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">High</span>;
      case "MEDIUM":
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">Medium</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">Low</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Project Management</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise project portfolio, milestone delivery schedules, and member allocations for Livexpert Technologies.
          </p>
        </div>

        {canCreateProject && (
          <Button
            variant="gradient"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setCreateError(null);
              setIsCreateOpen(true);
            }}
          >
            New Project
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200/80 shadow-subtle">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl w-full md:w-auto overflow-x-auto">
              {[
                { id: "all", label: "All Projects" },
                { id: "PLANNING", label: "Planning" },
                { id: "IN_PROGRESS", label: "Active" },
                { id: "ON_HOLD", label: "On Hold" },
                { id: "COMPLETED", label: "Completed" },
                { id: "ARCHIVED", label: "Archived" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    statusFilter === tab.id
                      ? "bg-white text-[#690BA8] shadow-sm font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects, key, owner..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#690BA8] focus:outline-none focus:ring-1 focus:ring-[#690BA8]"
              />
            </div>
          </div>

          {/* Secondary Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
            {/* Department Filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500">Department:</span>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-[#690BA8] focus:outline-none"
              >
                <option value="all">All Departments</option>
                {availableDepts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 focus:border-[#690BA8] focus:outline-none"
              >
                <option value="all">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            {(search || statusFilter !== "all" || deptFilter !== "all" || priorityFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setDeptFilter("all");
                  setPriorityFilter("all");
                }}
                className="text-[11px] font-semibold text-[#690BA8] hover:underline ml-auto"
              >
                Clear all filters
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <Spinner size="lg" variant="brand" />
          <p className="text-xs font-semibold text-slate-500">Loading project repository...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-xs text-rose-800">
          <p className="font-semibold">{error}</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <FolderKanban className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No projects match the current filter</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search criteria, department dropdown, or status filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((p) => (
            <Card
              key={p.id}
              className={`hover:border-[#690BA8]/40 transition-all flex flex-col justify-between ${
                p.status === "ARCHIVED" ? "opacity-75 bg-slate-50/60" : "bg-white"
              }`}
            >
              <CardContent className="p-5 space-y-4">
                {/* Header: Key, Department, Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#690BA8] bg-[#F5EFFB] px-2 py-0.5 rounded border border-[#690BA8]/20">
                        {p.key}
                      </span>
                      {p.department && (
                        <span className="text-[11px] font-semibold text-slate-500">
                          {p.department.name}
                        </span>
                      )}
                    </div>
                    {canViewProjectDashboard ? (
                      <button
                        type="button"
                        onClick={() => handleOpenDetails(p.id, "dashboard")}
                        className="block max-w-full truncate text-left text-base font-bold leading-snug text-slate-900 hover:text-[#690BA8] focus:outline-none focus-visible:underline"
                      >
                        {p.title}
                      </button>
                    ) : (
                      <h3 className="line-clamp-1 text-base font-bold leading-snug text-slate-900">{p.title}</h3>
                    )}
                  </div>
                  <div>{getStatusBadge(p.status)}</div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed min-h-[32px]">
                  {p.description || "No project description provided."}
                </p>

                {/* Priority & Deadline Info */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div>{getPriorityBadge(p.priority)}</div>

                  {p.targetDate && (
                    <div className="flex items-center gap-1 text-[11px]">
                      {p.isOverdue ? (
                        <span className="flex items-center gap-1 text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Overdue</span>
                        </span>
                      ) : p.daysLeft !== null && p.daysLeft <= 7 && p.status !== "COMPLETED" ? (
                        <span className="flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Clock className="h-3 w-3" />
                          <span>{p.daysLeft === 0 ? "Due Today" : `Due in ${p.daysLeft}d`}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">
                          Due {new Date(p.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>
                      Milestones: {p.reachedMilestones} / {p.milestonesCount}
                    </span>
                    <span className="font-bold text-[#690BA8]">{p.progress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#7200A5] transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, p.progress))}%` }}
                    />
                  </div>
                </div>

                {/* Footer: Owner and Members count */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-6 w-6 rounded-full bg-[#690BA8]/10 text-[#690BA8] flex items-center justify-center font-bold text-[10px]">
                      {p.owner?.name?.charAt(0) || "U"}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[100px]">
                      {p.owner?.name || "Unassigned"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                    <Users className="h-3.5 w-3.5" />
                    <span>{p.memberCount} members</span>
                  </div>
                </div>

                {/* Project dashboard/task actions are limited to administrators and managers. */}
                <div className="space-y-2 pt-2">
                  {canViewProjectDashboard ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-center text-xs"
                        onClick={() => handleOpenDetails(p.id, "dashboard")}
                      >
                        View Dashboard
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-center text-xs"
                        onClick={() => navigate(`/team-tasks?projectId=${encodeURIComponent(p.id)}`)}
                      >
                        View Tasks
                      </Button>
                    </div>
                  ) : null}
                  {(p.canEdit || !canViewProjectDashboard) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-center text-xs"
                      onClick={() => handleOpenDetails(p.id)}
                    >
                      {p.canEdit ? "Manage Project" : "View Details"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE PROJECT MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Enterprise Project"
        description="Initialize a new project, assign department, milestones, and project owner."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {createError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                label="Project Title"
                required
                placeholder="e.g. Telemetry Ingestion Gateway"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div>
              <Input
                label="Project Code"
                required
                placeholder="e.g. TIG"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <select
                value={newDepartmentId}
                onChange={(e) => setNewDepartmentId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-[#690BA8] focus:outline-none"
                required
              >
                {availableDepts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Project Owner</label>
              <select
                value={newOwnerId}
                onChange={(e) => setNewOwnerId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-[#690BA8] focus:outline-none"
              >
                <option value="">Default (Current User)</option>
                {availableEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-[#690BA8] focus:outline-none"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-[#690BA8] focus:outline-none"
              >
                <option value="PLANNING">Planning</option>
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={newStartDate}
              onChange={(e) => setNewStartDate(e.target.value)}
            />
            <Input
              label="Due Date / Target Date"
              type="date"
              value={newTargetDate}
              onChange={(e) => setNewTargetDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Project Description</label>
            <textarea
              rows={3}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Scope, key deliverables, and architectural requirements..."
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#690BA8] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gradient"
              size="sm"
              isLoading={createSubmitting}
            >
              Create Project
            </Button>
          </div>
        </form>
      </Modal>

      {/* PROJECT DETAILS & MANAGEMENT MODAL */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={selectedProject ? `${selectedProject.key} — ${selectedProject.title}` : "Project Details"}
        description="Comprehensive project overview, milestones, team members, and lifecycle settings."
        size={canViewProjectDashboard ? "4xl" : activeTab === "issues" || activeTab === "timeLogs" ? "2xl" : "md"}
      >
        {detailsLoading ? (
          <div className="py-16 text-center space-y-2">
            <Spinner size="md" variant="brand" />
            <p className="text-xs text-slate-500 font-medium">Fetching project details...</p>
          </div>
        ) : selectedProject ? (
          <div className="space-y-4">
            {/* Modal Tabs Header */}
            <div className="flex flex-wrap border-b border-slate-200 text-xs font-semibold">
              {canViewProjectDashboard && (
                <button
                  type="button"
                  onClick={() => setActiveTab("dashboard")}
                  className={`pb-2.5 px-3 border-b-2 transition-colors ${
                    activeTab === "dashboard"
                      ? "border-[#690BA8] text-[#690BA8]"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Project Dashboard
                </button>
              )}
              {canViewProjectDashboard && (
                <button
                  type="button"
                  onClick={() => setActiveTab("tasks")}
                  className={`pb-2.5 px-3 border-b-2 transition-colors ${
                    activeTab === "tasks"
                      ? "border-[#690BA8] text-[#690BA8]"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Project Tasks ({projectTasks.length})
                </button>
              )}
              {canViewProjectDashboard && (
                <button type="button" onClick={() => setActiveTab("users")} className={`pb-2.5 px-3 border-b-2 transition-colors ${activeTab === "users" ? "border-[#690BA8] text-[#690BA8]" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
                  Users
                </button>
              )}
              {canViewProjectDashboard && (
                <button type="button" onClick={() => setActiveTab("reports")} className={`pb-2.5 px-3 border-b-2 transition-colors ${activeTab === "reports" ? "border-[#690BA8] text-[#690BA8]" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
                  Reports
                </button>
              )}
              {canViewProjectDashboard && (
                <button type="button" onClick={() => { setActiveTab("documents"); void loadProjectDocuments(); }} className={`pb-2.5 px-3 border-b-2 transition-colors ${activeTab === "documents" ? "border-[#690BA8] text-[#690BA8]" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
                  Documents
                </button>
              )}
              <button type="button" onClick={() => setActiveTab("timeLogs")} className={`pb-2.5 px-3 border-b-2 transition-colors ${activeTab === "timeLogs" ? "border-[#690BA8] text-[#690BA8]" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
                Time Logs
              </button>
              <button type="button" onClick={() => setActiveTab("issues")} className={`pb-2.5 px-3 border-b-2 transition-colors ${activeTab === "issues" ? "border-[#690BA8] text-[#690BA8]" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
                Issues
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`pb-2.5 px-3 border-b-2 transition-colors ${
                  activeTab === "overview"
                    ? "border-[#690BA8] text-[#690BA8]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Overview & Settings
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("milestones")}
                className={`pb-2.5 px-3 border-b-2 transition-colors ${
                  activeTab === "milestones"
                    ? "border-[#690BA8] text-[#690BA8]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Phases ({selectedProject.milestones?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("members")}
                className={`pb-2.5 px-3 border-b-2 transition-colors ${
                  activeTab === "members"
                    ? "border-[#690BA8] text-[#690BA8]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Team Members ({selectedProject.members?.length || 0})
              </button>
            </div>

            {activeTab === "dashboard" && canViewProjectDashboard && (
              <ProjectDashboard project={selectedProject} tasks={projectTasks} error={projectTasksError} />
            )}
            {activeTab === "tasks" && canViewProjectDashboard && (
              <ProjectTasksPanel tasks={projectTasks} error={projectTasksError} />
            )}
            {activeTab === "users" && canViewProjectDashboard && (
              <ProjectUsersPanel project={selectedProject} tasks={projectTasks} employees={availableEmployees} />
            )}
            {activeTab === "reports" && canViewProjectDashboard && (
              <ProjectReportsPanel project={selectedProject} tasks={projectTasks} />
            )}
            {activeTab === "documents" && canViewProjectDashboard && (
              <ProjectDocumentsPanel documents={projectDocuments} loading={projectDocumentsLoading} error={projectDocumentsError} token={token} />
            )}
            {activeTab === "timeLogs" && (
              <ProjectTimeLogsPanel projectId={selectedProject.id} tasks={projectTasks} token={token} userId={user?.id || ""} canManage={selectedProject.canEdit} />
            )}
            {activeTab === "issues" && (
              <ProjectIssuesPanel projectId={selectedProject.id} tasks={projectTasks} token={token} canManage={selectedProject.canEdit} />
            )}

            {/* TAB 1: OVERVIEW & SETTINGS */}
            {activeTab === "overview" && (
              <form onSubmit={handleEditSubmit} className="space-y-4 pt-1">
                {editError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                    {editError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Project Title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    disabled={!selectedProject.canEdit}
                  />

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      disabled={!selectedProject.canEdit}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-[#690BA8] focus:outline-none disabled:bg-slate-100"
                    >
                      <option value="PLANNING">Planning</option>
                      <option value="ACTIVE">Active</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="ON_HOLD">On Hold</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                      disabled={!selectedProject.canEdit}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-[#690BA8] focus:outline-none disabled:bg-slate-100"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Project Owner</label>
                    <select
                      value={editOwnerId}
                      onChange={(e) => setEditOwnerId(e.target.value)}
                      disabled={!selectedProject.canEdit}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-[#690BA8] focus:outline-none disabled:bg-slate-100"
                    >
                      {availableEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Start Date"
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    disabled={!selectedProject.canEdit}
                  />
                  <Input
                    label="Target / Due Date"
                    type="date"
                    value={editTargetDate}
                    onChange={(e) => setEditTargetDate(e.target.value)}
                    disabled={!selectedProject.canEdit}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    disabled={!selectedProject.canEdit}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#690BA8] focus:outline-none disabled:bg-slate-100"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  {selectedProject.canEdit && selectedProject.status !== "ARCHIVED" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleArchive}
                      leftIcon={<Archive className="h-3.5 w-3.5 text-rose-600" />}
                      className="text-rose-600 hover:bg-rose-50 border-rose-200 text-xs"
                    >
                      Archive Project
                    </Button>
                  ) : <div />}

                  {selectedProject.canEdit && (
                    <Button
                      type="submit"
                      variant="gradient"
                      size="sm"
                      isLoading={editSubmitting}
                    >
                      Save Changes
                    </Button>
                  )}
                </div>
              </form>
            )}

            {/* TAB 2: MILESTONES */}
            {activeTab === "milestones" && (
              <div className="space-y-4 pt-1">
                {milestoneError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                    {milestoneError}
                  </div>
                )}

                {/* Milestones List */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {selectedProject.milestones?.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">
                      No milestones recorded yet for this project.
                    </p>
                  ) : (
                    selectedProject.milestones?.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-colors"
                      >
                        <div className="flex items-start gap-2.5">
                          <button
                            type="button"
                            onClick={() => selectedProject.canEdit && handleToggleMilestone(m.id, m.status)}
                            disabled={!selectedProject.canEdit}
                            className={`mt-0.5 rounded-full p-1 transition-colors ${
                              m.status === "REACHED"
                                ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                                : "text-slate-400 bg-white border border-slate-200 hover:border-[#690BA8]"
                            }`}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <div>
                            <h4
                              className={`text-xs font-bold ${
                                m.status === "REACHED"
                                  ? "line-through text-slate-400"
                                  : "text-slate-900"
                              }`}
                            >
                              {m.title}
                            </h4>
                            {m.description && (
                              <p className="text-[11px] text-slate-500 mt-0.5">{m.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                              <span>Due {new Date(m.dueDate).toLocaleDateString()}</span>
                              {m.status === "REACHED" && (
                                <span className="text-emerald-600 font-semibold">
                                  • Reached {m.reachedAt ? new Date(m.reachedAt).toLocaleDateString() : ""}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {selectedProject.canEdit && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMilestone(m.id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Delete Milestone"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Add Milestone Form */}
                {selectedProject.canEdit && (
                  <form onSubmit={handleAddMilestone} className="p-3.5 rounded-xl border border-slate-200 bg-purple-50/30 space-y-3">
                    <span className="text-[11px] font-bold text-[#690BA8] uppercase tracking-wider block">
                      Add Deliverable Milestone
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        label="Milestone Title"
                        placeholder="e.g. Beta Gateway Release"
                        value={newMilestoneTitle}
                        onChange={(e) => setNewMilestoneTitle(e.target.value)}
                        required
                      />
                      <Input
                        label="Milestone Due Date"
                        type="date"
                        value={newMilestoneDate}
                        onChange={(e) => setNewMilestoneDate(e.target.value)}
                        required
                      />
                    </div>
                    <Input
                      label="Description (Optional)"
                      placeholder="Brief notes on sign-off conditions"
                      value={newMilestoneDesc}
                      onChange={(e) => setNewMilestoneDesc(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={milestoneSubmitting}
                      >
                        Add Milestone
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* TAB 3: TEAM MEMBERS */}
            {activeTab === "members" && (
              <div className="space-y-4 pt-1">
                {memberError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                    {memberError}
                  </div>
                )}

                {/* Members List */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {selectedProject.members?.map((m) => {
                    const isOwner = selectedProject.owner?.id === m.userId;
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-[#690BA8]/10 text-[#690BA8] flex items-center justify-center font-bold text-xs">
                            {m.user?.name?.charAt(0) || "U"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-900">{m.user?.name || "Colleague"}</h4>
                              {isOwner && (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  Owner
                                </span>
                              )}
                              <span className="text-[10px] font-semibold text-slate-500 uppercase">
                                {m.role}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">{m.user?.email}</p>
                          </div>
                        </div>

                        {selectedProject.canEdit && !isOwner && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.userId)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Remove from project"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add Member Form */}
                {selectedProject.canEdit && (
                  <form onSubmit={handleAddMember} className="p-3.5 rounded-xl border border-slate-200 bg-purple-50/30 space-y-3">
                    <span className="text-[11px] font-bold text-[#690BA8] uppercase tracking-wider block">
                      Assign Team Member
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Colleague</label>
                        <select
                          value={newMemberUserId}
                          onChange={(e) => setNewMemberUserId(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-[#690BA8] focus:outline-none"
                          required
                        >
                          <option value="">Select Employee...</option>
                          {availableEmployees
                            .filter((emp) => !selectedProject.members?.some((m) => m.userId === emp.id))
                            .map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.name} ({emp.email})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Project Role</label>
                        <select
                          value={newMemberRole}
                          onChange={(e) => setNewMemberRole(e.target.value as any)}
                          className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-[#690BA8] focus:outline-none"
                        >
                          <option value="CONTRIBUTOR">Contributor</option>
                          <option value="LEAD">Lead</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={memberSubmitting}
                        disabled={!newMemberUserId}
                      >
                        Add to Project
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

const ProjectDashboard: React.FC<{
  project: ProjectDetail;
  tasks: TaskItem[];
  error: string | null;
}> = ({ project, tasks, error }) => {
  const [workloadPage, setWorkloadPage] = useState(1);
  const [workloadPageSize, setWorkloadPageSize] = useState(8);
  const [taskPage, setTaskPage] = useState(1);
  const [taskPageSize, setTaskPageSize] = useState(8);
  const completedTasks = tasks.filter((task) => task.status === "COMPLETED").length;
  const inProgressTasks = tasks.filter((task) => ["IN_PROGRESS", "UNDER_REVIEW", "CHANGES_REQUIRED"].includes(task.status)).length;
  const overdueTasks = tasks.filter(
    (task) => task.dueDate && task.status !== "COMPLETED" && new Date(task.dueDate).getTime() < Date.now()
  ).length;
  const blockedTasks = tasks.filter((task) => task.status === "BLOCKED" || task.isBlocked).length;
  const totalComments = tasks.reduce((total, task) => total + task.commentsCount, 0);
  const totalAttachments = tasks.reduce((total, task) => total + task.attachmentsCount, 0);
  const totalDependencies = tasks.reduce((total, task) => total + task.dependenciesCount, 0);
  const statusGroups = [
    { label: "Open", statuses: ["OPEN", "TODO", "BACKLOG"] },
    { label: "Assigned", statuses: ["ASSIGNED"] },
    { label: "In Progress", statuses: ["IN_PROGRESS"] },
    { label: "Under Review", statuses: ["UNDER_REVIEW", "IN_REVIEW"] },
    { label: "Changes Required", statuses: ["CHANGES_REQUIRED"] },
    { label: "Completed", statuses: ["COMPLETED"] },
    { label: "Blocked", statuses: ["BLOCKED"] },
  ];

  type ProjectPerson = { id: string; name: string; email?: string; roles: string[]; assigned: number; completed: number; reviewed: number };
  const people = new Map<string, ProjectPerson>();
  const registerPerson = (person: { id: string; name: string; email?: string }, role: string) => {
    const existing = people.get(person.id) || {
      id: person.id,
      name: person.name,
      email: person.email,
      roles: [],
      assigned: 0,
      completed: 0,
      reviewed: 0,
    };
    if (person.email) existing.email = person.email;
    if (!existing.roles.includes(role)) existing.roles.push(role);
    people.set(existing.id, existing);
    return existing;
  };
  for (const member of project.members || []) {
    if (member.user) {
      registerPerson(member.user, member.role);
    }
  }
  for (const task of tasks) {
    if (task.assignee) {
      const person = registerPerson(task.assignee, "Assignee");
      person.assigned += 1;
      if (task.status === "COMPLETED") person.completed += 1;
    }
    if (task.reviewer) {
      const person = registerPerson(task.reviewer, "Reviewer");
      person.reviewed += 1;
    }
  }
  if (project.owner) {
    registerPerson(project.owner, "Project Owner");
  }
  const workloadRows = [...people.values()].sort((a, b) => b.assigned - a.assigned);
  const visibleWorkloadRows = workloadRows.slice((workloadPage - 1) * workloadPageSize, workloadPage * workloadPageSize);
  const visibleTasks = tasks.slice((taskPage - 1) * taskPageSize, taskPage * taskPageSize);

  return (
    <div className="space-y-5 pt-1">
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}

      <section className="rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50/80 to-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#7200A5]">{project.key}</span>
              <Badge variant="primary" size="sm">{project.status.replace(/_/g, " ")}</Badge>
              <span className="text-xs text-slate-500">{project.department?.name || "No department"}</span>
            </div>
            <h4 className="mt-2 text-base font-bold text-slate-900">{project.title}</h4>
            <p className="mt-1 max-w-3xl text-xs text-slate-600">{project.description || "No project description provided."}</p>
          </div>
          <div className="rounded-lg border border-violet-100 bg-white px-3 py-2 text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Project progress</div>
            <div className="text-xl font-extrabold text-[#7200A5]">{project.progress}%</div>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#7200A5] transition-all" style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }} />
        </div>
        <div className="mt-3 grid gap-2 border-t border-violet-100 pt-3 text-[11px] sm:grid-cols-2 xl:grid-cols-4">
          <div><span className="text-slate-400">Owner</span><div className="font-semibold text-slate-700">{project.owner?.name || "Unassigned"}</div></div>
          <div><span className="text-slate-400">Priority</span><div className="font-semibold text-slate-700">{project.priority}</div></div>
          <div><span className="text-slate-400">Start date</span><div className="font-semibold text-slate-700">{project.startDate ? new Date(project.startDate).toLocaleDateString() : "Not set"}</div></div>
          <div><span className="text-slate-400">Target date</span><div className="font-semibold text-slate-700">{project.targetDate ? new Date(project.targetDate).toLocaleDateString() : "Not set"}</div></div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {[
          { label: "Tasks & Subtasks", value: tasks.length, icon: <CheckCircle2 className="h-4 w-4 text-violet-600" /> },
          { label: "Completed", value: completedTasks, icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" /> },
          { label: "In Progress", value: inProgressTasks, icon: <Clock className="h-4 w-4 text-blue-600" /> },
          { label: "Overdue", value: overdueTasks, icon: <AlertTriangle className="h-4 w-4 text-rose-600" /> },
          { label: "Blocked", value: blockedTasks, icon: <AlertTriangle className="h-4 w-4 text-orange-600" /> },
          { label: "Team Members", value: people.size, icon: <Users className="h-4 w-4 text-fuchsia-600" /> },
          { label: "Comments", value: totalComments, icon: <CheckCircle2 className="h-4 w-4 text-slate-500" /> },
          { label: "Attachments", value: totalAttachments, icon: <CheckCircle2 className="h-4 w-4 text-slate-500" /> },
          { label: "Dependencies", value: totalDependencies, icon: <CheckCircle2 className="h-4 w-4 text-slate-500" /> },
        ].map((metric) => (
          <div key={metric.label} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
              {metric.label}{metric.icon}
            </div>
            <div className="mt-1 text-xl font-bold text-slate-900">{metric.value}</div>
          </div>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.85fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">Task Status</h4>
            <span className="text-[11px] text-slate-500">{tasks.length} tasks and subtasks</span>
          </div>
          <div className="space-y-3">
            {statusGroups.map((group) => {
              const count = tasks.filter((task) => group.statuses.includes(task.status)).length;
              const percent = tasks.length ? Math.round((count / tasks.length) * 100) : 0;
              return (
                <div key={group.label}>
                  <div className="mb-1 flex justify-between text-[11px]">
                    <span className="text-slate-600">{group.label}</span><span className="font-semibold text-slate-700">{count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#7200A5]" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
            {project.milestones?.length || 0} milestones · {project.milestones?.filter((milestone) => milestone.status === "REACHED").length || 0} reached
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">Team Workload</h4>
            <span className="text-[11px] text-slate-500">{people.size} people</span>
          </div>
          {people.size === 0 ? (
            <p className="py-5 text-center text-xs text-slate-500">No project members or task assignees yet.</p>
          ) : (
            <div className="max-h-96 overflow-auto">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2.5">Person</th>
                    <th className="px-3 py-2.5">Project roles</th>
                    <th className="px-3 py-2.5 text-right">Assigned</th>
                    <th className="px-3 py-2.5 text-right">Completed</th>
                    <th className="px-3 py-2.5 text-right">Reviews</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleWorkloadRows.map((person) => (
                    <tr key={person.id} className="hover:bg-violet-50/40">
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-800">{person.name}</div>
                        {person.email && <div className="mt-0.5 truncate text-[10px] text-slate-500">{person.email}</div>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">{person.roles.map((role) => <span key={role} className="rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">{role.replace(/_/g, " ")}</span>)}</div>
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-slate-700">{person.assigned}</td>
                      <td className="px-3 py-3 text-right font-medium text-emerald-700">{person.completed}</td>
                      <td className="px-3 py-3 text-right font-medium text-slate-700">{person.reviewed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <TablePagination page={workloadPage} pageSize={workloadPageSize} total={workloadRows.length} onPageChange={setWorkloadPage} onPageSizeChange={(size) => { setWorkloadPageSize(size); setWorkloadPage(1); }} />
            </div>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h4 className="text-sm font-bold text-slate-900">Project Tasks</h4>
        </div>
        {tasks.length === 0 ? (
          <p className="p-6 text-center text-xs text-slate-500">No tasks have been added to this project.</p>
        ) : (
          <div className="max-h-72 overflow-auto">
            <table className="w-full min-w-[1000px] text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-2">Task</th><th className="px-4 py-2">Assignee</th><th className="px-4 py-2">Reviewer</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Priority</th><th className="px-4 py-2">Progress</th><th className="px-4 py-2">Due date</th><th className="px-4 py-2">Related work</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleTasks.map((task) => (
                  <tr key={task.id}>
                    <td className="max-w-64 truncate px-4 py-2.5 font-semibold text-slate-800">{task.title}</td>
                    <td className="px-4 py-2.5 text-slate-600">{task.assignee?.name || "Unassigned"}</td>
                    <td className="px-4 py-2.5 text-slate-600">{task.reviewer?.name || "—"}</td>
                    <td className="px-4 py-2.5 text-slate-600">{task.status.replace(/_/g, " ")}</td>
                    <td className="px-4 py-2.5 text-slate-600">{task.priority}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2"><div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#7200A5]" style={{ width: `${Math.min(100, Math.max(0, task.completionPercentage))}%` }} /></div><span className="text-slate-600">{task.completionPercentage}%</span></div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-2.5 text-slate-500">{task.subtasksCount} subtasks · {task.commentsCount} comments · {task.attachmentsCount} files · {task.dependenciesCount} dependencies</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePagination page={taskPage} pageSize={taskPageSize} total={tasks.length} onPageChange={setTaskPage} onPageSizeChange={(size) => { setTaskPageSize(size); setTaskPage(1); }} />
          </div>
        )}
      </section>
    </div>
  );
};

const ProjectTasksPanel: React.FC<{ tasks: TaskItem[]; error: string | null }> = ({ tasks, error }) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const visibleTasks = tasks.slice((page - 1) * pageSize, page * pageSize);
  const taskGroups = Array.from(
    visibleTasks.reduce((groups, task) => {
      const groupName = task.taskList?.trim() || "General";
      const group = groups.get(groupName) || [];
      group.push(task);
      groups.set(groupName, group);
      return groups;
    }, new Map<string, TaskItem[]>()).entries()
  );

  return (
    <section className="space-y-3 pt-1">
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Project task list</h4>
          <p className="mt-1 text-xs text-slate-500">Tasks grouped by task list, with owners, reviewers, progress, and dates.</p>
        </div>
        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">{tasks.length} tasks</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {tasks.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-500">No tasks have been added to this project.</p>
        ) : (
          <>
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full min-w-[1120px] text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-violet-100 bg-[#faf8fc] text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Task name</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Reviewer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Start date</th>
                  <th className="px-4 py-3">Due date</th>
                  <th className="px-4 py-3">Related work</th>
                </tr>
              </thead>
              {taskGroups.map(([groupName, groupTasks]) => (
                <tbody key={groupName} className="divide-y divide-slate-100">
                  <tr className="border-y border-slate-200 bg-slate-50/80">
                    <th colSpan={9} className="px-4 py-2.5 text-left font-bold text-slate-700">
                      <span className="mr-2 text-[#7200A5]">⌄</span>{groupName}
                      <span className="ml-2 font-medium text-slate-400">({groupTasks.length})</span>
                    </th>
                  </tr>
                  {groupTasks.map((task) => (
                    <tr key={task.id} className="transition-colors hover:bg-violet-50/40">
                      <td className="max-w-72 px-4 py-3">
                        <div className="truncate font-semibold text-slate-800">{task.title}</div>
                        <div className="mt-0.5 text-[10px] text-slate-400">{task.parentTaskId ? "Subtask" : "Task"}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{task.assignee?.name || "Unassigned"}</td>
                      <td className="px-4 py-3 text-slate-600">{task.reviewer?.name || "—"}</td>
                      <td className="px-4 py-3"><Badge variant="neutral" size="sm">{task.status.replace(/_/g, " ")}</Badge></td>
                      <td className="px-4 py-3 text-slate-600">{task.priority}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-[#7200A5]" style={{ width: `${Math.min(100, Math.max(0, task.completionPercentage))}%` }} />
                          </div>
                          <span className="text-slate-500">{task.completionPercentage}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{task.startDate ? new Date(task.startDate).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{task.subtasksCount} subtasks · {task.commentsCount} comments · {task.attachmentsCount} files</td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
          <TablePagination page={page} pageSize={pageSize} total={tasks.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
          </>
        )}
      </div>
    </section>
  );
};

const ProjectUsersPanel: React.FC<{
  project: ProjectDetail;
  tasks: TaskItem[];
  employees: { id: string; name: string; email: string }[];
}> = ({ project, tasks, employees }) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  type Person = { id: string; name: string; email?: string; roles: string[]; assigned: number; assignedBy: number; reviewed: number; completed: number };
  const people = new Map<string, Person>();
  const addPerson = (person: { id: string; name: string; email?: string }, role: string) => {
    const entry = people.get(person.id) || { ...person, roles: [], assigned: 0, assignedBy: 0, reviewed: 0, completed: 0 };
    if (!entry.roles.includes(role)) entry.roles.push(role);
    people.set(person.id, entry);
    return entry;
  };

  for (const member of project.members || []) {
    if (member.user) addPerson(member.user, member.role);
  }
  if (project.owner) addPerson(project.owner, "Project Owner");
  for (const task of tasks) {
    const creator = people.get(task.creatorId) || employees.find((employee) => employee.id === task.creatorId);
    if (creator) addPerson(creator, "Task Creator").assignedBy += 1;
    if (task.assignee) {
      const assignee = addPerson(task.assignee, "Assignee");
      assignee.assigned += 1;
      if (task.status === "COMPLETED") assignee.completed += 1;
    }
    if (task.reviewer) addPerson(task.reviewer, "Reviewer").reviewed += 1;
  }

  const contributors = Array.from(people.values()).filter((person) => person.assigned > 0 || person.assignedBy > 0 || person.reviewed > 0);
  const peopleRows = Array.from(people.values()).sort((a, b) => (b.assigned + b.assignedBy) - (a.assigned + a.assignedBy));
  const visiblePeople = peopleRows.slice((page - 1) * pageSize, page * pageSize);
  return (
    <section className="space-y-4 pt-1">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-900">People working on this project</h4>
          <p className="mt-1 text-xs text-slate-500">Assigned = tasks assigned to them; Assigned by = tasks they created; Reviewed = tasks they review; Completed = assigned tasks marked complete.</p>
        </div>
        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">{contributors.length} contributors</span>
      </div>
      {people.size === 0 ? <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">No project members or task participants yet.</p> : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] table-fixed text-left text-xs">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[40%]" />
                <col className="w-[9%]" />
                <col className="w-[11%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
              </colgroup>
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Person</th>
                  <th className="px-4 py-3">Project roles</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right">Assigned</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right">Assigned by</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right">Reviewed</th>
                  <th className="whitespace-nowrap px-3 py-3 text-right">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visiblePeople.map((person) => (
                  <tr key={person.id} className="hover:bg-violet-50/40">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{person.name}</div>
                      {person.email && <div className="mt-0.5 text-[10px] text-slate-500">{person.email}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">{person.roles.map((role) => <Badge key={role} variant="primary" size="sm">{role.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())}</Badge>)}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">{person.assigned}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">{person.assignedBy}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">{person.reviewed}</td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-700">{person.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination page={page} pageSize={pageSize} total={peopleRows.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        </div>
      )}
    </section>
  );
};

const ProjectReportsPanel: React.FC<{ project: ProjectDetail; tasks: TaskItem[] }> = ({ project, tasks }) => {
  const completed = tasks.filter((task) => task.status === "COMPLETED").length;
  const overdue = tasks.filter((task) => task.dueDate && task.status !== "COMPLETED" && new Date(task.dueDate).getTime() < Date.now()).length;
  const statusGroups = [
    { label: "Open", statuses: ["OPEN", "TODO", "BACKLOG"] },
    { label: "Assigned", statuses: ["ASSIGNED"] },
    { label: "In progress", statuses: ["IN_PROGRESS"] },
    { label: "Under review", statuses: ["UNDER_REVIEW", "IN_REVIEW"] },
    { label: "Changes required", statuses: ["CHANGES_REQUIRED"] },
    { label: "Completed", statuses: ["COMPLETED"] },
    { label: "Blocked", statuses: ["BLOCKED"] },
  ];
  return (
    <section className="space-y-4 pt-1">
      <div><h4 className="text-sm font-bold text-slate-900">Project reports</h4><p className="mt-1 text-xs text-slate-500">Read-only delivery metrics calculated from this project’s tasks and phases.</p></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Tasks", tasks.length], ["Completed", completed], ["Overdue", overdue], ["Project progress", `${project.progress}%`],
        ].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-[11px] text-slate-500">{label}</div><div className="mt-1 text-xl font-bold text-slate-900">{value}</div></div>)}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h5 className="mb-4 text-xs font-bold text-slate-800">Task status report <span className="ml-1 font-normal text-slate-400">({tasks.length} total)</span></h5>
        <div className="space-y-3">
          {statusGroups.map((group) => {
            const count = tasks.filter((task) => group.statuses.includes(task.status)).length;
            const ratio = tasks.length ? Math.round((count / tasks.length) * 100) : 0;
            return <div key={group.label}><div className="mb-1 flex justify-between text-[11px]"><span className="text-slate-600">{group.label}</span><span className="font-semibold text-slate-700">{count}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#7200A5]" style={{ width: `${ratio}%` }} /></div></div>;
          })}
        </div>
      </div>
    </section>
  );
};

const ProjectDocumentsPanel: React.FC<{
  documents: Array<{ taskId: string; taskTitle: string; attachment: TaskAttachment }>;
  loading: boolean;
  error: string | null;
  token: string | null;
}> = ({ documents, loading, error, token }) => {
  const [downloadError, setDownloadError] = React.useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const visibleDocuments = documents.slice((page - 1) * pageSize, page * pageSize);
  const handleDownload = async (taskId: string, attachment: TaskAttachment) => {
    setDownloadError(null);
    try {
      const blob = await downloadTaskAttachment(taskId, attachment.id, token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setDownloadError(err.message || "Could not download this file");
    }
  };
  return (
    <section className="space-y-3 pt-1">
      <div><h4 className="text-sm font-bold text-slate-900">Project documents</h4><p className="mt-1 text-xs text-slate-500">Files attached to tasks in this project.</p></div>
      {(error || downloadError) && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error || downloadError}</div>}
      {loading ? <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Loading project documents…</p> : documents.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">No task attachments are available for this project.</p> : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto_auto] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500"><span>File</span><span>Task</span><span>Size</span><span /></div>
          {visibleDocuments.map(({ taskId, taskTitle, attachment }) => <div key={attachment.id} className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0"><div className="min-w-0"><div className="truncate text-xs font-semibold text-slate-800">{attachment.filename}</div><div className="text-[10px] text-slate-400">{attachment.mimetype}</div></div><span className="truncate text-xs text-slate-600">{taskTitle}</span><span className="text-[11px] text-slate-500">{Math.max(1, Math.round(attachment.filesize / 1024))} KB</span><Button size="sm" variant="outline" onClick={() => void handleDownload(taskId, attachment)}>Download</Button></div>)}
          <TablePagination page={page} pageSize={pageSize} total={documents.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
        </div>
      )}
    </section>
  );
};

const projectFieldClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#7200A5] focus:outline-none focus:ring-2 focus:ring-[#7200A5]/10";

const ProjectIssuesPanel: React.FC<{ projectId: string; tasks: TaskItem[]; token: string | null; canManage: boolean }> = ({ projectId, tasks, token, canManage }) => {
  const [issues, setIssues] = useState<ProjectIssueItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskId, setTaskId] = useState("");
  const [priority, setPriority] = useState<ProjectIssueItem["priority"]>("MEDIUM");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const visibleIssues = issues.slice((page - 1) * pageSize, page * pageSize);

  const load = async () => {
    setError(null);
    try { setIssues(await fetchProjectIssues(projectId, token)); }
    catch (err: any) { setError(err.message || "Could not load project issues"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [projectId, token]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      await createProjectIssue(projectId, { title, description, taskId: taskId || undefined, priority }, token);
      setTitle(""); setDescription(""); setTaskId(""); setPriority("MEDIUM");
      await load();
    } catch (err: any) { setError(err.message || "Could not report issue"); }
    finally { setSaving(false); }
  };

  const changeStatus = async (issue: ProjectIssueItem, status: ProjectIssueItem["status"]) => {
    setError(null);
    try { await updateProjectIssue(projectId, issue.id, { status }, token); await load(); }
    catch (err: any) { setError(err.message || "Could not update issue"); }
  };

  return <section className="space-y-4 pt-1">
    <div><h4 className="text-sm font-bold text-slate-900">Report an issue</h4><p className="mt-1 text-xs text-slate-500">Report a project problem and optionally link it to a task. Project issues are visible to everyone who can access this project.</p></div>
    {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2">
      <label className="space-y-1 text-[11px] font-semibold text-slate-600">Issue title<input className={projectFieldClass} required minLength={3} maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Briefly describe the issue" /></label>
      <label className="space-y-1 text-[11px] font-semibold text-slate-600">Related task (optional)<select className={projectFieldClass} value={taskId} onChange={(e) => setTaskId(e.target.value)}><option value="">No task linked</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
      <label className="space-y-1 text-[11px] font-semibold text-slate-600">Priority<select className={projectFieldClass} value={priority} onChange={(e) => setPriority(e.target.value as ProjectIssueItem["priority"])}>{["LOW", "MEDIUM", "HIGH", "URGENT"].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="space-y-1 text-[11px] font-semibold text-slate-600 sm:col-span-2">Details<textarea className={`${projectFieldClass} min-h-20 resize-y`} maxLength={4000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What happened? Include steps to reproduce if useful." /></label>
      <div className="sm:col-span-2"><Button type="submit" size="sm" isLoading={saving}>Submit issue</Button></div>
    </form>
    <div><h4 className="mb-2 text-sm font-bold text-slate-900">Project issues <span className="font-normal text-slate-400">({issues.length})</span></h4>
      {loading ? <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">Loading issues…</p> : issues.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">No issues have been reported for this project.</p> : <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Issue</th><th className="px-3 py-3">Task</th><th className="px-3 py-3">Priority</th><th className="px-3 py-3">Reported by</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Date</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleIssues.map((issue) => <tr key={issue.id}><td className="max-w-xs px-3 py-3"><div className="font-semibold text-slate-800">{issue.title}</div>{issue.description && <div className="mt-1 line-clamp-2 text-[11px] text-slate-500">{issue.description}</div>}</td><td className="px-3 py-3 text-slate-600">{issue.task?.title || "—"}</td><td className="px-3 py-3">{issue.priority}</td><td className="px-3 py-3 text-slate-600">{issue.reporter?.name || "Unknown"}</td><td className="px-3 py-3">{canManage ? <select aria-label={`Status for ${issue.title}`} className={projectFieldClass} value={issue.status} onChange={(e) => void changeStatus(issue, e.target.value as ProjectIssueItem["status"])}>{["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((value) => <option key={value} value={value}>{value.replace("_", " ")}</option>)}</select> : <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700">{issue.status.replace("_", " ")}</span>}</td><td className="whitespace-nowrap px-3 py-3 text-slate-500">{new Date(issue.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div><TablePagination page={page} pageSize={pageSize} total={issues.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} /></div>}
    </div>
  </section>;
};

const ProjectTimeLogsPanel: React.FC<{ projectId: string; tasks: TaskItem[]; token: string | null; userId: string; canManage: boolean }> = ({ projectId, tasks, token, userId, canManage }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [entries, setEntries] = useState<ProjectTimeEntryItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [taskId, setTaskId] = useState("");
  const [workDate, setWorkDate] = useState(today);
  const [hours, setHours] = useState("1");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    setError(null);
    try { setEntries(await fetchProjectTimeEntries(projectId, token)); }
    catch (err: any) { setError(err.message || "Could not load time logs"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [projectId, token]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(null);
    const durationMinutes = Math.round(Number(hours) * 60);
    try {
      if (!Number.isFinite(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) throw new Error("Enter a duration from 1 minute to 24 hours");
      await createProjectTimeEntry(projectId, { taskId, workDate: new Date(`${workDate}T12:00:00`).toISOString(), durationMinutes, note }, token);
      setHours("1"); setNote(""); await load();
    } catch (err: any) { setError(err.message || "Could not record time"); }
    finally { setSaving(false); }
  };
  const remove = async (entryId: string) => {
    setError(null);
    try { await deleteProjectTimeEntry(projectId, entryId, token); await load(); }
    catch (err: any) { setError(err.message || "Could not delete time entry"); }
  };
  const totalMinutes = entries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
  const visibleEntries = entries.slice((page - 1) * pageSize, page * pageSize);
  const formatDuration = (minutes: number) => `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`;
  return <section className="space-y-4 pt-1">
    <div><h4 className="text-sm font-bold text-slate-900">Record work time</h4><p className="mt-1 text-xs text-slate-500">Log time against a task in this project. Your entries are visible to project members and managers.</p></div>
    {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}
    {tasks.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">Add or assign a task in this project before recording time.</p> : <form onSubmit={submit} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="space-y-1 text-[11px] font-semibold text-slate-600 lg:col-span-2">Task<select required className={projectFieldClass} value={taskId} onChange={(e) => setTaskId(e.target.value)}><option value="">Select a task</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
      <label className="space-y-1 text-[11px] font-semibold text-slate-600">Work date<input required type="date" className={projectFieldClass} value={workDate} onChange={(e) => setWorkDate(e.target.value)} /></label>
      <label className="space-y-1 text-[11px] font-semibold text-slate-600">Hours<input required type="number" min="0.02" max="24" step="0.25" className={projectFieldClass} value={hours} onChange={(e) => setHours(e.target.value)} /></label>
      <label className="space-y-1 text-[11px] font-semibold text-slate-600 sm:col-span-2 lg:col-span-3">Work note (optional)<input maxLength={1000} className={projectFieldClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you work on?" /></label>
      <div className="flex items-end"><Button type="submit" size="sm" isLoading={saving}>Record time</Button></div>
    </form>}
    <div className="flex items-center justify-between"><h4 className="text-sm font-bold text-slate-900">Time entries <span className="font-normal text-slate-400">({entries.length})</span></h4><span className="text-xs font-semibold text-slate-600">Total: {formatDuration(totalMinutes)}</span></div>
    {loading ? <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">Loading time entries…</p> : entries.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">No work time has been recorded for this project.</p> : <div className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[660px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Date</th><th className="px-3 py-3">Person</th><th className="px-3 py-3">Task</th><th className="px-3 py-3">Time</th><th className="px-3 py-3">Note</th><th /></tr></thead><tbody className="divide-y divide-slate-100">{visibleEntries.map((entry) => <tr key={entry.id}><td className="whitespace-nowrap px-3 py-3 text-slate-600">{new Date(entry.workDate).toLocaleDateString()}</td><td className="px-3 py-3 text-slate-700">{entry.user?.name || "Unknown"}</td><td className="max-w-[180px] truncate px-3 py-3 text-slate-700">{entry.task?.title || "Deleted task"}</td><td className="px-3 py-3 font-semibold text-slate-800">{formatDuration(entry.durationMinutes)}</td><td className="max-w-[220px] truncate px-3 py-3 text-slate-500">{entry.note || "—"}</td><td className="px-3 py-3 text-right">{(entry.userId === userId || canManage) && <button type="button" onClick={() => void remove(entry.id)} className="text-rose-600 hover:text-rose-800">Delete</button>}</td></tr>)}</tbody></table></div><TablePagination page={page} pageSize={pageSize} total={entries.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} /></div>}
  </section>;
};
