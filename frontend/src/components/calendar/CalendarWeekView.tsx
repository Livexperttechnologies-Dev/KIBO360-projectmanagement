import React from "react";
import { Lock, Flag, CheckCircle2, AlertTriangle, User as UserIcon } from "lucide-react";
import { CalendarEvent } from "../../api/calendar";
import { Badge } from "../ui/Badge";

interface CalendarWeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectDay: (date: Date) => void;
}

export const CalendarWeekView: React.FC<CalendarWeekViewProps> = ({
  currentDate,
  events,
  onSelectEvent,
  onSelectDay,
}) => {
  // Find Monday of the current week
  const curr = new Date(currentDate);
  const dayIndex = (curr.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate() - dayIndex);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;

    const dayEvents = events.filter((e) => {
      const eTime = new Date(e.date).getTime();
      return eTime >= dayStart && eTime <= dayEnd;
    });

    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();

    return {
      date: d,
      isToday,
      dayEvents,
    };
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
      {weekDays.map(({ date, isToday, dayEvents }, idx) => {
        return (
          <div
            key={idx}
            className={`flex flex-col bg-white rounded-2xl border transition-all ${
              isToday
                ? "border-[#690BA8] ring-2 ring-[#690BA8]/10 shadow-sm"
                : "border-slate-200/90 shadow-sm"
            }`}
          >
            {/* Day Header */}
            <div
              className={`p-3 border-b flex items-center justify-between rounded-t-2xl transition-colors cursor-pointer hover:bg-slate-50/80 ${
                isToday
                  ? "bg-purple-50/60 border-purple-100"
                  : "bg-slate-50/50 border-slate-100"
              }`}
              onClick={() => onSelectDay(date)}
            >
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                </p>
                <p
                  className={`text-base font-black tracking-tight ${
                    isToday ? "text-[#690BA8]" : "text-slate-900"
                  }`}
                >
                  {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
              {dayEvents.length > 0 && (
                <span
                  className={`text-xs font-black px-2 py-0.5 rounded-full ${
                    isToday
                      ? "bg-[#7200A5] text-white"
                      : "bg-slate-200/80 text-slate-700"
                  }`}
                >
                  {dayEvents.length}
                </span>
              )}
            </div>

            {/* Events Column */}
            <div className="p-2 space-y-2 flex-1 min-h-[350px] overflow-y-auto max-h-[600px]">
              {dayEvents.length === 0 ? (
                <div className="h-32 flex flex-col items-center justify-center text-center text-slate-400 p-2">
                  <p className="text-[11px] font-medium">No deadlines</p>
                </div>
              ) : (
                dayEvents.map((ev) => {
                  const isTask = ev.type === "TASK";
                  const isCompleted = ev.status === "COMPLETED" || ev.status === "REACHED";

                  let cardBorder = "border-slate-200/80 hover:border-purple-300";
                  let urgencyBadgeVariant: "primary" | "neutral" | "success" | "coral" | "magenta" =
                    "primary";

                  if (ev.isOverdue) {
                    cardBorder = "border-red-200 bg-red-50/20 hover:border-red-300";
                    urgencyBadgeVariant = "coral";
                  } else if (ev.isApproaching) {
                    cardBorder = "border-pink-200 bg-pink-50/20 hover:border-pink-300";
                    urgencyBadgeVariant = "magenta";
                  } else if (ev.isBlocked) {
                    cardBorder = "border-amber-200 bg-amber-50/20 hover:border-amber-300";
                  } else if (isCompleted) {
                    cardBorder = "border-emerald-200 bg-emerald-50/20 hover:border-emerald-300";
                    urgencyBadgeVariant = "success";
                  }

                  return (
                    <div
                      key={ev.id}
                      onClick={() => onSelectEvent(ev)}
                      className={`p-2.5 rounded-xl border bg-white shadow-sm hover:shadow-md transition-all cursor-pointer space-y-2 text-left ${cardBorder}`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-black text-[#690BA8] uppercase tracking-wider bg-purple-50 px-1.5 py-0.5 rounded">
                          {ev.projectKey}
                        </span>
                        <div className="flex items-center gap-1">
                          {ev.isBlocked && (
                            <span className="flex items-center gap-0.5 text-[9px] font-black text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded">
                              <Lock className="w-2.5 h-2.5" /> Blocked
                            </span>
                          )}
                          <Badge variant={urgencyBadgeVariant} size="sm">
                            {ev.isOverdue
                              ? "Overdue"
                              : ev.isApproaching
                              ? "Due Tomorrow"
                              : ev.isUpcoming
                              ? "Upcoming"
                              : ev.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Title */}
                      <div className="space-y-0.5">
                        <div className="flex items-start gap-1">
                          {isTask ? (
                            <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-[#690BA8]" />
                          ) : (
                            <Flag className="w-3 h-3 mt-0.5 shrink-0 text-[#690BA8]" />
                          )}
                          <h4 className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">
                            {ev.title}
                          </h4>
                        </div>
                      </div>

                      {/* Blocked Warning Details */}
                      {ev.isBlocked && ev.blockedReasons.length > 0 && (
                        <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[9px] text-amber-800 space-y-0.5">
                          <div className="flex items-center gap-1 font-bold">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Prerequisite Warning</span>
                          </div>
                          <p className="line-clamp-2">{ev.blockedReasons[0]}</p>
                        </div>
                      )}

                      {/* Progress bar if task */}
                      {isTask && ev.completionPercentage !== undefined && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-semibold text-slate-400">
                            <span>Progress</span>
                            <span>{ev.completionPercentage}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                            <div
                              className="bg-[#7200A5] h-1 rounded-full"
                              style={{ width: `${ev.completionPercentage}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Footer Info */}
                      <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-50">
                        {ev.assignee ? (
                          <div className="flex items-center gap-1 truncate max-w-[120px]">
                            {ev.assignee.avatarUrl ? (
                              <img
                                src={ev.assignee.avatarUrl}
                                alt={ev.assignee.name}
                                className="w-3.5 h-3.5 rounded-full object-cover"
                              />
                            ) : (
                              <UserIcon className="w-3 h-3 text-slate-400" />
                            )}
                            <span className="truncate font-semibold text-slate-600">
                              {ev.assignee.name}
                            </span>
                          </div>
                        ) : (
                          <span className="italic text-slate-400">Milestone</span>
                        )}

                        {ev.isOverdue ? (
                          <span className="font-extrabold text-red-600">
                            +{ev.daysOverdue}d
                          </span>
                        ) : ev.isApproaching ? (
                          <span className="font-extrabold text-[#E81778]">
                            &lt;24h
                          </span>
                        ) : (
                          <span>{ev.daysRemaining}d left</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
