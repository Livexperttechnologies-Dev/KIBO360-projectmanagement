import React, { useState, useEffect } from "react";
import {
  CheckSquare,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldAlert,
  Search,
  Filter,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { useAuth } from "../contexts/AuthContext";
import { fetchTasks, updateTask, TaskItem } from "../api/task";
import { CreateTaskModal } from "../components/tasks/CreateTaskModal";
import { TaskDetailModal } from "../components/tasks/TaskDetailModal";

export const MyTasksPage: React.FC = () => {
  const { user, token } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"all" | "active" | "completed">("active");
  const [search, setSearch] = useState("");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadMyTasks();
    }
  }, [user, token]);

  const loadMyTasks = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTasks({ assigneeId: user.id, limit: 100 }, token);
      setTasks(res.tasks);
    } catch (err: any) {
      setError(err.message || "Failed to load assigned tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (e: React.MouseEvent, task: TaskItem) => {
    e.stopPropagation();
    const nextStatus = task.status === "COMPLETED" ? "IN_PROGRESS" : "COMPLETED";
    try {
      await updateTask(task.id, { status: nextStatus }, token);
      loadMyTasks();
    } catch (err: any) {
      alert(err.message || "Failed to update task status");
    }
  };

  const handleOpenTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsDetailModalOpen(true);
  };

  // Filter tasks based on search & tab
  const filteredTasks = tasks.filter((t) => {
    if (activeTab === "active" && t.status === "COMPLETED") return false;
    if (activeTab === "completed" && t.status !== "COMPLETED") return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.project && t.project.title.toLowerCase().includes(q))
      );
    }
    return true;
  });

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">My Assigned Tasks</h2>
          <p className="text-xs text-slate-500 mt-1">
            Personal deliverables, sprint priorities, and deadlines assigned to you across Livexpert squads.
          </p>
        </div>

        <Button
          variant="gradient"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Add Task
        </Button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "active"
                ? "bg-white text-[#690BA8] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Active ({tasks.filter((t) => t.status !== "COMPLETED").length})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "completed"
                ? "bg-white text-[#690BA8] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Completed ({tasks.filter((t) => t.status === "COMPLETED").length})
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "all"
                ? "bg-white text-[#690BA8] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({tasks.length})
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deliverables..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-[#690BA8]"
          />
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Tasks List Card */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading your deliverables...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No tasks found under the "{activeTab}" view.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleOpenTask(task.id)}
                  className="flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={task.status === "COMPLETED"}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleToggleComplete(e as any, task)}
                      className="h-4 w-4 rounded border-slate-300 text-[#690BA8] focus:ring-[#690BA8]/20 cursor-pointer shrink-0"
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-sm font-bold truncate group-hover:text-[#690BA8] transition-colors ${
                            task.status === "COMPLETED" ? "text-slate-400 line-through" : "text-slate-900"
                          }`}
                        >
                          {task.title}
                        </h4>
                        {task.isBlocked && (
                          <Badge variant="coral" size="sm">
                            Blocked
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                        <span className="font-semibold text-slate-500">{task.id}</span>
                        <span>•</span>
                        <span className="font-semibold text-[#690BA8]">
                          {task.project ? `[${task.project.key}] ${task.project.title}` : "General"}
                        </span>
                        {task.taskList && (
                          <>
                            <span>•</span>
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded text-[10px]">
                              {task.taskList}
                            </span>
                          </>
                        )}
                        {task.subtasksCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-[11px] text-slate-500">
                              <CheckSquare className="h-3 w-3" />
                              {task.completedSubtasksCount}/{task.subtasksCount} subtasks
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <Badge variant={getPriorityBadgeVariant(task.priority)} size="sm">
                      {task.priority}
                    </Badge>

                    <Badge variant="neutral" size="sm">
                      {task.status.replace("_", " ")}
                    </Badge>

                    {task.dueDate && (
                      <span className="text-xs font-semibold text-slate-500 hidden sm:flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}

                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => loadMyTasks()}
      />

      {/* Task Details Modal */}
      <TaskDetailModal
        taskId={selectedTaskId}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTaskId(null);
        }}
        onTaskUpdated={() => loadMyTasks()}
      />
    </div>
  );
};