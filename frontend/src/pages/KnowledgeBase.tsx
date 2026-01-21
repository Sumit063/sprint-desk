import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { z } from "zod";
import api from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

const articleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().optional()
});

type ArticleForm = z.infer<typeof articleSchema>;

type Article = {
  _id: string;
  title: string;
  body: string;
  linkedIssueIds: string[];
  createdAt: string;
};

type Issue = {
  _id: string;
  ticketId?: string;
  title: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
};

export default function KnowledgeBasePage() {
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [extraLinkedIssues, setExtraLinkedIssues] = useState<Issue[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();

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
    if (articleId && articleId !== selectedArticleId) {
      setSelectedArticleId(articleId);
    }
  }, [searchParams, selectedArticleId]);

  useEffect(() => {
    if (!selectedArticle) {
      form.reset({ title: "", body: "" });
      setSelectedIssueIds([]);
      setExtraLinkedIssues([]);
      return;
    }

    form.reset({
      title: selectedArticle.title,
      body: selectedArticle.body ?? ""
    });
    setSelectedIssueIds(selectedArticle.linkedIssueIds ?? []);
    setExtraLinkedIssues([]);
  }, [selectedArticle, form]);

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
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.delete("articleId");
      return next;
    });
  };

  if (!currentWorkspaceId) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Select a workspace</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Choose a workspace to manage knowledge base articles.
        </p>
      </div>
    );
  }

  const articles = articlesData ?? [];
  const issues = issuesData ?? [];
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
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Capture decisions, how-tos, and troubleshooting notes for your team.
          </p>
        </div>
        <Button onClick={handleNew}>New article</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Articles</h2>
          <div className="mt-3 space-y-2">
            {isLoading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
            ) : null}
            {!isLoading && articles.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No articles yet.</p>
            ) : null}
            {articles.map((article) => (
              <button
                key={article._id}
                type="button"
                onClick={() => {
                  setSelectedArticleId(article._id);
                  setSearchParams((params) => {
                    const next = new URLSearchParams(params);
                    next.set("articleId", article._id);
                    return next;
                  });
                }}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                  selectedArticleId === article._id
                    ? "border-slate-900 bg-slate-900 text-white dark:border-blue-500 dark:bg-blue-600"
                    : "border-slate-200 text-slate-700 hover:bg-blue-50/60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                <p className="font-medium">{article.title}</p>
                <p className="mt-1 text-xs opacity-70">
                  {new Date(article.createdAt).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        </aside>

        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {selectedArticle ? "Edit article" : "Create article"}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Use markdown to structure the content.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={activeTab === "edit" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("edit")}
                >
                  Edit
                </Button>
                <Button
                  variant={activeTab === "preview" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("preview")}
                >
                  Preview
                </Button>
              </div>
            </div>

            <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="title">
                  Title
                </label>
                <Input id="title" {...form.register("title")} />
                {form.formState.errors.title ? (
                  <p className="text-xs text-red-500">{form.formState.errors.title.message}</p>
                ) : null}
              </div>

              {activeTab === "edit" ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="body">
                    Markdown
                  </label>
                  <Textarea id="body" rows={12} {...form.register("body")} />
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                  {form.watch("body") ? (
                    <div className="prose prose-slate max-w-none dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                        {form.watch("body")}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400">
                      Nothing to preview yet.
                    </p>
                  )}
                </div>
              )}

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
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {selectedArticle ? "Save changes" : "Create article"}
                </Button>
              </div>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">Link issues</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
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
                    <div className="absolute z-10 mt-2 w-full rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                      {issueSuggestions.map((issue) => (
                        <button
                          key={issue._id}
                          type="button"
                          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            handleLinkSelect(issue);
                          }}
                        >
                          <span className="font-medium">
                            {issue.ticketId ?? "NO-ID"} - {issue.title}
                          </span>
                          <Badge variant="outline" className="ml-2">
                            {issue.status}
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
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No linked issues yet.
                  </p>
                ) : (
                  linkedIssues.map((issue) => (
                    <span
                      key={issue._id}
                      className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                    >
                      {issue.ticketId ?? "NO-ID"} - {issue.title}
                      <button
                        type="button"
                        onClick={() => handleRemoveLinked(issue._id)}
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
                        aria-label="Remove linked issue"
                      >
                        <svg
                          aria-hidden="true"
                          className="h-3 w-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
