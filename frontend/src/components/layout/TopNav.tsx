import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  Search,
  X,
  LoaderCircle,
  FolderKanban,
  CheckSquare,
  CalendarDays,
  Bell,
  ChevronRight,
  Inbox,
  LogOut,
  Building2,
} from "lucide-react";
import { notificationApi } from "../../api/notification";
import { fetchProjects, ProjectItem } from "../../api/project";
import { fetchTasks, TaskItem } from "../../api/task";
import { NotificationItem } from "../../api/notification";
import { useAuth } from "../../contexts/AuthContext";

interface TopNavProps {
  onMenuClick: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [projectResults, setProjectResults] = useState<ProjectItem[]>([]);
  const [taskResults, setTaskResults] = useState<TaskItem[]>([]);
  const [notificationResults, setNotificationResults] = useState<NotificationItem[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    const query = searchQuery.trim();
    if (!token || query.length < 2) {
      setProjectResults([]);
      setTaskResults([]);
      setNotificationResults([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    const timer = window.setTimeout(async () => {
      const [projects, tasks, notifications] = await Promise.allSettled([
        fetchProjects({ search: query }, token),
        fetchTasks({ search: query, limit: 8 }, token),
        notificationApi.getNotifications(token),
      ]);

      if (cancelled) return;
      setProjectResults(projects.status === "fulfilled" ? projects.value.slice(0, 5) : []);
      setTaskResults(tasks.status === "fulfilled" ? tasks.value.tasks.slice(0, 5) : []);
      setNotificationResults(
        notifications.status === "fulfilled"
          ? notifications.value.notifications
              .filter((item) => `${item.title} ${item.message}`.toLowerCase().includes(query.toLowerCase())
              )
              .slice(0, 5)
          : [],
      );
      setSearchLoading(false);
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery, token]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        window.setTimeout(() => searchInputRef.current?.focus(), 0);
      } else if (event.key === "Escape") {
        setSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };
    const handlePointerDown = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setSearchOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const openSearchResult = (path: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    navigate(path);
  };

  const initials = user
    ? (user.profile?.firstName?.[0] || "") + (user.profile?.lastName?.[0] || user.email[0].toUpperCase())
    : "LX";

  return (
    <header className="sticky top-0 z-30 flex h-[68px] w-full items-center justify-between border-b border-violet-200/80 bg-[#FCFAFE]/95 px-5 backdrop-blur-md sm:px-6">
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
          <h1 className="text-base font-bold text-[#251330] tracking-tight">
            {getPageTitle()}
          </h1>
          <p className="text-[11px] text-slate-500 font-medium">
            KIBO360 Project Management Hub
          </p>
        </div>
      </div>

      {/* Middle: Global Search */}
      <div className="hidden md:flex flex-1 max-w-md mx-8" ref={searchRef}>
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search projects, tasks, notifications... (Ctrl + K)"
            role="combobox"
            aria-expanded={searchOpen && searchQuery.trim().length >= 2}
            aria-controls="global-search-results"
            aria-autocomplete="list"
            className="w-full rounded-xl border border-violet-100 bg-[#FCFAFE] py-2.5 pl-10 pr-10 text-xs text-slate-800 placeholder-slate-400 transition-colors focus:border-[#9B4DCA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#9B4DCA]/10"
          />
          {searchQuery && (
            <button type="button" onClick={() => { setSearchQuery(""); searchInputRef.current?.focus(); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-violet-50 hover:text-violet-700" aria-label="Clear search">
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {searchOpen && searchQuery.trim().length >= 2 && (
            <div id="global-search-results" role="listbox" className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 max-h-[min(70vh,520px)] overflow-y-auto rounded-2xl border border-violet-100 bg-white p-2 shadow-[0_18px_48px_rgba(43,20,64,0.18)]">
              {searchLoading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-8 text-xs text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin text-violet-600" />Searching projects, tasks, and notifications…</div>
              ) : projectResults.length + taskResults.length + notificationResults.length === 0 ? (
                <div className="flex flex-col items-center px-4 py-8 text-center"><Inbox className="mb-2 h-5 w-5 text-violet-300" /><span className="text-xs font-semibold text-slate-700">No matches found</span><span className="mt-1 text-[11px] text-slate-400">Try another project, task, or notification keyword.</span></div>
              ) : (
                <>
                  {projectResults.length > 0 && <SearchResultGroup title="Projects" icon={<FolderKanban className="h-3.5 w-3.5" />}>
                    {projectResults.map((project) => <SearchResult key={project.id} title={project.title} detail={`${project.key} · ${project.department?.name || "Project"}`} onClick={() => openSearchResult("/projects")} />)}
                  </SearchResultGroup>}
                  {taskResults.length > 0 && <SearchResultGroup title="Tasks" icon={<CheckSquare className="h-3.5 w-3.5" />}>
                    {taskResults.map((task) => <SearchResult key={task.id} title={task.title} detail={`${task.project?.key || "Task"} · ${task.status.replace(/_/g, " ")}`} onClick={() => openSearchResult(user?.role === "EMPLOYEE" ? "/my-tasks" : "/team-tasks")} />)}
                  </SearchResultGroup>}
                  {notificationResults.length > 0 && <SearchResultGroup title="Notifications" icon={<Bell className="h-3.5 w-3.5" />}>
                    {notificationResults.map((notification) => <SearchResult key={notification.id} title={notification.title} detail={notification.message} onClick={() => openSearchResult("/notifications")} />)}
                  </SearchResultGroup>}
                </>
              )}
              <div className="mt-1 border-t border-violet-50 px-3 py-2 text-[10px] text-slate-400">Showing up to 5 matches per category · Esc to close</div>
            </div>
          )}
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
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7200A5] text-white font-bold text-xs shadow-sm">
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

const SearchResultGroup: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="py-1">
    <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-violet-700">{icon}{title}</div>
    <div>{children}</div>
  </div>
);

const SearchResult: React.FC<{ title: string; detail: string; onClick: () => void }> = ({ title, detail, onClick }) => (
  <button type="button" role="option" onClick={onClick} className="group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-[#FBF7FF] focus:bg-[#FBF7FF] focus:outline-none">
    <span className="min-w-0"><span className="block truncate text-xs font-semibold text-slate-800 group-hover:text-[#690BA8]">{title}</span><span className="mt-0.5 block truncate text-[10px] text-slate-400">{detail}</span></span>
    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-[#690BA8]" />
  </button>
);
