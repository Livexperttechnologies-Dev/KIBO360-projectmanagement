import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FolderKanban,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  AlertCircle,
  Building2,
  Calendar,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchDashboardOverview,
  updateTaskStatus,
  DashboardFilters,
  DashboardOverviewResponse,
} from "../api/dashboard";

import { FilterBar } from "../components/dashboard/FilterBar";
import { SummaryCards } from "../components/dashboard/SummaryCards";
import { StatusDistributionChart } from "../components/dashboard/StatusDistributionChart";
import { WorkloadByEmployee } from "../components/dashboard/WorkloadByEmployee";
import { UpcomingDeadlines } from "../components/dashboard/UpcomingDeadlines";
import { MyAssignedTasks } from "../components/dashboard/MyAssignedTasks";
import { ReviewQueue } from "../components/dashboard/ReviewQueue";
import { OverdueAlert } from "../components/dashboard/OverdueAlert";

export const DashboardPage: React.FC = () => {
  const { user, token } = useAuth();

  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: "all",
    departmentId: "all",
    projectId: "all",
    assigneeId: "all",
    status: "all",
  });

  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (activeFilters = filters) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchDashboardOverview(activeFilters, token);
      setData(response);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(filters);
  }, [filters, token]);

  const handleFilterChange = (newFilters: DashboardFilters) => {
    setFilters(newFilters);
  };

  const handleTaskStatusToggle = async (taskId: string, newStatus: string) => {
    try {
      await updateTaskStatus(taskId, newStatus, token);
      await loadData(filters);
    } catch (err: any) {
      alert(err.message || "Failed to update task status");
    }
  };

  const handleApproveTask = async (taskId: string) => {
    try {
      await updateTaskStatus(taskId, "COMPLETED", token);
      await loadData(filters);
    } catch (err: any) {
      alert(err.message || "Failed to approve task");
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-[#690BA8] mb-2 border border-[#690BA8]/15">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>KIBO360 Analytics Engine • Live PostgreSQL Data</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Welcome back, {user?.profile?.firstName || "Team Member"}!
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time project telemetry, sprint workload, and delivery metrics for Livexpert Technologies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(filters)}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh Metrics
          </Button>
        </div>
      </div>

      {/* Reactive Filter Bar */}
      <FilterBar
        filters={filters}
        onChange={handleFilterChange}
        options={data?.filterOptions}
      />

      {/* Error Alert with Retry */}
      {error && (
        <Card className="border-rose-200 bg-rose-50/40 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-800 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 text-rose-600" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => loadData(filters)}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Component 1: Summary Cards (6 KPIs) */}
      <SummaryCards summary={data?.summary} isLoading={isLoading && !data} />

      {/* Component 6: Overdue Tasks Alert (if any exist) */}
      {data?.overdueTasks && data.overdueTasks.length > 0 && (
        <OverdueAlert tasks={data.overdueTasks} />
      )}

      {/* Row 1: Charts & Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusDistributionChart
          distribution={data?.statusStats?.distribution}
          totalTasks={data?.statusStats?.total ?? 0}
        />
        <WorkloadByEmployee workload={data?.workload} />
      </div>

      {/* Row 2: Recent Projects Table & Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Projects (2 cols on desktop) */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Projects</CardTitle>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Live delivery progress across departments
                  </p>
                </div>
                <Link to="/projects">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowUpRight className="h-3.5 w-3.5" />}>
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading && !data ? (
                <div className="py-12 text-center">
                  <Spinner size="md" variant="brand" />
                </div>
              ) : !data?.recentProjects?.projects?.length ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No projects match the selected filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-3">Project</th>
                        <th className="px-5 py-3">Department</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Progress</th>
                        <th className="px-5 py-3">Lead</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.recentProjects.projects.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-slate-900">{p.title}</div>
                            <div className="text-[11px] text-[#690BA8] font-bold">[{p.key}]</div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600 font-medium">
                            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                              <Building2 className="h-2.5 w-2.5 text-slate-400" />
                              {p.department}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge
                              variant={
                                p.status === "IN_PROGRESS" || p.status === "ACTIVE"
                                  ? "primary"
                                  : p.status === "COMPLETED"
                                  ? "success"
                                  : "neutral"
                              }
                              size="sm"
                            >
                              {p.status.replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="w-32">
                              <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                                <span>{p.progress}%</span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                  {p.completedTasks}/{p.totalTasks}
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-[#690BA8] to-[#E81778]"
                                  style={{ width: `${p.progress}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600 font-medium">
                            {p.lead}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Deadlines (1 col on desktop) */}
        <div>
          <UpcomingDeadlines deadlines={data?.upcomingDeadlines} />
        </div>
      </div>

      {/* Row 3: My Assigned Tasks & Tasks Awaiting Review */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MyAssignedTasks
          tasks={data?.myTasks}
          onToggleStatus={handleTaskStatusToggle}
        />
        <ReviewQueue
          tasks={data?.awaitingReview}
          onApprove={handleApproveTask}
        />
      </div>
    </div>
  );
};