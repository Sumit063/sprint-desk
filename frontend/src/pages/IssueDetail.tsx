import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { z } from "zod";
import api from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspaces";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const commentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty")
});

const editSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  labels: z.string().optional(),
  assigneeId: z.string().optional()
});

type CommentForm = z.infer<typeof commentSchema>;

type EditForm = z.infer<typeof editSchema>;

type IssueDetail = {
  _id: string;
  title: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  labels: string[];
  assigneeId?: { _id: string; name: string; email: string } | null;
  createdBy?: { name: string; email: string } | null;
  createdAt?: string;
};

type Comment = {
  _id: string;
  body: string;
  userId: { name: string; email: string };
  createdAt: string;
};

type Member = {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  user: { id: string; name: string; email: string };
};

const statusLabels: Record<IssueDetail["status"], string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  DONE: "Done"
};

const priorityLabels: Record<IssueDetail["priority"], string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High"
};

const priorityStyles: Record<IssueDetail["priority"], string> = {
  LOW: "border-emerald-200 bg-emerald-50 text-emerald-700",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-700",
  HIGH: "border-rose-200 bg-rose-50 text-rose-700"
};

const mentionRegex = /@([\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/g;

const renderCommentBody = (body: string) => {
  const parts = body.split(mentionRegex);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return (
        <span key={`mention-${index}`} className="font-medium text-blue-600">
          @{part}
        </span>
      );
    }
    return <span key={`text-${index}`}>{part}</span>;
  });
};

