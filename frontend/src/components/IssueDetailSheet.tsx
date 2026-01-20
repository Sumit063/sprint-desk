import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import api from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspaces";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
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

type IssueDetailSheetProps = {
  issueId: string | null;
  onClose: () => void;
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

export default function IssueDetailSheet({ issueId, onClose }: IssueDetailSheetProps) {
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
      onClose();
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

  return (
    <Sheet open={Boolean(issueId)} onOpenChange={(open) => (open ? null : onClose())}>
      <SheetContent>
        {isLoading || !issueData ? (
          <div className="text-sm text-slate-500">Loading issue...</div>
        ) : (
          <div className="space-y-6">
            <SheetHeader>
              <SheetTitle>{issueData.title}</SheetTitle>
              <SheetDescription>{issueData.description || "No description"}</SheetDescription>
            </SheetHeader>

            {!canEdit ? (
              <p className="text-xs text-slate-500">
                Only owners, admins, and members can edit this issue.
              </p>
            ) : null}

            <form className="space-y-4" onSubmit={editForm.handleSubmit(handleEditSubmit)}>
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
                  Labels (comma separated)
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
              <div className="flex items-center justify-between">
                <Button variant="outline" type="button" onClick={handleDelete} disabled={!canEdit}>
                  Delete issue
                </Button>
                <Button type="submit" disabled={!canEdit || updateMutation.isPending}>
                  Save changes
                </Button>
              </div>
            </form>

            <div className="space-y-3">
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
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        issueData.priority === priority
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 text-slate-600"
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
                  Labels
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {issueData.labels?.length ? (
                    issueData.labels.map((label) => (
                      <Badge key={label} variant="outline">
                        {label}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">No labels</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Comments</h3>
              <div className="space-y-3">
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
                      <p className="mt-2 text-slate-700">{comment.body}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No comments yet.</p>
                )}
              </div>
              <form
                className="space-y-3"
                onSubmit={commentForm.handleSubmit((values) => commentMutation.mutate(values))}
              >
                <Textarea placeholder="Add a comment (use @email to mention)" {...commentForm.register("body")} />
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
        )}
      </SheetContent>
    </Sheet>
  );
}
