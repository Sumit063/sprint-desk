import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import { useWorkspaceSocket } from "@/hooks/useWorkspaceSocket";

type Notification = {
  _id: string;
};

const navItems = [
  { label: "Issues", to: "/app/issues" },
  { label: "Knowledge Base", to: "/app/kb" },
  { label: "Notifications", to: "/app/notifications" },
  { label: "Settings", to: "/app/settings" }
];

export default function AppShell() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      return stored;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useWorkspaceSocket();

  const { data: unreadNotifications } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: async () => {
      const res = await api.get("/api/notifications", { params: { unread: "true" } });
      return res.data.notifications as Notification[];
    },
    enabled: Boolean(user)
  });

  const unreadCount = unreadNotifications?.length ?? 0;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-emerald-50 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 dark:text-slate-100">
      <aside className="flex h-full w-64 flex-col overflow-hidden border-r border-slate-200 bg-white/90 p-6 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
          SprintDesk
        </div>
        <div className="mt-6">
          <WorkspaceSwitcher />
          <Link
            className="mt-2 inline-block text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            to="/app/workspaces"
          >
            Manage workspaces
          </Link>
        </div>
        <nav className="mt-8 flex-1 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive
                    ? "bg-blue-600 text-white dark:bg-blue-500"
                    : "text-slate-600 hover:bg-blue-50 dark:text-slate-300 dark:hover:bg-slate-800"
                }`
              }
            >
              <span className="flex items-center justify-between">
                <span>{item.label}</span>
                {item.to === "/app/notifications" && unreadCount > 0 ? (
                  <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </span>
            </NavLink>
          ))}
        </nav>
        <button
          className="mt-4 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-blue-200 hover:text-blue-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:text-blue-300"
          type="button"
          onClick={handleLogout}
        >
          Sign out
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-2 border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-blue-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="M4.93 4.93l1.41 1.41" />
                <path d="M17.66 17.66l1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="M6.34 17.66l-1.41 1.41" />
                <path d="M19.07 4.93l-1.41 1.41" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />
              </svg>
            )}
          </button>
          <div className="flex items-center gap-2 bg-white px-2 py-0.5 dark:bg-transparent">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21a8 8 0 0 0-16 0" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <div className="leading-tight">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                {user?.name ?? "User"}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {user?.email}
              </p>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