export default function IssueDetailPage() {
  const { issueId } = useParams();
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const currentWorkspace = workspaces.find((item) => item.id === currentWorkspaceId);
  const queryClient = useQueryClient();

  const canEdit =
    currentWorkspace?.role === "OWNER" ||
    currentWorkspace?.role === "ADMIN" ||
    currentWorkspace?.role === "MEMBER";

  const { data: issueData, isLoading } = useQuery({
    queryKey: ["issue", issueId],
    queryFn: async () => {
      if (!currentWorkspaceId || !issueId) return null;
      const res = await api.get(`/api/workspaces/${currentWorkspaceId}/issues/${issueId}`);
      return res.data.issue as IssueDetail;
    },
    enabled: Boolean(currentWorkspaceId && issueId)
  });

  const { data: commentsData } = useQuery({
    queryKey: ["issue-comments", issueId],
    queryFn: async () => {
      if (!issueId) return [];
      const res = await api.get(`/api/issues/${issueId}/comments`);
      return res.data.comments as Comment[];
    },
    enabled: Boolean(issueId)
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

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema)
  });

  useEffect(() => {
    if (!issueData) return;
    editForm.reset({
      title: issueData.title,
      description: issueData.description ?? "",
      labels: issueData.labels?.join(", ") ?? "",
      assigneeId: issueData.assigneeId?._id ?? ""
    });
  }, [issueData, editForm]);

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      status?: IssueDetail["status"];
      priority?: IssueDetail["priority"];
      title?: string;
      description?: string;
      labels?: string[];
      assigneeId?: string | null;
    }) => {
      if (!currentWorkspaceId || !issueId) return;
      await api.patch(`/api/workspaces/${currentWorkspaceId}/issues/${issueId}`, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["issues", currentWorkspaceId] });
      await queryClient.invalidateQueries({ queryKey: ["issue", issueId] });
      toast.success("Issue updated");
    },
    onError: () => toast.error("Unable to update issue")
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!currentWorkspaceId || !issueId) return;
      await api.delete(`/api/workspaces/${currentWorkspaceId}/issues/${issueId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["issues", currentWorkspaceId] });
      toast.success("Issue deleted");
    },
    onError: () => toast.error("Unable to delete issue")
  });

  const commentForm = useForm<CommentForm>({
    resolver: zodResolver(commentSchema)
  });

  const commentMutation = useMutation({
    mutationFn: async (payload: CommentForm) => {
      if (!issueId) return;
      await api.post(`/api/issues/${issueId}/comments`, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["issue-comments", issueId] });
      commentForm.reset();
      toast.success("Comment added");
    },
    onError: () => toast.error("Unable to add comment")
  });

  const handleStatusChange = (value: IssueDetail["status"]) => {
    if (!canEdit) return;
    updateMutation.mutate({ status: value });
  };

  const handlePriorityChange = (value: IssueDetail["priority"]) => {
    if (!canEdit) return;
    updateMutation.mutate({ priority: value });
  };

  const handleEditSubmit = (values: EditForm) => {
    if (!canEdit) return;
    const labels = values.labels
      ? values.labels
          .split(",")
          .map((label) => label.trim())
          .filter(Boolean)
      : [];
    updateMutation.mutate({
      title: values.title,
      description: values.description ?? "",
      labels,
      assigneeId: values.assigneeId || null
    });
  };

  const handleDelete = () => {
    if (!canEdit) return;
    if (window.confirm("Delete this issue? This cannot be undone.")) {
      deleteMutation.mutate();
    }
  };

  if (!issueId) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Issue not found</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link className="text-xs font-medium text-slate-500" to="/app/issues">
            ? Back to issues
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            {issueData?.title ?? "Issue details"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {issueData ? (
              <>
                <Badge variant="outline">{statusLabels[issueData.status]}</Badge>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-medium ${
                    priorityStyles[issueData.priority]
                  }`}
                >
                  {priorityLabels[issueData.priority]}
                </span>
                <span className="text-slate-400">?</span>
                <span className="text-blue-600 font-medium">
                  {issueData.assigneeId?.name ?? "Unassigned"}
                </span>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleDelete} disabled={!canEdit}>
            Delete issue
          </Button>
          <Button onClick={editForm.handleSubmit(handleEditSubmit)} disabled={!canEdit}>
            Save changes
          </Button>
        </div>
      </div>

      {isLoading || !issueData ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Loading issue...</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Description</h2>
              <p className="mt-2 text-sm text-slate-600">
                {issueData.description || "No description yet."}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Comments</h2>
              <div className="mt-4 space-y-3">
                {commentsData?.length ? (
                  commentsData.map((comment) => (
                    <div
                      key={comment._id}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{comment.userId?.name ?? "User"}</span>
                        <span>{new Date(comment.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-2 text-slate-700">{renderCommentBody(comment.body)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No comments yet.</p>
                )}
              </div>
              <form
                className="mt-4 space-y-3"
                onSubmit={commentForm.handleSubmit((values) => commentMutation.mutate(values))}
              >
                <Textarea
                  placeholder="Add a comment (use @email to mention)"
                  {...commentForm.register("body")}
                />
                {commentForm.formState.errors.body ? (
                  <p className="text-xs text-red-500">
                    {commentForm.formState.errors.body.message}
                  </p>
                ) : null}
                <div className="flex justify-end">
                  <Button type="submit" disabled={commentMutation.isPending}>
                    Post comment
                  </Button>
                </div>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Details</h2>
              {!canEdit ? (
                <p className="mt-2 text-xs text-slate-500">
                  Only owners, admins, and members can edit this issue.
                </p>
              ) : null}
              <form className="mt-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="title">
                    Title
                  </label>
                  <Input id="title" {...editForm.register("title")} disabled={!canEdit} />
                  {editForm.formState.errors.title ? (
                    <p className="text-xs text-red-500">
                      {editForm.formState.errors.title.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="description">
                    Description
                  </label>
                  <Textarea
                    id="description"
                    {...editForm.register("description")}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="labels">
                    Labels
                  </label>
                  <Input id="labels" {...editForm.register("labels")} disabled={!canEdit} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="assigneeId">
                    Assignee
                  </label>
                  <select
                    id="assigneeId"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    {...editForm.register("assigneeId")}
                    disabled={!canEdit}
                  >
                    <option value="">Unassigned</option>
                    {membersData?.map((member) => (
                      <option key={member.user.id} value={member.user.id}>
                        {member.user.name}
                      </option>
                    ))}
                  </select>
                </div>
              </form>

              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.keys(statusLabels).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleStatusChange(status as IssueDetail["status"])}
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          issueData.status === status
                            ? "bg-slate-900 text-white"
                            : "border border-slate-200 text-slate-600"
                        } ${!canEdit ? "opacity-50" : ""}`}
                        disabled={!canEdit}
                      >
                        {statusLabels[status as IssueDetail["status"]]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Priority
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.keys(priorityLabels).map((priority) => (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => handlePriorityChange(priority as IssueDetail["priority"])}
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${
                          issueData.priority === priority
                            ? priorityStyles[priority as IssueDetail["priority"]]
                            : "border-slate-200 text-slate-600"
                        } ${!canEdit ? "opacity-50" : ""}`}
                        disabled={!canEdit}
                      >
                        {priorityLabels[priority as IssueDetail["priority"]]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Tags
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {issueData.labels?.length ? (
                      issueData.labels.map((label) => (
                        <span
                          key={label}
                          className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                        >
                          {label}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">No tags</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
