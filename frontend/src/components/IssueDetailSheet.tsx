import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const commentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty")
});

type CommentForm = z.infer<typeof commentSchema>;

type IssueDetail = {
  _id: string;
  title: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  labels: string[];
  assigneeId?: { name: string; email: string } | null;
  createdBy?: { name: string; email: string } | null;
};

type Comment = {
  _id: string;
  body: string;
  userId: { name: string; email: string };
  createdAt: string;
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
  const queryClient = useQueryClient();

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

  const updateMutation = useMutation({
    mutationFn: async (payload: { status?: IssueDetail["status"]; priority?: IssueDetail["priority"] }) => {
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
    updateMutation.mutate({ status: value });
  };

  const handlePriorityChange = (value: IssueDetail["priority"]) => {
    updateMutation.mutate({ priority: value });
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
                      }`}
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
                      }`}
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
                <Textarea placeholder="Add a comment" {...commentForm.register("body")} />
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
