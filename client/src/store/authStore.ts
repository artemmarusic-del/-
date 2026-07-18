import { create } from "zustand";
import { api } from "../api/client";
import { Profile, User } from "../types";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  status: "idle" | "loading" | "ready";
  error: string | null;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadProfile: () => Promise<void>;
  setProfile: (profile: Profile) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  status: "idle",
  error: null,

  init: async () => {
    set({ status: "loading" });
    try {
      const user = await api.get<User>("/auth/me");
      // Load the profile BEFORE flipping status to "ready", otherwise the
      // router briefly sees user-without-profile and redirects to onboarding.
      if (user.hasProfile) {
        try {
          const profile = await api.get<Profile>("/profile");
          set({ profile });
        } catch {
          // ignore - onboarding will handle a genuinely missing profile
        }
      }
      set({ user, status: "ready" });
    } catch {
      set({ user: null, status: "ready" });
    }
  },

  login: async (email, password) => {
    set({ error: null });
    const user = await api.post<User>("/auth/login", { email, password });
    set({ user });
    try {
      await get().loadProfile();
    } catch {
      // profile not created yet - onboarding will handle it
    }
  },

  register: async (name, email, password) => {
    set({ error: null });
    const user = await api.post<User>("/auth/register", { name, email, password });
    set({ user });
  },

  logout: async () => {
    await api.post("/auth/logout");
    set({ user: null, profile: null });
  },

  loadProfile: async () => {
    const profile = await api.get<Profile>("/profile");
    set({ profile });
  },

  setProfile: (profile) => set({ profile }),
}));
