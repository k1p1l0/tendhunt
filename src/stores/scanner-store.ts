import { create } from "zustand";
import type { ScannerType } from "@/models/scanner";

export interface ScoreEntry {
  score?: number;
  response: string;
  reasoning?: string;
  isLoading?: boolean;
}

type ScoreKey = string;

interface ScoringProgress {
  scored: number;
  total: number;
  columnId?: string;
}

interface ScannerStore {
  // Active scanner
  scannerId: string | null;
  scannerType: ScannerType | null;

  // Scores: key = "columnId:entityId"
  scores: Record<ScoreKey, ScoreEntry>;

  // Scoring state
  isScoring: boolean;
  scoringProgress: ScoringProgress;

  // Threshold
  threshold: number;
  hideBelow: boolean;

  // Actions
  setActiveScanner: (id: string, type: ScannerType) => void;
  setScore: (columnId: string, entityId: string, entry: ScoreEntry) => void;
  setIsScoring: (s: boolean) => void;
  setScoringProgress: (scored: number, total: number, columnId?: string) => void;
  setThreshold: (t: number) => void;
  setHideBelow: (h: boolean) => void;
  clearScores: () => void;
  loadScores: (
    scores: Array<{
      columnId: string;
      entityId: string;
      score?: number;
      response: string;
      reasoning?: string;
    }>
  ) => void;
}

function makeKey(columnId: string, entityId: string): string {
  return `${columnId}:${entityId}`;
}

export const useScannerStore = create<ScannerStore>((set) => ({
  scannerId: null,
  scannerType: null,
  scores: {},
  isScoring: false,
  scoringProgress: { scored: 0, total: 0 },
  threshold: 5,
  hideBelow: false,

  setActiveScanner: (id, type) => set({ scannerId: id, scannerType: type }),

  setScore: (columnId, entityId, entry) =>
    set((state) => ({
      scores: { ...state.scores, [makeKey(columnId, entityId)]: entry },
    })),

  setIsScoring: (s) => set({ isScoring: s }),

  setScoringProgress: (scored, total, columnId) =>
    set({ scoringProgress: { scored, total, columnId } }),

  setThreshold: (t) => set({ threshold: t }),

  setHideBelow: (h) => set({ hideBelow: h }),

  clearScores: () =>
    set({ scores: {}, scoringProgress: { scored: 0, total: 0 } }),

  loadScores: (scores) =>
    set({
      scores: Object.fromEntries(
        scores.map((s) => [
          makeKey(s.columnId, s.entityId),
          {
            score: s.score,
            response: s.response ?? "",
            reasoning: s.reasoning,
          },
        ])
      ),
    }),
}));

/** Selector to get a score entry by columnId and entityId */
export function getScore(
  scores: Record<ScoreKey, ScoreEntry>,
  columnId: string,
  entityId: string
): ScoreEntry | undefined {
  return scores[makeKey(columnId, entityId)];
}
