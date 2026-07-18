import { create } from "zustand";
import { api, setActiveProfileHeader } from "../api/client";
import { Profile, User } from "../types";

const ACTIVE_PROFILE_KEY = "xe-active-profile";

interface AuthState {
  user: User | null;
  /** All tracked people of this account (e.g. mother and child). */
  profiles: Profile[];
  /** The one currently being viewed/edited. */
  profile: Profile | null;
  status: "idle" | "loading" | "ready";
  error: string | null;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadProfiles: () => Promise<void>;
  switchProfile: (profileId: string) => void;
  setProfile: (profile: Profile) => void;
}

function pickActive(profiles: Profile[]): Profile | null {
  if (profiles.length === 0) return null;
  const savedId = localStorage.getItem(ACTIVE_PROFILE_KEY);
  return profiles.find((p) => p.id === savedId) ?? profiles[0];
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profiles: [],
  profile: null,
  status: "idle",
  error: null,

  init: async () => {
    set({ status: "loading" });
    try {
      const user = await api.get<User>("/auth/me");
      // Load profiles BEFORE flipping status to "ready", otherwise the router
      // briefly sees user-without-profile and redirects to onboarding.
      if (user.hasProfile) {
        try {
          await get().loadProfiles();
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
      await get().loadProfiles();
    } catch {
      // no profile yet - onboarding will handle it
    }
  },

  register: async (name, email, password) => {
    set({ error: null });
    const user = await api.post<User>("/auth/register", { name, email, password });
    set({ user });
  },

  logout: async () => {
    await api.post("/auth/logout");
    setActiveProfileHeader(null);
    set({ user: null, profiles: [], profile: null });
  },

  loadProfiles: async () => {
    const profiles = await api.get<Profile[]>("/profiles");
    const active = pickActive(profiles);
    setActiveProfileHeader(active?.id ?? null);
    if (active) localStorage.setItem(ACTIVE_PROFILE_KEY, active.id);
    set({ profiles, profile: active });
  },

  switchProfile: (profileId) => {
    const target = get().profiles.find((p) => p.id === profileId);
    if (!target) return;
    localStorage.setItem(ACTIVE_PROFILE_KEY, target.id);
    setActiveProfileHeader(target.id);
    set({ profile: target });
  },

  setProfile: (profile) =>
    set((state) => ({
      profile,
      profiles: state.profiles.map((p) => (p.id === profile.id ? profile : p)),
    })),
}));
