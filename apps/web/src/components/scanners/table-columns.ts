import type { ScannerType } from "@/models/scanner";
import { isTextUseCase } from "@/lib/ai-column-config";

export type DataType =
  | "text"
  | "number"
  | "date"
  | "badge"
  | "currency"
  | "url"
  | "email"
  | "checkbox"
  | "paragraph";

export interface ColumnDef {
  id: string;
  header: string;
  accessor: string;
  type: DataType | "ai" | "entity-name";
  width?: string;
  widthPx: number;
  truncate?: boolean;
  aiColumnId?: string;
  /** AI use case (e.g. "score", "research") — determines text vs score rendering */
  aiUseCase?: string;
  customColumnId?: string;
  /** Field to derive logo slug from (for entity-name type) */
  logoAccessor?: string;
}

// ── Entity fields available per scanner type ─────────────────

export interface EntityField {
  field: string;
  label: string;
  suggestedType: DataType;
}

export const ENTITY_FIELDS: Record<ScannerType, EntityField[]> = {
  schools: [
    { field: "name", label: "School Name", suggestedType: "text" },
    { field: "overallEffectiveness", label: "Overall Rating", suggestedType: "number" },
    { field: "qualityOfEducation", label: "Quality of Education", suggestedType: "number" },
    { field: "behaviourAndAttitudes", label: "Behaviour & Attitudes", suggestedType: "number" },
    { field: "personalDevelopment", label: "Personal Development", suggestedType: "number" },
    { field: "leadershipAndManagement", label: "Leadership & Management", suggestedType: "number" },
    { field: "inspectionDate", label: "Inspection Date", suggestedType: "date" },
    { field: "previousOverallEffectiveness", label: "Previous Rating", suggestedType: "number" },
    { field: "ratingDirection", label: "Rating Change", suggestedType: "badge" },
    { field: "region", label: "Region", suggestedType: "badge" },
    { field: "phase", label: "School Phase", suggestedType: "badge" },
    { field: "totalPupils", label: "Pupils", suggestedType: "number" },
    { field: "localAuthority", label: "Local Authority", suggestedType: "badge" },
    { field: "schoolType", label: "School Type", suggestedType: "badge" },
    { field: "lastDowngradeDate", label: "Last Downgrade", suggestedType: "date" },
    { field: "downgradeType", label: "Downgrade Type", suggestedType: "badge" },
  ],
  rfps: [
    { field: "title", label: "Title", suggestedType: "text" },
    { field: "description", label: "Description", suggestedType: "paragraph" },
    { field: "status", label: "Status", suggestedType: "badge" },
    { field: "stage", label: "Stage", suggestedType: "badge" },
    { field: "buyerName", label: "Buyer Name", suggestedType: "text" },
    { field: "buyerOrg", label: "Buyer Org", suggestedType: "text" },
    { field: "buyerRegion", label: "Buyer Region", suggestedType: "badge" },
    { field: "sector", label: "Sector", suggestedType: "badge" },
    { field: "valueMin", label: "Value (Min)", suggestedType: "currency" },
    { field: "valueMax", label: "Value (Max)", suggestedType: "currency" },
    { field: "publishedDate", label: "Published Date", suggestedType: "date" },
    { field: "deadlineDate", label: "Deadline Date", suggestedType: "date" },
    { field: "source", label: "Source", suggestedType: "badge" },
    { field: "sourceUrl", label: "Source URL", suggestedType: "url" },
    { field: "cpvCodes", label: "CPV Codes", suggestedType: "text" },
  ],
  meetings: [
    { field: "organizationName", label: "Organization", suggestedType: "text" },
    { field: "title", label: "Title", suggestedType: "text" },
    { field: "insight", label: "Insight", suggestedType: "paragraph" },
    { field: "signalType", label: "Signal Type", suggestedType: "badge" },
    { field: "source", label: "Source", suggestedType: "text" },
    { field: "sourceDate", label: "Source Date", suggestedType: "date" },
    { field: "sector", label: "Sector", suggestedType: "badge" },
    { field: "confidence", label: "Confidence", suggestedType: "number" },
  ],
  buyers: [
    { field: "name", label: "Name", suggestedType: "text" },
    { field: "description", label: "Description", suggestedType: "paragraph" },
    { field: "sector", label: "Sector", suggestedType: "badge" },
    { field: "region", label: "Region", suggestedType: "badge" },
    { field: "orgType", label: "Org Type", suggestedType: "badge" },
    { field: "enrichmentScore", label: "Enrichment Score", suggestedType: "number" },
    { field: "website", label: "Website", suggestedType: "url" },
    { field: "linkedinUrl", label: "LinkedIn", suggestedType: "url" },
    { field: "contractCount", label: "Contract Count", suggestedType: "number" },
    { field: "orgId", label: "Org ID", suggestedType: "text" },
    { field: "ofstedWorstRating", label: "Ofsted Rating", suggestedType: "number" },
    { field: "schoolsBelowGood", label: "Schools Below Good", suggestedType: "number" },
  ],
};

