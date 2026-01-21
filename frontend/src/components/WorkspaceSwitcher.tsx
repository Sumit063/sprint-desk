import { useEffect } from "react";
import { useWorkspaceStore } from "@/stores/workspaces";

export default function WorkspaceSwitcher() {
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const setCurrentWorkspace = useWorkspaceStore((state) => state.setCurrentWorkspace);
  const fetchWorkspaces = useWorkspaceStore((state) => state.fetchWorkspaces);

  useEffect(() => {
    if (workspaces.length === 0) {
      fetchWorkspaces();
    }
  }, [fetchWorkspaces, workspaces.length]);

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
        Workspace
      </label>
      <select
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
        value={currentWorkspaceId ?? ""}
        onChange={(event) => setCurrentWorkspace(event.target.value)}
      >
        <option value="" disabled>
          Select a workspace
        </option>
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name}
          </option>
        ))}
      </select>
    </div>
  );
}

