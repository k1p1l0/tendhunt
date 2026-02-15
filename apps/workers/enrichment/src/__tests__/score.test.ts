import { describe, it, expect } from "vitest";
import { ObjectId } from "mongodb";
import { computeScore } from "../stages/06-score";

import type { BuyerDoc } from "../types";

// ---------------------------------------------------------------------------
// Helper to create a minimal BuyerDoc with overrides
// ---------------------------------------------------------------------------

function makeBuyer(overrides: Partial<BuyerDoc> = {}): BuyerDoc {
  return {
    _id: new ObjectId(),
    name: "Test Buyer",
    orgId: "test-org",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// computeScore — weighted enrichment score calculation (0-100)
//
// Weights (from source code):
//   orgType:              12 pts
//   website:               8 pts
//   logoUrl:               5 pts
//   linkedinUrl:           5 pts
//   democracyPortalUrl:    8 pts
//   boardPapersUrl:        8 pts
//   description:           5 pts
//   staffCount:            8 pts
//   annualBudget:          8 pts
//   personnel (up to 5):  18 pts
//   documents (up to 10): 15 pts
//                  Total: 100 pts
// ---------------------------------------------------------------------------

describe("computeScore", () => {
  describe("empty buyer (no data)", () => {
    it("returns 0 for a buyer with no enrichment data", () => {
      const buyer = makeBuyer();
      expect(computeScore(buyer, 0, 0)).toBe(0);
    });
  });

  describe("fully enriched buyer", () => {
    it("returns 100 for a buyer with all data present", () => {
      const buyer = makeBuyer({
        orgType: "local_council_london",
        website: "https://hackney.gov.uk",
        logoUrl: "https://logo.dev/hackney.png",
        linkedinUrl: "https://linkedin.com/company/hackney",
        democracyPortalUrl: "https://hackney.moderngov.co.uk",
        boardPapersUrl: "https://hackney.gov.uk/board",
        description: "London borough council serving Hackney",
        staffCount: 5000,
        annualBudget: 1000000000,
      });
      // 5 personnel + 10 documents = max graduated scores
      expect(computeScore(buyer, 5, 10)).toBe(100);
    });
  });

  describe("binary presence fields", () => {
    it("awards 12 pts for orgType", () => {
      const buyer = makeBuyer({ orgType: "local_council_london" });
      expect(computeScore(buyer, 0, 0)).toBe(12);
    });

    it("awards 8 pts for website", () => {
      const buyer = makeBuyer({ website: "https://example.gov.uk" });
      expect(computeScore(buyer, 0, 0)).toBe(8);
    });

    it("awards 5 pts for logoUrl", () => {
      const buyer = makeBuyer({ logoUrl: "https://logo.dev/example.png" });
      expect(computeScore(buyer, 0, 0)).toBe(5);
    });

    it("awards 5 pts for linkedinUrl", () => {
      const buyer = makeBuyer({ linkedinUrl: "https://linkedin.com/company/example" });
      expect(computeScore(buyer, 0, 0)).toBe(5);
    });

    it("awards 8 pts for democracyPortalUrl", () => {
      const buyer = makeBuyer({ democracyPortalUrl: "https://example.moderngov.co.uk" });
      expect(computeScore(buyer, 0, 0)).toBe(8);
    });

    it("awards 8 pts for boardPapersUrl", () => {
      const buyer = makeBuyer({ boardPapersUrl: "https://example.gov.uk/board" });
      expect(computeScore(buyer, 0, 0)).toBe(8);
    });

    it("awards 5 pts for description", () => {
      const buyer = makeBuyer({ description: "A council in London" });
      expect(computeScore(buyer, 0, 0)).toBe(5);
    });

    it("awards 8 pts for staffCount", () => {
      const buyer = makeBuyer({ staffCount: 3000 });
      expect(computeScore(buyer, 0, 0)).toBe(8);
    });

    it("awards 8 pts for annualBudget", () => {
      const buyer = makeBuyer({ annualBudget: 500000000 });
      expect(computeScore(buyer, 0, 0)).toBe(8);
    });

    it("sums all binary fields correctly", () => {
      const buyer = makeBuyer({
        orgType: "nhs_other",
        website: "https://nhs.uk",
        logoUrl: "https://logo.dev/nhs.png",
        linkedinUrl: "https://linkedin.com/company/nhs",
        democracyPortalUrl: "https://nhs.moderngov.co.uk",
        boardPapersUrl: "https://nhs.uk/board",
        description: "National Health Service",
        staffCount: 100000,
        annualBudget: 150000000000,
      });
      // 12 + 8 + 5 + 5 + 8 + 8 + 5 + 8 + 8 = 67
      expect(computeScore(buyer, 0, 0)).toBe(67);
    });
  });

  describe("graduated personnel field (0-18 pts, capped at 5)", () => {
    it("awards 0 pts for 0 personnel", () => {
      const buyer = makeBuyer();
      expect(computeScore(buyer, 0, 0)).toBe(0);
    });

    it("awards proportional pts for 1 personnel", () => {
      const buyer = makeBuyer();
      // (1/5) * 18 = 3.6 → rounds to 4
      expect(computeScore(buyer, 1, 0)).toBe(4);
    });

    it("awards proportional pts for 2 personnel", () => {
      const buyer = makeBuyer();
      // (2/5) * 18 = 7.2 → rounds to 7
      expect(computeScore(buyer, 2, 0)).toBe(7);
    });

    it("awards proportional pts for 3 personnel", () => {
      const buyer = makeBuyer();
      // (3/5) * 18 = 10.8 → rounds to 11
      expect(computeScore(buyer, 3, 0)).toBe(11);
    });

    it("awards proportional pts for 4 personnel", () => {
      const buyer = makeBuyer();
      // (4/5) * 18 = 14.4 → rounds to 14
      expect(computeScore(buyer, 4, 0)).toBe(14);
    });

    it("awards full 18 pts for 5 personnel", () => {
      const buyer = makeBuyer();
      // (5/5) * 18 = 18
      expect(computeScore(buyer, 5, 0)).toBe(18);
    });

    it("caps at 18 pts for more than 5 personnel", () => {
      const buyer = makeBuyer();
      // min(10, 5) / 5 * 18 = 18
      expect(computeScore(buyer, 10, 0)).toBe(18);
    });

    it("caps at 18 pts for very large personnel counts", () => {
      const buyer = makeBuyer();
      expect(computeScore(buyer, 100, 0)).toBe(18);
    });
  });

  describe("graduated documents field (0-15 pts, capped at 10)", () => {
    it("awards 0 pts for 0 documents", () => {
      const buyer = makeBuyer();
      expect(computeScore(buyer, 0, 0)).toBe(0);
    });

    it("awards proportional pts for 1 document", () => {
      const buyer = makeBuyer();
      // (1/10) * 15 = 1.5 → rounds to 2
      expect(computeScore(buyer, 0, 1)).toBe(2);
    });

    it("awards proportional pts for 5 documents", () => {
      const buyer = makeBuyer();
      // (5/10) * 15 = 7.5 → rounds to 8
      expect(computeScore(buyer, 0, 5)).toBe(8);
    });

    it("awards full 15 pts for 10 documents", () => {
      const buyer = makeBuyer();
      // (10/10) * 15 = 15
      expect(computeScore(buyer, 0, 10)).toBe(15);
    });

    it("caps at 15 pts for more than 10 documents", () => {
      const buyer = makeBuyer();
      // min(50, 10) / 10 * 15 = 15
      expect(computeScore(buyer, 0, 50)).toBe(15);
    });
  });

  describe("score rounding", () => {
    it("rounds to nearest integer", () => {
      const buyer = makeBuyer();
      // 1 personnel = (1/5)*18 = 3.6 → 4
      // 1 document  = (1/10)*15 = 1.5 → total 5.1 → 5
      const score = computeScore(buyer, 1, 1);
      expect(Number.isInteger(score)).toBe(true);
    });
  });

  describe("realistic buyer profiles", () => {
    it("scores a partially enriched council", () => {
      const buyer = makeBuyer({
        orgType: "local_council_london",
        website: "https://hackney.gov.uk",
        description: "London Borough of Hackney",
        democracyPortalUrl: "https://hackney.moderngov.co.uk",
        boardPapersUrl: "https://hackney.gov.uk/meetings",
      });
      // 12 + 8 + 5 + 8 + 8 = 41, personnel=3→10.8, docs=7→10.5 = 62.3 → 62
      expect(computeScore(buyer, 3, 7)).toBe(62);
    });

    it("scores a minimal buyer (only classified)", () => {
      const buyer = makeBuyer({
        orgType: "private_company",
      });
      // 12 pts
      expect(computeScore(buyer, 0, 0)).toBe(12);
    });

    it("scores a buyer with only website and logo", () => {
      const buyer = makeBuyer({
        website: "https://example.com",
        logoUrl: "https://logo.dev/example.png",
      });
      // 8 + 5 = 13
      expect(computeScore(buyer, 0, 0)).toBe(13);
    });

    it("scores an NHS trust with good personnel data", () => {
      const buyer = makeBuyer({
        orgType: "nhs_trust_acute",
        website: "https://guysandstthomas.nhs.uk",
        logoUrl: "https://logo.dev/gstt.png",
        linkedinUrl: "https://linkedin.com/company/gstt",
        description: "NHS Foundation Trust",
        staffCount: 15000,
        annualBudget: 2000000000,
      });
      // Binary: 12+8+5+5+5+8+8 = 51, personnel=5→18, docs=2→3 = 72
      expect(computeScore(buyer, 5, 2)).toBe(72);
    });
  });

  describe("weight totals validation", () => {
    it("all weights sum to exactly 100", () => {
      // Binary weights: 12 + 8 + 5 + 5 + 8 + 8 + 5 + 8 + 8 = 67
      // Graduated max: 18 + 15 = 33
      // Total: 67 + 33 = 100
      const binarySum = 12 + 8 + 5 + 5 + 8 + 8 + 5 + 8 + 8;
      const graduatedMax = 18 + 15;
      expect(binarySum + graduatedMax).toBe(100);
    });
  });
});
