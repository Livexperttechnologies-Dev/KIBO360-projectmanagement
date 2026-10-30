import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users2,
  Calendar,
  BarChart3,
  Bell,
  Settings,
  ShieldCheck,
  X,
  UserCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { fetchProjects } from "../../api/project";
import { fetchTasks } from "../../api/task";
import { notificationApi } from "../../api/notification";
import { API_BASE_URL } from "../../api/client";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, token } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [canManageSettings, setCanManageSettings] = useState(false);
  const [menuCounts, setMenuCounts] = useState<{ projects: number | null; tasks: number | null; notifications: number | null }>({ projects: null, tasks: null, notifications: null });

  useEffect(() => {
    if (!user || !token) {
      setMenuCounts({ projects: null, tasks: null, notifications: null });
      return;
    }

    let isCurrent = true;
    const loadCounts = async () => {
      const [projects, tasks, notifications] = await Promise.allSettled([
        fetchProjects({}, token),
        fetchTasks({ assigneeId: user.id, limit: 1 }, token),
        notificationApi.getUnreadCount(token),
      ]);
      if (!isCurrent) return;
      setMenuCounts({
        projects: projects.status === "fulfilled" ? projects.value.length : null,
        tasks: tasks.status === "fulfilled" ? tasks.value.pagination.total : null,
        notifications: notifications.status === "fulfilled" ? notifications.value : null,
      });
    };

    void loadCounts();
    const interval = window.setInterval(() => void loadCounts(), 30000);
    return () => {
      isCurrent = false;
      window.clearInterval(interval);
    };
  }, [token, user?.id]);

  useEffect(() => {
    if (!token) {
      setCanManageSettings(false);
      return;
    }

    let isCurrent = true;
    fetch(`${API_BASE_URL}/auth/two-factor`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    })
      .then((response) => response.json())
      .then((result) => {
        if (isCurrent) setCanManageSettings(Boolean(result?.data?.canManageEnforcement));
      })
      .catch(() => {
        if (isCurrent) setCanManageSettings(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [token, user?.id]);

  const workspaceItems = [
    { name: "Projects", path: "/projects", icon: FolderKanban, badge: menuCounts.projects != null && String(menuCounts.projects) },
    { name: "My Tasks", path: "/my-tasks", icon: CheckSquare, badge: menuCounts.tasks != null && String(menuCounts.tasks) },
    { name: "Team Tasks", path: "/team-tasks", icon: Users2 },
    { name: "Calendar", path: "/calendar", icon: Calendar },
  ];
  const insightItems = [
    { name: "Reports", path: "/reports", icon: BarChart3 },
    { name: "Notifications", path: "/notifications", icon: Bell, badge: menuCounts.notifications != null && menuCounts.notifications > 0 ? String(menuCounts.notifications) : undefined },
  ];

  // Admin-only nav item
  const adminNavItems = user?.role === "ADMINISTRATOR"
    ? [{ name: "Users & Access", path: "/users", icon: ShieldCheck, badge: "Admin", badgeVariant: "primary" as const }]
    : [];

  const systemItems = [
    ...(canManageSettings ? [{ name: "Settings", path: "/settings", icon: Settings }] : []),
    ...adminNavItems,
  ];
  const accountItems = [{ name: "My Profile", path: "/profile", icon: UserCircle }];

  const renderNavItem = (item: { name: string; path: string; icon: React.ElementType; badge?: string | false }) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.path}
        to={item.path}
        title={isCollapsed ? item.name : undefined}
        onClick={() => {
          if (window.innerWidth < 1024) onClose();
        }}
        className={({ isActive }) =>
          `group flex min-h-10 items-center rounded-xl py-2 text-[13px] font-semibold transition-all duration-150 ${isCollapsed ? "justify-center px-0" : "justify-between px-3.5"} ${
            isActive
              ? "bg-[#7200A5] text-white shadow-[0_5px_18px_rgba(114,0,165,0.2)]"
              : "text-[#e7dce9] hover:bg-white/[0.07] hover:text-white"
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span className={`flex min-w-0 items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-[#b79abd] group-hover:text-[#f3c9de]"}`} />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </span>
            {!isCollapsed && item.badge && (
              <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive ? "bg-white/20 text-white" : "bg-white/10 text-[#e4b8d0]"}`}>
                {item.badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex ${isCollapsed ? "w-20" : "w-72"} flex-col border-r border-white/10 border-t-[3px] border-t-[#f4b83f] bg-[#1b0d22] text-white transition-[width,transform] duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="relative flex h-[104px] shrink-0 items-center justify-center border-b border-white/10 px-5">
          <div className="flex flex-col items-center gap-1">
            <img
              src="/kibo360-logo-white.png"
              alt="KIBO360 Logo"
              className={`${isCollapsed ? "h-9" : "h-[58px]"} w-auto object-contain`}
            />
          </div>
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-lg p-1.5 text-[#b79abd] hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className={`flex-1 space-y-5 overflow-y-auto py-4 ${isCollapsed ? "px-2" : "px-3.5"}`}>
          <div className="space-y-2 border-b border-white/10 pb-3">
            {renderNavItem({ name: "Dashboard", path: "/dashboard", icon: LayoutDashboard })}
          </div>

          <section className="space-y-1.5">
            {!isCollapsed && <h2 className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9f7ba8]">Workspace</h2>}
            {workspaceItems.map(renderNavItem)}
          </section>

          <section className="space-y-1.5 border-t border-white/10 pt-4">
            {!isCollapsed && <h2 className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9f7ba8]">Performance &amp; Reports</h2>}
            {insightItems.map(renderNavItem)}
          </section>

          {systemItems.length > 0 && (
            <section className="space-y-1.5 border-t border-white/10 pt-4">
              {!isCollapsed && <h2 className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9f7ba8]">System</h2>}
              {systemItems.map(renderNavItem)}
            </section>
          )}

          <section className="space-y-1.5 border-t border-white/10 pt-4">
            {!isCollapsed && <h2 className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9f7ba8]">Account</h2>}
            {accountItems.map(renderNavItem)}
          </section>
        </div>

        <div className="shrink-0 border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => setIsCollapsed((current) => !current)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex min-h-9 w-full items-center rounded-lg border border-white/15 text-xs font-semibold text-[#e7dce9] transition-colors hover:bg-white/[0.07] hover:text-white ${isCollapsed ? "justify-center px-0" : "justify-center gap-2 px-2"}`}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span>Collapse</span></>}
          </button>
          {user && !isCollapsed && (
            <div className="mt-2 rounded-lg border border-white/10 px-2.5 py-2 text-center">
              <div className="text-[10px] font-semibold text-white">Powered by Livexpert Technologies</div>
              <div className="mt-0.5 text-[10px] text-[#9f7ba8]">
                {user.role === "ADMINISTRATOR" ? "Administrator" : user.role.replace(/_/g, " ")}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
