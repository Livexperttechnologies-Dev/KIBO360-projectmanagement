import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  Check,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Clock,
  UserCheck,
  CheckCircle2,
  Trash2,
  Settings,
  Play,
  RefreshCw,
  Filter,
  Flag,
  ExternalLink,
  Layers,
  ArrowRightLeft,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import {
  notificationApi,
  NotificationItem,
  NotificationType,
  BackgroundJobItem,
} from "../api/notification";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { NotificationPreferencesModal } from "../components/notifications/NotificationPreferencesModal";
import { TablePagination } from "../components/ui/TablePagination";

type FilterTab = "ALL" | "UNREAD" | "ASSIGNMENTS" | "DEADLINES" | "BLOCKERS" | "REVIEWS" | "MILESTONES";

export const NotificationsPage: React.FC = () => {
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [isPrefModalOpen, setIsPrefModalOpen] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Background jobs state (Admin / Lead)
  const [showJobsSection, setShowJobsSection] = useState<boolean>(false);
  const [jobs, setJobs] = useState<BackgroundJobItem[]>([]);
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsPageSize, setJobsPageSize] = useState(8);
  const [jobsLoading, setJobsLoading] = useState<boolean>(false);
  const [workerRunning, setWorkerRunning] = useState<boolean>(false);
  const [workerMessage, setWorkerMessage] = useState<string | null>(null);

  const canViewJobs = user?.role === "ADMINISTRATOR" || user?.role === "MANAGER" || user?.role === "TEAM_LEAD";
  const visibleJobs = jobs.slice((jobsPage - 1) * jobsPageSize, jobsPage * jobsPageSize);

  useEffect(() => {
    if (!token) return;
    void loadNotifications();
    const refreshTimer = window.setInterval(() => void loadNotifications(), 15000);
    return () => window.clearInterval(refreshTimer);
  }, [token, activeTab]);

  const loadNotifications = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const filters: { isRead?: boolean; type?: NotificationType } = {};
      if (activeTab === "UNREAD") {
        filters.isRead = false;
      }

      const res = await notificationApi.getNotifications(token, filters);
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = async () => {
    if (!token) return;
    try {
      setJobsLoading(true);
      const jobList = await notificationApi.getBackgroundJobs(token);
      setJobs(jobList);
    } catch (err) {
      console.error("Failed to load background jobs:", err);
    } finally {
      setJobsLoading(false);
    }
  };

  const handleToggleJobs = () => {
    const nextState = !showJobsSection;
    setShowJobsSection(nextState);
    if (nextState) {
      loadJobs();
    }
  };

  const handleMarkAsRead = async (id: string) => {
    if (!token) return;
    try {
      setActionLoading(id);
      await notificationApi.markAsRead(id, token);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token) return;
    try {
      setActionLoading("mark-all");
      await notificationApi.markAllAsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      setActionLoading(id);
      await notificationApi.deleteNotification(id, token);
      const deletedItem = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (deletedItem && !deletedItem.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to delete notification:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRunWorker = async () => {
    if (!token) return;
    try {
      setWorkerRunning(true);
      setWorkerMessage(null);
      const result = await notificationApi.runWorkerCycle(token);
      setWorkerMessage(`Worker scan completed: ${result.upcoming} upcoming, ${result.overdue} overdue, ${result.milestones} milestones.`);
      await loadNotifications();
      if (showJobsSection) {
        await loadJobs();
      }
    } catch (err: any) {
      setWorkerMessage(`Worker run error: ${err.message}`);
    } finally {
      setWorkerRunning(false);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    if (!token) return;
    try {
      await notificationApi.retryBackgroundJob(jobId, token);
      await loadJobs();
    } catch (err) {
      console.error("Failed to retry job:", err);
    }
  };

  // Filter notifications by active tab in memory
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "UNREAD") return !n.isRead;
    if (activeTab === "ASSIGNMENTS") return n.type === "NEW_TASK_ASSIGNMENT" || n.type === "TASK_REASSIGNMENT";
    if (activeTab === "DEADLINES") return n.type === "UPCOMING_DEADLINE" || n.type === "OVERDUE_TASK";
    if (activeTab === "BLOCKERS") return n.type === "BLOCKED_TASK";
    if (activeTab === "REVIEWS") return n.type === "REVIEW_REQUESTED" || n.type === "CHANGES_REQUESTED" || n.type === "TASK_APPROVED";
    if (activeTab === "MILESTONES") return n.type === "MILESTONE_APPROACHING";
    return true;
  });

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "NEW_TASK_ASSIGNMENT":
        return <UserCheck className="h-5 w-5 text-[#E81778]" />;
      case "TASK_REASSIGNMENT":
        return <ArrowRightLeft className="h-5 w-5 text-indigo-600" />;
      case "UPCOMING_DEADLINE":
        return <Clock className="h-5 w-5 text-amber-500" />;
      case "OVERDUE_TASK":
        return <AlertTriangle className="h-5 w-5 text-[#F16A65]" />;
      case "BLOCKED_TASK":
        return <AlertCircle className="h-5 w-5 text-purple-600" />;
      case "REVIEW_REQUESTED":
        return <Eye className="h-5 w-5 text-blue-600" />;
      case "CHANGES_REQUESTED":
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case "MILESTONE_APPROACHING":
        return <Flag className="h-5 w-5 text-[#00A896]" />;
      default:
        return <Bell className="h-5 w-5 text-[#690BA8]" />;
    }
  };

  const getNotificationBadgeVariant = (type: NotificationType): "magenta" | "neutral" | "coral" | "primary" | "success" => {
    switch (type) {
      case "NEW_TASK_ASSIGNMENT":
      case "TASK_REASSIGNMENT":
        return "magenta";
      case "UPCOMING_DEADLINE":
        return "neutral";
      case "OVERDUE_TASK":
      case "BLOCKED_TASK":
        return "coral";
      case "REVIEW_REQUESTED":
      case "CHANGES_REQUESTED":
        return "primary";
      case "MILESTONE_APPROACHING":
      case "TASK_APPROVED":
      case "TASK_COMPLETED":
        return "success";
      default:
        return "neutral";
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Notifications & Automation
            </h2>
            {unreadCount > 0 && (
              <span className="flex items-center justify-center rounded-full bg-[#E81778] px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time project updates, deadline reminders, review alerts, and server-side automation queue.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {canViewJobs && (
            <Button
              variant={showJobsSection ? "primary" : "outline"}
              size="sm"
              onClick={handleToggleJobs}
              leftIcon={<Layers className="h-4 w-4" />}
            >
              Background Queue
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPrefModalOpen(true)}
            leftIcon={<Settings className="h-4 w-4" />}
          >
            Preferences
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || actionLoading === "mark-all"}
            leftIcon={<Check className="h-4 w-4" />}
          >
            Mark All as Read
          </Button>
        </div>
      </div>

      {/* Admin / Team Lead Background Queue Diagnostic Card */}
      {canViewJobs && showJobsSection && (
        <Card className="border-indigo-100 bg-indigo-50/20 shadow-md">
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Server-Side Automation Queue & Worker
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated background scanner monitors deadlines, overdue alerts, and milestones without browser timers.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadJobs}
                  disabled={jobsLoading}
                  leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${jobsLoading ? "animate-spin" : ""}`} />}
                >
                  Refresh Jobs
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRunWorker}
                  disabled={workerRunning}
                  leftIcon={<Play className={`h-3.5 w-3.5 ${workerRunning ? "animate-spin" : ""}`} />}
                >
                  {workerRunning ? "Scanning..." : "Run Worker Scan Now"}
                </Button>
              </div>
            </div>

            {workerMessage && (
              <div className="p-3 rounded-xl bg-white border border-indigo-200 text-xs text-indigo-900 font-medium">
                {workerMessage}
              </div>
            )}

            {/* Jobs List */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Job Name</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Attempts</th>
                    <th className="px-4 py-3">Last Processed</th>
                    <th className="px-4 py-3">Error / Diagnostics</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                        No background jobs recorded in queue.
                      </td>
                    </tr>
                  ) : (
                    visibleJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {job.jobName}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              job.status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-800"
                                : job.status === "FAILED"
                                ? "bg-rose-100 text-rose-800"
                                : job.status === "PROCESSING"
                                ? "bg-blue-100 text-blue-800 animate-pulse"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {job.attempts} / {job.maxAttempts}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {job.processedAt ? formatTimeAgo(job.processedAt) : "Pending"}
                        </td>
                        <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                          {job.lastError ? (
                            <span className="text-rose-600 font-semibold">{job.lastError}</span>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {job.status === "FAILED" && (
                            <button
                              onClick={() => handleRetryJob(job.id)}
                              className="text-xs font-bold text-[#690BA8] hover:underline"
                            >
                              Retry
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {jobs.length > 0 && <TablePagination page={jobsPage} pageSize={jobsPageSize} total={jobs.length} onPageChange={setJobsPage} onPageSizeChange={(size) => { setJobsPageSize(size); setJobsPage(1); }} />}
          </CardContent>
        </Card>
      )}

      {/* Tabs Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === "ALL"
              ? "border-[#690BA8] text-[#690BA8] bg-[#690BA8]/5"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          All Notifications
          <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] text-slate-700">
            {notifications.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("UNREAD")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === "UNREAD"
              ? "border-[#E81778] text-[#E81778] bg-[#E81778]/5"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          Unread
          {unreadCount > 0 && (
            <span className="ml-1 rounded-full bg-[#E81778] px-1.5 py-0.2 text-[10px] text-white">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("ASSIGNMENTS")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === "ASSIGNMENTS"
              ? "border-[#690BA8] text-[#690BA8] bg-[#690BA8]/5"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          Assignments
        </button>

        <button
          onClick={() => setActiveTab("DEADLINES")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === "DEADLINES"
              ? "border-amber-500 text-amber-700 bg-amber-50"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          Deadlines & Overdue
        </button>

        <button
          onClick={() => setActiveTab("BLOCKERS")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === "BLOCKERS"
              ? "border-purple-600 text-purple-700 bg-purple-50"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          Blockers
        </button>

        <button
          onClick={() => setActiveTab("REVIEWS")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === "REVIEWS"
              ? "border-blue-500 text-blue-700 bg-blue-50"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          Reviews & Changes
        </button>

        <button
          onClick={() => setActiveTab("MILESTONES")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
            activeTab === "MILESTONES"
              ? "border-teal-500 text-teal-700 bg-teal-50"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          Milestones
        </button>
      </div>

      {/* Notifications List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-sm">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#690BA8] border-t-transparent mb-3" />
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 px-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                <Bell className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">No notifications found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                {activeTab === "UNREAD"
                  ? "You're all caught up! No unread notifications in your inbox."
                  : "No notifications matching the selected filter category."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredNotifications.map((item) => {
                return (
                  <div
                    key={item.id}
                    className={`group flex items-start gap-4 p-5 hover:bg-slate-50/80 transition-colors ${
                      !item.isRead ? "bg-purple-50/25" : ""
                    }`}
                  >
                    {/* Icon */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200/80 shadow-sm mt-0.5">
                      {getNotificationIcon(item.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant={getNotificationBadgeVariant(item.type)} size="sm">
                          {item.type.replace(/_/g, " ")}
                        </Badge>
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {item.title}
                        </h4>
                        {!item.isRead && (
                          <span className="h-2 w-2 rounded-full bg-[#E81778] shrink-0" />
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed font-normal">
                        {item.message}
                      </p>

                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 font-medium">
                        <span>{formatTimeAgo(item.createdAt)}</span>
                        {item.entityType === "TASK" && item.entityId && (
                          <Link
                            to={`/team-tasks?taskId=${encodeURIComponent(item.entityId || "")}`}
                            className="flex items-center gap-1 text-[#690BA8] font-bold hover:underline"
                          >
                            <span>View Task</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                        {item.entityType === "MILESTONE" && (
                          <Link
                            to="/calendar"
                            className="flex items-center gap-1 text-[#00A896] font-bold hover:underline"
                          >
                            <span>View Calendar</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                      {!item.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(item.id)}
                          disabled={actionLoading === item.id}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={actionLoading === item.id}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Delete notification"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={isPrefModalOpen}
        onClose={() => setIsPrefModalOpen(false)}
        onSaved={loadNotifications}
      />
    </div>
  );
};
