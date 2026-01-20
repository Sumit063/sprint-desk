import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useWorkspaceStore } from "@/stores/workspaces";

const createSchema = z.object({
  name: z.string().min(1, "Workspace name is required")
});

const joinSchema = z.object({
  code: z.string().min(4, "Invite code is required")
});

type CreateForm = z.infer<typeof createSchema>;

type JoinForm = z.infer<typeof joinSchema>;

export default function WorkspacesPage() {
  const fetchWorkspaces = useWorkspaceStore((state) => state.fetchWorkspaces);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const createWorkspace = useWorkspaceStore((state) => state.createWorkspace);
  const joinWorkspace = useWorkspaceStore((state) => state.joinWorkspace);
  const [error, setError] = useState<string | null>(null);

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema)
  });

  const joinForm = useForm<JoinForm>({
    resolver: zodResolver(joinSchema)
  });

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const handleCreate = async (values: CreateForm) => {
    setError(null);
    try {
      await createWorkspace(values.name);
      createForm.reset();
    } catch {
      setError("Unable to create workspace");
    }
  };

  const handleJoin = async (values: JoinForm) => {
    setError(null);
    try {
      await joinWorkspace(values.code);
      joinForm.reset();
    } catch {
      setError("Invite code not valid");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Workspaces</h1>
        <p className="mt-2 text-sm text-slate-600">
          Join an existing workspace or create a new space for your team.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Create workspace</h2>
          <form className="mt-4 space-y-3" onSubmit={createForm.handleSubmit(handleCreate)}>
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="name">
                Name
              </label>
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                id="name"
                type="text"
                {...createForm.register("name")}
              />
              {createForm.formState.errors.name ? (
                <p className="mt-1 text-xs text-red-500">
                  {createForm.formState.errors.name.message}
                </p>
              ) : null}
            </div>
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              type="submit"
              disabled={createForm.formState.isSubmitting}
            >
              Create workspace
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Join workspace</h2>
          <form className="mt-4 space-y-3" onSubmit={joinForm.handleSubmit(handleJoin)}>
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="code">
                Invite code
              </label>
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                id="code"
                type="text"
                {...joinForm.register("code")}
              />
              {joinForm.formState.errors.code ? (
                <p className="mt-1 text-xs text-red-500">
                  {joinForm.formState.errors.code.message}
                </p>
              ) : null}
            </div>
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              type="submit"
              disabled={joinForm.formState.isSubmitting}
            >
              Join workspace
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Your workspaces</h2>
        <div className="mt-4 space-y-2 text-sm text-slate-600">
          {workspaces.length === 0 ? (
            <p>No workspaces yet.</p>
          ) : (
            workspaces.map((workspace) => (
              <div key={workspace.id} className="flex items-center justify-between">
                <span className="font-medium text-slate-900">{workspace.name}</span>
                <span className="text-xs uppercase text-slate-500">
                  {workspace.role}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
