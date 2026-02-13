import { create } from "zustand";

import type { PipelineCardData } from "@/types/inbox";

interface InboxStore {
  cards: PipelineCardData[];
  isLoading: boolean;
  error: string | null;

  fetchCards: () => Promise<void>;
  setCards: (cards: PipelineCardData[]) => void;
  addCard: (card: PipelineCardData) => void;
  updateCard: (id: string, updates: Partial<PipelineCardData>) => void;
  removeCard: (id: string) => void;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
}

export const useInboxStore = create<InboxStore>((set) => ({
  cards: [],
  isLoading: false,
  error: null,

  fetchCards: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/inbox");
      if (!res.ok) throw new Error("Failed to fetch inbox cards");
      const data = await res.json();
      set({ cards: data.cards ?? data, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Unknown error",
        isLoading: false,
      });
    }
  },

  setCards: (cards) => set({ cards }),

  addCard: (card) =>
    set((state) => ({ cards: [...state.cards, card] })),

  updateCard: (id, updates) =>
    set((state) => ({
      cards: state.cards.map((c) =>
        c._id === id ? { ...c, ...updates } : c
      ),
    })),

  removeCard: (id) =>
    set((state) => ({
      cards: state.cards.filter((c) => c._id !== id),
    })),

  setLoading: (v) => set({ isLoading: v }),

  setError: (v) => set({ error: v }),
}));
