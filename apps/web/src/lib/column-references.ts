import { ENTITY_FIELDS } from "@/components/scanners/table-columns";
import { resolveAccessor } from "@/components/scanners/grid/format-utils";
import type { ScannerType } from "@/models/scanner";

interface ColumnInfo {
  name: string;
  type: "core" | "custom" | "ai";
  accessor: string;
}

interface AIColumnRef {
  columnId: string;
  name: string;
  useCase?: string;
}

interface CustomColumnRef {
  columnId: string;
  name: string;
  accessor: string;
  dataType: string;
}

interface AIScoreEntry {
  columnId: string;
  entityId: string;
  score?: number | null;
  value?: string;
  reasoning?: string;
}

const TOKEN_RE = /\{\{(.+?)\}\}/g;

export function getAvailableColumns(
  scannerType: ScannerType,
  aiColumns: AIColumnRef[],
  customColumns?: CustomColumnRef[],
  excludeColumnId?: string
): ColumnInfo[] {
  const result: ColumnInfo[] = [];

  const entityFields = ENTITY_FIELDS[scannerType] ?? [];
  for (const field of entityFields) {
    result.push({
      name: field.label,
      type: "core",
      accessor: field.field,
    });
  }

  for (const col of customColumns ?? []) {
    result.push({
      name: col.name,
      type: "custom",
      accessor: col.accessor,
    });
  }

  for (const col of aiColumns) {
    if (excludeColumnId && col.columnId === excludeColumnId) continue;
    result.push({
      name: col.name,
      type: "ai",
      accessor: col.columnId,
    });
  }

  return result;
}

export function findColumnByName(
  name: string,
  scannerType: ScannerType,
  aiColumns: AIColumnRef[],
  customColumns?: CustomColumnRef[]
): { type: "core" | "custom" | "ai"; accessor: string; columnId?: string } | null {
  const lower = name.toLowerCase();

  const entityFields = ENTITY_FIELDS[scannerType] ?? [];
  const coreField = entityFields.find((f) => f.label.toLowerCase() === lower);
  if (coreField) {
    return { type: "core", accessor: coreField.field };
  }

  for (const col of customColumns ?? []) {
    if (col.name.toLowerCase() === lower) {
      return { type: "custom", accessor: col.accessor };
    }
  }

  for (const col of aiColumns) {
    if (col.name.toLowerCase() === lower) {
      return { type: "ai", accessor: col.columnId, columnId: col.columnId };
    }
  }

  return null;
}

export function resolveColumnReferences(
  prompt: string,
  entity: Record<string, unknown>,
  scannerType: ScannerType,
  aiScores?: AIScoreEntry[],
  aiColumns?: AIColumnRef[],
  customColumns?: CustomColumnRef[]
): string {
  return prompt.replace(TOKEN_RE, (match, columnName: string) => {
    const col = findColumnByName(
      columnName.trim(),
      scannerType,
      aiColumns ?? [],
      customColumns
    );

    if (!col) return match;

    if (col.type === "core" || col.type === "custom") {
      const val = resolveAccessor(entity, col.accessor);
      if (val == null || val === "") return "(no data)";
      return String(val);
    }

    if (col.type === "ai" && col.columnId && aiScores) {
      const entityId = String(entity._id || entity.id || "");
      const scoreEntry = aiScores.find(
        (s) => s.columnId === col.columnId && String(s.entityId) === entityId
      );
      if (scoreEntry) {
        if (scoreEntry.value) return scoreEntry.value;
        if (scoreEntry.score != null) return String(scoreEntry.score);
        return "(no result)";
      }
      return "(not yet scored)";
    }

    return match;
  });
}

export function hasColumnReferences(prompt: string): boolean {
  return /\{\{.+?\}\}/.test(prompt);
}

export function extractReferencedColumnIds(
  prompt: string,
  scannerType: ScannerType,
  aiColumns: AIColumnRef[],
  customColumns?: CustomColumnRef[]
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  let m;
  const re = new RegExp(TOKEN_RE.source, TOKEN_RE.flags);
  while ((m = re.exec(prompt)) !== null) {
    const col = findColumnByName(m[1].trim(), scannerType, aiColumns, customColumns);
    if (col?.type === "ai" && col.columnId && !seen.has(col.columnId)) {
      seen.add(col.columnId);
      ids.push(col.columnId);
    }
  }

  return ids;
}
