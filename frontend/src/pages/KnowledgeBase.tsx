import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { z } from "zod";
import { X } from "lucide-react";
import api from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { statusLabels, statusStyles, type IssueStatus } from "@/lib/issueMeta";
import { setIssueBreadcrumb, setKbBreadcrumb } from "@/lib/breadcrumbs";

const articleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().optional()
});

type ArticleForm = z.infer<typeof articleSchema>;

type Article = {
  _id: string;
  kbId?: string;
  title: string;
  body: string;
  linkedIssueIds: string[];
  createdAt: string;
  updatedAt?: string;
  createdBy?: { name: string; email: string; avatarUrl?: string | null } | null;
  updatedBy?: { name: string; email: string; avatarUrl?: string | null } | null;
};

type Issue = {
  _id: string;
  ticketId?: string;
  title: string;
  status: IssueStatus;
};

export default function KnowledgeBasePage() {
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [extraLinkedIssues, setExtraLinkedIssues] = useState<Issue[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const form = useForm<ArticleForm>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: "",
      body: ""
    }
  });

  const { data: articlesData, isLoading } = useQuery({
    queryKey: ["articles", currentWorkspaceId],
    queryFn: async () => {
      if (!currentWorkspaceId) return [];
      const res = await api.get(`/api/workspaces/${currentWorkspaceId}/articles`);
      return res.data.articles as Article[];
    },
    enabled: Boolean(currentWorkspaceId)
  });

  const { data: issuesData } = useQuery({
    queryKey: ["issues", currentWorkspaceId, "linkable"],
    queryFn: async () => {
      if (!currentWorkspaceId) return [];
      const res = await api.get(`/api/workspaces/${currentWorkspaceId}/issues`, {
        params: { limit: 50 }
      });
      return res.data.issues as Issue[];
    },
    enabled: Boolean(currentWorkspaceId)
  });

  const selectedArticle = useMemo(
    () => (articlesData ?? []).find((article) => article._id === selectedArticleId) ?? null,
    [articlesData, selectedArticleId]
  );

  useEffect(() => {
    const articleId = searchParams.get("articleId");
    if (articleId) {
      if (articleId !== selectedArticleId) {
        setSelectedArticleId(articleId);
      }
      setIsCreating(false);
      return;
    }

    if (selectedArticleId) {
      setSelectedArticleId(null);
    }
  }, [searchParams, selectedArticleId]);

  useEffect(() => {
    if (!selectedArticle) {
      form.reset({ title: "", body: "" });
      setSelectedIssueIds([]);
      setExtraLinkedIssues([]);
      return;
    }

    setIsCreating(false);
    form.reset({
      title: selectedArticle.title,
      body: selectedArticle.body ?? ""
    });
    setSelectedIssueIds(selectedArticle.linkedIssueIds ?? []);
    setExtraLinkedIssues([]);
  }, [selectedArticle, form]);

  useEffect(() => {
    if (!selectedArticle) return;
    const label = selectedArticle.kbId ?? selectedArticle.title ?? "Article";
    setKbBreadcrumb(selectedArticle._id, label);
  }, [selectedArticle]);

  useEffect(() => {
    if (selectedArticleId) {
      setActiveTab("preview");
      return;
    }
    if (isCreating) {
      setActiveTab("edit");
    }
  }, [selectedArticleId, isCreating]);

  const createMutation = useMutation({
    mutationFn: async (values: ArticleForm) => {
      if (!currentWorkspaceId) return;
      await api.post(`/api/workspaces/${currentWorkspaceId}/articles`, {
        title: values.title,
        body: values.body ?? "",
        linkedIssueIds: selectedIssueIds
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["articles", currentWorkspaceId] });
      form.reset({ title: "", body: "" });
      setSelectedIssueIds([]);
      setIsCreating(false);
      setActiveTab("preview");
      toast.success("Article created");
    },
    onError: () => toast.error("Unable to create article")
  });

  const updateMutation = useMutation({
    mutationFn: async (values: ArticleForm) => {
      if (!currentWorkspaceId || !selectedArticleId) return;
      await api.patch(`/api/workspaces/${currentWorkspaceId}/articles/${selectedArticleId}`, {
        title: values.title,
        body: values.body ?? "",
        linkedIssueIds: selectedIssueIds
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["articles", currentWorkspaceId] });
      toast.success("Article updated");
    },
    onError: () => toast.error("Unable to update article")
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!currentWorkspaceId || !selectedArticleId) return;
      await api.delete(`/api/workspaces/${currentWorkspaceId}/articles/${selectedArticleId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["articles", currentWorkspaceId] });
      setSelectedArticleId(null);
      setIsCreating(false);
      setSearchParams((params) => {
        const next = new URLSearchParams(params);
        next.delete("articleId");
        return next;
      });
      toast.success("Article deleted");
    },
    onError: () => toast.error("Unable to delete article")
  });

  const handleSubmit = (values: ArticleForm) => {
    if (selectedArticleId) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const handleNew = () => {
    setSelectedArticleId(null);
    form.reset({ title: "", body: "" });
    setSelectedIssueIds([]);
    setIsCreating(true);
    setActiveTab("edit");
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.delete("articleId");
      return next;
    });
  };

  const handleBackToGrid = () => {
    setSelectedArticleId(null);
    setIsCreating(false);
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.delete("articleId");
      return next;
    });
  };

  if (!currentWorkspaceId) {
    return (
      <div className="rounded-md border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Select a workspace</h2>
        <p className="mt-2 text-sm text-foreground-muted">
          Choose a workspace to manage knowledge base articles.
        </p>
      </div>
    );
  }

  const articles = articlesData ?? [];
  const issues = issuesData ?? [];
  const issueMap = useMemo(() => {
    const map = new Map<string, Issue>();
    issues.forEach((issue) => map.set(issue._id, issue));
    extraLinkedIssues.forEach((issue) => map.set(issue._id, issue));
    return map;
  }, [issues, extraLinkedIssues]);
  const normalizedQuery = linkInput.trim().toLowerCase();
  const issueSuggestions = normalizedQuery
    ? issues
        .filter((issue) => !selectedIssueIds.includes(issue._id))
        .filter((issue) => {
          const ticket = issue.ticketId?.toLowerCase() ?? "";
          return ticket.includes(normalizedQuery) || issue.title.toLowerCase().includes(normalizedQuery);
        })
        .slice(0, 6)
    : [];
  const linkedIssues = useMemo(() => {
    const combined = new Map<string, Issue>();
    issues.forEach((issue) => combined.set(issue._id, issue));
    extraLinkedIssues.forEach((issue) => combined.set(issue._id, issue));
    return selectedIssueIds
      .map((id) => combined.get(id))
      .filter((issue): issue is Issue => Boolean(issue));
  }, [issues, extraLinkedIssues, selectedIssueIds]);

  useEffect(() => {
    if (!currentWorkspaceId) return;
    const combined = new Set([
      ...issues.map((issue) => issue._id),
      ...extraLinkedIssues.map((issue) => issue._id)
    ]);
    const missing = selectedIssueIds.filter((id) => !combined.has(id));
    if (missing.length === 0) return;
    Promise.all(
      missing.map((id) => api.get(`/api/workspaces/${currentWorkspaceId}/issues/${id}`))
    )
      .then((responses) => {
        setExtraLinkedIssues((prev) => {
          const next = new Map(prev.map((issue) => [issue._id, issue]));
          responses.forEach((response) => {
            next.set(response.data.issue._id, response.data.issue as Issue);
          });
          return Array.from(next.values());
        });
      })
      .catch(() => {
        toast.error("Unable to load linked issues");
      });
  }, [selectedIssueIds, issues, extraLinkedIssues, currentWorkspaceId]);

  const handleLinkById = async () => {
    const trimmed = linkInput.trim().toUpperCase();
    if (!trimmed) return;
    try {
      let match = issues.find(
        (issue) => issue.ticketId?.toUpperCase() === trimmed
      );
      if (!match && currentWorkspaceId) {
        const res = await api.get(`/api/workspaces/${currentWorkspaceId}/issues`, {
          params: { ticketId: trimmed, limit: 1 }
        });
        match = (res.data.issues as Issue[])[0];
      }

      if (!match) {
        toast.error("Issue ID not found in this workspace");
        return;
      }

      setSelectedIssueIds((prev) =>
        prev.includes(match._id) ? prev : [...prev, match._id]
      );
      setExtraLinkedIssues((prev) =>
        prev.some((issue) => issue._id === match._id) ? prev : [...prev, match]
      );
      setLinkInput("");
    } catch {
      toast.error("Unable to look up that issue ID");
    }
  };

  const formatDateTime = (value?: string) => {
    if (!value) return "Unknown";
    return new Date(value).toLocaleString();
  };

  const isDetailView = Boolean(selectedArticleId);
  const isCreateView = !selectedArticleId && isCreating;
  const isGridView = !selectedArticleId && !isCreating;

  const handleLinkSelect = (issue: Issue) => {
    setSelectedIssueIds((prev) => (prev.includes(issue._id) ? prev : [...prev, issue._id]));
    setExtraLinkedIssues((prev) =>
      prev.some((item) => item._id === issue._id) ? prev : [...prev, issue]
    );
    setLinkInput("");
  };

  const handleRemoveLinked = (issueId: string) => {
    setSelectedIssueIds((prev) => prev.filter((id) => id !== issueId));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Knowledge Base</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Capture decisions, how-tos, and troubleshooting notes for your team.
          </p>
        </div>
        {isDetailView || isCreateView ? (
          <Button variant="outline" onClick={handleBackToGrid}>
            Back to articles
          </Button>
        ) : null}
      </div>

      {isGridView ? (
        <div className="rounded-md border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Articles</h2>
              <p className="mt-1 text-xs text-foreground-muted">
                Pick an article to open the full preview.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <button
              type="button"
              onClick={handleNew}
              className="flex h-full flex-col items-start justify-between rounded-md border border-dashed border-border bg-muted px-4 py-3 text-left text-sm text-foreground hover:bg-background"
            >
              <div>
                <p className="text-sm font-semibold">Create article</p>
                <p className="mt-1 text-xs text-foreground-muted">
                  Start a new knowledge base entry.
                </p>
              </div>
              <span className="mt-6 text-xs font-medium text-accent">New article</span>
            </button>
            {isLoading ? (
              <div className="rounded-md border border-border bg-muted px-4 py-3 text-sm text-foreground-muted">
                Loading...
              </div>
            ) : null}
            {!isLoading && articles.length === 0 ? (
              <div className="rounded-md border border-border bg-muted px-4 py-3 text-sm text-foreground-muted">
                No articles yet.
              </div>
            ) : null}
            {articles.map((article) => {
              const linkedIds = article.linkedIssueIds ?? [];
              const resolvedLinked = linkedIds
                .map((id) => issueMap.get(id))
                .filter((issue): issue is Issue => Boolean(issue));
              const linkedLabels = resolvedLinked.map(
                (issue) => issue.ticketId ?? "NO-ID"
              );
              const displayLinked = linkedLabels.slice(0, 3);
              const remaining = Math.max(0, linkedIds.length - displayLinked.length);
              const updatedBy = article.updatedBy ?? null;
              const updatedAt = article.updatedAt ?? article.createdAt;

              return (
                <button
                  key={article._id}
                  type="button"
                  onClick={() => {
                    setKbBreadcrumb(article._id, article.kbId ?? article.title ?? "Article");
                    setSelectedArticleId(article._id);
                    setSearchParams((params) => {
                      const next = new URLSearchParams(params);
                      next.set("articleId", article._id);
                      return next;
                    });
                  }}
                  className="flex h-full flex-col justify-between rounded-md border border-border px-4 py-3 text-left text-sm text-foreground hover:bg-muted"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground-muted">
                      {article.kbId ?? "KB"}
                    </p>
                    <p className="mt-2 text-sm font-semibold">{article.title}</p>
                    <div className="mt-3 space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-foreground-muted">
                        <Avatar
                          size="xs"
                          name={article.createdBy?.name ?? "Unknown"}
                          email={article.createdBy?.email}
                          src={article.createdBy?.avatarUrl ?? null}
                        />
                        <span>
                          Created by {article.createdBy?.name ?? "Unknown"} at{" "}
                          {formatDateTime(article.createdAt)}
                        </span>
                      </div>
                      {updatedBy ? (
                        <div className="flex items-center gap-2 text-foreground-muted">
                          <Avatar
                            size="xs"
                            name={updatedBy.name ?? "Unknown"}
                            email={updatedBy.email}
                            src={updatedBy.avatarUrl ?? null}
                          />
                          <span>
                            Last updated by {updatedBy.name ?? "Unknown"} at{" "}
                            {formatDateTime(updatedAt)}
                          </span>
                        </div>
                      ) : (
                        <div className="text-foreground-muted">
                          Last updated at {formatDateTime(updatedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
                      Linked issues
                    </p>
                    {linkedIds.length === 0 ? (
                      <p className="mt-2 text-xs text-foreground-muted">None</p>
                    ) : displayLinked.length === 0 ? (
                      <p className="mt-2 text-xs text-foreground-muted">
                        {linkedIds.length} linked issue{linkedIds.length === 1 ? "" : "s"}
                      </p>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {displayLinked.map((label) => (
                          <span
                            key={`${article._id}-${label}`}
                            className="rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground"
                          >
                            {label}
                          </span>
                        ))}
                        {remaining > 0 ? (
                          <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground-muted">
                            +{remaining} more
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {isDetailView && !selectedArticle ? (
        <div className="rounded-md border border-border bg-surface p-6">
          <p className="text-sm text-foreground-muted">Loading article...</p>
        </div>
      ) : null}

      {selectedArticle && activeTab === "preview" ? (
        <>
          <div className="rounded-md border border-border bg-surface p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                {selectedArticle?.kbId ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground-muted">
                    {selectedArticle.kbId}
                  </p>
                ) : null}
                <h2 className="text-xl font-semibold text-foreground">
                  {selectedArticle.title}
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-foreground-muted">
                  <div className="flex items-center gap-2">
                    <Avatar
                      size="xs"
                      name={selectedArticle.createdBy?.name ?? "Unknown"}
                      email={selectedArticle.createdBy?.email}
                      src={selectedArticle.createdBy?.avatarUrl ?? null}
                    />
                    <span>
                      Created by {selectedArticle.createdBy?.name ?? "Unknown"} at{" "}
                      {formatDateTime(selectedArticle.createdAt)}
                    </span>
                  </div>
                  {selectedArticle.updatedBy ? (
                    <div className="flex items-center gap-2">
                      <Avatar
                        size="xs"
                        name={selectedArticle.updatedBy?.name ?? "Unknown"}
                        email={selectedArticle.updatedBy?.email}
                        src={selectedArticle.updatedBy?.avatarUrl ?? null}
                      />
                      <span>
                        Last updated by {selectedArticle.updatedBy?.name ?? "Unknown"} at{" "}
                        {formatDateTime(
                          selectedArticle.updatedAt ?? selectedArticle.createdAt
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className="text-foreground-muted">
                      Last updated at{" "}
                      {formatDateTime(selectedArticle.updatedAt ?? selectedArticle.createdAt)}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("edit")}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </Button>
              </div>
            </div>
            <div className="mt-6 rounded-md border border-border bg-muted p-4 text-sm text-foreground">
              {selectedArticle.body ? (
                <div className="prose max-w-none text-foreground dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                    {selectedArticle.body}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-foreground-muted">No content yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-md border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold">Linked issues</h2>
            <p className="mt-1 text-sm text-foreground-muted">
              Jump directly to the related work items.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {linkedIssues.length === 0 ? (
                <p className="text-sm text-foreground-muted">No linked issues yet.</p>
              ) : (
                linkedIssues.map((issue) => (
                  <button
                    key={issue._id}
                    type="button"
                    onClick={() => {
                      setIssueBreadcrumb(issue._id, issue.ticketId);
                      navigate(`/app/issues/${issue._id}`);
                    }}
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-xs font-medium text-foreground hover:bg-background"
                  >
                    {issue.ticketId ?? "NO-ID"} - {issue.title}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}

      {(isCreateView || (selectedArticle && activeTab === "edit")) ? (
        <>
          <div className="rounded-md border border-border bg-surface p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {selectedArticle ? "Edit article" : "Create article"}
                </h2>
                <p className="mt-1 text-sm text-foreground-muted">
                  Use markdown to structure the content.
                </p>
              </div>
              {selectedArticle ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant={activeTab === "preview" ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setActiveTab("preview")}
                  >
                    Preview
                  </Button>
                  <Button
                    variant={activeTab === "edit" ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setActiveTab("edit")}
                  >
                    Edit
                  </Button>
                </div>
              ) : null}
            </div>

            <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="title">
                  Title
                </label>
                <Input id="title" {...form.register("title")} />
                {form.formState.errors.title ? (
                  <p className="text-xs text-accent">{form.formState.errors.title.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="body">
                  Markdown
                </label>
                <Textarea id="body" rows={12} {...form.register("body")} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {selectedArticle ? (
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {selectedArticle ? "Save changes" : "Create article"}
                </Button>
              </div>
            </form>
          </div>

          <div className="rounded-md border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold">Link issues</h2>
            <p className="mt-1 text-sm text-foreground-muted">
              Attach related work items to keep context in one place.
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full max-w-md">
                  <Input
                    placeholder="Search by issue ID or title"
                    value={linkInput}
                    onChange={(event) => setLinkInput(event.target.value)}
                  />
                  {issueSuggestions.length > 0 ? (
                    <div className="absolute z-10 mt-2 w-full rounded-md border border-border bg-surface p-2">
                      {issueSuggestions.map((issue) => (
                        <button
                          key={issue._id}
                          type="button"
                          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            handleLinkSelect(issue);
                          }}
                        >
                          <span className="font-medium">
                            {issue.ticketId ?? "NO-ID"} - {issue.title}
                          </span>
                          <Badge
                            variant="outline"
                            className={`ml-2 ${statusStyles[issue.status]}`}
                          >
                            {statusLabels[issue.status]}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleLinkById}>
                  Link issue
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {linkedIssues.length === 0 ? (
                  <p className="text-sm text-foreground-muted">No linked issues yet.</p>
                ) : (
                  linkedIssues.map((issue) => (
                    <span
                      key={issue._id}
                      className="inline-flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground"
                    >
                      {issue.ticketId ?? "NO-ID"} - {issue.title}
                      <button
                        type="button"
                        onClick={() => handleRemoveLinked(issue._id)}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-muted text-accent hover:bg-background"
                        aria-label="Remove linked issue"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}


