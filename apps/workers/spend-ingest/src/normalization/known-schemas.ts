// ---------------------------------------------------------------------------
// Known UK council CSV column mapping patterns
// ---------------------------------------------------------------------------

export interface ColumnMapping {
  name: string;
  detect: (headers: string[]) => boolean;
  map: {
    date: string;
    amount: string;
    vendor: string;
    category: string;
    subcategory?: string;
    department?: string;
    reference?: string;
  };
}

/**
 * Case-insensitive header check: returns true if headers include all specified values.
 */
function hasHeaders(headers: string[], required: string[]): boolean {
  const lower = headers.map((h) => h.toLowerCase().trim());
  return required.every((r) => lower.some((h) => h.includes(r.toLowerCase())));
}

/**
 * 10 known UK council CSV column mapping patterns.
 * Ordered by specificity — more specific patterns first.
 */
export const KNOWN_SCHEMAS: ColumnMapping[] = [
  // 1. Devon pattern
  {
    name: "devon_pattern",
    detect: (headers) =>
      hasHeaders(headers, ["expense area", "expense type", "supplier name"]),
    map: {
      date: "Date",
      amount: "Amount",
      vendor: "Supplier Name",
      category: "Expense Area",
      subcategory: "Expense Type",
    },
  },

  // 2. Rochdale pattern
  {
    name: "rochdale_pattern",
    detect: (headers) =>
      hasHeaders(headers, ["directorate", "purpose", "supplier name", "effective date"]),
    map: {
      date: "EFFECTIVE DATE",
      amount: "AMOUNT (GBP)",
      vendor: "SUPPLIER NAME",
      category: "PURPOSE",
      department: "DIRECTORATE",
    },
  },

  // 3. Ipswich pattern
  {
    name: "ipswich_pattern",
    detect: (headers) =>
      hasHeaders(headers, ["service area categorisation", "expenses type"]),
    map: {
      date: "Date",
      amount: "Amount",
      vendor: "Supplier Name",
      category: "Service Area Categorisation",
      subcategory: "Expenses Type",
    },
  },

  // 4. Manchester pattern
  {
    name: "manchester_pattern",
    detect: (headers) =>
      hasHeaders(headers, ["service area", "net amount", "invoice payment date"]),
    map: {
      date: "Invoice Payment Date",
      amount: "Net Amount",
      vendor: "Supplier Name",
      category: "Service Area",
    },
  },

  // 5. Eden pattern
  {
    name: "eden_pattern",
    detect: (headers) =>
      hasHeaders(headers, ["expense area", "body name", "supplier name"]),
    map: {
      date: "Date",
      amount: "Amount",
      vendor: "Supplier Name",
      category: "Expense Area",
      department: "Body Name",
    },
  },

  // 6. Generic1: Department + Category + Total (inc. VAT) + Payee Name + Payment Date
  {
    name: "generic1_pattern",
    detect: (headers) =>
      hasHeaders(headers, ["department", "total (inc. vat)", "payee name", "payment date"]),
    map: {
      date: "Payment Date",
      amount: "Total (inc. VAT)",
      vendor: "Payee Name",
      category: "Category",
      department: "Department",
    },
  },

  // 7. Generic2: Service + Description + Value + Supplier + Date Paid
  {
    name: "generic2_pattern",
    detect: (headers) =>
      hasHeaders(headers, ["service", "value", "supplier", "date paid"]),
    map: {
      date: "Date Paid",
      amount: "Value",
      vendor: "Supplier",
      category: "Service",
      subcategory: "Description",
    },
  },

  // 8. Generic3: Cost Centre + Subjective + Net + Creditor Name + Posting Date
  {
    name: "generic3_pattern",
    detect: (headers) =>
      hasHeaders(headers, ["cost centre", "subjective", "net", "creditor name"]),
    map: {
      date: "Posting Date",
      amount: "Net",
      vendor: "Creditor Name",
      category: "Cost Centre",
      subcategory: "Subjective",
    },
  },

  // 9. NHS pattern: Budget Code + Description + Net Amount + Supplier + Invoice Date
  {
    name: "nhs_pattern",
    detect: (headers) =>
      hasHeaders(headers, ["budget code", "net amount", "invoice date"]),
    map: {
      date: "Invoice Date",
      amount: "Net Amount",
      vendor: "Supplier",
      category: "Budget Code",
      subcategory: "Description",
    },
  },

  // 10. ProClass pattern: ProClass Description + Total + Supplier Name + Date
  {
    name: "proclass_pattern",
    detect: (headers) =>
      hasHeaders(headers, ["proclass description", "total", "supplier name"]),
    map: {
      date: "Date",
      amount: "Total",
      vendor: "Supplier Name",
      category: "ProClass Description",
    },
  },
];
