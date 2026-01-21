import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import api from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspaces";
import { useAuthStore } from "@/stores/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const issueSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE"]).default("OPEN"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  labels: z.string().optional(),
  assigneeId: z.string().optional()
});

type IssueForm = z.infer<typeof issueSchema>;

type Issue = {
  _id: string;
  ticketId?: string;
  title: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  labels: string[];
  assigneeId?: { _id: string; name: string; email: string } | null;
  createdBy?: { name: string; email: string } | null;
  createdAt: string;
};

type IssueResponse = {
  issues: Issue[];
  pagination: { page: number; limit: number; total: number };
};

type Member = {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  user: { id: string; name: string; email: string };
};

const statusLabels: Record<Issue["status"], string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  DONE: "Done"
};

const priorityLabels: Record<Issue["priority"], string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High"
};

const priorityStyles: Record<Issue["priority"], string> = {
  LOW: "border-emerald-200 bg-emerald-50 text-emerald-700",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-700",
  HIGH: "border-rose-200 bg-rose-50 text-rose-700"
};

export default function IssuesPage() {
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const currentWorkspace = workspaces.find((item) => item.id === currentWorkspaceId);
  const user = useAuthStore((state) => state.user);
  const [status, setStatus] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const canCreate =
    currentWorkspace?.role === "OWNER" ||
    currentWorkspace?.role === "ADMIN" ||
    currentWorkspace?.role === "MEMBER";

  const queryKey = useMemo(
    () => ["issues", currentWorkspaceId, status, priority, page],
    [currentWorkspaceId, status, priority, page]
  );

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!currentWorkspaceId) {
        return { issues: [], pagination: { page: 1, limit: 20, total: 0 } };
      }
      const params: Record<string, string | number> = {
        page,
        limit: 10
      };
      if (status) params.status = status;
      if (priority) params.priority = priority;
      const res = await api.get(`/api/workspaces/${currentWorkspaceId}/issues`, {
        params
      });
      return res.data as IssueResponse;
    },
    enabled: Boolean(currentWorkspaceId)
  });

  const { data: membersData } = useQuery({
    queryKey: ["workspace-members", currentWorkspaceId],
    queryFn: async () => {
      if (!currentWorkspaceId) return [];
      const res = await api.get(`/api/workspaces/${currentWorkspaceId}/members`);
      return res.data.members as Member[];
    },
    enabled: Boolean(currentWorkspaceId)
  });

  const createMutation = useMutation({
    mutationFn: async (values: IssueForm) => {
      if (!currentWorkspaceId) return;
      const labels = values.labels
        ? values.labels
            .split(",")
            .map((label) => label.trim())
            .filter(Boolean)
        : [];
      await api.post(`/api/workspaces/${currentWorkspaceId}/issues`, {
        title: values.title,
        description: values.description ?? "",
        status: values.status,
        priority: values.priority,
        labels,
        assigneeId: values.assigneeId || null
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["issues", currentWorkspaceId] });
      setIsCreateOpen(false);
    }
  });

  const assignMutation = useMutation({
    mutationFn: async (issueId: string) => {
      if (!currentWorkspaceId || !user?.id) return;
      await api.patch(`/api/workspaces/${currentWorkspaceId}/issues/${issueId}`, {
        assigneeId: user.id
      });
    },
    onSuccess: async (_, issueId) => {
      await queryClient.invalidateQueries({ queryKey: ["issues", currentWorkspaceId] });
      await queryClient.invalidateQueries({ queryKey: ["issue", issueId] });
    }
  });

  const form = useForm<IssueForm>({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      status: "OPEN",
      priority: "MEDIUM"
    }
  });

  const handleCreate = async (values: IssueForm) => {
    await createMutation.mutateAsync(values);
    form.reset({
      title: "",
      description: "",
      labels: "",
      status: "OPEN",
      priority: "MEDIUM",
      assigneeId: ""
    });
  };

  if (!currentWorkspaceId) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Select a workspace</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Choose a workspace from the sidebar to start tracking issues.
        </p>
      </div>
    );
  }

  const issues = data?.issues ?? [];
  const total = data?.pagination.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (data?.pagination.limit ?? 10)));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Issues</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Track work, assign owners, and keep progress visible.
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button disabled={!canCreate}>Create Issue</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New issue</DialogTitle>
              <DialogDescription>
                Capture a title, status, and priority for the work item.
              </DialogDescription>
            </DialogHeader>
            <form className="mt-4 space-y-4" onSubmit={form.handleSubmit(handleCreate)}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="title">
                  Title
                </label>
                <Input id="title" {...form.register("title")} />
                {form.formState.errors.title ? (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.title.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="description">
                  Description
                </label>
                <Textarea id="description" {...form.register("description")} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="status">
                    Status
                  </label>
                  <select
                    id="status"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    {...form.register("status")}
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="priority">
                    Priority
                  </label>
                  <select
                    id="priority"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    {...form.register("priority")}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="labels">
                  Labels (comma separated)
                </label>
                <Input id="labels" placeholder="api, ui" {...form.register("labels")} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="assigneeId">
                  Assignee
                </label>
                <select
                  id="assigneeId"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  {...form.register("assigneeId")}
                >
                  <option value="">Unassigned</option>
                  {membersData?.map((member) => (
                    <option key={member.user.id} value={member.user.id}>
                      {member.user.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => form.reset()}>
                  Reset
                </Button>
                <Button type="submit" disabled={createMutation.isPending || !canCreate}>
                  Create issue
                </Button>
              </div>
            </form>
            {!canCreate ? (
              <p className="mt-3 text-xs text-slate-500">
                Only owners, admins, and members can create issues.
              </p>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="DONE">Done</option>
          </select>
          <select
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            value={priority}
            onChange={(event) => {
              setPriority(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>

        <div className="mt-6 space-y-3">
          {isLoading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading issues...</p>
          ) : null}
          {!isLoading && issues.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No issues found.</p>
          ) : null}
          {issues.map((issue) => (
            <div
              key={issue._id}
              className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/60 dark:hover:bg-slate-800/60"
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/app/issues/${issue._id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  navigate(`/app/issues/${issue._id}`);
                }
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
                    {issue.ticketId ?? "NO-ID"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {issue.title}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Badge variant="outline">{statusLabels[issue.status]}</Badge>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${priorityStyles[issue.priority]}`}
                    >
                      {priorityLabels[issue.priority]}
                    </span>
                    <span className="text-slate-400 dark:text-slate-600">|</span>
                    <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
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
                      {issue.assigneeId?.name ?? "Unassigned"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {issue.labels?.length ? (
                    <div className="flex flex-wrap gap-1">
                      {issue.labels.map((label) => (
                        <span
                          key={label}
                          className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {canCreate && user && issue.assigneeId?._id !== user.id ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        assignMutation.mutate(issue._id);
                      }}
                      disabled={assignMutation.isPending}
                    >
                      Assign to me
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
