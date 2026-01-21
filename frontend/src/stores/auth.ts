import { create } from "zustand";
import api, { getAccessToken, setAccessToken } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspaces";

type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  contact?: string | null;
};

type AuthState = {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  bootstrap: () => Promise<void>;
  login: (payload: { email: string; password: string }) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (payload: { email: string; code: string }) => Promise<void>;
  loginAsDemo: (type: "owner" | "member") => Promise<void>;
  register: (payload: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (payload: { name?: string; avatarUrl?: string | null; contact?: string | null }) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,
  bootstrap: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get("/api/users/me");
      set({ user: res.data.user, accessToken: getAccessToken() });
    } catch {
      setAccessToken(null);
      set({ user: null, accessToken: null });
    } finally {
      set({ isLoading: false });
    }
  },
  login: async (payload) => {
    const res = await api.post("/api/auth/login", payload);
    const token = res.data.accessToken ?? null;
    setAccessToken(token);
    set({ accessToken: token, user: res.data.user ?? null });
  },
  loginWithGoogle: async (credential) => {
    const res = await api.post("/api/auth/google", { credential });
    const token = res.data.accessToken ?? null;
    setAccessToken(token);
    set({ accessToken: token, user: res.data.user ?? null });
  },
  requestOtp: async (email) => {
    await api.post("/api/auth/otp/request", { email });
  },
  verifyOtp: async (payload) => {
    const res = await api.post("/api/auth/otp/verify", payload);
    const token = res.data.accessToken ?? null;
    setAccessToken(token);
    set({ accessToken: token, user: res.data.user ?? null });
  },
  loginAsDemo: async (type) => {
    const res = await api.post("/api/auth/demo", { type });
    const token = res.data.accessToken ?? null;
    setAccessToken(token);
    set({ accessToken: token, user: res.data.user ?? null });
  },
  register: async (payload) => {
    const res = await api.post("/api/auth/register", payload);
    const token = res.data.accessToken ?? null;
    setAccessToken(token);
    set({ accessToken: token, user: res.data.user ?? null });
  },
  logout: async () => {
    await api.post("/api/auth/logout");
    setAccessToken(null);
    set({ accessToken: null, user: null });
    useWorkspaceStore.getState().reset();
  },
  updateProfile: async (payload) => {
    const res = await api.patch("/api/users/me", payload);
    set({ user: res.data.user ?? null });
  }
}));
