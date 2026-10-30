import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Kanban,
  List,
  Plus,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  GitBranch,
  CheckSquare,
  ChevronRight,
  X,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { useAuth } from "../contexts/AuthContext";
import { fetchTasks, updateTask, TaskItem, TaskFilters } from "../api/task";
import { fetchProjects, ProjectItem } from "../api/project";
import { fetchUsers } from "../api/user";
import { CreateTaskModal } from "../components/tasks/CreateTaskModal";
import { TaskDetailModal } from "../components/tasks/TaskDetailModal";

const KANBAN_COLUMNS = [
  { key: "OPEN", label: "Open", color: "border-slate-300", bg: "bg-slate-50" },
  { key: "ASSIGNED", label: "Assigned", color: "border-blue-300", bg: "bg-blue-50/30" },
  { key: "IN_PROGRESS", label: "In Progress", color: "border-[#690BA8]", bg: "bg-purple-50/30" },
  { key: "UNDER_REVIEW", label: "Under Review", color: "border-[#E81778]", bg: "bg-pink-50/30" },
  { key: "CHANGES_REQUIRED", label: "Changes Required", color: "border-orange-300", bg: "bg-orange-50/30" },
  { key: "COMPLETED", label: "Completed", color: "border-emerald-300", bg: "bg-emerald-50/30" },
  { key: "BLOCKED", label: "Blocked", color: "border-red-400", bg: "bg-red-50/40" },
];

