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
        <p className="mt-2 text-sm text-foreground-muted">
          Join an existing workspace or create a new space for your team.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-border bg-muted px-4 py-3 text-sm text-accent">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold">Create workspace</h2>
          <form className="mt-4 space-y-3" onSubmit={createForm.handleSubmit(handleCreate)}>
            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="name">
                Name
              </label>
              <input
                className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
                id="name"
                type="text"
                {...createForm.register("name")}
              />
              {createForm.formState.errors.name ? (
                <p className="mt-1 text-xs text-accent">
                  {createForm.formState.errors.name.message}
                </p>
              ) : null}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="key">
                Workspace key
              </label>
              <input
                className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm uppercase text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
                id="key"
                type="text"
                placeholder="ACME"
                {...createForm.register("key")}
              />
              {createForm.formState.errors.key ? (
                <p className="mt-1 text-xs text-accent">
                  {createForm.formState.errors.key.message}
                </p>
              ) : (
                <p className="mt-1 text-xs text-foreground-muted">
                  Used for ticket IDs, like ACME-12.
                </p>
              )}
            </div>
            <Button type="submit" disabled={createForm.formState.isSubmitting}>
              Create workspace
            </Button>
          </form>
        </div>

        <div className="rounded-md border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold">Join workspace</h2>
          <form className="mt-4 space-y-3" onSubmit={joinForm.handleSubmit(handleJoin)}>
            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="code">
                Invite code
              </label>
              <input
                className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
                id="code"
                type="text"
                {...joinForm.register("code")}
              />
              {joinForm.formState.errors.code ? (
                <p className="mt-1 text-xs text-accent">
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

      <div className="rounded-md border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Your workspaces</h2>
        <div className="mt-4 space-y-2 text-sm text-foreground-muted">
          {workspaces.length === 0 ? (
            <p>No workspaces yet.</p>
          ) : (
            workspaces.map((workspace) => (
              <div key={workspace.id} className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-foreground">
                    {workspace.name}
                  </span>
                  <span className="ml-2 text-xs text-foreground-muted">
                    {workspace.key ?? "-"}
                  </span>
                </div>
                <span className="text-xs uppercase text-foreground-muted">
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

