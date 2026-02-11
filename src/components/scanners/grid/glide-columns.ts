import type { GridColumn } from "@glideapps/glide-data-grid";
import type { ColumnDef } from "@/components/scanners/table-columns";

export interface ColumnMeta {
  id: string;
  type: ColumnDef["type"];
  accessor: string;
  aiColumnId?: string;
  aiUseCase?: string;
  customColumnId?: string;
  truncate?: boolean;
  logoAccessor?: string;
}

/**
 * Convert our ColumnDef[] to Glide's GridColumn[] format + parallel metadata array.
 * `columnWidths` overrides default widths from persisted resize state.
 */
export function toGlideColumns(
  columns: ColumnDef[],
  columnWidths: Record<string, number>
): { gridColumns: GridColumn[]; columnMeta: ColumnMeta[] } {
  const gridColumns: GridColumn[] = [];
  const columnMeta: ColumnMeta[] = [];

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    gridColumns.push({
      id: col.id,
      title: col.header,
      width: columnWidths[col.id] ?? col.widthPx,
      hasMenu: true,
      // Only allow non-frozen columns (index > 0) to grow
      grow: i > 0 && col.type === "text" && col.truncate ? 1 : 0,
    });

    columnMeta.push({
      id: col.id,
      type: col.type,
      accessor: col.accessor,
      aiColumnId: col.aiColumnId,
      aiUseCase: col.aiUseCase,
      customColumnId: col.customColumnId,
      truncate: col.truncate,
      logoAccessor: col.logoAccessor,
    });
  }

  return { gridColumns, columnMeta };
}
