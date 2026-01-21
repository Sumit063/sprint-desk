import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ListChecks,
  LogOut,
  Moon,
  Settings,
  Sun
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import { useWorkspaceSocket } from "@/hooks/useWorkspaceSocket";
import { Button } from "@/components/ui/button";
import { getIssueBreadcrumb, getKbBreadcrumb } from "@/lib/breadcrumbs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar } from "@/components/ui/avatar";

type Notification = {
  _id: string;
};

const navItems = [
  { label: "Issues", to: "/app/issues", icon: ListChecks },
  { label: "Knowledge Base", to: "/app/kb", icon: BookOpen },
  { label: "Notifications", to: "/app/notifications", icon: Bell },
  { label: "Settings", to: "/app/settings", icon: Settings }
];

const breadcrumbMap: Record<string, string> = {
  issues: "Issues",
  kb: "Knowledge Base",
  notifications: "Notifications",
  settings: "Settings",
  workspaces: "Workspaces"
};

export default function AppShell() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [issueLabelVersion, setIssueLabelVersion] = useState(0);
  const [kbLabelVersion, setKbLabelVersion] = useState(0);
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleIssueLabel = () => setIssueLabelVersion((value) => value + 1);
    window.addEventListener("issue-ticket-updated", handleIssueLabel);
    return () => window.removeEventListener("issue-ticket-updated", handleIssueLabel);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleKbLabel = () => setKbLabelVersion((value) => value + 1);
    window.addEventListener("kb-article-updated", handleKbLabel);
    return () => window.removeEventListener("kb-article-updated", handleKbLabel);
  }, []);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const breadcrumbs = useMemo(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    const appIndex = segments.indexOf("app");
    const items = appIndex >= 0 ? segments.slice(appIndex + 1) : [];
    const crumbItems = items.map((segment, index) => {
      if (segment === "issues") {
        return "Issues";
      }
      if (items[index - 1] === "issues") {
        return getIssueBreadcrumb(segment);
      }
      return breadcrumbMap[segment] ?? segment;
    });

    if (items.includes("kb")) {
      const params = new URLSearchParams(location.search);
      const articleId = params.get("articleId");
      if (articleId) {
        crumbItems.push(getKbBreadcrumb(articleId));
      }
    }

    return crumbItems;
  }, [location.pathname, location.search, issueLabelVersion, kbLabelVersion]);

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <aside className="flex h-full w-60 flex-col border-r border-border bg-surface">
          <div className="px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
              SprintDesk
            </div>
            <div className="mt-6 space-y-2">
              <WorkspaceSwitcher />
              <Link
                className="inline-flex text-xs font-medium text-foreground-muted hover:text-foreground"
                to="/app/workspaces"
              >
                Manage workspaces
              </Link>
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                      "text-foreground-muted hover:bg-muted hover:text-foreground",
                      isActive
                        ? "bg-muted text-foreground before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:bg-accent"
                        : ""
                    ].join(" ")
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="flex flex-1 items-center justify-between">
                    <span>{item.label}</span>
                    {item.to === "/app/notifications" && unreadCount > 0 ? (
                      <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-md bg-accent px-1 text-[11px] font-semibold text-white">
                        {unreadCount}
                      </span>
                    ) : null}
                  </span>
                </NavLink>
              );
            })}
          </nav>
          <div className="px-4 pb-4">
            <Button
              className="w-full justify-center"
              variant="outline"
              size="sm"
              type="button"
              onClick={handleLogout}
            >
              Sign out
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
            <div className="flex items-center gap-2 text-xs text-foreground-muted">
              <span>App</span>
              {breadcrumbs.map((crumb, index) => (
                <span key={`${crumb}-${index}`} className="flex items-center gap-2">
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-foreground">{crumb}</span>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground-muted hover:bg-muted hover:text-foreground"
                    type="button"
                    onClick={toggleTheme}
                    aria-label="Toggle theme"
                  >
                    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{theme === "dark" ? "Light mode" : "Dark mode"}</TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground hover:bg-muted"
                    type="button"
                  >
                    <Avatar size="sm" name={user?.name} email={user?.email} src={user?.avatarUrl} />
                    <span className="hidden text-left text-xs font-medium sm:block">
                      {user?.name ?? "User"}
                    </span>
                    <ChevronDown className="h-4 w-4 text-foreground-muted" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user?.email ?? "Signed in"}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/app/settings")}>
                    <Settings className="h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto w-full max-w-6xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

