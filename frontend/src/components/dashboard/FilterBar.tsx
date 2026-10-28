import React from "react";
import { Filter, Calendar, Building2, FolderKanban, User, CheckCircle2, RotateCcw } from "lucide-react";
import { DashboardFilters, FilterOptions } from "../../api/dashboard";

interface FilterBarProps {
  filters: DashboardFilters;
  onChange: (newFilters: DashboardFilters) => void;
  options?: FilterOptions;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, onChange, options }) => {
  const isFiltered =
    (filters.dateRange && filters.dateRange !== "all") ||
    (filters.departmentId && filters.departmentId !== "all") ||
    (filters.projectId && filters.projectId !== "all") ||
    (filters.assigneeId && filters.assigneeId !== "all") ||
    (filters.status && filters.status !== "all");

  const handleReset = () => {
    onChange({
      dateRange: "all",
      departmentId: "all",
      projectId: "all",
      assigneeId: "all",
      status: "all",
    });
  };

  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-violet-100/80">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#76528C]">
          <Filter className="h-3.5 w-3.5 text-[#7B20B2]" />
          <span>Dashboard Filters</span>
          {isFiltered && (
            <span className="rounded-full bg-[#F5EFFB] px-2 py-0.5 text-[10px] font-bold text-[#690BA8] border border-[#690BA8]/20">
              Active Filters
            </span>
          )}
        </div>

        {isFiltered && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Date Range Filter */}
        <div className="space-y-1">
          <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <Calendar className="h-3 w-3 text-slate-400" />
            <span>Date Range</span>
          </label>
          <select
            value={filters.dateRange || "all"}
            onChange={(e) => onChange({ ...filters, dateRange: e.target.value })}
            className="w-full rounded-xl border border-violet-100 bg-[#FCFAFE] px-3 py-2.5 text-xs font-medium text-slate-700 transition-colors focus:border-[#9B4DCA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#9B4DCA]/10"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="this_quarter">This Quarter</option>
          </select>
        </div>

        {/* Department Filter */}
        <div className="space-y-1">
          <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <Building2 className="h-3 w-3 text-slate-400" />
            <span>Department</span>
          </label>
          <select
            value={filters.departmentId || "all"}
            onChange={(e) => onChange({ ...filters, departmentId: e.target.value })}
            className="w-full rounded-xl border border-violet-100 bg-[#FCFAFE] px-3 py-2.5 text-xs font-medium text-slate-700 transition-colors focus:border-[#9B4DCA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#9B4DCA]/10"
          >
            <option value="all">All Departments</option>
            {options?.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Project Filter */}
        <div className="space-y-1">
          <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <FolderKanban className="h-3 w-3 text-slate-400" />
            <span>Project</span>
          </label>
          <select
            value={filters.projectId || "all"}
            onChange={(e) => onChange({ ...filters, projectId: e.target.value })}
            className="w-full rounded-xl border border-violet-100 bg-[#FCFAFE] px-3 py-2.5 text-xs font-medium text-slate-700 transition-colors focus:border-[#9B4DCA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#9B4DCA]/10"
          >
            <option value="all">All Projects</option>
            {options?.projects.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.key}] {p.title}
              </option>
            ))}
          </select>
        </div>

        {/* Task Owner / Assignee Filter */}
        <div className="space-y-1">
          <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <User className="h-3 w-3 text-slate-400" />
            <span>Task Owner</span>
          </label>
          <select
            value={filters.assigneeId || "all"}
            onChange={(e) => onChange({ ...filters, assigneeId: e.target.value })}
            className="w-full rounded-xl border border-violet-100 bg-[#FCFAFE] px-3 py-2.5 text-xs font-medium text-slate-700 transition-colors focus:border-[#9B4DCA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#9B4DCA]/10"
          >
            <option value="all">All Owners</option>
            {options?.employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="space-y-1">
          <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <CheckCircle2 className="h-3 w-3 text-slate-400" />
            <span>Status</span>
          </label>
          <select
            value={filters.status || "all"}
            onChange={(e) => onChange({ ...filters, status: e.target.value })}
            className="w-full rounded-xl border border-violet-100 bg-[#FCFAFE] px-3 py-2.5 text-xs font-medium text-slate-700 transition-colors focus:border-[#9B4DCA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#9B4DCA]/10"
          >
            <option value="all">All Statuses</option>
            {options?.statuses.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
