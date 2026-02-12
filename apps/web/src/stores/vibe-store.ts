import { create } from "zustand";

interface ScoreEntry {
  score: number;
  reasoning: string;
}

interface ScoringProgress {
  scored: number;
  total: number;
}

interface VibeStore {
  scores: Record<string, ScoreEntry>;
  threshold: number;
  hideBelow: boolean;
  isScoring: boolean;
  scoringProgress: ScoringProgress;
  setScore: (contractId: string, score: number, reasoning: string) => void;
  setThreshold: (t: number) => void;
  setHideBelow: (h: boolean) => void;
  setIsScoring: (s: boolean) => void;
  setScoringProgress: (scored: number, total: number) => void;
  clearScores: () => void;
  loadScores: (
    scores: Array<{ contractId: string; score: number; reasoning: string }>
  ) => void;
}

export const useVibeStore = create<VibeStore>((set) => ({
  scores: {},
  threshold: 5,
  hideBelow: false,
  isScoring: false,
  scoringProgress: { scored: 0, total: 0 },

  setScore: (contractId, score, reasoning) =>
    set((state) => ({
      scores: { ...state.scores, [contractId]: { score, reasoning } },
    })),

  setThreshold: (t) => set({ threshold: t }),

  setHideBelow: (h) => set({ hideBelow: h }),

  setIsScoring: (s) => set({ isScoring: s }),

  setScoringProgress: (scored, total) =>
    set({ scoringProgress: { scored, total } }),

  clearScores: () => set({ scores: {}, scoringProgress: { scored: 0, total: 0 } }),

  loadScores: (scores) =>
    set({
      scores: Object.fromEntries(
        scores.map((s) => [s.contractId, { score: s.score, reasoning: s.reasoning }])
      ),
    }),
}));
