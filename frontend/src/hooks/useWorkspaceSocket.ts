import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";
import { useWorkspaceStore } from "@/stores/workspaces";

let socket: Socket | null = null;

export function useWorkspaceSocket() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.user?.id);
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    socket?.disconnect();
    socket = io(import.meta.env.VITE_API_URL ?? "http://localhost:4000", {
      auth: { token: accessToken }
    });

    socket.on("connect_error", () => {
      toast.error("Realtime connection failed");
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!socket || !workspaceId) {
      return;
    }

    socket.emit("join_workspace", workspaceId, (payload: { ok?: boolean; message?: string }) => {
      if (!payload?.ok) {
        toast.warning(payload?.message ?? "Unable to join workspace");
      }
    });

    const handleIssueCreated = (payload: {
      issueId?: string;
      title?: string;
      actorId?: string;
    }) => {
      const isSelf = Boolean(payload.actorId && payload.actorId === userId);
      if (!isSelf) {
        toast.info(payload.title ? `Issue created: ${payload.title}` : "Issue created", {
          id: payload.issueId ? `issue-created-${payload.issueId}` : undefined
        });
      }
      queryClient.invalidateQueries({ queryKey: ["issues", workspaceId] });
    };

    const handleIssueUpdated = (payload: {
      issueId?: string;
      actorId?: string;
      fields?: string[];
    }) => {
      const isSelf = Boolean(payload.actorId && payload.actorId === userId);
      const isAssignmentOnly = payload.fields?.length === 1 && payload.fields[0] === "assigneeId";
      if (!isSelf && !isAssignmentOnly) {
        toast.message("Issue updated", {
          id: payload.issueId ? `issue-updated-${payload.issueId}` : undefined
        });
      }
      queryClient.invalidateQueries({ queryKey: ["issues", workspaceId] });
      if (payload.issueId) {
        queryClient.invalidateQueries({ queryKey: ["issue", payload.issueId] });
      }
    };

    const handleCommentAdded = (payload: { issueId?: string; actorId?: string }) => {
      const isSelf = Boolean(payload.actorId && payload.actorId === userId);
      if (!isSelf) {
        toast.message("New comment added", {
          id: payload.issueId ? `comment-added-${payload.issueId}` : undefined
        });
      }
      if (payload.issueId) {
        queryClient.invalidateQueries({ queryKey: ["issue-comments", payload.issueId] });
      }
    };

    const handleNotification = (payload: { message?: string; notificationId?: string }) => {
      if (payload.message) {
        toast.message(payload.message, {
          id: payload.notificationId ? `notification-${payload.notificationId}` : undefined
        });
      }
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
    };

    socket.on("issue_created", handleIssueCreated);
    socket.on("issue_updated", handleIssueUpdated);
    socket.on("comment_added", handleCommentAdded);
    socket.on("notification_created", handleNotification);

    return () => {
      socket?.off("issue_created", handleIssueCreated);
      socket?.off("issue_updated", handleIssueUpdated);
      socket?.off("comment_added", handleCommentAdded);
      socket?.off("notification_created", handleNotification);
    };
  }, [workspaceId, queryClient, userId]);
}
