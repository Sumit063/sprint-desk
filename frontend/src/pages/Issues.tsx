import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import api from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspaces";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import IssueDetailSheet from "@/components/IssueDetailSheet";

const issueSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE"]).default("OPEN"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  labels: z.string().optional()
});

type IssueForm = z.infer<typeof issueSchema>;

type Issue = {
  _id: string;
  title: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  labels: string[];
  assigneeId?: { name: string; email: string } | null;
  createdBy?: { name: string; email: string } | null;
  createdAt: string;
};

type IssueResponse = {
  issues: Issue[];
  pagination: { page: number; limit: number; total: number };
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

export default function IssuesPage() {
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const [status, setStatus] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [page, setPage] = useState(1);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const queryClient = useQueryClient();

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
        labels
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["issues", currentWorkspaceId] });
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
    form.reset({ title: "", description: "", labels: "", status: "OPEN", priority: "MEDIUM" });
  };

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

  const issues = data?.issues ?? [];
  const total = data?.pagination.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (data?.pagination.limit ?? 10)));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Issues</h1>
          <p className="mt-1 text-sm text-slate-600">
            Track work, assign owners, and keep progress visible.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Create Issue</Button>
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
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
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
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
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
              <div className="flex items-center justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => form.reset()}>
                  Reset
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  Create issue
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm"
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
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm"
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

        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assignee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4}>Loading issues...</TableCell>
                </TableRow>
              ) : null}
              {!isLoading && issues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>No issues found.</TableCell>
                </TableRow>
              ) : null}
              {issues.map((issue) => (
                <TableRow
                  key={issue._id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => setSelectedIssueId(issue._id)}
                >
                  <TableCell className="font-medium text-slate-900">
                    {issue.title}
                    {issue.labels?.length ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {issue.labels.map((label) => (
                          <Badge key={label} variant="outline">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{statusLabels[issue.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{priorityLabels[issue.priority]}</Badge>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {issue.assigneeId?.name ?? "Unassigned"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

      <IssueDetailSheet
        issueId={selectedIssueId}
        onClose={() => setSelectedIssueId(null)}
      />
    </div>
  );
}
