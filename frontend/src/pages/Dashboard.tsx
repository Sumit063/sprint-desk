import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  CircleDot,
  FileText,
  Filter,
  Flag,
  LayoutDashboard,
  Link2,
  PencilLine,
  Tag,
  UserRound,
  Users
} from "lucide-react";
import api from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspaces";
import { Badge } from "@/components/ui/badge";
import { setIssueBreadcrumb, setKbBreadcrumb } from "@/lib/breadcrumbs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

type Issue = {
  _id: string;
  ticketId?: string;
  title: string;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  priority?: "LOW" | "MEDIUM" | "HIGH";
  createdAt: string;
  updatedAt?: string;
  createdBy?: { name?: string | null } | null;
  assigneeId?: { name?: string | null } | null;
};

type Article = {
  _id: string;
  kbId?: string;
  title: string;
  linkedIssueIds?: string[];
  createdAt: string;
  updatedAt?: string;
  createdBy?: { name?: string | null } | null;
  updatedBy?: { name?: string | null } | null;
};

type IssueResponse = {
  issues: Issue[];
};

type Activity = {
  _id: string;
  action: string;
  createdAt: string;
  actorId?: { name?: string | null } | null;
  issueId?: { _id: string; ticketId?: string; title?: string; status?: string } | null;
  meta?: {
    articleId?: string;
    kbId?: string;
    title?: string;
    linkedIssueIds?: string[];
    fields?: string[];
    changes?: Record<string, { from?: string | null; to?: string | null }>;
  };
};

type UpdateItem = {
  id: string;
  type: "issue" | "kb";
  entityId: string;
  title: string;
  label: string;
  timestamp: string;
  href: string;
  icon: JSX.Element;
  description: JSX.Element;
  breadcrumb?: string;
};

type DashboardWidget = {
  id: string;
  title: string;
  description?: string;
  content: JSX.Element;
  span?: string;
};

const formatDateTime = (value: string) => {
  return new Date(value).toLocaleString();
};

const priorityLabel = (value?: Issue["priority"]) => {
  if (value === "LOW") return "Low";
  if (value === "MEDIUM") return "Medium";
  if (value === "HIGH") return "High";
  return "Unknown";
};

const statusLabel = (value?: Issue["status"]) => {
  if (value === "OPEN") return "Open";
  if (value === "IN_PROGRESS") return "In progress";
  if (value === "DONE") return "Done";
  return "Unknown";
};

const buildIssueUpdateSegments = (
  fields: string[] | undefined,
  changes: Activity["meta"] extends { changes?: infer T } ? T : undefined,
  issue: Issue | undefined,
  memberMap: Map<string, string>
) => {
  if (!fields || fields.length === 0) {
    return [];
  }

  const segments: JSX.Element[] = [];
  const withChange = (
    key: string,
    label: string,
    icon: JSX.Element,
    format: (value?: string | null) => string,
    fallback: string
  ) => {
    const change = changes?.[key];
    if (change) {
      const from = format(change.from ?? undefined);
      const to = format(change.to ?? undefined);
      segments.push(
        <span key={key} className="inline-flex items-center gap-1">
          {icon}
          <span>{label}</span>
          <span className="text-foreground">{from}</span>
          <ArrowRight className="h-3 w-3 text-foreground-muted" />
          <span className="text-foreground">{to}</span>
        </span>
      );
      return;
    }

    if (fields.includes(key)) {
      segments.push(
        <span key={key} className="inline-flex items-center gap-1">
          {icon}
          <span>{fallback}</span>
        </span>
      );
    }
  };

  withChange(
    "priority",
    "priority",
    <Flag className="h-3 w-3 text-foreground-muted" />,
    (value) => (value ? priorityLabel(value as Issue["priority"]) : "Unknown"),
    "priority updated"
  );
  withChange(
    "status",
    "status",
    <CircleDot className="h-3 w-3 text-foreground-muted" />,
    (value) => (value ? statusLabel(value as Issue["status"]) : "Unknown"),
    "status updated"
  );
  withChange(
    "assigneeId",
    "assignee",
    <UserRound className="h-3 w-3 text-foreground-muted" />,
    (value) => {
      if (!value) return "Unassigned";
      return memberMap.get(value) ?? "Unassigned";
    },
    issue?.assigneeId?.name
      ? `assigned to ${issue.assigneeId.name}`
      : "assignee updated"
  );
  withChange(
    "title",
    "title",
    <PencilLine className="h-3 w-3 text-foreground-muted" />,
    (value) => (value ? `"${value}"` : "Untitled"),
    issue?.title ? `renamed to "${issue.title}"` : "title updated"
  );

  if (fields.includes("labels")) {
    segments.push(
      <span key="labels" className="inline-flex items-center gap-1">
        <Tag className="h-3 w-3 text-foreground-muted" />
        <span>labels updated</span>
      </span>
    );
  }
  if (fields.includes("description")) {
    segments.push(
      <span key="description" className="inline-flex items-center gap-1">
        <FileText className="h-3 w-3 text-foreground-muted" />
        <span>description updated</span>
      </span>
    );
  }
  if (fields.includes("dueDate")) {
    segments.push(
      <span key="dueDate" className="inline-flex items-center gap-1">
        <Calendar className="h-3 w-3 text-foreground-muted" />
        <span>due date updated</span>
      </span>
    );
  }

  return segments;
};

