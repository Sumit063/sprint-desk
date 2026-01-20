import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import ReactMarkdown from "react-markdown";
import { z } from "zod";
import api from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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
    if (!selectedArticle) {
      form.reset({ title: "", body: "" });
      setSelectedIssueIds([]);
      return;
    }

    form.reset({
      title: selectedArticle.title,
      body: selectedArticle.body ?? ""
    });
    setSelectedIssueIds(selectedArticle.linkedIssueIds ?? []);
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
  };

  if (!currentWorkspaceId) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Select a workspace</h2>
        <p className="mt-2 text-sm text-slate-600">
          Choose a workspace to manage knowledge base articles.
        </p>
      </div>
    );
  }

  const articles = articlesData ?? [];
  const issues = issuesData ?? [];

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
      setLinkInput("");
    } catch {
      toast.error("Unable to look up that issue ID");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Knowledge Base</h1>
          <p className="mt-1 text-sm text-slate-600">
            Capture decisions, how-tos, and troubleshooting notes for your team.
          </p>
        </div>
        <Button onClick={handleNew}>New article</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">Articles</h2>
          <div className="mt-3 space-y-2">
            {isLoading ? <p className="text-sm text-slate-500">Loading...</p> : null}
            {!isLoading && articles.length === 0 ? (
              <p className="text-sm text-slate-500">No articles yet.</p>
            ) : null}
            {articles.map((article) => (
              <button
                key={article._id}
                type="button"
                onClick={() => setSelectedArticleId(article._id)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                  selectedArticleId === article._id
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
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
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {selectedArticle ? "Edit article" : "Create article"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
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
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  {form.watch("body") ? (
                    <ReactMarkdown>{form.watch("body")}</ReactMarkdown>
                  ) : (
                    <p className="text-slate-500">Nothing to preview yet.</p>
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

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Link issues</h2>
            <p className="mt-1 text-sm text-slate-500">
              Attach related work items to keep context in one place.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Input
                placeholder="Enter issue ID (e.g. ACME-12)"
                value={linkInput}
                onChange={(event) => setLinkInput(event.target.value)}
                className="max-w-xs"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleLinkById}>
                Link issue
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {issues.length === 0 ? (
                <p className="text-sm text-slate-500">No issues to link.</p>
              ) : (
                issues.map((issue) => {
                  const isSelected = selectedIssueIds.includes(issue._id);
                  return (
                    <button
                      key={issue._id}
                      type="button"
                      onClick={() => {
                        setSelectedIssueIds((prev) =>
                          prev.includes(issue._id)
                            ? prev.filter((id) => id !== issue._id)
                            : [...prev, issue._id]
                        );
                      }}
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        isSelected
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      {issue.ticketId ?? "NO-ID"} · {issue.title}
                      <Badge variant="outline" className="ml-2">
                        {issue.status}
                      </Badge>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
