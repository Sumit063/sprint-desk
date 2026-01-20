import { useWorkspaceStore } from "@/stores/workspaces";

export default function IssuesPage() {
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);

  if (!currentWorkspaceId) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Select a workspace</h2>
        <p className="mt-2 text-sm text-slate-600">
          Choose a workspace from the sidebar to start tracking issues.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Issues</h2>
      <p className="mt-2 text-sm text-slate-600">
        Issue tracking UI lands in the next phase.
      </p>
    </div>
  );
}