/** Valid accessor fields per scanner type — used for server-side validation */
export const VALID_ACCESSORS: Record<ScannerType, Set<string>> = {
  rfps: new Set(ENTITY_FIELDS.rfps.map((f) => f.field)),
  meetings: new Set(ENTITY_FIELDS.meetings.map((f) => f.field)),
  buyers: new Set(ENTITY_FIELDS.buyers.map((f) => f.field)),
  schools: new Set(ENTITY_FIELDS.schools.map((f) => f.field)),
};

// ── Default width per data type ──────────────────────────────

const DATA_TYPE_WIDTHS: Record<DataType, number> = {
  text: 150,
  paragraph: 200,
  badge: 130,
  date: 110,
  number: 100,
  currency: 120,
  url: 160,
  email: 160,
  checkbox: 80,
};

// ── Core column definitions per scanner type ─────────────────

const SCHOOLS_COLUMNS: ColumnDef[] = [
  {
    id: "name",
    header: "School",
    accessor: "name",
    type: "entity-name",
    logoAccessor: "name",
    width: "w-[220px]",
    widthPx: 220,
    truncate: true,
  },
  {
    id: "overallEffectiveness",
    header: "Rating",
    accessor: "overallEffectiveness",
    type: "number",
    width: "w-[80px]",
    widthPx: 80,
  },
  {
    id: "qualityOfEducation",
    header: "Quality of Ed",
    accessor: "qualityOfEducation",
    type: "number",
    width: "w-[100px]",
    widthPx: 100,
  },
  {
    id: "inspectionDate",
    header: "Inspection Date",
    accessor: "inspectionDate",
    type: "date",
    width: "w-[120px]",
    widthPx: 120,
  },
  {
    id: "previousOverallEffectiveness",
    header: "Prev Rating",
    accessor: "previousOverallEffectiveness",
    type: "number",
    width: "w-[90px]",
    widthPx: 90,
  },
  {
    id: "ratingDirection",
    header: "Rating Change",
    accessor: "ratingDirection",
    type: "badge",
    width: "w-[120px]",
    widthPx: 120,
  },
  {
    id: "region",
    header: "Region",
    accessor: "region",
    type: "badge",
    width: "w-[130px]",
    widthPx: 130,
  },
  {
    id: "phase",
    header: "Phase",
    accessor: "phase",
    type: "badge",
    width: "w-[130px]",
    widthPx: 130,
  },
  {
    id: "totalPupils",
    header: "Pupils",
    accessor: "totalPupils",
    type: "number",
    width: "w-[80px]",
    widthPx: 80,
  },
  {
    id: "localAuthority",
    header: "LA",
    accessor: "localAuthority",
    type: "badge",
    width: "w-[140px]",
    widthPx: 140,
  },
];

const RFP_COLUMNS: ColumnDef[] = [
  {
    id: "buyerName",
    header: "Buyer",
    accessor: "buyerName",
    type: "entity-name",
    logoAccessor: "buyerName",
    width: "w-[200px]",
    widthPx: 200,
    truncate: true,
  },
  {
    id: "title",
    header: "Contract",
    accessor: "title",
    type: "text",
    width: "min-w-[250px]",
    widthPx: 250,
    truncate: true,
  },
  {
    id: "valueMax",
    header: "Value",
    accessor: "valueMax",
    type: "currency",
    width: "w-[120px]",
    widthPx: 120,
  },
  {
    id: "deadlineDate",
    header: "Deadline",
    accessor: "deadlineDate",
    type: "date",
    width: "w-[110px]",
    widthPx: 110,
  },
  {
    id: "sector",
    header: "Sector",
    accessor: "sector",
    type: "badge",
    width: "w-[130px]",
    widthPx: 130,
  },
  {
    id: "stage",
    header: "Stage",
    accessor: "stage",
    type: "badge",
    width: "w-[110px]",
    widthPx: 110,
  },
  {
    id: "status",
    header: "Status",
    accessor: "status",
    type: "badge",
    width: "w-[110px]",
    widthPx: 110,
  },
  {
    id: "contractMechanism",
    header: "Type",
    accessor: "contractMechanism",
    type: "badge",
    width: "w-[130px]",
    widthPx: 130,
  },
];

