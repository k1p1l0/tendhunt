import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isDpsFrameworkActive,
  statusLabel,
  getActionCTA,
} from "./contract-mechanism";

// Fix "now" to 2026-02-14 for deterministic date comparisons
const NOW = new Date("2026-02-14T12:00:00Z");
const FUTURE_DATE = "2028-03-31T00:00:00Z";
const PAST_DATE = "2025-01-01T00:00:00Z";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

// ─────────────────────────────────────────────────────────────────────────────
// isDpsFrameworkActive
// ─────────────────────────────────────────────────────────────────────────────

describe("isDpsFrameworkActive", () => {
  it("returns true for DPS + CLOSED + future end date", () => {
    expect(isDpsFrameworkActive("dps", "CLOSED", FUTURE_DATE)).toBe(true);
  });

  it("returns true for framework + CLOSED + future end date", () => {
    expect(isDpsFrameworkActive("framework", "CLOSED", FUTURE_DATE)).toBe(true);
  });

  it("returns true for call_off_dps + CLOSED + future end date", () => {
    expect(isDpsFrameworkActive("call_off_dps", "CLOSED", FUTURE_DATE)).toBe(
      true
    );
  });

  it("returns true for call_off_framework + CLOSED + future end date", () => {
    expect(
      isDpsFrameworkActive("call_off_framework", "CLOSED", FUTURE_DATE)
    ).toBe(true);
  });

  it("returns false for standard mechanism", () => {
    expect(isDpsFrameworkActive("standard", "CLOSED", FUTURE_DATE)).toBe(false);
  });

  it("returns false for null mechanism", () => {
    expect(isDpsFrameworkActive(null, "CLOSED", FUTURE_DATE)).toBe(false);
  });

  it("returns false for undefined mechanism", () => {
    expect(isDpsFrameworkActive(undefined, "CLOSED", FUTURE_DATE)).toBe(false);
  });

  it("returns false when status is OPEN (not CLOSED)", () => {
    expect(isDpsFrameworkActive("dps", "OPEN", FUTURE_DATE)).toBe(false);
  });

  it("returns false when status is AWARDED", () => {
    expect(isDpsFrameworkActive("dps", "AWARDED", FUTURE_DATE)).toBe(false);
  });

  it("returns false when contractEndDate is in the past", () => {
    expect(isDpsFrameworkActive("dps", "CLOSED", PAST_DATE)).toBe(false);
  });

  it("returns false when contractEndDate is null", () => {
    expect(isDpsFrameworkActive("dps", "CLOSED", null)).toBe(false);
  });

  it("returns false when contractEndDate is undefined", () => {
    expect(isDpsFrameworkActive("dps", "CLOSED", undefined)).toBe(false);
  });

  it("handles Date objects (not just strings)", () => {
    expect(
      isDpsFrameworkActive("dps", "CLOSED", new Date("2028-01-01"))
    ).toBe(true);

    expect(
      isDpsFrameworkActive("dps", "CLOSED", new Date("2020-01-01"))
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// statusLabel
// ─────────────────────────────────────────────────────────────────────────────

describe("statusLabel", () => {
  it("returns 'Window Closed' for active DPS with CLOSED status", () => {
    expect(statusLabel("CLOSED", "dps", FUTURE_DATE)).toBe("Window Closed");
  });

  it("returns 'Window Closed' for active framework with CLOSED status", () => {
    expect(statusLabel("CLOSED", "framework", FUTURE_DATE)).toBe(
      "Window Closed"
    );
  });

  it("returns original status for standard contracts", () => {
    expect(statusLabel("CLOSED", "standard", FUTURE_DATE)).toBe("CLOSED");
    expect(statusLabel("OPEN", "standard")).toBe("OPEN");
    expect(statusLabel("AWARDED", "standard")).toBe("AWARDED");
    expect(statusLabel("CANCELLED")).toBe("CANCELLED");
  });

  it("returns original status for DPS with OPEN status", () => {
    expect(statusLabel("OPEN", "dps", FUTURE_DATE)).toBe("OPEN");
  });

  it("returns original CLOSED for DPS with past end date", () => {
    expect(statusLabel("CLOSED", "dps", PAST_DATE)).toBe("CLOSED");
  });

  it("returns original CLOSED for DPS with no end date", () => {
    expect(statusLabel("CLOSED", "dps", null)).toBe("CLOSED");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getActionCTA
// ─────────────────────────────────────────────────────────────────────────────

describe("getActionCTA", () => {
  describe("Standard tenders", () => {
    it("OPEN standard → 'Apply for this tender'", () => {
      const cta = getActionCTA("standard", "OPEN");
      expect(cta.label).toBe("Apply for this tender");
      expect(cta.variant).toBe("default");
      expect(cta.disabled).toBe(false);
    });

    it("CLOSED standard with sourceUrl → 'View on source'", () => {
      const cta = getActionCTA(
        "standard",
        "CLOSED",
        null,
        "https://example.com"
      );
      expect(cta.label).toBe("View on source");
      expect(cta.variant).toBe("outline");
      expect(cta.disabled).toBe(false);
    });

    it("CLOSED standard without sourceUrl → disabled", () => {
      const cta = getActionCTA("standard", "CLOSED", null, null);
      expect(cta.label).toBe("View on source");
      expect(cta.disabled).toBe(true);
    });

    it("null mechanism treated as standard", () => {
      const cta = getActionCTA(null, "OPEN");
      expect(cta.label).toBe("Apply for this tender");
    });

    it("undefined mechanism treated as standard", () => {
      const cta = getActionCTA(undefined, "OPEN");
      expect(cta.label).toBe("Apply for this tender");
    });
  });

  describe("DPS contracts", () => {
    it("OPEN DPS → 'Apply to join this DPS'", () => {
      const cta = getActionCTA("dps", "OPEN");
      expect(cta.label).toBe("Apply to join this DPS");
      expect(cta.variant).toBe("default");
      expect(cta.disabled).toBe(false);
    });

    it("CLOSED DPS with future end date → 'Monitor for next reopening'", () => {
      const cta = getActionCTA("dps", "CLOSED", FUTURE_DATE);
      expect(cta.label).toBe("Monitor for next reopening");
      expect(cta.variant).toBe("secondary");
      expect(cta.disabled).toBe(false);
    });

    it("CLOSED DPS with past end date → 'DPS expired'", () => {
      const cta = getActionCTA("dps", "CLOSED", PAST_DATE);
      expect(cta.label).toBe("DPS expired");
      expect(cta.variant).toBe("outline");
      expect(cta.disabled).toBe(true);
    });

    it("CLOSED DPS with no end date → 'DPS expired'", () => {
      const cta = getActionCTA("dps", "CLOSED", null);
      expect(cta.label).toBe("DPS expired");
      expect(cta.disabled).toBe(true);
    });
  });

  describe("Framework contracts", () => {
    it("OPEN Framework → 'View framework details'", () => {
      const cta = getActionCTA("framework", "OPEN");
      expect(cta.label).toBe("View framework details");
      expect(cta.variant).toBe("default");
      expect(cta.disabled).toBe(false);
    });

    it("CLOSED Framework with future end → 'Framework active -- monitor buyer'", () => {
      const cta = getActionCTA("framework", "CLOSED", FUTURE_DATE);
      expect(cta.label).toBe("Framework active -- monitor buyer");
      expect(cta.variant).toBe("secondary");
      expect(cta.disabled).toBe(false);
    });

    it("CLOSED Framework with past end → falls through to View on source", () => {
      const cta = getActionCTA(
        "framework",
        "CLOSED",
        PAST_DATE,
        "https://source.gov.uk"
      );
      expect(cta.label).toBe("View on source");
    });
  });

  describe("Call-off contracts", () => {
    it("DPS call-off → 'Framework members only' (always disabled)", () => {
      const cta = getActionCTA("call_off_dps", "OPEN");
      expect(cta.label).toBe("Framework members only");
      expect(cta.disabled).toBe(true);
    });

    it("Framework call-off → 'Framework members only' (always disabled)", () => {
      const cta = getActionCTA("call_off_framework", "CLOSED", FUTURE_DATE);
      expect(cta.label).toBe("Framework members only");
      expect(cta.disabled).toBe(true);
    });

    it("Call-off ignores status and end date", () => {
      const openCta = getActionCTA("call_off_dps", "OPEN", FUTURE_DATE);
      const closedCta = getActionCTA("call_off_framework", "CLOSED", PAST_DATE);
      expect(openCta.label).toBe("Framework members only");
      expect(closedCta.label).toBe("Framework members only");
    });
  });

  describe("Real-world scenarios", () => {
    it("KCC Skills Programme DPS — OPEN with future deadline", () => {
      const cta = getActionCTA(
        "dps",
        "OPEN",
        "2026-11-06T17:00:00Z",
        "https://kentbusinessportal.org.uk"
      );
      expect(cta.label).toBe("Apply to join this DPS");
      expect(cta.disabled).toBe(false);
    });

    it("KCC Skills Programme DPS — CLOSED between reopening windows", () => {
      const cta = getActionCTA(
        "dps",
        "CLOSED",
        "2031-03-31T00:00:00Z",
        "https://kentbusinessportal.org.uk"
      );
      expect(cta.label).toBe("Monitor for next reopening");
      expect(cta.disabled).toBe(false);
    });

    it("NHS framework call-off — framework members only", () => {
      const cta = getActionCTA(
        "call_off_framework",
        "CLOSED",
        "2026-11-01T00:00:00Z",
        "https://nhssupplychain.nhs.uk"
      );
      expect(cta.label).toBe("Framework members only");
      expect(cta.disabled).toBe(true);
    });
  });
});
