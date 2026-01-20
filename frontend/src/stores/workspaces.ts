import { create } from "zustand";
import api from "@/lib/api";

type Workspace = {
  id: string;
  name: string;
  ownerId?: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
};

type WorkspaceState = {
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  isLoading: boolean;
  error: string | null;
  fetchWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<void>;
  joinWorkspace: (code: string) => Promise<void>;
  setCurrentWorkspace: (id: string) => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  currentWorkspaceId: null,
  isLoading: false,
  error: null,
  fetchWorkspaces: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get("/api/workspaces");
      const workspaces = (res.data.workspaces ?? []) as Workspace[];
      const currentId = get().currentWorkspaceId ?? workspaces[0]?.id ?? null;
      set({ workspaces, currentWorkspaceId: currentId });
    } catch {
      set({ error: "Unable to load workspaces" });
    } finally {
      set({ isLoading: false });
    }
  },
  createWorkspace: async (name) => {
    const res = await api.post("/api/workspaces", { name });
    const workspace = {
      ...(res.data.workspace as Workspace),
      role: res.data.role as Workspace["role"]
    };
    set((state) => ({
      workspaces: [...state.workspaces, workspace],
      currentWorkspaceId: workspace.id
    }));
  },
  joinWorkspace: async (code) => {
    const res = await api.post("/api/workspaces/join", { code });
    const workspace = {
      ...(res.data.workspace as Workspace),
      role: res.data.role as Workspace["role"]
    };
    set((state) => {
      const exists = state.workspaces.some((item) => item.id === workspace.id);
      return {
        workspaces: exists ? state.workspaces : [...state.workspaces, workspace],
        currentWorkspaceId: workspace.id
      };
    });
  },
  setCurrentWorkspace: (id) => set({ currentWorkspaceId: id })
}));
