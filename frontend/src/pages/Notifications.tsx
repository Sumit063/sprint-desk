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
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();

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
    }
  });

  const notifications = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="mt-1 text-sm text-slate-600">
          Mentions and assignments across your workspaces.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {isLoading ? <p className="text-sm text-slate-500">Loading...</p> : null}
        {!isLoading && notifications.length === 0 ? (
          <p className="text-sm text-slate-500">You're all caught up.</p>
        ) : null}
        <div className="space-y-3">
          {notifications.map((note) => (
            <div
              key={note._id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-900">{note.message}</p>
                  {!note.readAt ? <Badge variant="outline">Unread</Badge> : null}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {typeLabels[note.type] ?? "Notification"} ?{" "}
                  {new Date(note.createdAt).toLocaleString()}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => markRead.mutate(note._id)}
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
