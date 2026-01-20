import { useWorkspaceStore } from "@/stores/workspaces";

export default function KnowledgeBasePage() {
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);

  if (!currentWorkspaceId) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Select a workspace</h2>
        <p className="mt-2 text-sm text-slate-600">
          Choose a workspace from the sidebar to view knowledge base articles.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Knowledge Base</h2>
      <p className="mt-2 text-sm text-slate-600">
        Markdown articles will appear here in a later phase.
      </p>
    </div>
  );
}
