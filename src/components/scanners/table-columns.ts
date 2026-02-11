import type { ScannerType } from "@/models/scanner";

export interface ColumnDef {
  id: string;
  header: string;
  accessor: string;
  type: "text" | "number" | "date" | "badge" | "currency" | "ai";
  width?: string;
  truncate?: boolean;
  aiColumnId?: string;
}

const RFP_COLUMNS: ColumnDef[] = [
  {
    id: "buyerName",
    header: "Buyer",
    accessor: "buyerName",
    type: "text",
    width: "w-[200px]",
    truncate: true,
  },
  {
    id: "title",
    header: "Contract",
    accessor: "title",
    type: "text",
    width: "min-w-[250px]",
    truncate: true,
  },
  {
    id: "valueMax",
    header: "Value",
    accessor: "valueMax",
    type: "currency",
    width: "w-[120px]",
  },
  {
    id: "deadlineDate",
    header: "Deadline",
    accessor: "deadlineDate",
    type: "date",
    width: "w-[110px]",
  },
  {
    id: "sector",
    header: "Sector",
    accessor: "sector",
    type: "badge",
    width: "w-[130px]",
  },
];

const MEETINGS_COLUMNS: ColumnDef[] = [
  {
    id: "organizationName",
    header: "Organization",
    accessor: "organizationName",
    type: "text",
    width: "w-[200px]",
    truncate: true,
  },
  {
    id: "title",
    header: "Signal",
    accessor: "title",
    type: "text",
    width: "min-w-[250px]",
    truncate: true,
  },
  {
    id: "signalType",
    header: "Type",
    accessor: "signalType",
    type: "badge",
    width: "w-[130px]",
  },
  {
    id: "sourceDate",
    header: "Date",
    accessor: "sourceDate",
    type: "date",
    width: "w-[110px]",
  },
];

const BUYERS_COLUMNS: ColumnDef[] = [
  {
    id: "name",
    header: "Organization",
    accessor: "name",
    type: "text",
    width: "w-[200px]",
    truncate: true,
  },
  {
    id: "description",
    header: "Description",
    accessor: "description",
    type: "text",
    width: "min-w-[250px]",
    truncate: true,
  },
  {
    id: "contactCount",
    header: "Contacts",
    accessor: "contactCount",
    type: "number",
    width: "w-[100px]",
  },
  {
    id: "region",
    header: "Region",
    accessor: "region",
    type: "badge",
    width: "w-[130px]",
  },
  {
    id: "sector",
    header: "Sector",
    accessor: "sector",
    type: "badge",
    width: "w-[130px]",
  },
];

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
 * Returns data columns + AI columns appended for the given scanner type.
 */
export function getColumnsForType(
  type: ScannerType,
  aiColumns: Array<{ columnId: string; name: string }>
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
    default:
      base = getRfpColumns();
  }

  // Append AI columns
  const aiCols: ColumnDef[] = aiColumns.map((col) => ({
    id: `ai-${col.columnId}`,
    header: col.name,
    accessor: col.columnId,
    type: "ai" as const,
    width: "w-[140px]",
    aiColumnId: col.columnId,
  }));

  return [...base, ...aiCols];
}
