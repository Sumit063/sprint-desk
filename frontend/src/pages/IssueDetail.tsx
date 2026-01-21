import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { z } from "zod";
import api from "@/lib/api";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { useWorkspaceStore } from "@/stores/workspaces";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import {
  statusLabels,
  statusStyles,
  priorityLabels,
  priorityStyles,
  type IssuePriority,
  type IssueStatus
} from "@/lib/issueMeta";
import { setIssueBreadcrumb, setKbBreadcrumb } from "@/lib/breadcrumbs";

const commentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty")
});

const editSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  labels: z.string().optional(),
  assigneeId: z.string().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"])
});

type CommentForm = z.infer<typeof commentSchema>;

type EditForm = z.infer<typeof editSchema>;

type IssueDetail = {
  _id: string;
  ticketId?: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  labels: string[];
  assigneeId?: { _id: string; name: string; email: string; avatarUrl?: string | null } | null;
  createdBy?: { name: string; email: string; avatarUrl?: string | null } | null;
  createdAt?: string;
  updatedAt?: string;
};

type Comment = {
  _id: string;
  body: string;
  userId: { name: string; email: string; avatarUrl?: string | null };
  createdAt: string;
};

type Member = {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  user: { id: string; name: string; email: string; avatarUrl?: string | null };
};

type Article = {
  _id: string;
  title: string;
  kbId?: string;
  linkedIssueIds?: string[];
};


