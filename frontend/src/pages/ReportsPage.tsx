import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Download,
  PieChart,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Building2,
  Users2,
  Calendar,
  Filter,
  Layers,
  ChevronDown,
  RefreshCw,
  FolderKanban,
  Flag,
  FileSpreadsheet,
} from "lucide-react";
import {
  reportApi,
  ReportFilters,
  ManagementKPIs,
  ProjectStatusReport,
  TasksByStatusReport,
  OverdueByOwnerReport,
  UpcomingDeadlinesReport,
  MilestoneCompletionReport,
  EmployeeWorkloadReport,
  DepartmentWorkloadReport,
} from "../api/report";
import { fetchProjects, ProjectItem } from "../api/project";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";

type ReportTab = "PROJECTS" | "TASKS" | "WORKLOAD";

export const ReportsPage: React.FC = () => {
  const { token, user } = useAuth();

  // Filters State
  const [dateRange, setDateRange] = useState<ReportFilters["dateRange"]>("all");
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [projectId, setProjectId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<ReportTab>("PROJECTS");

  // Data States
  const [kpis, setKPIs] = useState<ManagementKPIs | null>(null);
  const [projectReport, setProjectReport] = useState<ProjectStatusReport | null>(null);
  const [taskReport, setTaskReport] = useState<TasksByStatusReport | null>(null);
  const [overdueReport, setOverdueReport] = useState<OverdueByOwnerReport | null>(null);
  const [upcomingReport, setUpcomingReport] = useState<UpcomingDeadlinesReport | null>(null);
  const [milestoneReport, setMilestoneReport] = useState<MilestoneCompletionReport | null>(null);
  const [employeeReport, setEmployeeReport] = useState<EmployeeWorkloadReport | null>(null);
  const [departmentReport, setDepartmentReport] = useState<DepartmentWorkloadReport | null>(null);
  const [availableProjects, setAvailableProjects] = useState<ProjectItem[]>([]);

  // UI States
  const [loading, setLoading] = useState<boolean>(true);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canExport = user?.role === "ADMINISTRATOR" || user?.role === "PROJECT_MANAGER" || user?.role === "TEAM_LEAD";

  useEffect(() => {
    if (token) {
      loadProjectsList();
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadAllReports();
    }
  }, [token, dateRange, departmentId, projectId]);

  const loadProjectsList = async () => {
    if (!token) return;
    try {
      const list = await fetchProjects({ status: "all" }, token);
      setAvailableProjects(list);
    } catch {
      // Ignore background projects load errors
    }
  };

  const loadAllReports = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      const filters: ReportFilters = {
        dateRange,
        departmentId: departmentId !== "all" ? departmentId : undefined,
        projectId: projectId !== "all" ? projectId : undefined,
      };

      const [kpisData, projData, taskData, overdueData, upcomingData, mileData, empData, deptData] =
        await Promise.all([
          reportApi.getKPIs(token, filters),
          reportApi.getProjectStatus(token, filters),
          reportApi.getTasksByStatus(token, filters),
          reportApi.getOverdueByOwner(token, filters),
          reportApi.getUpcomingDeadlines(token, filters),
          reportApi.getMilestoneCompletion(token, filters),
          reportApi.getEmployeeWorkload(token, filters),
          reportApi.getDepartmentWorkload(token, filters),
        ]);

      setKPIs(kpisData);
      setProjectReport(projData);
      setTaskReport(taskData);
      setOverdueReport(overdueData);
      setUpcomingReport(upcomingData);
      setMilestoneReport(mileData);
      setEmployeeReport(empData);
      setDepartmentReport(deptData);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load report analytics");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: "tasks" | "projects" | "kpis") => {
    if (!token) return;
    try {
      setExportLoading(type);
      setExportMenuOpen(false);
      const filters: ReportFilters = {
        dateRange,
        departmentId: departmentId !== "all" ? departmentId : undefined,
        projectId: projectId !== "all" ? projectId : undefined,
      };
      await reportApi.downloadCSV(type, token, filters);
    } catch (err: any) {
      alert(err.message || "Export failed");
    } finally {
      setExportLoading(null);
    }
  };

  const handleResetFilters = () => {
    setDateRange("all");
    setDepartmentId("all");
    setProjectId("all");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Reports & Management KPIs
            </h2>
            <Badge variant="primary" size="sm">Phase 8</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Live executive metrics, on-time completion rates, resource workload, and milestone delivery benchmarks.
          </p>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAllReports}
            disabled={loading}
            leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />}
          >
            Refresh
          </Button>

          {canExport && (
            <div className="relative">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                disabled={Boolean(exportLoading)}
                leftIcon={<FileSpreadsheet className="h-4 w-4" />}
                rightIcon={<ChevronDown className="h-3.5 w-3.5 ml-1" />}
              >
                {exportLoading ? "Exporting..." : "Export CSV"}
              </Button>

              {exportMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white shadow-xl border border-slate-100 py-1.5 z-40 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => handleExport("tasks")}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center justify-between"
                  >
                    <span>Tasks Report</span>
                    <span className="text-[10px] text-slate-400">.csv</span>
                  </button>
                  <button
                    onClick={() => handleExport("projects")}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center justify-between"
                  >
                    <span>Projects Report</span>
                    <span className="text-[10px] text-slate-400">.csv</span>
                  </button>
                  <button
                    onClick={() => handleExport("kpis")}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center justify-between"
                  >
                    <span>Executive KPIs</span>
                    <span className="text-[10px] text-slate-400">.csv</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-slate-200/90 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Date Range Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
                Period:
              </span>
              {[
                { label: "All Time", value: "all" },
                { label: "Last 7 Days", value: "last_7_days" },
                { label: "Last 30 Days", value: "last_30_days" },
                { label: "This Month", value: "this_month" },
                { label: "This Quarter", value: "this_quarter" },
              ].map((p) => (
                <button
                  key={p.value}
                  onClick={() => setDateRange(p.value as any)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
                    dateRange === p.value
                      ? "bg-[#690BA8] text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Department & Project Dropdowns */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-slate-400" />
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-[#690BA8] focus:outline-none focus:ring-2 focus:ring-[#690BA8]/10"
                >
                  <option value="all">All Departments</option>
                  <option value="dept-sw">Software / IT</option>
                  <option value="dept-pd">Product / Design</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <FolderKanban className="h-4 w-4 text-slate-400" />
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-[#690BA8] focus:outline-none focus:ring-2 focus:ring-[#690BA8]/10 max-w-[180px] truncate"
                >
                  <option value="all">All Projects</option>
                  {availableProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.key}] {p.title}
                    </option>
                  ))}
                </select>
              </div>

              {(dateRange !== "all" || departmentId !== "all" || projectId !== "all") && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs font-bold text-[#E81778] hover:underline px-2 py-1"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Management KPIs Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: On-Time Task Completion Rate */}
        <Card className="border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                On-Time Completion Rate
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-[#690BA8]">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#690BA8] mt-2">
              {kpis ? `${kpis.onTimeCompletionRate.rate}%` : "--"}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {kpis?.onTimeCompletionRate.completedOnTime || 0} / {kpis?.onTimeCompletionRate.totalCompletedWithDueDate || 0}
              </span>
              <span className="text-[11px] text-slate-400">completed on schedule</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Overdue Task Count */}
        <Card className="border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Overdue Tasks
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-[#F16A65]">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#F16A65] mt-2">
              {kpis ? kpis.overdueTaskCount : "--"}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[11px] text-slate-400">
                Incomplete deliverables past due date
              </span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Ownership Coverage */}
        <Card className="border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Ownership Coverage
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-50 text-[#E81778]">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#E81778] mt-2">
              {kpis ? `${kpis.ownershipCoverage.rate}%` : "--"}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-[#690BA8]">
                {kpis?.ownershipCoverage.openWithAssigneeAndDueDate || 0} / {kpis?.ownershipCoverage.totalOpenTasks || 0}
              </span>
              <span className="text-[11px] text-slate-400">open tasks have owner & deadline</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Milestone Completion */}
        <Card className="border-slate-200/90 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Milestone Progress
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-[#00A896]">
                <Flag className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#00A896] mt-2">
              {kpis ? `${kpis.milestoneCompletion.rate}%` : "--"}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">
                {kpis?.milestoneCompletion.reached || 0} / {kpis?.milestoneCompletion.total || 0}
              </span>
              <span className="text-[11px] text-slate-400">milestones reached</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("PROJECTS")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
            activeTab === "PROJECTS"
              ? "border-[#690BA8] text-[#690BA8] bg-[#690BA8]/5"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <FolderKanban className="h-4 w-4" />
          Project Status & Milestones
        </button>

        <button
          onClick={() => setActiveTab("TASKS")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
            activeTab === "TASKS"
              ? "border-[#690BA8] text-[#690BA8] bg-[#690BA8]/5"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Task Distribution & Deadlines
        </button>

        <button
          onClick={() => setActiveTab("WORKLOAD")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
            activeTab === "WORKLOAD"
              ? "border-[#690BA8] text-[#690BA8] bg-[#690BA8]/5"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Users2 className="h-4 w-4" />
          Team & Department Workload
        </button>
      </div>

      {/* TAB 1: Project Status & Milestones */}
      {activeTab === "PROJECTS" && (
        <div className="space-y-6">
          {/* Status Distribution Summary */}
          {projectReport && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(projectReport.statusDistribution).map(([status, count]) => (
                <div key={status} className="p-4 rounded-xl border border-slate-200/80 bg-white">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    {status.replace("_", " ")}
                  </div>
                  <div className="text-xl font-black text-slate-800 mt-1">{count}</div>
                </div>
              ))}
            </div>
          )}

          {/* Project Details Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Project Portfolio Status & Progress</CardTitle>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Average Milestone Progress: {projectReport?.averageProgress || 0}% across {projectReport?.totalProjects || 0} projects
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5">Project</th>
                      <th className="px-5 py-3.5">Department</th>
                      <th className="px-5 py-3.5">Owner</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Milestone Progress</th>
                      <th className="px-5 py-3.5">Tasks</th>
                      <th className="px-5 py-3.5">Target Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                          Loading project status...
                        </td>
                      </tr>
                    ) : projectReport?.projects.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                          No projects match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      projectReport?.projects.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/60">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-bold text-[#690BA8] bg-[#690BA8]/10 px-1.5 py-0.5 rounded">
                                {p.key}
                              </span>
                              <span className="font-bold text-slate-900">{p.title}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">{p.department}</td>
                          <td className="px-5 py-3.5 text-slate-700 font-semibold">{p.owner}</td>
                          <td className="px-5 py-3.5">
                            <Badge
                              variant={
                                p.status === "ACTIVE"
                                  ? "success"
                                  : p.status === "COMPLETED"
                                  ? "primary"
                                  : p.status === "ON_HOLD"
                                  ? "coral"
                                  : "neutral"
                              }
                              size="sm"
                            >
                              {p.status}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 min-w-[150px]">
                            <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                              <span>{p.reachedMilestones}/{p.totalMilestones} reached</span>
                              <span className="font-bold">{p.progressPercentage}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#690BA8] to-[#00A896]"
                                style={{ width: `${p.progressPercentage}%` }}
                              />
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-700">{p.totalTasks} total</span>
                              {p.overdueTasks > 0 && (
                                <span className="text-rose-600 font-bold">({p.overdueTasks} late)</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500">
                            {p.targetDate ? new Date(p.targetDate).toLocaleDateString() : "--"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: Task Distribution & Deadlines */}
      {activeTab === "TASKS" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Task Status Distribution */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Tasks by Status ({taskReport?.total || 0})</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                {taskReport?.breakdown.map((item) => (
                  <div key={item.status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700">{item.status.replace("_", " ")}</span>
                      <span className="text-slate-500 font-mono">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#690BA8]"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Upcoming Deadlines Table */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Upcoming Deadlines ({upcomingReport?.totalUpcoming || 0})</CardTitle>
                  <span className="text-xs text-slate-400">Due in next 14 days</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3">Task Title</th>
                        <th className="px-5 py-3">Project</th>
                        <th className="px-5 py-3">Assignee</th>
                        <th className="px-5 py-3">Due Date</th>
                        <th className="px-5 py-3">Remaining</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {upcomingReport?.tasks.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                            No upcoming deadlines in this time window.
                          </td>
                        </tr>
                      ) : (
                        upcomingReport?.tasks.map((task) => (
                          <tr key={task.id} className="hover:bg-slate-50/60">
                            <td className="px-5 py-3 font-semibold text-slate-900 max-w-xs truncate">
                              {task.title}
                            </td>
                            <td className="px-5 py-3 text-slate-600 font-mono">{task.projectKey}</td>
                            <td className="px-5 py-3 text-slate-700">
                              {task.assignee ? task.assignee.name : "Unassigned"}
                            </td>
                            <td className="px-5 py-3 text-slate-600 font-mono">
                              {new Date(task.dueDate).toLocaleDateString()}
                            </td>
                            <td className="px-5 py-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                  task.daysRemaining <= 1
                                    ? "bg-rose-100 text-rose-800"
                                    : task.daysRemaining <= 3
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {task.daysRemaining === 0 ? "Due Today" : `${task.daysRemaining}d left`}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Overdue Tasks by Assignee */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Overdue Deliverables by Responsible Assignee</CardTitle>
                <Badge variant="coral" size="sm">
                  {overdueReport?.totalOverdue || 0} Total Overdue
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {overdueReport?.owners.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Zero overdue deliverables! Great job team.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {overdueReport?.owners.map((owner) => (
                    <div
                      key={owner.userId}
                      className="rounded-xl border border-rose-200/80 bg-rose-50/20 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{owner.name}</h4>
                          <span className="text-[10px] text-slate-500">{owner.department}</span>
                        </div>
                        <span className="flex h-6 px-2 items-center justify-center rounded-full bg-rose-100 text-rose-800 font-bold text-xs">
                          {owner.count} overdue
                        </span>
                      </div>

                      <div className="divide-y divide-rose-100/80 text-[11px]">
                        {owner.tasks.map((task) => (
                          <div key={task.id} className="py-1.5 flex items-center justify-between gap-2">
                            <span className="truncate text-slate-800 font-medium">{task.title}</span>
                            <span className="text-rose-600 font-bold shrink-0">{task.daysOverdue}d late</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: Team & Department Workload */}
      {activeTab === "WORKLOAD" && (
        <div className="space-y-6">
          {/* Department Workload Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {departmentReport?.departments.map((dept) => (
              <Card key={dept.id} className="border-slate-200/90 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{dept.name}</CardTitle>
                      <span className="text-xs text-slate-400">{dept.memberCount} Team Members</span>
                    </div>
                    <Badge variant="neutral" size="sm">{dept.code}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-slate-50">
                      <div className="text-xs text-slate-500 font-semibold">Active Projects</div>
                      <div className="text-xl font-black text-slate-900 mt-1">{dept.activeProjects}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50">
                      <div className="text-xs text-slate-500 font-semibold">Open Tasks</div>
                      <div className="text-xl font-black text-[#690BA8] mt-1">{dept.openTasksCount}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50">
                      <div className="text-xs text-slate-500 font-semibold">Estimated Hours</div>
                      <div className="text-xl font-black text-[#00A896] mt-1">{dept.totalEstimatedHours}h</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Employee Workload Table */}
          <Card>
            <CardHeader>
              <CardTitle>Team Member Workload Allocation</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5">Contributor</th>
                      <th className="px-5 py-3.5">Department</th>
                      <th className="px-5 py-3.5">Role / Job Title</th>
                      <th className="px-5 py-3.5">Active Tasks</th>
                      <th className="px-5 py-3.5">Completed</th>
                      <th className="px-5 py-3.5">Overdue</th>
                      <th className="px-5 py-3.5">Estimated Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {employeeReport?.employees.map((emp) => (
                      <tr key={emp.userId} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3.5">
                          <div>
                            <div className="font-bold text-slate-900">{emp.name}</div>
                            <div className="text-[11px] text-slate-400">{emp.email}</div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">{emp.department}</td>
                        <td className="px-5 py-3.5 text-slate-700">{emp.jobTitle}</td>
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-[#690BA8]">{emp.openTasksCount}</span>
                        </td>
                        <td className="px-5 py-3.5 text-emerald-600 font-bold">{emp.completedTasksCount}</td>
                        <td className="px-5 py-3.5">
                          {emp.overdueTasksCount > 0 ? (
                            <span className="text-rose-600 font-bold">{emp.overdueTasksCount}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-700">
                          {emp.totalEstimatedHours} hrs
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};