const MEETINGS_COLUMNS: ColumnDef[] = [
  {
    id: "organizationName",
    header: "Organization",
    accessor: "organizationName",
    type: "entity-name",
    logoAccessor: "organizationName",
    width: "w-[200px]",
    widthPx: 200,
    truncate: true,
  },
  {
    id: "title",
    header: "Signal",
    accessor: "title",
    type: "text",
    width: "min-w-[250px]",
    widthPx: 250,
    truncate: true,
  },
  {
    id: "signalType",
    header: "Type",
    accessor: "signalType",
    type: "badge",
    width: "w-[130px]",
    widthPx: 130,
  },
  {
    id: "sourceDate",
    header: "Date",
    accessor: "sourceDate",
    type: "date",
    width: "w-[110px]",
    widthPx: 110,
  },
];

const BUYERS_COLUMNS: ColumnDef[] = [
  {
    id: "name",
    header: "Organization",
    accessor: "name",
    type: "entity-name",
    logoAccessor: "name",
    width: "w-[200px]",
    widthPx: 200,
    truncate: true,
  },
  {
    id: "orgType",
    header: "Org Type",
    accessor: "orgType",
    type: "badge",
    width: "w-[150px]",
    widthPx: 150,
  },
  {
    id: "description",
    header: "Description",
    accessor: "description",
    type: "text",
    width: "min-w-[250px]",
    widthPx: 250,
    truncate: true,
  },
  {
    id: "contactCount",
    header: "Contacts",
    accessor: "contactCount",
    type: "number",
    width: "w-[100px]",
    widthPx: 100,
  },
  {
    id: "enrichmentScore",
    header: "Enrichment",
    accessor: "enrichmentScore",
    type: "number",
    width: "w-[110px]",
    widthPx: 110,
  },
  {
    id: "region",
    header: "Region",
    accessor: "region",
    type: "badge",
    width: "w-[130px]",
    widthPx: 130,
  },
  {
    id: "sector",
    header: "Sector",
    accessor: "sector",
    type: "badge",
    width: "w-[130px]",
    widthPx: 130,
  },
  {
    id: "website",
    header: "Website",
    accessor: "website",
    type: "url",
    width: "w-[160px]",
    widthPx: 160,
  },
  {
    id: "linkedinUrl",
    header: "LinkedIn",
    accessor: "linkedinUrl",
    type: "url",
    width: "w-[160px]",
    widthPx: 160,
  },
];

export function getSchoolsColumns(): ColumnDef[] {
  return [...SCHOOLS_COLUMNS];
}

export function getRfpColumns(): ColumnDef[] {
  return [...RFP_COLUMNS];
}

export function getMeetingsColumns(): ColumnDef[] {
  return [...MEETINGS_COLUMNS];
}

export function getBuyersColumns(): ColumnDef[] {
  return [...BUYERS_COLUMNS];
}

/**
 * Returns core + custom data + AI columns for the given scanner type.
 * Merge order: core → custom data → AI.
 * Applies optional columnRenames to override default header text.
 */
export function getColumnsForType(
  type: ScannerType,
  aiColumns: Array<{ columnId: string; name: string; useCase?: string }>,
  customColumns?: Array<{
    columnId: string;
    name: string;
    accessor: string;
    dataType: string;
  }>,
  columnRenames?: Record<string, string>
): ColumnDef[] {
  let base: ColumnDef[];

  switch (type) {
    case "rfps":
      base = getRfpColumns();
      break;
    case "meetings":
      base = getMeetingsColumns();
      break;
    case "buyers":
      base = getBuyersColumns();
      break;
    case "schools":
      base = getSchoolsColumns();
      break;
    default:
      base = getRfpColumns();
  }

  // Apply renames to core columns
  if (columnRenames) {
    base = base.map((col) =>
      columnRenames[col.id]
        ? { ...col, header: columnRenames[col.id] }
        : col
    );
  }

  // Map custom data columns
  const customCols: ColumnDef[] = (customColumns ?? []).map((col) => ({
    id: `custom-${col.columnId}`,
    header: col.name,
    accessor: col.accessor,
    type: col.dataType as DataType,
    widthPx: DATA_TYPE_WIDTHS[col.dataType as DataType] ?? 150,
    customColumnId: col.columnId,
  }));

  // Apply renames to custom columns
  if (columnRenames) {
    for (const col of customCols) {
      if (columnRenames[col.id]) {
        col.header = columnRenames[col.id];
      }
    }
  }

  // Map AI columns — text use cases get wider default width
  const aiCols: ColumnDef[] = aiColumns.map((col) => ({
    id: `ai-${col.columnId}`,
    header: col.name,
    accessor: col.columnId,
    type: "ai" as const,
    width: isTextUseCase(col.useCase) ? "w-[200px]" : "w-[140px]",
    widthPx: isTextUseCase(col.useCase) ? 200 : 140,
    aiColumnId: col.columnId,
    aiUseCase: col.useCase,
  }));

  return [...base, ...customCols, ...aiCols];
}
