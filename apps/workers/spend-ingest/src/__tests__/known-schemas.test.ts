import { describe, it, expect } from "vitest";
import { KNOWN_SCHEMAS } from "../normalization/known-schemas";

// Helper to find which schema matches given headers
function findMatchingSchema(headers: string[]) {
  for (const schema of KNOWN_SCHEMAS) {
    if (schema.detect(headers)) {
      return schema;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Schema detection
// ---------------------------------------------------------------------------

describe("KNOWN_SCHEMAS — schema detection", () => {
  it("detects govuk_mod_spending_25k", () => {
    const headers = [
      "Expense Type",
      "Expense Area",
      "Supplier Name",
      "Transaction Number",
      "Payment Date",
      "Total",
      "Entity",
    ];
    const match = findMatchingSchema(headers);
    expect(match).not.toBeNull();
    expect(match!.name).toBe("govuk_mod_spending_25k");
  });

  it("detects govuk_nhs_spending_25k", () => {
    const headers = [
      "Expense Type",
      "Expense Area",
      "Supplier",
      "Transaction Number",
      "AP Amount",
      "Date",
      "Entity",
    ];
    const match = findMatchingSchema(headers);
    expect(match).not.toBeNull();
    expect(match!.name).toBe("govuk_nhs_spending_25k");
  });

  it("detects govuk_spending_25k (generic central government)", () => {
    const headers = [
      "Expense Type",
      "Expense Area",
      "Supplier",
      "Transaction Number",
      "Amount",
      "Date",
      "Entity",
    ];
    const match = findMatchingSchema(headers);
    expect(match).not.toBeNull();
    expect(match!.name).toBe("govuk_spending_25k");
  });

  it("detects devon_pattern", () => {
    const headers = [
      "Date",
      "Expense Area",
      "Expense Type",
      "Supplier Name",
      "Amount",
    ];
    const match = findMatchingSchema(headers);
    expect(match).not.toBeNull();
    expect(match!.name).toBe("devon_pattern");
  });

  it("detects rochdale_pattern", () => {
    const headers = [
      "DIRECTORATE",
      "PURPOSE",
      "SUPPLIER NAME",
      "EFFECTIVE DATE",
      "AMOUNT (GBP)",
    ];
    const match = findMatchingSchema(headers);
    expect(match).not.toBeNull();
    expect(match!.name).toBe("rochdale_pattern");
  });

  it("detects ipswich_pattern", () => {
    const headers = [
      "Date",
      "Service Area Categorisation",
      "Expenses Type",
      "Supplier Name",
      "Amount",
    ];
    const match = findMatchingSchema(headers);
    expect(match).not.toBeNull();
    expect(match!.name).toBe("ipswich_pattern");
  });

  it("detects manchester_pattern", () => {
    const headers = [
      "Service Area",
      "Net Amount",
      "Invoice Payment Date",
      "Supplier Name",
    ];
    const match = findMatchingSchema(headers);
    expect(match).not.toBeNull();
    expect(match!.name).toBe("manchester_pattern");
  });

  it("detects eden_pattern", () => {
    const headers = [
      "Date",
      "Expense Area",
      "Body Name",
      "Supplier Name",
      "Amount",
    ];
    const match = findMatchingSchema(headers);
    expect(match).not.toBeNull();
    expect(match!.name).toBe("eden_pattern");
  });

  it("detects generic1_pattern", () => {
    const headers = [
      "Department",
      "Category",
      "Total (inc. VAT)",
      "Payee Name",
      "Payment Date",
    ];
    const match = findMatchingSchema(headers);
    expect(match).not.toBeNull();
    expect(match!.name).toBe("generic1_pattern");
  });

  it("detects generic2_pattern", () => {
    const headers = ["Service", "Description", "Value", "Supplier", "Date Paid"];
    const match = findMatchingSchema(headers);
    expect(match).not.toBeNull();
    expect(match!.name).toBe("generic2_pattern");
  });

  it("detects generic3_pattern", () => {
    const headers = [
      "Cost Centre",
      "Subjective",
      "Net",
      "Creditor Name",
      "Posting Date",
    ];
    const match = findMatchingSchema(headers);
    expect(match).not.toBeNull();
    expect(match!.name).toBe("generic3_pattern");
  });

  it("detects nhs_pattern", () => {
    const headers = [
      "Budget Code",
      "Description",
      "Net Amount",
      "Supplier",
      "Invoice Date",
    ];
    const match = findMatchingSchema(headers);
    expect(match).not.toBeNull();
    expect(match!.name).toBe("nhs_pattern");
  });

  it("detects proclass_pattern", () => {
    const headers = [
      "Date",
      "ProClass Description",
      "Total",
      "Supplier Name",
    ];
    const match = findMatchingSchema(headers);
    expect(match).not.toBeNull();
    expect(match!.name).toBe("proclass_pattern");
  });

  it("returns null for unrecognized headers", () => {
    const headers = ["Column A", "Column B", "Column C"];
    const match = findMatchingSchema(headers);
    expect(match).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Schema priority — more specific schemas match before generic ones
// ---------------------------------------------------------------------------

describe("KNOWN_SCHEMAS — priority ordering", () => {
  it("NHS ICB schema (AP Amount) matches before generic govuk_spending_25k", () => {
    // These headers match both govuk_nhs_spending_25k AND govuk_spending_25k
    // because they have all of: expense type, expense area, supplier, transaction number
    // but the NHS variant has "AP Amount" specifically
    const headers = [
      "Expense Type",
      "Expense Area",
      "Supplier",
      "Transaction Number",
      "AP Amount",
      "Date",
      "Entity",
    ];
    const match = findMatchingSchema(headers);
    expect(match).not.toBeNull();
    expect(match!.name).toBe("govuk_nhs_spending_25k");
    // Verify it's NOT the generic one
    expect(match!.name).not.toBe("govuk_spending_25k");
  });

  it("MoD schema matches before generic govuk_spending_25k when Supplier Name is present", () => {
    const headers = [
      "Expense Type",
      "Expense Area",
      "Supplier Name",
      "Transaction Number",
      "Payment Date",
      "Total",
      "Entity",
    ];
    const match = findMatchingSchema(headers);
    expect(match).not.toBeNull();
    expect(match!.name).toBe("govuk_mod_spending_25k");
  });

  it("MoD schema is listed before generic govuk_spending_25k in KNOWN_SCHEMAS array", () => {
    const modIndex = KNOWN_SCHEMAS.findIndex(
      (s) => s.name === "govuk_mod_spending_25k"
    );
    const genericIndex = KNOWN_SCHEMAS.findIndex(
      (s) => s.name === "govuk_spending_25k"
    );
    expect(modIndex).toBeLessThan(genericIndex);
  });

  it("NHS ICB schema is listed before generic govuk_spending_25k in KNOWN_SCHEMAS array", () => {
    const nhsIndex = KNOWN_SCHEMAS.findIndex(
      (s) => s.name === "govuk_nhs_spending_25k"
    );
    const genericIndex = KNOWN_SCHEMAS.findIndex(
      (s) => s.name === "govuk_spending_25k"
    );
    expect(nhsIndex).toBeLessThan(genericIndex);
  });
});

// ---------------------------------------------------------------------------
// Column mapping correctness
// ---------------------------------------------------------------------------

describe("KNOWN_SCHEMAS — column mappings", () => {
  it("govuk_mod_spending_25k maps to correct columns", () => {
    const schema = KNOWN_SCHEMAS.find(
      (s) => s.name === "govuk_mod_spending_25k"
    )!;
    expect(schema.map.date).toBe("Payment Date");
    expect(schema.map.amount).toBe("Total");
    expect(schema.map.vendor).toBe("Supplier Name");
    expect(schema.map.category).toBe("Expense Type");
    expect(schema.map.subcategory).toBe("Expense Area");
    expect(schema.map.department).toBe("Entity");
    expect(schema.map.reference).toBe("Transaction Number");
  });

  it("govuk_nhs_spending_25k maps AP Amount to amount field", () => {
    const schema = KNOWN_SCHEMAS.find(
      (s) => s.name === "govuk_nhs_spending_25k"
    )!;
    expect(schema.map.amount).toBe("AP Amount");
    expect(schema.map.vendor).toBe("Supplier");
    expect(schema.map.category).toBe("Expense Type");
  });

  it("govuk_spending_25k maps Amount and Supplier correctly", () => {
    const schema = KNOWN_SCHEMAS.find(
      (s) => s.name === "govuk_spending_25k"
    )!;
    expect(schema.map.date).toBe("Date");
    expect(schema.map.amount).toBe("Amount");
    expect(schema.map.vendor).toBe("Supplier");
  });

  it("rochdale_pattern uses uppercase column names", () => {
    const schema = KNOWN_SCHEMAS.find(
      (s) => s.name === "rochdale_pattern"
    )!;
    expect(schema.map.date).toBe("EFFECTIVE DATE");
    expect(schema.map.amount).toBe("AMOUNT (GBP)");
    expect(schema.map.vendor).toBe("SUPPLIER NAME");
    expect(schema.map.category).toBe("PURPOSE");
    expect(schema.map.department).toBe("DIRECTORATE");
  });

  it("manchester_pattern maps Invoice Payment Date and Net Amount", () => {
    const schema = KNOWN_SCHEMAS.find(
      (s) => s.name === "manchester_pattern"
    )!;
    expect(schema.map.date).toBe("Invoice Payment Date");
    expect(schema.map.amount).toBe("Net Amount");
  });

  it("every schema has required date, amount, and vendor fields", () => {
    for (const schema of KNOWN_SCHEMAS) {
      expect(schema.map.date, `${schema.name} missing date`).toBeTruthy();
      expect(schema.map.amount, `${schema.name} missing amount`).toBeTruthy();
      expect(schema.map.vendor, `${schema.name} missing vendor`).toBeTruthy();
    }
  });

  it("every schema has a unique name", () => {
    const names = KNOWN_SCHEMAS.map((s) => s.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });
});

// ---------------------------------------------------------------------------
// Case-insensitive header matching
// ---------------------------------------------------------------------------

describe("KNOWN_SCHEMAS — case-insensitive matching", () => {
  it("matches headers regardless of case", () => {
    const headers = [
      "expense type",
      "expense area",
      "supplier",
      "transaction number",
      "amount",
      "date",
    ];
    const match = findMatchingSchema(headers);
    expect(match).not.toBeNull();
    expect(match!.name).toBe("govuk_spending_25k");
  });

  it("matches headers with mixed case", () => {
    const headers = [
      "EXPENSE TYPE",
      "expense area",
      "Supplier",
      "Transaction Number",
      "Amount",
    ];
    const match = findMatchingSchema(headers);
    expect(match).not.toBeNull();
    expect(match!.name).toBe("govuk_spending_25k");
  });

  it("matches headers with whitespace padding", () => {
    const headers = [
      "  Expense Type  ",
      " Expense Area",
      "Supplier ",
      " Transaction Number ",
      "Amount",
    ];
    const match = findMatchingSchema(headers);
    expect(match).not.toBeNull();
    expect(match!.name).toBe("govuk_spending_25k");
  });

  it("uses includes for partial header matching", () => {
    // hasHeaders uses .includes(), so "My Expense Type Col" should match "expense type"
    const headers = [
      "My Expense Type Column",
      "The Expense Area",
      "Main Supplier",
      "The Transaction Number",
      "Total Amount",
    ];
    const match = findMatchingSchema(headers);
    expect(match).not.toBeNull();
    expect(match!.name).toBe("govuk_spending_25k");
  });
});
