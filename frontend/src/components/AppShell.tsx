import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";

const navItems = [
  { label: "Issues", to: "/app/issues" },
  { label: "Knowledge Base", to: "/app/kb" },
  { label: "Settings", to: "/app/settings" }
];

export default function AppShell() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white p-6">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          SprintDesk
        </div>
        <div className="mt-6">
          <WorkspaceSwitcher />
          <Link
            className="mt-2 inline-block text-xs font-medium text-slate-500 hover:text-slate-700"
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
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          className="mt-4 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          type="button"
          onClick={handleLogout}
        >
          Sign out
        </button>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <p className="text-sm font-medium">Welcome back</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
