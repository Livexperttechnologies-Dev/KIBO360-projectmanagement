import React from "react";
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
  LogOut,
} from "lucide-react";
import { Badge } from "../ui/Badge";
import { useAuth } from "../../contexts/AuthContext";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  const baseNavItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Projects", path: "/projects", icon: FolderKanban, badge: "8" },
    { name: "My Tasks", path: "/my-tasks", icon: CheckSquare, badge: "12" },
    { name: "Team Tasks", path: "/team-tasks", icon: Users2 },
    { name: "Calendar", path: "/calendar", icon: Calendar },
    { name: "Reports", path: "/reports", icon: BarChart3 },
    { name: "Notifications", path: "/notifications", icon: Bell, badge: "3", badgeVariant: "magenta" as const },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  // Admin-only nav item
  const adminNavItems = user?.role === "ADMINISTRATOR"
    ? [{ name: "Users & Access", path: "/users", icon: ShieldCheck, badge: "Admin", badgeVariant: "primary" as const }]
    : [];

  const navItems = [...baseNavItems, ...adminNavItems];

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
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200/90 bg-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-6">
          <div className="flex items-center gap-3">
            <img
              src="/kibo360-logo.png"
              alt="KIBO360 Logo"
              className="h-10 w-auto object-contain"
            />
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-wider text-[#690BA8] uppercase">
                Project Hub
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Livexpert Technologies
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-bold tracking-wider uppercase text-slate-400">
            Main Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? "bg-[#F5EFFB] text-[#690BA8] shadow-sm font-bold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`h-5 w-5 transition-colors ${
                          isActive
                            ? "text-[#690BA8]"
                            : "text-slate-400 group-hover:text-slate-600"
                        }`}
                      />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <Badge
                        variant={item.badgeVariant || (isActive ? "primary" : "neutral")}
                        size="sm"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* User Card in Sidebar Footer */}
        {user && (
          <div className="border-t border-slate-100 p-4">
            <div className="flex items-center justify-between rounded-xl bg-[#F8F9FC] p-3 border border-slate-200/60">
              <div className="flex items-center gap-2.5 truncate">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#690BA8] to-[#E81778] text-white text-xs font-bold shrink-0">
                  {(user.profile?.firstName?.[0] || "") + (user.profile?.lastName?.[0] || user.email[0].toUpperCase())}
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-slate-800 truncate">
                    {user.profile?.firstName} {user.profile?.lastName}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {user.role.replace("_", " ")}
                  </div>
                </div>
              </div>
              <button
                onClick={() => logout()}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};