const mentionRegex = /@([\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/g;

const renderCommentBody = (body: string, mentionMap: Map<string, string>) => {
  const parts = body.split(mentionRegex);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      const lookup = mentionMap.get(part.toLowerCase()) ?? part;
      return (
        <span key={`mention-${index}`} className="font-medium text-accent">
          @{lookup}
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
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const canEdit =
    currentWorkspace?.role === "OWNER" ||
    currentWorkspace?.role === "ADMIN" ||
    currentWorkspace?.role === "MEMBER";

  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState<number | null>(null);
  const [mentionCursor, setMentionCursor] = useState<number | null>(null);
  const [mentionPosition, setMentionPosition] = useState<{ left: number; top: number } | null>(
    null
  );
  const [linkKbOpen, setLinkKbOpen] = useState(false);
  const [linkKbQuery, setLinkKbQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  const mentionMap = useMemo(() => {
    const map = new Map<string, string>();
    (membersData ?? []).forEach((member) => {
      map.set(member.user.email.toLowerCase(), member.user.name);
    });
    return map;
  }, [membersData]);

  const { data: linkedArticles } = useQuery({
    queryKey: ["articles", currentWorkspaceId, issueId],
    queryFn: async () => {
      if (!currentWorkspaceId || !issueId) return [];
      const res = await api.get(`/api/workspaces/${currentWorkspaceId}/articles`, {
        params: { issueId }
      });
      return res.data.articles as Article[];
    },
    enabled: Boolean(currentWorkspaceId && issueId)
  });

  const { data: allArticles } = useQuery({
    queryKey: ["articles", currentWorkspaceId],
    queryFn: async () => {
      if (!currentWorkspaceId) return [];
      const res = await api.get(`/api/workspaces/${currentWorkspaceId}/articles`);
      return res.data.articles as Article[];
    },
    enabled: Boolean(currentWorkspaceId)
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: "",
      description: "",
      labels: "",
      assigneeId: "",
      status: "OPEN",
      priority: "MEDIUM"
    }
  });

  useEffect(() => {
    if (!issueData) return;
    editForm.reset({
      title: issueData.title,
      description: issueData.description ?? "",
      labels: issueData.labels?.join(", ") ?? "",
      assigneeId: issueData.assigneeId?._id ?? "",
      status: issueData.status,
      priority: issueData.priority
    });
  }, [issueData, editForm]);

  useEffect(() => {
    if (!issueId || !issueData?.ticketId || typeof window === "undefined") {
      return;
    }
    setIssueBreadcrumb(issueId, issueData.ticketId);
  }, [issueId, issueData?.ticketId]);

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
      setIsEditing(false);
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

  const linkArticleMutation = useMutation({
    mutationFn: async (article: Article) => {
      if (!currentWorkspaceId || !issueId) return;
      const nextLinked = Array.from(
        new Set([...(article.linkedIssueIds ?? []), issueId])
      );
      await api.patch(`/api/workspaces/${currentWorkspaceId}/articles/${article._id}`, {
        linkedIssueIds: nextLinked
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["articles", currentWorkspaceId] });
      await queryClient.invalidateQueries({
        queryKey: ["articles", currentWorkspaceId, issueId]
      });
      setLinkKbOpen(false);
      setLinkKbQuery("");
      toast.success("Knowledge base linked");
    },
    onError: () => toast.error("Unable to link knowledge base")
  });

  const commentMutation = useMutation({
    mutationFn: async (payload: CommentForm) => {
      if (!issueId) return;
      await api.post(`/api/issues/${issueId}/comments`, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["issue", issueId] });
      await queryClient.invalidateQueries({ queryKey: ["issue-comments", issueId] });
      commentForm.reset();
      setMentionIndex(null);
      setMentionQuery("");
      setMentionCursor(null);
      setMentionPosition(null);
      toast.success("Comment added");
    },
    onError: () => toast.error("Unable to add comment")
  });

  const commentRegister = commentForm.register("body");

  const mentionOptions = (membersData ?? []).map((member) => member.user);
  const mentionMatches =
    mentionIndex !== null
      ? mentionOptions.filter((member) => {
          const query = mentionQuery.toLowerCase();
          return (
            !query ||
            member.name.toLowerCase().includes(query) ||
            member.email.toLowerCase().includes(query)
          );
        })
      : [];

  const linkedArticleIds = useMemo(() => {
    return new Set((linkedArticles ?? []).map((article) => article._id));
  }, [linkedArticles]);

  const availableArticles = useMemo(() => {
    const list = (allArticles ?? []).filter((article) => !linkedArticleIds.has(article._id));
    const query = linkKbQuery.trim().toLowerCase();
    if (!query) return list;
    return list.filter((article) => {
      const id = article.kbId?.toLowerCase() ?? "";
      return id.includes(query) || article.title.toLowerCase().includes(query);
    });
  }, [allArticles, linkedArticleIds, linkKbQuery]);

  const handleCommentChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    commentRegister.onChange(event);
    const value = event.target.value;
    const cursor = event.target.selectionStart ?? value.length;
    const lastAt = value.lastIndexOf("@", cursor - 1);
    if (lastAt === -1) {
      setMentionIndex(null);
      setMentionQuery("");
      setMentionCursor(null);
      setMentionPosition(null);
      return;
    }

    const fragment = value.slice(lastAt + 1, cursor);
    if (fragment.includes(" ") || fragment.includes("\n")) {
      setMentionIndex(null);
      setMentionQuery("");
      setMentionCursor(null);
      setMentionPosition(null);
      return;
    }

    setMentionIndex(lastAt);
    setMentionQuery(fragment);
    setMentionCursor(cursor);

    const textarea = textareaRef.current;
    if (textarea) {
      const style = window.getComputedStyle(textarea);
      const parsedLineHeight = Number.parseFloat(style.lineHeight);
      const lineHeight = Number.isNaN(parsedLineHeight) ? 18 : parsedLineHeight;
      const paddingLeft = parseFloat(style.paddingLeft || "0");
      const paddingTop = parseFloat(style.paddingTop || "0");
      const font =
        style.font ||
        `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const textBefore = value.slice(0, cursor);
      const lines = textBefore.split("\n");
      const lastLine = lines[lines.length - 1] ?? "";
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.font = font;
        const textWidth = ctx.measureText(lastLine).width;
        const leftRaw = paddingLeft + textWidth;
        const topRaw = paddingTop + lineHeight * (lines.length - 1);
        const dropdownWidth = 240;
        const maxLeft = Math.max(8, textarea.clientWidth - dropdownWidth - 8);
        const left = Math.min(Math.max(leftRaw, 8), maxLeft);
        setMentionPosition({ left, top: topRaw + lineHeight });
      }
    }
  };

  const handleSelectMention = (member: Member["user"]) => {
    const value = commentForm.getValues("body") ?? "";
    const cursor = mentionCursor ?? value.length;
    const start = mentionIndex ?? value.lastIndexOf("@", cursor - 1);
    if (start === -1) {
      return;
    }
    const mentionText = `@${member.email}`;
    const nextValue = `${value.slice(0, start)}${mentionText} ${value.slice(cursor)}`;
    commentForm.setValue("body", nextValue, { shouldDirty: true, shouldTouch: true });
    setMentionIndex(null);
    setMentionQuery("");
    setMentionCursor(null);
    setMentionPosition(null);

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const nextCursor = start + mentionText.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(nextCursor, nextCursor);
      }
    });
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
      assigneeId: values.assigneeId || null,
      status: values.status,
      priority: values.priority
    });
  };

  const handleStatusSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    if (!canEdit) return;
    const nextStatus = event.target.value as IssueDetail["status"];
    updateMutation.mutate({ status: nextStatus });
  };

  const handleDelete = () => {
    if (!canEdit) return;
    deleteMutation.mutate();
    setDeleteOpen(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (!issueData) return;
    editForm.reset({
      title: issueData.title,
      description: issueData.description ?? "",
      labels: issueData.labels?.join(", ") ?? "",
      assigneeId: issueData.assigneeId?._id ?? "",
      status: issueData.status,
      priority: issueData.priority
    });
  };

  const handleAssignToMe = () => {
    if (!user?.id || !canEdit) return;
    updateMutation.mutate({ assigneeId: user.id });
  };

  if (!issueId) {
    return (
      <div className="rounded-md border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Issue not found</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            className="inline-flex items-center gap-2 text-xs font-medium text-accent hover:text-accent-hover"
            to="/app/issues"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to issues
          </Link>
          <div className="mt-2 flex flex-wrap items-baseline gap-3">
            <span className="text-lg font-semibold tracking-wide text-accent">
              {issueData?.ticketId ?? "ISSUE"}
            </span>
            <h1 className="text-2xl font-semibold text-foreground">
              {issueData?.title ?? "Issue details"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && user && issueData?.assigneeId?._id !== user.id ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAssignToMe}
              disabled={updateMutation.isPending}
            >
              Assign to me
            </Button>
          ) : null}
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button
                onClick={editForm.handleSubmit(handleEditSubmit)}
                disabled={!canEdit || updateMutation.isPending}
              >
                Save changes
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              disabled={!canEdit}
              aria-label="Edit issue"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={!canEdit} aria-label="Delete issue">
                <Trash2 className="h-4 w-4 text-foreground-muted" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete issue?</DialogTitle>
                <DialogDescription>
                  This permanently removes the issue, comments, and activity log.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  className="bg-accent text-white hover:bg-accent-hover"
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading || !issueData ? (
        <div className="rounded-md border border-border bg-surface p-6">
          <p className="text-sm text-foreground-muted">Loading issue...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {isEditing ? (
            <div className="rounded-md border border-border bg-surface p-6">
              <h2 className="text-lg font-semibold">Edit details</h2>
              {!canEdit ? (
                <p className="mt-2 text-xs text-foreground-muted">
                  Only owners, admins, and members can edit this issue.
                </p>
              ) : null}
              <form
                className="mt-4 space-y-4"
                onSubmit={editForm.handleSubmit(handleEditSubmit)}
              >
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-foreground"
                    htmlFor="title"
                  >
                    Title
                  </label>
                  <Input id="title" {...editForm.register("title")} disabled={!canEdit} />
                  {editForm.formState.errors.title ? (
                    <p className="text-xs text-accent">
                      {editForm.formState.errors.title.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-foreground"
                    htmlFor="description"
                  >
                    Description
                  </label>
                  <Textarea
                    id="description"
                    {...editForm.register("description")}
                    disabled={!canEdit}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium text-foreground"
                      htmlFor="status"
                    >
                      Status
                    </label>
                    <select
                      id="status"
                      className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                      {...editForm.register("status")}
                      disabled={!canEdit}
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In progress</option>
                      <option value="DONE">Done</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium text-foreground"
                      htmlFor="priority"
                    >
                      Priority
                    </label>
                    <select
                      id="priority"
                      className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                      {...editForm.register("priority")}
                      disabled={!canEdit}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-foreground"
                    htmlFor="labels"
                  >
                    Labels
                  </label>
                  <Input id="labels" {...editForm.register("labels")} disabled={!canEdit} />
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-foreground"
                    htmlFor="assigneeId"
                  >
                    Assignee
                  </label>
                  <select
                    id="assigneeId"
                    className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
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
            </div>
          ) : (
            <>
              <div className="rounded-md border border-border bg-surface p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Overview</h2>
                  <div className="flex items-center gap-2 text-xs">
                    {canEdit ? (
                      <select
                        className="h-7 rounded-md border border-border bg-surface px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
                        value={issueData.status}
                        onChange={handleStatusSelect}
                        disabled={updateMutation.isPending}
                      >
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In progress</option>
                        <option value="DONE">Done</option>
                      </select>
                    ) : (
                      <span
                        className={`rounded-md border px-2.5 py-0.5 ${statusStyles[issueData.status]}`}
                      >
                        {statusLabels[issueData.status]}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 font-medium ${priorityStyles[issueData.priority]}`}
                    >
                      {priorityLabels[issueData.priority]}
                    </span>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
                      Assignee
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-foreground">
                      <Avatar
                        size="xs"
                        name={issueData.assigneeId?.name ?? "Unassigned"}
                        email={issueData.assigneeId?.email}
                        src={issueData.assigneeId?.avatarUrl ?? null}
                      />
                      <span className="text-sm font-medium">
                        {issueData.assigneeId?.name ?? "Unassigned"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
                      Reporter
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-foreground">
                      <Avatar
                        size="xs"
                        name={issueData.createdBy?.name ?? "Unknown"}
                        email={issueData.createdBy?.email}
                        src={issueData.createdBy?.avatarUrl ?? null}
                      />
                      <span className="text-sm font-medium">
                        {issueData.createdBy?.name ?? "Unknown"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
                      Created
                    </p>
                    <p className="mt-1 text-foreground">
                      {issueData.createdAt
                        ? new Date(issueData.createdAt).toLocaleString()
                        : "Unknown"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
                      Updated
                    </p>
                    <p className="mt-1 text-foreground">
                      {issueData.updatedAt
                        ? new Date(issueData.updatedAt).toLocaleString()
                        : "Unknown"}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
                    Tags
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {issueData.labels?.length ? (
                      issueData.labels.map((label) => (
                        <span
                          key={label}
                          className="rounded-md border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
                        >
                          {label}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-foreground-muted">
                        No tags
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-border bg-surface p-6">
                <h2 className="text-lg font-semibold">Description</h2>
                <p className="mt-2 text-sm text-foreground-muted">
                  {issueData.description || "No description yet."}
                </p>
              </div>

              <div className="rounded-md border border-border bg-surface p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Linked knowledge base</h2>
                  {canEdit ? (
                    <Dialog open={linkKbOpen} onOpenChange={setLinkKbOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Add KB
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Link knowledge base</DialogTitle>
                          <DialogDescription>
                            Search by KB ID or article title.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4 space-y-3">
                          <Input
                            placeholder="Search KB ID or title"
                            value={linkKbQuery}
                            onChange={(event) => setLinkKbQuery(event.target.value)}
                          />
                          <div className="max-h-64 space-y-2 overflow-y-auto">
                            {availableArticles.length === 0 ? (
                              <p className="text-sm text-foreground-muted">
                                No KB articles available to link.
                              </p>
                            ) : (
                              availableArticles.map((article) => (
                                <div
                                  key={article._id}
                                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                                >
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground-muted">
                                      {article.kbId ?? "KB"}
                                    </p>
                                    <p className="text-sm font-medium text-foreground">
                                      {article.title}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => linkArticleMutation.mutate(article)}
                                    disabled={linkArticleMutation.isPending}
                                  >
                                    Link
                                  </Button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : null}
                </div>
                {linkedArticles && linkedArticles.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {linkedArticles.map((article) => (
                      <Link
                        key={article._id}
                        to={`/app/kb?articleId=${article._id}`}
                        onClick={() =>
                          setKbBreadcrumb(article._id, article.kbId ?? article.title ?? "Article")
                        }
                        className="block rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-accent hover:text-accent"
                      >
                        {article.kbId ? `${article.kbId} — ${article.title}` : article.title}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-foreground-muted">
                    No knowledge base linked yet.
                  </p>
                )}
              </div>
            </>
          )}

          <div className="rounded-md border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold">Comments</h2>
            <div className="mt-4 space-y-3">
              {commentsData?.length ? (
                commentsData.map((comment) => (
                  <div
                    key={comment._id}
                    className="rounded-md border border-border bg-muted px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between text-xs text-foreground-muted">
                      <div className="flex items-center gap-2 text-foreground">
                        <Avatar
                          size="xs"
                          name={comment.userId?.name ?? "User"}
                          email={comment.userId?.email}
                          src={comment.userId?.avatarUrl ?? null}
                        />
                        <span className="text-xs font-medium text-foreground">
                          {comment.userId?.name ?? "User"}
                        </span>
                      </div>
                      <span>{new Date(comment.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 text-foreground">
                      {renderCommentBody(comment.body, mentionMap)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-foreground-muted">No comments yet.</p>
              )}
            </div>
            <form
              className="mt-4 space-y-3"
              onSubmit={commentForm.handleSubmit((values) => commentMutation.mutate(values))}
            >
              <div className="relative">
                <Textarea
                  ref={(element) => {
                    commentRegister.ref(element);
                    textareaRef.current = element;
                  }}
                  placeholder="Add a comment (use @ to mention)"
                  {...commentRegister}
                  onChange={handleCommentChange}
                />
                {mentionIndex !== null && mentionMatches.length > 0 ? (
                  <div
                    className="absolute left-0 top-full z-10 mt-2 max-h-48 w-60 max-w-[70%] overflow-auto rounded-md border border-border bg-surface p-2"
                    style={
                      mentionPosition
                        ? { left: mentionPosition.left, top: mentionPosition.top }
                        : undefined
                    }
                  >
                    {mentionMatches.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          handleSelectMention(member);
                        }}
                      >
                        <span className="font-medium">{member.name}</span>
                        <span className="text-xs text-foreground-muted">{member.email}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              {commentForm.formState.errors.body ? (
                <p className="text-xs text-accent">
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
    </div>
  );
}