const timeFilters = [
  { id: "today", label: "Today" },
  { id: "3d", label: "Last 3 days", days: 3 },
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "15d", label: "Last 15 days", days: 15 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 3 months", days: 90 }
];

export default function DashboardPage() {
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const [timeFilter, setTimeFilter] = useState("7d");

  const { data: issuesData, isLoading: issuesLoading } = useQuery({
    queryKey: ["issues", currentWorkspaceId, "dashboard"],
    queryFn: async () => {
      if (!currentWorkspaceId) return { issues: [] };
      const res = await api.get(`/api/workspaces/${currentWorkspaceId}/issues`, {
        params: { limit: 50 }
      });
      return res.data as IssueResponse;
    },
    enabled: Boolean(currentWorkspaceId)
  });

  const { data: articlesData, isLoading: articlesLoading } = useQuery({
    queryKey: ["articles", currentWorkspaceId, "dashboard"],
    queryFn: async () => {
      if (!currentWorkspaceId) return [];
      const res = await api.get(`/api/workspaces/${currentWorkspaceId}/articles`);
      return res.data.articles as Article[];
    },
    enabled: Boolean(currentWorkspaceId)
  });

  const { data: membersData } = useQuery({
    queryKey: ["workspace-members", currentWorkspaceId, "dashboard"],
    queryFn: async () => {
      if (!currentWorkspaceId) return [];
      const res = await api.get(`/api/workspaces/${currentWorkspaceId}/members`);
      return res.data.members as { user: { id: string; name: string } }[];
    },
    enabled: Boolean(currentWorkspaceId)
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["activities", currentWorkspaceId],
    queryFn: async () => {
      if (!currentWorkspaceId) return [];
      const res = await api.get(`/api/workspaces/${currentWorkspaceId}/activities`, {
        params: { limit: 30 }
      });
      return res.data.activities as Activity[];
    },
    enabled: Boolean(currentWorkspaceId)
  });

  const issues = issuesData?.issues ?? [];
  const articles = articlesData ?? [];
  const membersCount = membersData?.length ?? 0;
  const memberMap = useMemo(() => {
    return new Map(
      (membersData ?? []).map((member) => [member.user.id, member.user.name])
    );
  }, [membersData]);
  const activities = activityData ?? [];

  const issueMap = useMemo(() => {
    return new Map(issues.map((issue) => [issue._id, issue]));
  }, [issues]);

  const articleMap = useMemo(() => {
    return new Map(articles.map((article) => [article._id, article]));
  }, [articles]);

  const updates = useMemo(() => {
    const items: UpdateItem[] = [];

    const createdIssueIds = new Set(
      activities
        .filter((activity) => activity.action === "issue_created" && activity.issueId?._id)
        .map((activity) => activity.issueId?._id ?? "")
    );

    activities.forEach((activity) => {
      const actorName = activity.actorId?.name ?? "Someone";
      const issue = activity.issueId ?? null;
      const issueId = issue?._id ?? "";
      const issueSnapshot = issueId ? issueMap.get(issueId) : undefined;
      const issueTicketId = issue?.ticketId ?? issueSnapshot?.ticketId;
      const issueTitle = issue?.title ?? issueSnapshot?.title;
      const articleId = activity.meta?.articleId ?? "";
      const article = articleId ? articleMap.get(articleId) : undefined;
      const kbTitle = activity.meta?.title ?? article?.title ?? "KB";
      const kbId = activity.meta?.kbId ?? article?.kbId ?? "KB";
      const linkedIssueIds = activity.meta?.linkedIssueIds ?? [];
      const linkedTickets = linkedIssueIds
        .map((id) => issueMap.get(id)?.ticketId)
        .filter((ticketId): ticketId is string => Boolean(ticketId));

      if (activity.action === "comment_added" && issueTicketId) {
        items.push({
          id: activity._id,
          type: "issue",
          entityId: issueId,
          title: issueTitle ?? issueTicketId,
          label: "Updated issue",
          description: (
            <span>
              {actorName} added a comment on {issueTicketId}.
            </span>
          ),
          timestamp: activity.createdAt,
          href: `/app/issues/${issueId}`,
          icon: <PencilLine className="h-4 w-4 text-amber-500" />,
          breadcrumb: issueTicketId
        });
        return;
      }

      if (activity.action === "issue_resolved" && issueTicketId) {
        items.push({
          id: activity._id,
          type: "issue",
          entityId: issueId,
          title: issueTitle ?? issueTicketId,
          label: "Resolved Issue",
          description: (
            <span>
              {actorName} marked {issueTicketId} as resolved.
            </span>
          ),
          timestamp: activity.createdAt,
          href: `/app/issues/${issueId}`,
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
          breadcrumb: issueTicketId
        });
        return;
      }

      if (activity.action === "issue_created" && issueTicketId) {
        items.push({
          id: activity._id,
          type: "issue",
          entityId: issueId,
          title: issueTitle ?? issueTicketId,
          label: "New issue",
          description: (
            <span>
              {actorName} created {issueTicketId}.
            </span>
          ),
          timestamp: activity.createdAt,
          href: `/app/issues/${issueId}`,
          icon: <CircleDot className="h-4 w-4 text-blue-500" />,
          breadcrumb: issueTicketId
        });
        return;
      }

      if (activity.action === "issue_updated" && issueTicketId) {
        const fields = activity.meta?.fields ?? [];
        const isFreshCreate =
          issueSnapshot?.createdAt &&
          Math.abs(
            new Date(activity.createdAt).getTime() -
              new Date(issueSnapshot.createdAt).getTime()
          ) < 2 * 60 * 1000;

        if (isFreshCreate && createdIssueIds.has(issueId)) {
          items.push({
            id: activity._id,
            type: "issue",
            entityId: issueId,
            title: issueTitle ?? issueTicketId,
            label: "New issue",
            description: (
              <span>
                {actorName} created {issueTicketId}.
              </span>
            ),
            timestamp: activity.createdAt,
            href: `/app/issues/${issueId}`,
            icon: <CircleDot className="h-4 w-4 text-blue-500" />,
            breadcrumb: issueTicketId
          });
          return;
        }

        const changes = activity.meta?.changes;
        const segments = buildIssueUpdateSegments(
          fields,
          changes,
          issueSnapshot,
          memberMap
        );
        const onlyAssignee = fields.length === 1 && fields[0] === "assigneeId";
        const onlyField = fields.length === 1 ? fields[0] : null;

        if (onlyAssignee) {
          const assigneeChange = changes?.assigneeId;
          const fallbackName = issueSnapshot?.assigneeId?.name ?? null;
          const toId = assigneeChange?.to ?? fallbackName ?? null;
          const toName =
            typeof toId === "string" ? memberMap.get(toId) ?? toId : "Unassigned";
          const hasAssignee =
            assigneeChange !== undefined
              ? assigneeChange.to !== null && assigneeChange.to !== undefined
              : Boolean(fallbackName);
          const assigneeText = hasAssignee
            ? `assigned ${issueTicketId} to ${toName}`
            : `unassigned ${issueTicketId}`;
          items.push({
            id: activity._id,
            type: "issue",
            entityId: issueId,
            title: issueTitle ?? issueTicketId,
            label: "Updated issue",
            description: (
              <span>
                {actorName} {assigneeText}.
              </span>
            ),
            timestamp: activity.createdAt,
            href: `/app/issues/${issueId}`,
            icon: <UserRound className="h-4 w-4 text-foreground-muted" />,
            breadcrumb: issueTicketId
          });
          return;
        }

        if (onlyField && segments.length > 0) {
          items.push({
            id: activity._id,
            type: "issue",
            entityId: issueId,
            title: issueTitle ?? issueTicketId,
            label: "Updated issue",
            description: (
              <span>
                {actorName} updated {issueTicketId}: {segments[0]}.
              </span>
            ),
            timestamp: activity.createdAt,
            href: `/app/issues/${issueId}`,
            icon: <PencilLine className="h-4 w-4 text-amber-500" />,
            breadcrumb: issueTicketId
          });
          return;
        }
        items.push({
          id: activity._id,
          type: "issue",
          entityId: issueId,
          title: issueTitle ?? issueTicketId,
          label: "Updated issue",
          description: (
            <span>
              {actorName} updated {issueTicketId}
              {segments.length > 0 ? ": " : "."}
              {segments.length > 0
                ? segments.map((segment, index) => (
                    <span key={`${segment.key}-${index}`}>
                      {segment}
                      {index < segments.length - 1 ? <span>, </span> : null}
                    </span>
                  ))
                : null}
              {segments.length > 0 ? "." : null}
            </span>
          ),
          timestamp: activity.createdAt,
          href: `/app/issues/${issueId}`,
          icon: <PencilLine className="h-4 w-4 text-amber-500" />,
          breadcrumb: issueTicketId
        });
        return;
      }

      if (activity.action === "kb_linked" && articleId) {
        const linkedIssueLabel = linkedTickets[0] ?? "an issue";
        items.push({
          id: activity._id,
          type: "kb",
          entityId: articleId,
          title: kbTitle,
          label: `Linked KB - ${kbTitle}`,
          description: (
            <span>
              {actorName} linked {linkedIssueLabel} to {kbId}.
            </span>
          ),
          timestamp: activity.createdAt,
          href: `/app/kb?articleId=${articleId}`,
          icon: <Link2 className="h-4 w-4 text-emerald-500" />,
          breadcrumb: kbId
        });
        return;
      }

      if (activity.action === "kb_updated" && articleId) {
        items.push({
          id: activity._id,
          type: "kb",
          entityId: articleId,
          title: kbTitle,
          label: `Updated KB - ${kbTitle}`,
          description: (
            <span>
              {actorName} updated {kbId}.
            </span>
          ),
          timestamp: activity.createdAt,
          href: `/app/kb?articleId=${articleId}`,
          icon: <PencilLine className="h-4 w-4 text-amber-500" />,
          breadcrumb: kbId
        });
        return;
      }

      if (activity.action === "kb_created" && articleId) {
        items.push({
          id: activity._id,
          type: "kb",
          entityId: articleId,
          title: kbTitle,
          label: `New KB - ${kbTitle}`,
          description: (
            <span>
              {actorName} created {kbId}.
            </span>
          ),
          timestamp: activity.createdAt,
          href: `/app/kb?articleId=${articleId}`,
          icon: <BookOpen className="h-4 w-4 text-blue-500" />,
          breadcrumb: kbId
        });
      }
    });

    return items
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 12);
  }, [activities, articleMap, issueMap, memberMap]);

  const selectedFilter = timeFilters.find((filter) => filter.id === timeFilter) ?? timeFilters[2];
  const issueWindowStart = useMemo(() => {
    const start = new Date();
    if (selectedFilter.id === "today") {
      start.setHours(0, 0, 0, 0);
      return start;
    }
    const days = selectedFilter.days ?? 7;
    start.setDate(start.getDate() - days);
    return start;
  }, [selectedFilter]);

  const createdCount = issues.filter(
    (issue) => new Date(issue.createdAt) >= issueWindowStart
  ).length;
  const resolvedCount = issues.filter(
    (issue) =>
      issue.status === "DONE" &&
      new Date(issue.updatedAt ?? issue.createdAt) >= issueWindowStart
  ).length;
  const unassignedCount = issues.filter(
    (issue) => !issue.assigneeId && new Date(issue.createdAt) >= issueWindowStart
  ).length;
  const maxCount = Math.max(createdCount, resolvedCount, 1);

  const widgets: DashboardWidget[] = [
    {
      id: "updates",
      title: "Recent updates",
      description: "Latest activity from issues and knowledge base entries.",
      span: "lg:col-span-2",
      content: (
        <div className="space-y-3">
          {issuesLoading || articlesLoading || activityLoading ? (
            <p className="text-sm text-foreground-muted">Loading updates...</p>
          ) : null}
          {!issuesLoading && !articlesLoading && !activityLoading && updates.length === 0 ? (
            <p className="text-sm text-foreground-muted">No recent updates yet.</p>
          ) : null}
          {updates.map((item) => (
            <Link
              key={item.id}
              to={item.href}
              onClick={() => {
                if (item.type === "issue") {
                  setIssueBreadcrumb(item.entityId, item.breadcrumb ?? undefined);
                } else {
                  setKbBreadcrumb(item.entityId, item.breadcrumb ?? undefined);
                }
              }}
              className="flex items-center justify-between gap-4 rounded-md border border-border bg-muted px-4 py-3 text-sm text-foreground hover:bg-background"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface">
                  {item.icon}
                </span>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground-muted">
                    {item.label}
                  </p>
                  <p className="text-[13px] font-medium text-foreground">{item.description}</p>
                </div>
              </div>
              <div className="text-xs text-foreground-muted">
                {formatDateTime(item.timestamp)}
              </div>
            </Link>
          ))}
        </div>
      )
    },
    {
      id: "issue-flow",
      title: "Issue flow",
      description:
        selectedFilter.id === "today"
          ? "Created vs resolved today."
          : `Created vs resolved in ${selectedFilter.label.toLowerCase()}.`,
      content: (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
            <Badge variant="outline">Created {createdCount}</Badge>
            <Badge variant="outline">Resolved {resolvedCount}</Badge>
            <Badge variant="outline">Unassigned {unassignedCount}</Badge>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs text-foreground-muted">
              <span>Created</span>
              <span>{createdCount}</span>
            </div>
            <div className="mt-2 h-2 rounded-md bg-muted">
              <div
                className="h-2 rounded-md bg-accent"
                style={{ width: `${(createdCount / maxCount) * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs text-foreground-muted">
              <span>Resolved</span>
              <span>{resolvedCount}</span>
            </div>
            <div className="mt-2 h-2 rounded-md bg-muted">
              <div
                className="h-2 rounded-md bg-emerald-500"
                style={{ width: `${(resolvedCount / maxCount) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
            <Badge variant="outline">Open {issues.filter((issue) => issue.status === "OPEN").length}</Badge>
            <Badge variant="outline">In progress {issues.filter((issue) => issue.status === "IN_PROGRESS").length}</Badge>
            <Badge variant="outline">Done {issues.filter((issue) => issue.status === "DONE").length}</Badge>
          </div>
        </div>
      )
    },
    {
      id: "workspace",
      title: "Workspace pulse",
      content: (
        <div className="space-y-3 text-sm text-foreground-muted">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4 text-accent" />
            <span>{issues.length} total issues</span>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-accent" />
            <span>{articles.length} knowledge base articles</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            <span>{membersCount} members</span>
          </div>
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-accent" />
            <span>
              {articles.reduce((sum, article) => sum + (article.linkedIssueIds?.length ?? 0), 0)} linked issues
            </span>
          </div>
        </div>
      )
    }
  ];

  if (!currentWorkspaceId) {
    return (
      <div className="rounded-md border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Select a workspace</h2>
        <p className="mt-2 text-sm text-foreground-muted">
          Choose a workspace to see the latest updates.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          A quick view of what changed recently in this workspace.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {widgets.map((widget) => (
          <div
            key={widget.id}
            className={`rounded-md border border-border bg-surface p-5 ${widget.span ?? ""}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">{widget.title}</h2>
                {widget.description ? (
                  <p className="mt-1 text-xs text-foreground-muted">{widget.description}</p>
                ) : null}
              </div>
              {widget.id === "issue-flow" ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md border border-border bg-surface p-2 text-foreground-muted hover:bg-muted hover:text-foreground"
                      aria-label="Filter time range"
                    >
                      <Filter className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {timeFilters.map((filter) => (
                      <DropdownMenuItem
                        key={filter.id}
                        onClick={() => setTimeFilter(filter.id)}
                      >
                        {filter.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
            <div className="mt-4">{widget.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
