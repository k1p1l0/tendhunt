import { GridCellKind } from "@glideapps/glide-data-grid";
import type { GridCell } from "@glideapps/glide-data-grid";
import type { ColumnMeta } from "./glide-columns";
import {
  createScoreBadgeCell,
  createTextStatusCell,
  createCategoryBadgeCell,
  createEntityNameCell,
} from "./custom-renderers";
import {
  resolveAccessor,
  formatDate,
  formatCurrency,
  formatNumber,
} from "./format-utils";

const MECHANISM_LABELS: Record<string, string> = {
  standard: "Standard",
  dps: "DPS",
  framework: "Framework",
  call_off_dps: "DPS Call-off",
  call_off_framework: "FW Call-off",
};

const ORG_TYPE_LABELS: Record<string, string> = {
  local_council_london: "London Borough",
  local_council_metro: "Metro Borough",
  local_council_county: "County Council",
  local_council_unitary: "Unitary Authority",
  local_council_district: "District Council",
  local_council_sui_generis: "Sui Generis",
  local_council_other: "Council",
  nhs_trust_acute: "NHS Acute Trust",
  nhs_trust_mental_health: "NHS Mental Health",
  nhs_trust_community: "NHS Community",
  nhs_trust_ambulance: "NHS Ambulance",
  nhs_icb: "NHS ICB",
  nhs_other: "NHS Body",
  fire_rescue: "Fire & Rescue",
  police_pcc: "Police / PCC",
  combined_authority: "Combined Authority",
  national_park: "National Park",
  mat: "Academy Trust",
  university: "University",
  fe_college: "FE College",
  alb: "Arms-Length Body",
  central_government: "Central Gov",
  devolved_government: "Devolved Gov",
  housing_association: "Housing Assoc",
  private_company: "Private Company",
};
import type { ScoreEntry } from "@/stores/scanner-store";
import { isTextUseCase } from "@/lib/ai-column-config";

/**
 * Create a getCellContent callback for Glide DataEditor.
 * Captures columnMeta, displayRows, and scores as a closure.
 */
export function createGetCellContent(
  columnMeta: ColumnMeta[],
  displayRows: Array<Record<string, unknown>>,
  scores: Record<string, ScoreEntry>,
  getScore: (
    scores: Record<string, ScoreEntry>,
    columnId: string,
    entityId: string
  ) => ScoreEntry | undefined,
  isScoringActive?: boolean
) {
  return function getCellContent([col, row]: readonly [
    number,
    number,
  ]): GridCell {
    const meta = columnMeta[col];
    const rowData = displayRows[row];

    if (!meta || !rowData) {
      return {
        kind: GridCellKind.Text,
        data: "",
        displayData: "--",
        allowOverlay: false,
      };
    }

    // AI column — text mode vs score mode
    if (meta.type === "ai" && meta.aiColumnId) {
      const entityId = String(rowData._id);
      const entry = getScore(scores, meta.aiColumnId, entityId);

      if (isTextUseCase(meta.aiUseCase)) {
        if (entry?.isQueued) return createTextStatusCell("", "queued");
        if (entry?.isLoading) return createTextStatusCell("", "loading");
        if (entry?.error) return createTextStatusCell("", "error", entry.error);
        if (entry?.response) return createTextStatusCell(entry.response, "success");
        return createTextStatusCell("", "empty");
      }

      // Score mode: queued shows shimmer bar, active shows spinner
      if (entry?.isQueued) {
        return createScoreBadgeCell(null, false, true);
      }
      if (entry?.isLoading) {
        return createScoreBadgeCell(null, true);
      }
      if (entry?.score != null) {
        return createScoreBadgeCell(entry.score, false, false, `${meta.aiColumnId}:${entityId}`);
      }
      // No score — show queued shimmer when scoring is active, dashed circle otherwise
      return createScoreBadgeCell(null, false, isScoringActive);
    }

    // Entity name with logo
    if (meta.type === "entity-name") {
      const name = resolveAccessor(rowData, meta.accessor);
      const logoName = meta.logoAccessor
        ? resolveAccessor(rowData, meta.logoAccessor)
        : name;
      const nameStr = name != null ? String(name) : "";
      const logoStr = logoName != null ? String(logoName) : nameStr;
      const logoUrl = resolveAccessor(rowData, "logoUrl");
      const logoUrlStr = logoUrl != null ? String(logoUrl) : undefined;
      return createEntityNameCell(nameStr, logoStr, logoUrlStr);
    }

    const value = resolveAccessor(rowData, meta.accessor);

    switch (meta.type) {
      case "date": {
        const display = formatDate(value);
        return {
          kind: GridCellKind.Text,
          data: value != null ? String(value) : "",
          displayData: display,
          allowOverlay: false,
        };
      }

      case "currency": {
        const display = formatCurrency(value);
        return {
          kind: GridCellKind.Text,
          data: value != null ? String(value) : "",
          displayData: display,
          allowOverlay: false,
        };
      }

      case "number": {
        const num = value != null ? Number(value) : undefined;
        if (num == null || isNaN(num)) {
          return {
            kind: GridCellKind.Text,
            data: "",
            displayData: "--",
            allowOverlay: false,
          };
        }
        return {
          kind: GridCellKind.Number,
          data: num,
          displayData: formatNumber(value),
          allowOverlay: false,
        };
      }

      case "badge": {
        let label = value != null ? String(value) : "";
        if (!label) {
          return {
            kind: GridCellKind.Text,
            data: "",
            displayData: "--",
            allowOverlay: false,
          };
        }
        // Human-readable labels for enum badge values
        if (meta.id === "orgType" && label in ORG_TYPE_LABELS) {
          label = ORG_TYPE_LABELS[label];
        } else if (meta.accessor === "contractMechanism" && label in MECHANISM_LABELS) {
          label = MECHANISM_LABELS[label];
        }
        return createCategoryBadgeCell(label);
      }

      case "url": {
        const url = value != null ? String(value) : "";
        if (!url) {
          return {
            kind: GridCellKind.Text,
            data: "",
            displayData: "--",
            allowOverlay: false,
          };
        }
        return {
          kind: GridCellKind.Uri,
          data: url,
          allowOverlay: true,
        };
      }

      case "email": {
        const email = value != null ? String(value) : "";
        if (!email) {
          return {
            kind: GridCellKind.Text,
            data: "",
            displayData: "--",
            allowOverlay: false,
          };
        }
        return {
          kind: GridCellKind.Uri,
          data: `mailto:${email}`,
          allowOverlay: true,
        };
      }

      case "checkbox": {
        const checked = Boolean(value);
        return {
          kind: GridCellKind.Boolean,
          data: checked,
          allowOverlay: false,
        };
      }

      case "paragraph": {
        const text = value != null ? String(value) : "";
        return {
          kind: GridCellKind.Text,
          data: text,
          displayData: text || "--",
          allowOverlay: true,
          allowWrapping: true,
        };
      }

      case "text":
      default: {
        const text = value != null ? String(value) : "";
        return {
          kind: GridCellKind.Text,
          data: text,
          displayData: text || "--",
          allowOverlay: false,
        };
      }
    }
  };
}
