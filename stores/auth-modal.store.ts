"use client";

import { create } from "zustand";

type NextAction = (() => void | Promise<void>) | null;

type AuthModalState = {
  open: boolean;
  nextAction: NextAction;

  openModal: (nextAction?: () => void | Promise<void>) => void;
  closeModal: () => void;

  consumeNextAction: () => Promise<void>;
};

export const useAuthModalStore = create<AuthModalState>((set, get) => ({
  open: false,
  nextAction: null,

  openModal: (nextAction) => set({ open: true, nextAction: nextAction ?? null }),

  closeModal: () => set({ open: false, nextAction: null }),

  consumeNextAction: async () => {
    const fn = get().nextAction;
    set({ nextAction: null }); // jangan auto-close di sini, biar modal yang atur
    if (fn) await fn();
  },
}));