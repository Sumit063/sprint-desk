import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";
import { useWorkspaceStore } from "@/stores/workspaces";

let socket: Socket | null = null;

export function useWorkspaceSocket() {
  const accessToken = useAuthStore((state) => state.accessToken);
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

    const handleIssueCreated = (payload: { issueId?: string; title?: string }) => {
      toast.info(payload.title ? `Issue created: ${payload.title}` : "Issue created");
      queryClient.invalidateQueries({ queryKey: ["issues", workspaceId] });
    };

    const handleIssueUpdated = (payload: { issueId?: string }) => {
      toast.message("Issue updated");
      queryClient.invalidateQueries({ queryKey: ["issues", workspaceId] });
      if (payload.issueId) {
        queryClient.invalidateQueries({ queryKey: ["issue", payload.issueId] });
      }
    };

    const handleCommentAdded = (payload: { issueId?: string }) => {
      toast.message("New comment added");
      if (payload.issueId) {
        queryClient.invalidateQueries({ queryKey: ["issue-comments", payload.issueId] });
      }
    };

    socket.on("issue_created", handleIssueCreated);
    socket.on("issue_updated", handleIssueUpdated);
    socket.on("comment_added", handleCommentAdded);

    return () => {
      socket?.off("issue_created", handleIssueCreated);
      socket?.off("issue_updated", handleIssueUpdated);
      socket?.off("comment_added", handleCommentAdded);
    };
  }, [workspaceId, queryClient]);
}
