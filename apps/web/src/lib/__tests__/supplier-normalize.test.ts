import { describe, it, expect } from "vitest";
import {
  normalizeSupplierName,
  isSameSupplier,
} from "../supplier-normalize";

describe("normalizeSupplierName", () => {
  it("lowercases and trims whitespace", () => {
    expect(normalizeSupplierName("  Capita  ")).toBe("capita");
    expect(normalizeSupplierName("SERCO")).toBe("serco");
    expect(normalizeSupplierName("Acme Corp ")).toBe("acme");
  });

  it("strips 'Ltd'", () => {
    expect(normalizeSupplierName("Capita Ltd")).toBe("capita");
    expect(normalizeSupplierName("Capita Ltd.")).toBe("capita");
  });

  it("strips 'Limited'", () => {
    expect(normalizeSupplierName("Capita Limited")).toBe("capita");
  });

  it("strips 'PLC'", () => {
    expect(normalizeSupplierName("Capita PLC")).toBe("capita");
    expect(normalizeSupplierName("Capita Plc")).toBe("capita");
  });

  it("strips 'LLP'", () => {
    expect(normalizeSupplierName("Smith & Jones LLP")).toBe("smith & jones");
  });

  it("strips 'Inc'", () => {
    expect(normalizeSupplierName("Acme Inc")).toBe("acme");
    expect(normalizeSupplierName("Acme Inc.")).toBe("acme");
  });

  it("strips 'Corp'", () => {
    expect(normalizeSupplierName("Acme Corp")).toBe("acme");
  });

  it("strips parentheticals at the end", () => {
    expect(normalizeSupplierName("Serco (Holdings)")).toBe("serco");
    expect(normalizeSupplierName("G4S (UK) ")).toBe("g4s");
  });

  it("handles multiple suffixes: 'Capita Business Services Limited'", () => {
    expect(normalizeSupplierName("Capita Business Services Limited")).toBe(
      "capita business"
    );
  });

  it("collapses multiple spaces into one", () => {
    expect(normalizeSupplierName("Capita   Business   Ltd")).toBe(
      "capita business"
    );
  });

  it("removes trailing punctuation (commas, dots, dashes)", () => {
    expect(normalizeSupplierName("Capita,")).toBe("capita");
    expect(normalizeSupplierName("Capita.")).toBe("capita");
    expect(normalizeSupplierName("Capita-")).toBe("capita");
  });

  it("handles empty string", () => {
    expect(normalizeSupplierName("")).toBe("");
  });

  it("handles a name that is just a suffix", () => {
    expect(normalizeSupplierName("Ltd")).toBe("");
    expect(normalizeSupplierName("Limited")).toBe("");
  });

  it("handles single word names", () => {
    expect(normalizeSupplierName("Serco")).toBe("serco");
    expect(normalizeSupplierName("KPMG")).toBe("kpmg");
  });
});

describe("isSameSupplier", () => {
  it("matches across variants with different suffixes", () => {
    expect(isSameSupplier("Capita Ltd", "Capita Limited")).toBe(true);
    expect(isSameSupplier("Capita PLC", "capita plc")).toBe(true);
    expect(isSameSupplier("Serco (Holdings)", "Serco Holdings")).toBe(true);
  });

  it("does not match different companies", () => {
    expect(isSameSupplier("Capita", "Serco")).toBe(false);
    expect(isSameSupplier("Capita Ltd", "Serco Ltd")).toBe(false);
  });

  it("matches with varying whitespace and casing", () => {
    expect(isSameSupplier("  CAPITA  ", "capita")).toBe(true);
  });
});
