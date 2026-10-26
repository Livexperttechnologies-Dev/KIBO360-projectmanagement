import React, { useState, useEffect, useMemo } from "react";
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
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Spinner } from "../components/ui/Spinner";
import { useAuth } from "../contexts/AuthContext";
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
} from "../api/project";
import { API_BASE_URL } from "../api/client";

export const ProjectsPage: React.FC = () => {
  const { user, token } = useAuth();

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
  const [activeTab, setActiveTab] = useState<"overview" | "milestones" | "members">("overview");

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
  const canCreateProject = user?.role === "ADMINISTRATOR" || user?.role === "PROJECT_MANAGER";

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
  const handleOpenDetails = async (projectId: string) => {
    setIsDetailsOpen(true);
    setDetailsLoading(true);
    setActiveTab("overview");
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
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setDetailsLoading(false);
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
            <Badge variant="primary" size="sm" className="font-bold">Phase 4</Badge>
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
                    <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-1">
                      {p.title}
                    </h3>
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
                      className="h-full rounded-full bg-gradient-to-r from-[#690BA8] via-[#E81778] to-[#F16A65] transition-all duration-300"
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

                {/* Action button */}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-center text-xs"
                    onClick={() => handleOpenDetails(p.id)}
                  >
                    {p.canEdit ? "Manage Project" : "View Details"}
                  </Button>
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
      >
        {detailsLoading ? (
          <div className="py-16 text-center space-y-2">
            <Spinner size="md" variant="brand" />
            <p className="text-xs text-slate-500 font-medium">Fetching project details...</p>
          </div>
        ) : selectedProject ? (
          <div className="space-y-4">
            {/* Modal Tabs Header */}
            <div className="flex border-b border-slate-200 text-xs font-semibold">
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
                Milestones ({selectedProject.milestones?.length || 0})
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