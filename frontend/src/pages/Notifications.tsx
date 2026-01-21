import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Mentions and assignments across your workspaces.
        </p>
      </div>

      <div className="rounded-md border border-border bg-surface p-6">
        {isLoading ? (
          <p className="text-sm text-foreground-muted">Loading...</p>
        ) : null}
        {!isLoading && notifications.length === 0 ? (
          <p className="text-sm text-foreground-muted">You're all caught up.</p>
        ) : null}
        {notifications.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.map((note) => (
                <TableRow
                  key={note._id}
                  className={note.readAt ? "" : "bg-muted"}
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
                  <TableCell className="text-foreground-muted">
                    {typeLabels[note.type] ?? "Notification"}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{note.message}</TableCell>
                  <TableCell className="text-foreground-muted">
                    {new Date(note.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {!note.readAt ? (
                      <Badge variant="outline">Unread</Badge>
                    ) : (
                      <span className="text-foreground-muted">Read</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </div>
    </div>
  );
}

