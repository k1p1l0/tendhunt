import { describe, it, expect } from "vitest";
import { extractParentName } from "../stages/00-parent-link";

// ---------------------------------------------------------------------------
// extractParentName — extract potential parent org names from buyer names
// ---------------------------------------------------------------------------

describe("extractParentName", () => {
  describe("'hosted by' pattern", () => {
    it("extracts parent from 'X as hosted by Y'", () => {
      const candidates = extractParentName(
        "NHS Wales Informatics as hosted by Velindre NHS Trust"
      );
      expect(candidates).toContain("Velindre NHS Trust");
    });

    it("handles 'as hosted by' case-insensitively", () => {
      const candidates = extractParentName(
        "Some Service AS HOSTED BY Parent Org"
      );
      expect(candidates).toContain("Parent Org");
    });

    it("trims whitespace from extracted name", () => {
      const candidates = extractParentName(
        "Service as hosted by   Parent Org  "
      );
      expect(candidates).toContain("Parent Org");
    });

    it("skips 'hosted by' if extracted name is too short", () => {
      const candidates = extractParentName("Service as hosted by NHS");
      // "NHS" is only 3 chars, below MIN_PARENT_NAME_LENGTH (5)
      expect(candidates).not.toContain("NHS");
    });
  });

  describe("comma pattern", () => {
    it("extracts parent from 'Ministry of Defence, Army'", () => {
      const candidates = extractParentName("Ministry of Defence, Army");
      expect(candidates).toContain("Ministry of Defence");
    });

    it("extracts only the first comma split", () => {
      const candidates = extractParentName(
        "Ministry of Defence, Ships, Maritime Platform Systems"
      );
      expect(candidates).toContain("Ministry of Defence");
      // Should NOT produce "Ministry of Defence, Ships"
    });

    it("trims whitespace around comma-split parts", () => {
      const candidates = extractParentName("  Parent Org , Sub Unit  ");
      expect(candidates).toContain("Parent Org");
    });

    it("skips parenthetical abbreviations like '(NWSSP)'", () => {
      const candidates = extractParentName("(NWSSP), Shared Services");
      expect(candidates).not.toContain("(NWSSP)");
    });

    it("skips comma parent if left side is too short", () => {
      const candidates = extractParentName("NHS, Something");
      // "NHS" is only 3 chars
      expect(candidates).not.toContain("NHS");
    });
  });

  describe("dash pattern", () => {
    it("extracts both sides from 'DIO - Ministry of Defence'", () => {
      const candidates = extractParentName("DIO - Ministry of Defence");
      // "DIO" is only 3 chars, should be skipped
      expect(candidates).not.toContain("DIO");
      expect(candidates).toContain("Ministry of Defence");
    });

    it("extracts left side when long enough", () => {
      const candidates = extractParentName(
        "National Trust - Some Sub Department"
      );
      expect(candidates).toContain("National Trust");
      expect(candidates).toContain("Some Sub Department");
    });

    it("only processes first ' - ' occurrence", () => {
      const candidates = extractParentName("A Long Name - Middle Part - End Part");
      expect(candidates).toContain("A Long Name");
      expect(candidates).toContain("Middle Part - End Part");
    });

    it("skips dash sides that are too short", () => {
      const candidates = extractParentName("MOD - NHS");
      // Both "MOD" (3 chars) and "NHS" (3 chars) are below the limit
      expect(candidates).toHaveLength(0);
    });

    it("requires spaces around dash (not bare hyphens)", () => {
      const candidates = extractParentName("Self-Employed-Org");
      // No " - " pattern, just bare hyphens
      const dashCandidates = candidates.filter(
        (c) => c === "Self" || c === "Employed" || c === "Org"
      );
      expect(dashCandidates).toHaveLength(0);
    });
  });

  describe("combined patterns", () => {
    it("returns candidates from multiple patterns", () => {
      // Has both "hosted by" and comma
      const candidates = extractParentName(
        "NHS Wales Informatics, IT Division as hosted by Velindre NHS Trust"
      );
      expect(candidates).toContain("Velindre NHS Trust");
      expect(candidates).toContain("NHS Wales Informatics");
    });

    it("returns candidates from comma and dash", () => {
      const candidates = extractParentName(
        "Ministry of Defence, Ships - Naval Base"
      );
      expect(candidates).toContain("Ministry of Defence");
      // Dash candidate from left of " - " if present
    });
  });

  describe("self-reference prevention", () => {
    it("returns empty for a simple name with no delimiters", () => {
      const candidates = extractParentName("Sheffield City Council");
      expect(candidates).toHaveLength(0);
    });
  });

  describe("minimum name length", () => {
    it("skips all candidates shorter than 5 characters", () => {
      const candidates = extractParentName("ABC, DEF");
      expect(candidates).toHaveLength(0);
    });

    it("includes candidates with exactly 5 characters", () => {
      const candidates = extractParentName("Hello, World");
      expect(candidates).toContain("Hello");
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      const candidates = extractParentName("");
      expect(candidates).toHaveLength(0);
    });

    it("handles string with only a comma", () => {
      const candidates = extractParentName(",");
      expect(candidates).toHaveLength(0);
    });

    it("handles string with only a dash", () => {
      const candidates = extractParentName(" - ");
      expect(candidates).toHaveLength(0);
    });

    it("handles real-world MoD sub-department names", () => {
      const candidates = extractParentName(
        "Ministry of Defence, Army"
      );
      expect(candidates).toContain("Ministry of Defence");
    });

    it("handles DAERA sub-departments", () => {
      const candidates = extractParentName(
        "DAERA - Forest Service"
      );
      expect(candidates).toContain("DAERA");
      expect(candidates).toContain("Forest Service");
    });

    it("handles NHS Wales hosted by pattern", () => {
      const candidates = extractParentName(
        "Health Education and Improvement Wales as hosted by Velindre NHS Trust"
      );
      expect(candidates).toContain("Velindre NHS Trust");
    });
  });
});
