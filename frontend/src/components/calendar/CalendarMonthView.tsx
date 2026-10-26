import React from "react";
import { Lock, Flag, CheckCircle2, AlertCircle } from "lucide-react";
import { CalendarEvent } from "../../api/calendar";

interface CalendarMonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectDay: (date: Date) => void;
}

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  currentDate,
  events,
  onSelectEvent,
  onSelectDay,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of month
  const firstDay = new Date(year, month, 1);
  // Sunday = 0, Monday = 1 ... convert Monday to 0
  const startingDayIndex = (firstDay.getDay() + 6) % 7;

  // Days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Days in previous month
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: Array<{
    date: Date;
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    dayEvents: CalendarEvent[];
  }> = [];

  const today = new Date();
  const isTodayDate = (d: Date) =>
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  // 1. Previous month padding days
  for (let i = startingDayIndex - 1; i >= 0; i--) {
    const dayNumber = daysInPrevMonth - i;
    const date = new Date(year, month - 1, dayNumber);
    days.push({
      date,
      dayNumber,
      isCurrentMonth: false,
      isToday: isTodayDate(date),
      dayEvents: [],
    });
  }

  // 2. Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    days.push({
      date,
      dayNumber: i,
      isCurrentMonth: true,
      isToday: isTodayDate(date),
      dayEvents: [],
    });
  }

  // 3. Next month padding days to complete grid (multiples of 7)
  const remainingDays = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(year, month + 1, i);
    days.push({
      date,
      dayNumber: i,
      isCurrentMonth: false,
      isToday: isTodayDate(date),
      dayEvents: [],
    });
  }

  // Populate events for each day
  days.forEach((d) => {
    const dayStart = new Date(d.date.getFullYear(), d.date.getMonth(), d.date.getDate()).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;

    d.dayEvents = events.filter((e) => {
      const eTime = new Date(e.date).getTime();
      return eTime >= dayStart && eTime <= dayEnd;
    });
  });

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-slate-200/80 bg-slate-50/80 text-center py-2.5 text-[11px] font-black uppercase tracking-wider text-slate-500">
        {weekDays.map((wd) => (
          <div key={wd}>{wd}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 bg-slate-100/50">
        {days.map((day, idx) => {
          const maxVisibleEvents = 3;
          const visibleEvents = day.dayEvents.slice(0, maxVisibleEvents);
          const hiddenCount = day.dayEvents.length - maxVisibleEvents;

          return (
            <div
              key={idx}
              className={`min-h-[110px] sm:min-h-[125px] p-1.5 sm:p-2 bg-white flex flex-col justify-between transition-colors ${
                !day.isCurrentMonth ? "bg-slate-50/50 text-slate-400" : "text-slate-800"
              } ${day.isToday ? "ring-2 ring-inset ring-[#690BA8]/60 bg-purple-50/20" : ""}`}
            >
              {/* Day header */}
              <div className="flex items-center justify-between mb-1">
                <button
                  type="button"
                  onClick={() => onSelectDay(day.date)}
                  className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors ${
                    day.isToday
                      ? "bg-[#690BA8] text-white hover:bg-[#520984]"
                      : !day.isCurrentMonth
                      ? "text-slate-400"
                      : "text-slate-700"
                  }`}
                >
                  {day.dayNumber}
                </button>
                {day.dayEvents.length > 0 && (
                  <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.2">
                    {day.dayEvents.length}
                  </span>
                )}
              </div>

              {/* Day events list */}
              <div className="space-y-1 flex-1 overflow-hidden">
                {visibleEvents.map((ev) => {
                  const isTask = ev.type === "TASK";
                  const isCompleted = ev.status === "COMPLETED" || ev.status === "REACHED";

                  let chipStyle = "bg-purple-50 text-[#690BA8] border-purple-200/80 hover:bg-purple-100";
                  if (ev.isOverdue) {
                    chipStyle = "bg-red-50 text-red-700 border-red-200 hover:bg-red-100";
                  } else if (ev.isApproaching) {
                    chipStyle = "bg-pink-50 text-[#E81778] border-pink-200 hover:bg-pink-100";
                  } else if (ev.isBlocked) {
                    chipStyle = "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100";
                  } else if (isCompleted) {
                    chipStyle = "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
                  }

                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onSelectEvent(ev)}
                      title={`${ev.projectName}: ${ev.title} (${ev.status})${
                        ev.isBlocked ? " - BLOCKED" : ""
                      }`}
                      className={`w-full text-left rounded-md px-1.5 py-0.5 text-[10px] font-bold border truncate flex items-center gap-1 transition-all ${chipStyle}`}
                    >
                      {ev.isBlocked ? (
                        <Lock className="w-2.5 h-2.5 shrink-0 text-amber-600" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="w-2.5 h-2.5 shrink-0 text-emerald-600" />
                      ) : isTask ? (
                        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-current" />
                      ) : (
                        <Flag className="w-2.5 h-2.5 shrink-0 text-[#690BA8]" />
                      )}
                      <span className="truncate">
                        <span className="opacity-75 font-semibold">[{ev.projectKey}]</span> {ev.title}
                      </span>
                    </button>
                  );
                })}

                {hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onSelectDay(day.date)}
                    className="w-full text-center text-[10px] font-black text-[#690BA8] hover:underline py-0.5"
                  >
                    +{hiddenCount} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
