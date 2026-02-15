import { create } from "zustand";
import type { ScannerType } from "@/models/scanner";

export interface ScoreEntry {
  score?: number;
  response: string;
  reasoning?: string;
  isLoading?: boolean;
  isQueued?: boolean;
  error?: string;
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

  // Per-column scoring progress for inline header display
  columnScoringProgress: Record<string, { scored: number; total: number }>;

  // Grid layout state
  columnWidths: Record<string, number>;
  columnOrder: string[];

  // Column value filters: columnId → selected values (OR within column, AND across columns)
  columnFilters: Record<string, string[]>;

  // Actions
  setActiveScanner: (id: string, type: ScannerType) => void;
  setScore: (columnId: string, entityId: string, entry: ScoreEntry) => void;
  setIsScoring: (s: boolean) => void;
  setScoringProgress: (scored: number, total: number, columnId?: string) => void;
  setColumnScoringProgress: (columnId: string, scored: number, total: number) => void;
  clearColumnScoringProgress: () => void;
  setColumnWidth: (columnId: string, width: number) => void;
  setColumnOrder: (order: string[]) => void;
  setColumnFilter: (columnId: string, values: string[]) => void;
  loadColumnFilters: (filters: Record<string, string[]>) => void;
  clearColumnFilters: () => void;
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
  columnScoringProgress: {},
  columnWidths: {},
  columnOrder: [],
  columnFilters: {},

  setActiveScanner: (id, type) => set({ scannerId: id, scannerType: type }),

  setScore: (columnId, entityId, entry) =>
    set((state) => ({
      scores: { ...state.scores, [makeKey(columnId, entityId)]: entry },
    })),

  setIsScoring: (s) => set({ isScoring: s }),

  setScoringProgress: (scored, total, columnId) =>
    set({ scoringProgress: { scored, total, columnId } }),

  setColumnScoringProgress: (columnId, scored, total) =>
    set((state) => ({
      columnScoringProgress: {
        ...state.columnScoringProgress,
        [columnId]: { scored, total },
      },
    })),

  clearColumnScoringProgress: () => set({ columnScoringProgress: {} }),

  setColumnWidth: (columnId, width) =>
    set((state) => ({
      columnWidths: { ...state.columnWidths, [columnId]: width },
    })),

  setColumnOrder: (order) => set({ columnOrder: order }),

  setColumnFilter: (columnId, values) =>
    set((state) => {
      if (values.length === 0) {
        const { [columnId]: _, ...rest } = state.columnFilters;
        return { columnFilters: rest };
      }
      return { columnFilters: { ...state.columnFilters, [columnId]: values } };
    }),

  loadColumnFilters: (filters) => set({ columnFilters: filters }),

  clearColumnFilters: () => set({ columnFilters: {} }),

  clearScores: () =>
    set({ scores: {}, scoringProgress: { scored: 0, total: 0 }, columnScoringProgress: {} }),

  loadScores: (scores) =>
    set((state) => ({
      scores: {
        ...state.scores,
        ...Object.fromEntries(
          scores.map((s) => [
            makeKey(s.columnId, s.entityId),
            {
              score: s.score,
              response: s.response ?? "",
              reasoning: s.reasoning,
            },
          ])
        ),
      },
    })),
}));

/** Selector to get a score entry by columnId and entityId */
export function getScore(
  scores: Record<ScoreKey, ScoreEntry>,
  columnId: string,
  entityId: string
): ScoreEntry | undefined {
  return scores[makeKey(columnId, entityId)];
}
