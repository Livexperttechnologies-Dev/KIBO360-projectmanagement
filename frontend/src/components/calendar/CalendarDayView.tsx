import React from "react";
import {
  Calendar as CalendarIcon,
  Lock,
  Flag,
  CheckCircle2,
  AlertTriangle,
  User as UserIcon,
  CheckSquare,
  Clock,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { CalendarEvent } from "../../api/calendar";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface CalendarDayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
}

export const CalendarDayView: React.FC<CalendarDayViewProps> = ({
  currentDate,
  events,
  onSelectEvent,
}) => {
  const dayStart = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate()
  ).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;

  const dayEvents = events.filter((e) => {
    const eTime = new Date(e.date).getTime();
    return eTime >= dayStart && eTime <= dayEnd;
  });

  const totalTasks = dayEvents.filter((e) => e.type === "TASK").length;
  const totalMilestones = dayEvents.filter((e) => e.type === "MILESTONE").length;
  const blockedTasks = dayEvents.filter((e) => e.isBlocked).length;
  const overdueTasks = dayEvents.filter((e) => e.isOverdue).length;

  return (
    <div className="space-y-4">
      {/* Day Overview Strip */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-[#690BA8] rounded-xl shrink-0">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              {currentDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Daily agenda and deadline schedule for project deliverables.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl border border-slate-100 bg-slate-50 text-xs">
            <span className="text-slate-400 font-medium">Deliverables:</span>{" "}
            <span className="font-bold text-slate-800">{dayEvents.length}</span>
          </div>
          {overdueTasks > 0 && (
            <div className="px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 text-xs text-red-700 font-bold">
              {overdueTasks} Overdue
            </div>
          )}
          {blockedTasks > 0 && (
            <div className="px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-800 font-bold flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              {blockedTasks} Blocked
            </div>
          )}
        </div>
      </div>

      {/* Events Agenda List */}
      {dayEvents.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/90 shadow-sm text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-700">No deadlines scheduled</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No tasks or project milestones are scheduled for due delivery on this date.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayEvents.map((ev) => {
            const isTask = ev.type === "TASK";
            const isCompleted = ev.status === "COMPLETED" || ev.status === "REACHED";

            return (
              <div
                key={ev.id}
                className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-sm transition-all hover:shadow-md space-y-4 ${
                  ev.isOverdue
                    ? "border-red-200"
                    : ev.isBlocked
                    ? "border-amber-200"
                    : ev.isApproaching
                    ? "border-pink-200"
                    : "border-slate-200/90"
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[#690BA8] uppercase tracking-wider bg-purple-50 px-2.5 py-1 rounded-lg">
                      [{ev.projectKey}] {ev.projectName}
                    </span>
                    {ev.priority && (
                      <Badge
                        variant={
                          ev.priority === "URGENT"
                            ? "coral"
                            : ev.priority === "HIGH"
                            ? "coral"
                            : "neutral"
                        }
                        size="sm"
                      >
                        {ev.priority}
                      </Badge>
                    )}
                    <Badge
                      variant={
                        isCompleted
                          ? "success"
                          : ev.isOverdue
                          ? "coral"
                          : ev.isApproaching
                          ? "magenta"
                          : "primary"
                      }
                      size="sm"
                    >
                      {ev.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-600">
                      Due:{" "}
                      {new Date(ev.dueDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {ev.isOverdue ? (
                      <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                        Overdue by {ev.daysOverdue}d
                      </span>
                    ) : ev.isApproaching ? (
                      <span className="text-xs font-black text-[#E81778] bg-pink-50 px-2 py-0.5 rounded-full">
                        Due in &lt;24h
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-[#690BA8] bg-purple-50 px-2 py-0.5 rounded-full">
                        Due in {ev.daysRemaining}d
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & Description */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {isTask ? (
                      <CheckSquare className="w-4 h-4 text-[#690BA8] shrink-0" />
                    ) : (
                      <Flag className="w-4 h-4 text-[#690BA8] shrink-0" />
                    )}
                    <h4 className="text-base font-bold text-slate-900 tracking-tight">
                      {ev.title}
                    </h4>
                  </div>
                  {ev.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 pl-6">
                      {ev.description}
                    </p>
                  )}
                </div>

                {/* Blocked and Dependencies Alert Banner */}
                {ev.isBlocked && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-900">
                      <Lock className="w-4 h-4 text-amber-700" />
                      <span>Blocked Work — Incomplete Prerequisites</span>
                    </div>

                    {ev.prerequisites.length > 0 ? (
                      <div className="space-y-1.5 pl-5">
                        {ev.prerequisites.map((prereq) => (
                          <div
                            key={prereq.id}
                            className="flex items-center justify-between text-xs bg-white/80 p-2 rounded-lg border border-amber-200/60"
                          >
                            <span className="font-semibold text-slate-800">
                              {prereq.title}
                            </span>
                            <Badge
                              variant={prereq.isCompleted ? "success" : "coral"}
                              size="sm"
                            >
                              {prereq.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-800 pl-5">
                        Task status has been flagged as Blocked.
                      </p>
                    )}
                  </div>
                )}

                {/* Task Details and Subtasks Footer */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    {ev.assignee ? (
                      <div className="flex items-center gap-1.5">
                        {ev.assignee.avatarUrl ? (
                          <img
                            src={ev.assignee.avatarUrl}
                            alt={ev.assignee.name}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                        ) : (
                          <UserIcon className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="font-semibold text-slate-700">
                          {ev.assignee.name}
                        </span>
                      </div>
                    ) : (
                      <span className="italic text-slate-400">Milestone</span>
                    )}

                    {isTask && ev.subtasksCount !== undefined && ev.subtasksCount > 0 && (
                      <span className="font-medium">
                        Subtasks: {ev.completedSubtasksCount} / {ev.subtasksCount}
                      </span>
                    )}

                    {isTask && ev.completionPercentage !== undefined && (
                      <span className="font-medium">
                        Progress: {ev.completionPercentage}%
                      </span>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectEvent(ev)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
