import { describe, it, expect } from "vitest";
import { compareInspections, detectDowngradesFromHistory } from "../ofsted-downgrade";

describe("compareInspections", () => {
  it("detects pre-2024 downgrade (overall effectiveness 2 -> 3)", () => {
    const result = compareInspections(
      { overallEffectiveness: 3, qualityOfEducation: 2, behaviourAndAttitudes: 2, personalDevelopment: 2, leadershipAndManagement: 2 },
      { overallEffectiveness: 2, qualityOfEducation: 2, behaviourAndAttitudes: 2, personalDevelopment: 2, leadershipAndManagement: 2 }
    );
    expect(result.direction).toBe("downgraded");
    expect(result.downgradeType).toBe("overall");
    expect(result.usedOverallEffectiveness).toBe(true);
  });

  it("detects pre-2024 improvement (overall effectiveness 3 -> 2)", () => {
    const result = compareInspections(
      { overallEffectiveness: 2, qualityOfEducation: 2, behaviourAndAttitudes: 2, personalDevelopment: 2, leadershipAndManagement: 2 },
      { overallEffectiveness: 3, qualityOfEducation: 3, behaviourAndAttitudes: 3, personalDevelopment: 3, leadershipAndManagement: 3 }
    );
    expect(result.direction).toBe("improved");
    expect(result.downgradeType).toBeNull();
    expect(result.usedOverallEffectiveness).toBe(true);
  });

  it("detects pre-2024 unchanged (overall effectiveness 2 -> 2)", () => {
    const result = compareInspections(
      { overallEffectiveness: 2, qualityOfEducation: 2, behaviourAndAttitudes: 2, personalDevelopment: 2, leadershipAndManagement: 2 },
      { overallEffectiveness: 2, qualityOfEducation: 2, behaviourAndAttitudes: 2, personalDevelopment: 2, leadershipAndManagement: 2 }
    );
    expect(result.direction).toBe("unchanged");
    expect(result.downgradeType).toBeNull();
    expect(result.usedOverallEffectiveness).toBe(false);
  });

  it("detects post-2024 downgrade (no overall, sub-judgement worsens)", () => {
    const result = compareInspections(
      { qualityOfEducation: 3, behaviourAndAttitudes: 2, personalDevelopment: 2, leadershipAndManagement: 2 },
      { qualityOfEducation: 2, behaviourAndAttitudes: 2, personalDevelopment: 2, leadershipAndManagement: 2 }
    );
    expect(result.direction).toBe("downgraded");
    expect(result.downgradeType).toBe("qualityOfEducation");
    expect(result.usedOverallEffectiveness).toBe(false);
    expect(result.downgradedAreas).toHaveLength(1);
    expect(result.downgradedAreas[0].field).toBe("qualityOfEducation");
  });

  it("detects post-2024 mixed (some improve, some downgrade)", () => {
    const result = compareInspections(
      { qualityOfEducation: 3, behaviourAndAttitudes: 1, personalDevelopment: 2, leadershipAndManagement: 2 },
      { qualityOfEducation: 2, behaviourAndAttitudes: 2, personalDevelopment: 2, leadershipAndManagement: 2 }
    );
    // Downgrade takes priority over improvement
    expect(result.direction).toBe("downgraded");
    expect(result.downgradeType).toBe("qualityOfEducation");
    expect(result.downgradedAreas).toHaveLength(1);
    expect(result.improvedAreas).toHaveLength(1);
    expect(result.improvedAreas[0].field).toBe("behaviourAndAttitudes");
  });

  it("handles cross-era comparison (2019-2024 with overall vs post-2024 without)", () => {
    // Current (post-2024) has no overall, previous (pre-2024) has overall
    // Should fall through to sub-judgement comparison since both must have overall
    const result = compareInspections(
      { qualityOfEducation: 3, behaviourAndAttitudes: 2, personalDevelopment: 2, leadershipAndManagement: 2 },
      { overallEffectiveness: 2, qualityOfEducation: 2, behaviourAndAttitudes: 2, personalDevelopment: 2, leadershipAndManagement: 2 }
    );
    expect(result.direction).toBe("downgraded");
    expect(result.usedOverallEffectiveness).toBe(false);
    expect(result.downgradeType).toBe("qualityOfEducation");
  });

  it("returns unchanged when same overall but sub-judgements also same", () => {
    const result = compareInspections(
      { overallEffectiveness: 2, qualityOfEducation: 2, behaviourAndAttitudes: 2, personalDevelopment: 2, leadershipAndManagement: 2 },
      { overallEffectiveness: 2, qualityOfEducation: 2, behaviourAndAttitudes: 2, personalDevelopment: 2, leadershipAndManagement: 2 }
    );
    expect(result.direction).toBe("unchanged");
    expect(result.downgradedAreas).toHaveLength(0);
    expect(result.improvedAreas).toHaveLength(0);
  });

  it("detects sub-judgement downgrade when overall is equal", () => {
    const result = compareInspections(
      { overallEffectiveness: 2, qualityOfEducation: 3, behaviourAndAttitudes: 2, personalDevelopment: 2, leadershipAndManagement: 2 },
      { overallEffectiveness: 2, qualityOfEducation: 2, behaviourAndAttitudes: 2, personalDevelopment: 2, leadershipAndManagement: 2 }
    );
    expect(result.direction).toBe("downgraded");
    expect(result.usedOverallEffectiveness).toBe(false);
    expect(result.downgradeType).toBe("qualityOfEducation");
    expect(result.downgradedAreas).toHaveLength(1);
  });
});

describe("detectDowngradesFromHistory", () => {
  it("returns null direction for single inspection (no previous to compare)", () => {
    const result = detectDowngradesFromHistory([
      { inspectionDate: new Date("2024-01-15"), overallEffectiveness: 2, qualityOfEducation: 2 },
    ]);
    expect(result.ratingDirection).toBeNull();
    expect(result.lastDowngradeDate).toBeNull();
    expect(result.latestAnalysis).toBeNull();
  });

  it("returns null for empty history", () => {
    const result = detectDowngradesFromHistory([]);
    expect(result.ratingDirection).toBeNull();
    expect(result.lastDowngradeDate).toBeNull();
  });
});