export const TeamTasksPage: React.FC = () => {
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter options
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Filter values
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedAssignee, setSelectedAssignee] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    loadFiltersData();
  }, [token]);

  useEffect(() => {
    loadTasks();
  }, [
    token,
    search,
    selectedProject,
    selectedAssignee,
    selectedPriority,
    selectedStatus,
    page,
  ]);

  useEffect(() => {
    const taskId = searchParams.get("taskId");
    if (!taskId) return;
    setSelectedTaskId(taskId);
    setIsDetailModalOpen(true);
  }, [searchParams]);

  const loadFiltersData = async () => {
    try {
      const [projList, userList] = await Promise.all([
        fetchProjects({}, token),
        fetchUsers({}, token),
      ]);
      setProjects(projList);
      setUsers(userList);
    } catch (err) {
      console.error(err);
    }
  };

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: TaskFilters = {
        page,
        limit: viewMode === "kanban" ? 100 : 20,
        isSubtask: "false", // Top-level view shows parent tasks by default
      };

      if (search.trim()) filters.search = search.trim();
      if (selectedProject !== "all") filters.projectId = selectedProject;
      if (selectedAssignee !== "all") filters.assigneeId = selectedAssignee;
      if (selectedPriority !== "all") filters.priority = selectedPriority;
      if (selectedStatus !== "all") filters.status = selectedStatus;

      const res = await fetchTasks(filters, token);
      setTasks(res.tasks);
      setTotalCount(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err: any) {
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsDetailModalOpen(true);
  };

  const handleQuickAdvance = async (e: React.MouseEvent, task: TaskItem) => {
    e.stopPropagation();
    let nextStatus: any = "IN_PROGRESS";
    if (task.status === "OPEN" || task.status === "TODO" || task.status === "BACKLOG") {
      nextStatus = "IN_PROGRESS";
    } else if (task.status === "ASSIGNED") {
      nextStatus = "IN_PROGRESS";
    } else if (task.status === "IN_PROGRESS") {
      nextStatus = "UNDER_REVIEW";
    } else if (task.status === "UNDER_REVIEW" || task.status === "IN_REVIEW") {
      nextStatus = "COMPLETED";
    } else if (task.status === "CHANGES_REQUIRED") {
      nextStatus = "IN_PROGRESS";
    } else if (task.status === "BLOCKED") {
      nextStatus = "IN_PROGRESS";
    }

    try {
      await updateTask(task.id, { status: nextStatus }, token);
      loadTasks();
    } catch (err: any) {
      alert(err.message || "Cannot advance status");
    }
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedProject("all");
    setSelectedAssignee("all");
    setSelectedPriority("all");
    setSelectedStatus("all");
    setPage(1);
  };

  const mapToColumnKey = (status: string) => {
    if (status === "TODO" || status === "BACKLOG") return "OPEN";
    if (status === "IN_REVIEW") return "UNDER_REVIEW";
    return status;
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Team Task Board</h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time Kanban workflow, sprint management, dependency tracking, and cross-team execution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "kanban"
                  ? "bg-white text-[#690BA8] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "list"
                  ? "bg-white text-[#690BA8] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
          </div>

          <Button
            variant="gradient"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create Task
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks by title, list, or description..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-[#690BA8] focus:ring-1 focus:ring-[#690BA8]"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Project Filter */}
              <select
                value={selectedProject}
                onChange={(e) => {
                  setSelectedProject(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#690BA8]"
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.key}] {p.title}
                  </option>
                ))}
              </select>

              {/* Assignee Filter */}
              <select
                value={selectedAssignee}
                onChange={(e) => {
                  setSelectedAssignee(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#690BA8]"
              >
                <option value="all">All Assignees</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>

              {/* Priority Filter */}
              <select
                value={selectedPriority}
                onChange={(e) => {
                  setSelectedPriority(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#690BA8]"
              >
                <option value="all">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:border-[#690BA8]"
              >
                <option value="all">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="CHANGES_REQUIRED">Changes Required</option>
                <option value="COMPLETED">Completed</option>
                <option value="BLOCKED">Blocked</option>
              </select>

              {(search ||
                selectedProject !== "all" ||
                selectedAssignee !== "all" ||
                selectedPriority !== "all" ||
                selectedStatus !== "all") && (
                <button
                  onClick={resetFilters}
                  className="px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary strip */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing <span className="font-bold text-slate-800">{tasks.length}</span> of{" "}
          <span className="font-bold text-slate-800">{totalCount}</span> tasks
        </span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-slate-600">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Active: {tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED").length}
          </span>
          <span className="flex items-center gap-1 text-slate-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Completed: {tasks.filter((t) => t.status === "COMPLETED").length}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* KANBAN VIEW */}
      {viewMode === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 items-start">
          {KANBAN_COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => mapToColumnKey(t.status) === col.key);

            return (
              <div
                key={col.key}
                className={`rounded-2xl border ${col.color} ${col.bg} p-3 flex flex-col min-h-[500px]`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200/60">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    {col.label}
                  </span>
                  <Badge variant="neutral" size="sm">
                    {colTasks.length}
                  </Badge>
                </div>

                {/* Column Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="py-8 text-center text-[11px] text-slate-400">No tasks</div>
                  ) : (
                    colTasks.map((task) => (
                      <Card
                        key={task.id}
                        onClick={() => handleOpenTask(task.id)}
                        className="p-3.5 bg-white hover:border-[#690BA8] hover:shadow-md transition-all cursor-pointer group"
                      >
                        {/* Card Top Meta */}
                        <div className="flex items-center justify-between text-[10px] mb-1.5">
                          <span className="font-bold text-[#690BA8] bg-[#690BA8]/10 px-1.5 py-0.5 rounded">
                            {task.project?.key || "PRJ"}
                          </span>
                          <Badge variant={getPriorityBadgeVariant(task.priority)} size="sm">
                            {task.priority}
                          </Badge>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#690BA8] transition-colors line-clamp-2 leading-snug">
                          {task.title}
                        </h4>

                        {/* Badges / indicators */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                          {task.subtasksCount > 0 && (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <CheckSquare className="h-3 w-3 text-slate-400" />
                              {task.completedSubtasksCount}/{task.subtasksCount}
                            </span>
                          )}

                          {task.isBlocked && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <ShieldAlert className="h-3 w-3 text-amber-600" />
                              Blocked
                            </span>
                          )}

                          {task.taskList && (
                            <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                              {task.taskList}
                            </span>
                          )}
                        </div>

                        {/* Progress Bar */}
                        {task.completionPercentage > 0 && (
                          <div className="w-full bg-slate-100 rounded-full h-1 mt-2.5 overflow-hidden">
                            <div
                              className="bg-[#7200A5] h-1 rounded-full"
                              style={{ width: `${task.completionPercentage}%` }}
                            />
                          </div>
                        )}

                        {/* Card Footer */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <div className="flex items-center gap-1.5 truncate">
                            <div className="h-5 w-5 rounded-full bg-[#690BA8]/10 text-[#690BA8] flex items-center justify-center font-bold text-[10px] shrink-0">
                              {task.assignee ? task.assignee.name.charAt(0) : "?"}
                            </div>
                            <span className="truncate text-slate-600 font-medium">
                              {task.assignee ? task.assignee.name.split(" ")[0] : "Unassigned"}
                            </span>
                          </div>

                          {col.key !== "COMPLETED" && (
                            <button
                              onClick={(e) => handleQuickAdvance(e, task)}
                              className="p-1 rounded text-slate-400 hover:text-[#690BA8] hover:bg-slate-100 transition-colors"
                              title="Advance Status"
                            >
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Task</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Assignee</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Progress</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No tasks match the active filters.
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => (
                      <tr
                        key={task.id}
                        onClick={() => handleOpenTask(task.id)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-[#690BA8]">
                          <div className="flex items-center gap-2">
                            <span>{task.title}</span>
                            {task.isBlocked && (
                              <Badge variant="coral" size="sm">
                                Blocked
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-700">
                            {task.project ? task.project.title : "—"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-slate-600">
                            {task.assignee ? task.assignee.name : "Unassigned"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant={getPriorityBadgeVariant(task.priority)} size="sm">
                            {task.priority}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="neutral" size="sm">
                            {task.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-[#7200A5] h-1.5 rounded-full"
                                style={{ width: `${task.completionPercentage}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-slate-500 font-semibold">
                              {task.completionPercentage}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button size="sm" variant="outline" onClick={() => handleOpenTask(task.id)}>
                            View
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-100 text-xs">
                <span className="text-slate-500">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => loadTasks()}
      />

      {/* Task Details Modal */}
      <TaskDetailModal
        taskId={selectedTaskId}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTaskId(null);
          if (searchParams.has("taskId")) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete("taskId");
            setSearchParams(nextParams, { replace: true });
          }
        }}
        onTaskUpdated={() => loadTasks()}
      />
    </div>
  );
};
