import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useWorkspaceStore } from "@/stores/workspaces";
import { Button } from "@/components/ui/button";

const createSchema = z.object({
  name: z.string().min(1, "Workspace name is required"),
  key: z
    .string()
    .min(2, "Workspace key is required")
    .max(10, "Keep the key short")
    .regex(/^[A-Za-z0-9]+$/, "Use only letters and numbers")
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
      await createWorkspace({
        name: values.name,
        key: values.key.toUpperCase()
      });
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
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Join an existing workspace or create a new space for your team.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Create workspace</h2>
          <form className="mt-4 space-y-3" onSubmit={createForm.handleSubmit(handleCreate)}>
            <div>
              <label
                className="text-sm font-medium text-slate-700 dark:text-slate-200"
                htmlFor="name"
              >
                Name
              </label>
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
            <div>
              <label
                className="text-sm font-medium text-slate-700 dark:text-slate-200"
                htmlFor="key"
              >
                Workspace key
              </label>
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                id="key"
                type="text"
                placeholder="ACME"
                {...createForm.register("key")}
              />
              {createForm.formState.errors.key ? (
                <p className="mt-1 text-xs text-red-500">
                  {createForm.formState.errors.key.message}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Used for ticket IDs, like ACME-12.
                </p>
              )}
            </div>
            <Button type="submit" disabled={createForm.formState.isSubmitting}>
              Create workspace
            </Button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Join workspace</h2>
          <form className="mt-4 space-y-3" onSubmit={joinForm.handleSubmit(handleJoin)}>
            <div>
              <label
                className="text-sm font-medium text-slate-700 dark:text-slate-200"
                htmlFor="code"
              >
                Invite code
              </label>
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
            <Button type="submit" disabled={joinForm.formState.isSubmitting}>
              Join workspace
            </Button>
          </form>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Your workspaces</h2>
        <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
          {workspaces.length === 0 ? (
            <p>No workspaces yet.</p>
          ) : (
            workspaces.map((workspace) => (
              <div key={workspace.id} className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {workspace.name}
                  </span>
                  <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                    {workspace.key ?? "-"}
                  </span>
                </div>
                <span className="text-xs uppercase text-slate-500 dark:text-slate-400">
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
