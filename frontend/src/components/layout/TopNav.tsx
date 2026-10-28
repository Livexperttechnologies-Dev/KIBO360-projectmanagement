import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  Search,
  CalendarDays,
  Bell,
  LogOut,
  Building2,
} from "lucide-react";
import { notificationApi } from "../../api/notification";
import { useAuth } from "../../contexts/AuthContext";

interface TopNavProps {
  onMenuClick: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onMenuClick }) => {
  const location = useLocation();
  const { user, token, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const currentDate = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

  const getPageTitle = () => {
    const path = location.pathname.replace(/^\//, "");
    if (!path || path === "dashboard") return "Dashboard Overview";
    if (path === "users") return "User & Access Management";
    return path
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
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
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [token]);

  const initials = user
    ? (user.profile?.firstName?.[0] || "") + (user.profile?.lastName?.[0] || user.email[0].toUpperCase())
    : "LX";

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-violet-100 bg-white/95 px-6 backdrop-blur-md">
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
            className="w-full rounded-xl border border-violet-100 bg-[#FCFAFE] pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 transition-colors focus:border-[#9B4DCA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#9B4DCA]/10"
          />
        </div>
      </div>

      {/* Right: Notifications & User Avatar */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 rounded-xl border border-violet-200 bg-[#FBF7FF] px-3 py-2 text-xs font-semibold text-[#5E347B] sm:flex">
          <CalendarDays className="h-4 w-4 text-[#7B20B2]" />
          <span>{currentDate}</span>
        </div>

        {/* Notifications Icon with Dynamic Unread Counter */}
        <Link
          to="/notifications"
          className="relative rounded-xl p-2 text-[#755788] hover:bg-violet-50 hover:text-[#690BA8] transition-colors"
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
          <div className="flex items-center gap-3 border-l border-violet-100 pl-3">
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
