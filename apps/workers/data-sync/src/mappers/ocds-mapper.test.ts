import { describe, it, expect } from "vitest";
import { classifyContractMechanism } from "./ocds-mapper";

describe("classifyContractMechanism", () => {
  describe("Signal 1: procurementMethodDetails (highest priority)", () => {
    it("classifies DPS call-off from procurementMethodDetails", () => {
      expect(
        classifyContractMechanism(
          "Call-off from a dynamic purchasing system",
          "IT Penetration Testing Services"
        )
      ).toBe("call_off_dps");
    });

    it("classifies Framework call-off from procurementMethodDetails", () => {
      expect(
        classifyContractMechanism(
          "Call-off from a framework agreement",
          "Generator Maintenance"
        )
      ).toBe("call_off_framework");
    });

    it("is case-insensitive for procurementMethodDetails", () => {
      expect(
        classifyContractMechanism(
          "CALL-OFF FROM A DYNAMIC PURCHASING SYSTEM",
          "Some title"
        )
      ).toBe("call_off_dps");

      expect(
        classifyContractMechanism(
          "call-off from a framework agreement",
          "Some title"
        )
      ).toBe("call_off_framework");
    });

    it("procurementMethodDetails takes priority over title patterns", () => {
      // Title says "DPS" but procurementMethodDetails says framework call-off
      expect(
        classifyContractMechanism(
          "Call-off from a framework agreement",
          "DPS for IT Services"
        )
      ).toBe("call_off_framework");
    });
  });

  describe("Signal 2: Title pattern matching", () => {
    it("detects DPS from 'Dynamic Purchasing System' in title", () => {
      expect(
        classifyContractMechanism(
          null,
          "Kent County Council Dynamic Purchasing System for Skills"
        )
      ).toBe("dps");
    });

    it("detects DPS from 'DPS' abbreviation in title", () => {
      expect(
        classifyContractMechanism(
          null,
          "KCC Skills Programme DPS - Reopening Round 3"
        )
      ).toBe("dps");
    });

    it("detects DPS at start of title", () => {
      expect(
        classifyContractMechanism(null, "DPS for Construction Services")
      ).toBe("dps");
    });

    it("detects DPS at end of title", () => {
      expect(
        classifyContractMechanism(null, "Construction Services DPS")
      ).toBe("dps");
    });

    it("does NOT match 'DPS' inside other words (no false positives)", () => {
      // "ADPS" should not match
      expect(
        classifyContractMechanism(null, "ADPS Technology Solutions")
      ).toBe("standard");
    });

    it("detects Framework Agreement in title", () => {
      expect(
        classifyContractMechanism(
          null,
          "National Framework Agreement for Office Supplies"
        )
      ).toBe("framework");
    });

    it("detects bare 'Framework' in title", () => {
      expect(
        classifyContractMechanism(null, "NHS Framework for Medical Equipment")
      ).toBe("framework");
    });

    it("is case-insensitive for title matching", () => {
      expect(
        classifyContractMechanism(null, "DYNAMIC PURCHASING SYSTEM FOR IT")
      ).toBe("dps");

      expect(
        classifyContractMechanism(
          null,
          "NATIONAL FRAMEWORK AGREEMENT FOR SUPPLIES"
        )
      ).toBe("framework");
    });
  });

  describe("Default: standard classification", () => {
    it("returns standard for regular open procedure", () => {
      expect(
        classifyContractMechanism(
          "Open procedure",
          "Supply of Office Furniture"
        )
      ).toBe("standard");
    });

    it("returns standard for restricted procedure", () => {
      expect(
        classifyContractMechanism(
          "Restricted procedure",
          "Highway Maintenance Works"
        )
      ).toBe("standard");
    });

    it("returns standard for null/undefined procurementMethodDetails", () => {
      expect(
        classifyContractMechanism(null, "Some Regular Contract")
      ).toBe("standard");

      expect(
        classifyContractMechanism(undefined, "Another Contract")
      ).toBe("standard");
    });

    it("returns standard for generic titles", () => {
      expect(
        classifyContractMechanism(
          "Negotiated procedure with prior call for competition",
          "Consultancy Services for Digital Transformation"
        )
      ).toBe("standard");
    });
  });

  describe("Edge cases", () => {
    it("handles empty string procurementMethodDetails", () => {
      expect(
        classifyContractMechanism("", "Regular Title")
      ).toBe("standard");
    });

    it("handles title with 'framework' in a different context", () => {
      // "framework" as a standalone word in a title should still match
      expect(
        classifyContractMechanism(null, "Professional Services Framework")
      ).toBe("framework");
    });

    it("prefers Framework Agreement over bare Framework", () => {
      // Both should return "framework" but via the more specific regex first
      expect(
        classifyContractMechanism(
          null,
          "Framework Agreement for Temporary Staffing"
        )
      ).toBe("framework");
    });

    it("DPS in title takes priority over Framework in title", () => {
      // If title contains both DPS and Framework, DPS regex is checked first
      expect(
        classifyContractMechanism(
          null,
          "DPS Framework for Construction"
        )
      ).toBe("dps");
    });
  });

  describe("Real-world contract titles from our database", () => {
    it("KCC Skills Programme DPS", () => {
      expect(
        classifyContractMechanism(
          "Restricted procedure",
          "Kent County Council (KCC) Skills Programme DPS - Reopening for Round 3 Applications (SC240120)"
        )
      ).toBe("dps");
    });

    it("Mental Health Supported Living call-off from DPS", () => {
      expect(
        classifyContractMechanism(
          "Call-off from a dynamic purchasing system",
          "Mental Health Supported Living - My Place"
        )
      ).toBe("call_off_dps");
    });

    it("Generator Maintenance framework call-off", () => {
      expect(
        classifyContractMechanism(
          "Call-off from a framework agreement",
          "Generator Maintenance"
        )
      ).toBe("call_off_framework");
    });

    it("Bladder Scanner Maintenance via NHSSC (framework call-off)", () => {
      expect(
        classifyContractMechanism(
          "Call-off from a framework agreement",
          "Bladder Scanner Maintenance Contract via NHSSC"
        )
      ).toBe("call_off_framework");
    });

    it("Standard open procedure contract", () => {
      expect(
        classifyContractMechanism(
          "Open procedure",
          "Supply and Delivery of Cleaning Products"
        )
      ).toBe("standard");
    });
  });
});
