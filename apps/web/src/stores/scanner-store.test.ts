import { describe, it, expect, beforeEach } from "vitest";
import { useScannerStore, getScore } from "./scanner-store";

beforeEach(() => {
  useScannerStore.setState({
    scores: {},
    isScoring: false,
    scoringProgress: { scored: 0, total: 0 },
    columnScoringProgress: {},
  });
});

describe("loadScores", () => {
  it("merges new scores with existing ones", () => {
    const { setScore, loadScores } = useScannerStore.getState();

    setScore("col-a", "ent-1", { score: 8, response: "Great" });

    loadScores([
      { columnId: "col-b", entityId: "ent-2", score: 5, response: "OK" },
    ]);

    const state = useScannerStore.getState();
    expect(getScore(state.scores, "col-a", "ent-1")).toEqual({
      score: 8,
      response: "Great",
    });
    expect(getScore(state.scores, "col-b", "ent-2")).toEqual({
      score: 5,
      response: "OK",
      reasoning: undefined,
    });
  });

  it("overwrites existing entry for same column+entity", () => {
    const { setScore, loadScores } = useScannerStore.getState();

    setScore("col-a", "ent-1", { score: 3, response: "Old", reasoning: "old reason" });

    loadScores([
      { columnId: "col-a", entityId: "ent-1", score: 9, response: "New", reasoning: "new reason" },
    ]);

    const entry = getScore(useScannerStore.getState().scores, "col-a", "ent-1");
    expect(entry?.score).toBe(9);
    expect(entry?.response).toBe("New");
    expect(entry?.reasoning).toBe("new reason");
  });

  it("preserves in-memory loading state when DB has no entry for that key", () => {
    const { setScore, loadScores } = useScannerStore.getState();

    setScore("col-a", "ent-1", { response: "", isLoading: true });

    loadScores([
      { columnId: "col-b", entityId: "ent-2", score: 7, response: "Done" },
    ]);

    const loading = getScore(useScannerStore.getState().scores, "col-a", "ent-1");
    expect(loading?.isLoading).toBe(true);
  });
});

describe("setScore", () => {
  it("sets an individual score entry", () => {
    useScannerStore.getState().setScore("col-x", "ent-y", {
      score: 6,
      response: "Decent",
      reasoning: "Because...",
    });

    const entry = getScore(useScannerStore.getState().scores, "col-x", "ent-y");
    expect(entry).toEqual({
      score: 6,
      response: "Decent",
      reasoning: "Because...",
    });
  });
});

describe("clearScores", () => {
  it("resets scores to empty and zeroes progress", () => {
    const store = useScannerStore.getState();
    store.setScore("col-a", "ent-1", { score: 5, response: "OK" });
    store.setScoringProgress(3, 10);
    store.setColumnScoringProgress("col-a", 3, 10);

    useScannerStore.getState().clearScores();

    const state = useScannerStore.getState();
    expect(state.scores).toEqual({});
    expect(state.scoringProgress).toEqual({ scored: 0, total: 0 });
    expect(state.columnScoringProgress).toEqual({});
  });
});

describe("getScore selector", () => {
  it("returns the correct entry", () => {
    useScannerStore.getState().setScore("c1", "e1", { score: 4, response: "Test" });
    const entry = getScore(useScannerStore.getState().scores, "c1", "e1");
    expect(entry?.score).toBe(4);
  });

  it("returns undefined for missing key", () => {
    const entry = getScore(useScannerStore.getState().scores, "nope", "nada");
    expect(entry).toBeUndefined();
  });
});
