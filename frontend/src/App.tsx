import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppShell from "@/components/AppShell";
import LoginPage from "@/pages/Login";
import RegisterPage from "@/pages/Register";
import IssuesPage from "@/pages/Issues";
import IssueDetailPage from "@/pages/IssueDetail";
import KnowledgeBasePage from "@/pages/KnowledgeBase";
import NotificationsPage from "@/pages/Notifications";
import SettingsPage from "@/pages/Settings";
import WorkspacesPage from "@/pages/Workspaces";
import { useAuthStore } from "@/stores/auth";
import { Toaster } from "sonner";

function RequireAuth({ children }: { children: JSX.Element }) {
  const user = useAuthStore((state) => state.user);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const stored = window.localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.classList.toggle("dark", stored === "dark");
      return;
    }
    document.documentElement.classList.toggle(
      "dark",
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        Loading session...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster
        richColors
        position="top-right"
        closeButton
        toastOptions={{ className: "rounded-md" }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<IssuesPage />} />
          <Route path="issues" element={<IssuesPage />} />
          <Route path="issues/:issueId" element={<IssueDetailPage />} />
          <Route path="kb" element={<KnowledgeBasePage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="workspaces" element={<WorkspacesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
