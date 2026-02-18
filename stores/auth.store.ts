import { create } from "zustand";

export type AuthUser = {
  email: string | null;
  full_name: string | null;
  role: "customer" | "admin" | null;
};

type AuthState = {
  hydrated: boolean;
  user: AuthUser | null;

  setUser: (u: AuthUser | null) => void;
  setHydrated: (v: boolean) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  hydrated: false,
  user: null,
  setUser: (u) => set({ user: u }),
  setHydrated: (v) => set({ hydrated: v }),
  clear: () => set({ user: null }),
}));