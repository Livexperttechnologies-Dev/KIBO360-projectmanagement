import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  Search,
  Bell,
  Activity,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Building2,
} from "lucide-react";
import { fetchBackendHealth, HealthResponse } from "../../api/health";
import { notificationApi } from "../../api/notification";
import { Badge } from "../ui/Badge";
import { useAuth } from "../../contexts/AuthContext";

interface TopNavProps {
  onMenuClick: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onMenuClick }) => {
  const location = useLocation();
  const { user, token, logout } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isHealthChecking, setIsHealthChecking] = useState<boolean>(true);
  const [healthError, setHealthError] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const getPageTitle = () => {
    const path = location.pathname.replace(/^\//, "");
    if (!path || path === "dashboard") return "Dashboard Overview";
    if (path === "users") return "User & Access Management";
    return path
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const checkHealth = async () => {
    try {
      setIsHealthChecking(true);
      const res = await fetchBackendHealth();
      setHealth(res);
      setHealthError(false);
    } catch {
      setHealthError(true);
      setHealth(null);
    } finally {
      setIsHealthChecking(false);
    }
  };

  const fetchUnread = async () => {
    if (!token) return;
    try {
      const count = await notificationApi.getUnreadCount(token);
      setUnreadCount(count);
    } catch {
      // Ignore background unread poll failures
    }
  };

  useEffect(() => {
    checkHealth();
    fetchUnread();
    const interval = setInterval(() => {
      checkHealth();
      fetchUnread();
    }, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const initials = user
    ? (user.profile?.firstName?.[0] || "") + (user.profile?.lastName?.[0] || user.email[0].toUpperCase())
    : "LX";

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-slate-200/90 bg-white/90 px-6 backdrop-blur-md">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Toggle Navigation"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
            {getPageTitle()}
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            KIBO360 Project Management Hub
          </p>
        </div>
      </div>

      {/* Middle: Global Search */}
      <div className="hidden md:flex flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects, tasks, team members... (Ctrl + K)"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 transition-colors focus:border-[#690BA8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#690BA8]/10"
          />
        </div>
      </div>

      {/* Right: Health Indicator, Notifications & User Avatar */}
      <div className="flex items-center gap-3">
        {/* Backend API Health Pill */}
        <div
          title={
            healthError
              ? "Backend API unreachable (GET /api/v1/health)"
              : `Backend API healthy (${health?.service} v${health?.version})`
          }
          className="cursor-pointer"
          onClick={checkHealth}
        >
          {isHealthChecking && !health && !healthError ? (
            <Badge variant="neutral" size="sm">
              <Activity className="h-3 w-3 animate-spin text-slate-500" />
              <span className="hidden sm:inline">Connecting API...</span>
            </Badge>
          ) : healthError ? (
            <Badge variant="coral" size="sm">
              <AlertTriangle className="h-3 w-3 text-[#F16A65]" />
              <span className="hidden sm:inline">API Offline</span>
            </Badge>
          ) : (
            <Badge variant="success" size="sm">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span className="hidden sm:inline">API Live (v{health?.version})</span>
            </Badge>
          )}
        </div>

        {/* Notifications Icon with Dynamic Unread Counter */}
        <Link
          to="/notifications"
          className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          title={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E81778] px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : (
            <span className="hidden" />
          )}
        </Link>

        {/* User Profile & Sign Out */}
        {user ? (
          <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
            <Link to="/profile" className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-50" title="Open my profile">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#690BA8] to-[#E81778] text-white font-bold text-xs shadow-sm">
                {initials}
              </div>
              <div className="hidden text-left xl:block">
                <div className="text-xs font-bold text-slate-800 leading-tight">
                  {user.profile?.firstName} {user.profile?.lastName}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="font-semibold text-[#690BA8]">{user.role.replace("_", " ")}</span>
                  {user.department && (
                    <>
                      <span>•</span>
                      <span>{user.department.name}</span>
                    </>
                  )}
                </div>
              </div>
            </Link>

            <button
              onClick={() => logout()}
              className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="border-l border-slate-200 pl-3">
            <Link
              to="/login"
              className="text-xs font-bold text-[#690BA8] hover:underline"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
