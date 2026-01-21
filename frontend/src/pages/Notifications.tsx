import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const typeLabels: Record<string, string> = {
  assigned: "Assigned",
  mention: "Mention"
};

type Notification = {
  _id: string;
  message: string;
  type: string;
  readAt?: string | null;
  createdAt: string;
  issueId?: string | null;
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get("/api/notifications");
      return res.data.notifications as Notification[];
    }
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/api/notifications/${id}/read`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
    }
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await api.patch("/api/notifications/read-all");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
    }
  });

  const notifications = data ?? [];
  const hasUnread = notifications.some((note) => !note.readAt);

  useEffect(() => {
    if (hasUnread && !markAllRead.isPending) {
      markAllRead.mutate();
    }
  }, [hasUnread, markAllRead.isPending, markAllRead.mutate]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Mentions and assignments across your workspaces.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {isLoading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
        ) : null}
        {!isLoading && notifications.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            You're all caught up.
          </p>
        ) : null}
        <div className="space-y-3">
          {notifications.map((note) => (
            <div
              key={note._id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 transition ${
                note.readAt
                  ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                  : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40"
              }`}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (note.issueId) {
                  navigate(`/app/issues/${note.issueId}`);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && note.issueId) {
                  navigate(`/app/issues/${note.issueId}`);
                }
              }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {note.message}
                  </p>
                  {!note.readAt ? <Badge variant="outline">Unread</Badge> : null}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {typeLabels[note.type] ?? "Notification"} -{" "}
                  {new Date(note.createdAt).toLocaleString()}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  markRead.mutate(note._id);
                }}
                onKeyDown={(event) => event.stopPropagation()}
                disabled={Boolean(note.readAt) || markRead.isPending}
              >
                Mark read
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
