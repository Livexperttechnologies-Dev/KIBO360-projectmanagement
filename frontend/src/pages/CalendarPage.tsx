import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
  Clock,
  AlertCircle,
  Lock,
  Flag,
  CheckCircle2,
  CalendarDays,
  CalendarRange,
  Sun,
  Globe,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { calendarApi, CalendarEvent, CalendarSummary, DeadlineClassification } from "../api/calendar";
import { fetchProjects, ProjectItem } from "../api/project";
import { fetchUsers, UserSummary } from "../api/user";
import { CalendarMonthView } from "../components/calendar/CalendarMonthView";
import { CalendarWeekView } from "../components/calendar/CalendarWeekView";
import { CalendarDayView } from "../components/calendar/CalendarDayView";
import { MilestoneDetailModal } from "../components/calendar/MilestoneDetailModal";
import { TaskDetailModal } from "../components/tasks/TaskDetailModal";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

type CalendarViewMode = "month" | "week" | "day";

export const CalendarPage: React.FC = () => {
  const { token, user } = useAuth();

  // Navigation & View State
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Filter State
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<"ALL" | "TASK" | "MILESTONE">("ALL");
  const [selectedUrgency, setSelectedUrgency] = useState<"ALL" | DeadlineClassification>("ALL");

  // Options for Dropdowns
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserSummary[]>([]);

  // Data State
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [summary, setSummary] = useState<CalendarSummary>({
    totalEvents: 0,
    totalTasks: 0,
    totalMilestones: 0,
    overdueTasks: 0,
    approachingTasks: 0,
    upcomingTasks: 0,
    completedTasks: 0,
    blockedTasks: 0,
    timezone: "Asia/Kolkata",
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Modal State
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedMilestoneEvent, setSelectedMilestoneEvent] = useState<CalendarEvent | null>(null);

  // Load dropdown options
  useEffect(() => {
    if (!token) return;

    fetchProjects({}, token)
      .then((data) => setProjects(data))
      .catch((err) => console.error("Error loading projects:", err));

    fetchUsers({}, token)
      .then((data) => setTeamMembers(data))
      .catch((err) => console.error("Error loading team members:", err));
  }, [token]);

  // Compute start and end date for current view window
  const dateWindow = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === "month") {
      // Pad to cover full visible grid
      const start = new Date(year, month - 1, 20).toISOString();
      const end = new Date(year, month + 1, 15).toISOString();
      return { start, end };
    }

    if (viewMode === "week") {
      const curr = new Date(currentDate);
      const dayIndex = (curr.getDay() + 6) % 7;
      const monday = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() - dayIndex);
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7);
      return { start: monday.toISOString(), end: sunday.toISOString() };
    }

    // day view
    const start = new Date(year, month, currentDate.getDate(), 0, 0, 0).toISOString();
    const end = new Date(year, month, currentDate.getDate(), 23, 59, 59, 999).toISOString();
    return { start, end };
  }, [viewMode, currentDate]);

  // Load Calendar Events
  const loadCalendarEvents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const data = await calendarApi.getEvents(
        {
          startDate: dateWindow.start,
          endDate: dateWindow.end,
          projectId: selectedProject,
          userId: selectedUser,
          departmentId: selectedDepartment,
          status: selectedStatus,
          type: selectedType,
          deadlineStatus: selectedUrgency,
        },
        token
      );
      setEvents(data.events);
      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message || "Failed to load calendar events");
    } finally {
      setLoading(false);
    }
  }, [
    token,
    dateWindow,
    selectedProject,
    selectedUser,
    selectedDepartment,
    selectedStatus,
    selectedType,
    selectedUrgency,
  ]);

  useEffect(() => {
    loadCalendarEvents();
  }, [loadCalendarEvents]);

  // Navigation handlers
  const handlePrevious = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === "month") {
        d.setMonth(d.getMonth() - 1);
      } else if (viewMode === "week") {
        d.setDate(d.getDate() - 7);
      } else {
        d.setDate(d.getDate() - 1);
      }
      return d;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === "month") {
        d.setMonth(d.getMonth() + 1);
      } else if (viewMode === "week") {
        d.setDate(d.getDate() + 7);
      } else {
        d.setDate(d.getDate() + 1);
      }
      return d;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleSelectDay = (date: Date) => {
    setCurrentDate(date);
    setViewMode("day");
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    if (event.type === "TASK") {
      setSelectedTaskId(event.entityId);
    } else {
      setSelectedMilestoneEvent(event);
    }
  };

  const handleResetFilters = () => {
    setSelectedProject("all");
    setSelectedUser("all");
    setSelectedDepartment("all");
    setSelectedStatus("all");
    setSelectedType("ALL");
    setSelectedUrgency("ALL");
  };

  // Formatted Title
  const periodTitle = useMemo(() => {
    if (viewMode === "month") {
      return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    if (viewMode === "week") {
      const curr = new Date(currentDate);
      const dayIndex = (curr.getDay() + 6) % 7;
      const monday = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() - dayIndex);
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
      return `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${sunday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return currentDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  }, [viewMode, currentDate]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Calendar & Deadlines</h2>
            <div className="flex items-center gap-1 bg-purple-50 text-[#690BA8] border border-purple-200/80 rounded-lg px-2.5 py-0.5 text-[11px] font-bold">
              <Globe className="w-3.5 h-3.5" />
              <span>{summary.timezone} (IST)</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Timezone-aware deliverable schedules, milestone target dates, and blocked work visibility for Livexpert teams.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setViewMode("month")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === "month"
                ? "bg-white text-[#690BA8] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Month</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("week")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === "week"
                ? "bg-white text-[#690BA8] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Week</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("day")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === "day"
                ? "bg-white text-[#690BA8] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Day</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total Events */}
        <div
          onClick={() => setSelectedUrgency("ALL")}
          className={`p-3.5 rounded-2xl border bg-white shadow-sm cursor-pointer transition-all hover:border-purple-300 ${
            selectedUrgency === "ALL" ? "ring-2 ring-[#690BA8] border-transparent" : "border-slate-200/90"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Events</span>
            <CalendarIcon className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">{summary.totalEvents}</p>
          <p className="text-[10px] text-slate-400 font-medium">Tasks & Milestones</p>
        </div>

        {/* Overdue Tasks */}
        <div
          onClick={() => setSelectedUrgency((prev) => (prev === "OVERDUE" ? "ALL" : "OVERDUE"))}
          className={`p-3.5 rounded-2xl border bg-white shadow-sm cursor-pointer transition-all hover:border-red-300 ${
            selectedUrgency === "OVERDUE" ? "ring-2 ring-red-500 border-transparent bg-red-50/20" : "border-slate-200/90"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Overdue</span>
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-black text-red-600 mt-1">{summary.overdueTasks}</p>
          <p className="text-[10px] text-slate-400 font-medium">Past due & incomplete</p>
        </div>

        {/* Approaching Deadlines */}
        <div
          onClick={() => setSelectedUrgency((prev) => (prev === "APPROACHING" ? "ALL" : "APPROACHING"))}
          className={`p-3.5 rounded-2xl border bg-white shadow-sm cursor-pointer transition-all hover:border-pink-300 ${
            selectedUrgency === "APPROACHING" ? "ring-2 ring-[#E81778] border-transparent bg-pink-50/20" : "border-slate-200/90"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#E81778] uppercase tracking-wider">Approaching</span>
            <Clock className="w-4 h-4 text-[#E81778]" />
          </div>
          <p className="text-2xl font-black text-[#E81778] mt-1">{summary.approachingTasks}</p>
          <p className="text-[10px] text-slate-400 font-medium">Due in &le;1 business day</p>
        </div>

        {/* Upcoming 7 Days */}
        <div
          onClick={() => setSelectedUrgency((prev) => (prev === "UPCOMING" ? "ALL" : "UPCOMING"))}
          className={`p-3.5 rounded-2xl border bg-white shadow-sm cursor-pointer transition-all hover:border-purple-300 ${
            selectedUrgency === "UPCOMING" ? "ring-2 ring-[#690BA8] border-transparent bg-purple-50/20" : "border-slate-200/90"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#690BA8] uppercase tracking-wider">Upcoming</span>
            <Flag className="w-4 h-4 text-[#690BA8]" />
          </div>
          <p className="text-2xl font-black text-[#690BA8] mt-1">{summary.upcomingTasks}</p>
          <p className="text-[10px] text-slate-400 font-medium">Due within 7 days</p>
        </div>

        {/* Blocked Work */}
        <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Blocked Work</span>
            <Lock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-1">{summary.blockedTasks}</p>
          <p className="text-[10px] text-slate-400 font-medium">Incomplete dependencies</p>
        </div>
      </div>

      {/* Navigation & Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Date Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevious}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              title="Previous period"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
              title="Next period"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-base font-black text-slate-900 tracking-tight">{periodTitle}</h3>
        </div>

        {/* Type Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Show:</span>
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => setSelectedType("ALL")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedType === "ALL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSelectedType("TASK")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedType === "TASK" ? "bg-white text-[#690BA8] shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Tasks
            </button>
            <button
              type="button"
              onClick={() => setSelectedType("MILESTONE")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                selectedType === "MILESTONE" ? "bg-white text-[#E81778] shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Milestones
            </button>
          </div>
        </div>
      </div>

      {/* Multi-filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        {/* Project Selector */}
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#690BA8]"
        >
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.key}] {p.title}
            </option>
          ))}
        </select>

        {/* Team Member / Assignee Selector */}
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#690BA8]"
        >
          <option value="all">All Team Members</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name || m.email}
            </option>
          ))}
        </select>

        {/* Department Selector (Managers / Admins) */}
        {(user?.role === "ADMINISTRATOR" || user?.role === "PROJECT_MANAGER") && (
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#690BA8]"
          >
            <option value="all">All Departments</option>
            <option value="dept-sw">Software / IT</option>
            <option value="dept-pd">Product / Design</option>
          </select>
        )}

        {/* Status Selector */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#690BA8]"
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

        {/* Urgency Filter */}
        <select
          value={selectedUrgency}
          onChange={(e) => setSelectedUrgency(e.target.value as any)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#690BA8]"
        >
          <option value="ALL">All Deadlines</option>
          <option value="OVERDUE">Overdue Only</option>
          <option value="APPROACHING">Approaching (&le;1 Day)</option>
          <option value="UPCOMING">Upcoming (&le;7 Days)</option>
          <option value="COMPLETED">Completed</option>
        </select>

        <button
          type="button"
          onClick={handleResetFilters}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition-colors ml-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Main Calendar View Body */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center space-y-3 shadow-sm">
          <div className="w-8 h-8 border-3 border-[#690BA8] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Loading calendar deliverables...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 p-6 rounded-2xl text-center space-y-2">
          <AlertCircle className="w-6 h-6 text-red-600 mx-auto" />
          <p className="text-xs font-bold text-red-700">{error}</p>
          <Button variant="outline" size="sm" onClick={loadCalendarEvents}>
            Retry
          </Button>
        </div>
      ) : viewMode === "month" ? (
        <CalendarMonthView
          currentDate={currentDate}
          events={events}
          onSelectEvent={handleSelectEvent}
          onSelectDay={handleSelectDay}
        />
      ) : viewMode === "week" ? (
        <CalendarWeekView
          currentDate={currentDate}
          events={events}
          onSelectEvent={handleSelectEvent}
          onSelectDay={handleSelectDay}
        />
      ) : (
        <CalendarDayView
          currentDate={currentDate}
          events={events}
          onSelectEvent={handleSelectEvent}
        />
      )}

      {/* Task Details Modal */}
      <TaskDetailModal
        taskId={selectedTaskId}
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onTaskUpdated={loadCalendarEvents}
      />

      {/* Milestone Details Modal */}
      <MilestoneDetailModal
        event={selectedMilestoneEvent}
        isOpen={!!selectedMilestoneEvent}
        onClose={() => setSelectedMilestoneEvent(null)}
        onUpdated={loadCalendarEvents}
      />
    </div>
  );
};