import {
  type CustomCell,
  type CustomRenderer,
  GridCellKind,
} from "@glideapps/glide-data-grid";

// ── Score Badge ──────────────────────────────────────────────

interface ScoreBadgeData {
  readonly kind: "score-badge";
  readonly score: number | null;
  readonly isLoading: boolean;
  readonly isQueued?: boolean;
}

export type ScoreBadgeCell = CustomCell<ScoreBadgeData>;

export function createScoreBadgeCell(
  score: number | null,
  isLoading: boolean,
  isQueued?: boolean
): ScoreBadgeCell {
  return {
    kind: GridCellKind.Custom,
    allowOverlay: false,
    copyData: score != null ? score.toFixed(1) : "",
    data: { kind: "score-badge", score, isLoading, isQueued },
  };
}

function getScoreColor(score: number): string {
  if (score >= 7) return "#22c55e";
  if (score >= 4) return "#eab308";
  return "#ef4444";
}

const scoreBadgeRenderer: CustomRenderer<ScoreBadgeCell> = {
  kind: GridCellKind.Custom,
  isMatch: (cell: CustomCell): cell is ScoreBadgeCell =>
    (cell.data as ScoreBadgeData).kind === "score-badge",

  draw: (args, cell) => {
    const { ctx, rect, theme } = args;
    const { score, isLoading, isQueued } = cell.data;
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const radius = 14;

    if (isLoading) {
      // Background track circle
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(156, 163, 175, 0.15)";
      ctx.fill();

      // Spinning arc
      const t = (Date.now() % 1000) / 1000;
      const startAngle = t * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, startAngle + Math.PI * 1.2);
      ctx.strokeStyle = "#a3a3a3";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.stroke();

      // Pulsing dots text
      const dots = ".".repeat(Math.floor(t * 3) + 1);
      ctx.fillStyle = "rgba(156, 163, 175, 0.7)";
      ctx.font = `600 9px ${theme.fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(dots, cx, cy);

      return true;
    }

    if (isQueued) {
      // Queued: shimmer progress bar showing "waiting in line"
      const barW = Math.min(rect.width - 24, 60);
      const barH = 6;
      const barX = cx - barW / 2;
      const barY = cy - barH / 2;
      const barR = barH / 2;

      // Track
      ctx.beginPath();
      ctx.moveTo(barX + barR, barY);
      ctx.lineTo(barX + barW - barR, barY);
      ctx.arcTo(barX + barW, barY, barX + barW, barY + barR, barR);
      ctx.lineTo(barX + barW, barY + barH - barR);
      ctx.arcTo(barX + barW, barY + barH, barX + barW - barR, barY + barH, barR);
      ctx.lineTo(barX + barR, barY + barH);
      ctx.arcTo(barX, barY + barH, barX, barY + barH - barR, barR);
      ctx.lineTo(barX, barY + barR);
      ctx.arcTo(barX, barY, barX + barR, barY, barR);
      ctx.closePath();
      ctx.fillStyle = "rgba(156, 163, 175, 0.15)";
      ctx.fill();

      // Animated shimmer highlight
      const t = (Date.now() % 1500) / 1500;
      const shimmerX = barX + t * (barW + 20) - 20;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(barX + barR, barY);
      ctx.lineTo(barX + barW - barR, barY);
      ctx.arcTo(barX + barW, barY, barX + barW, barY + barR, barR);
      ctx.lineTo(barX + barW, barY + barH - barR);
      ctx.arcTo(barX + barW, barY + barH, barX + barW - barR, barY + barH, barR);
      ctx.lineTo(barX + barR, barY + barH);
      ctx.arcTo(barX, barY + barH, barX, barY + barH - barR, barR);
      ctx.lineTo(barX, barY + barR);
      ctx.arcTo(barX, barY, barX + barR, barY, barR);
      ctx.closePath();
      ctx.clip();
      const grad = ctx.createLinearGradient(shimmerX, 0, shimmerX + 20, 0);
      grad.addColorStop(0, "rgba(156, 163, 175, 0)");
      grad.addColorStop(0.5, "rgba(156, 163, 175, 0.3)");
      grad.addColorStop(1, "rgba(156, 163, 175, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(shimmerX, barY, 20, barH);
      ctx.restore();

      // "Queued" label
      ctx.fillStyle = "rgba(156, 163, 175, 0.5)";
      ctx.font = `500 9px ${theme.fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("queued", cx, cy + barH + 6);

      return true;
    }

    if (score == null) {
      // Empty dashed circle
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = theme.textLight;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
      return false;
    }

    // Filled circle with score
    const color = getScoreColor(score);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Score text
    ctx.fillStyle = "#ffffff";
    ctx.font = `600 11px ${theme.fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(score.toFixed(1), cx, cy);

    return false;
  },
};

// ── Text Shimmer (skeleton loader for text-mode AI columns) ─

interface TextShimmerData {
  readonly kind: "text-shimmer";
}

export type TextShimmerCell = CustomCell<TextShimmerData>;

export function createTextShimmerCell(): TextShimmerCell {
  return {
    kind: GridCellKind.Custom,
    allowOverlay: false,
    copyData: "",
    data: { kind: "text-shimmer" },
  };
}

const textShimmerRenderer: CustomRenderer<TextShimmerCell> = {
  kind: GridCellKind.Custom,
  isMatch: (cell: CustomCell): cell is TextShimmerCell =>
    (cell.data as TextShimmerData).kind === "text-shimmer",

  draw: (args, _cell) => {
    const { ctx, rect } = args;
    const padX = 12;
    const barH = 6;
    const gap = 6;
    const barR = 3;
    const barWidths = [0.7, 0.5]; // fraction of available width
    const availW = rect.width - padX * 2;
    const totalH = barWidths.length * barH + (barWidths.length - 1) * gap;
    const startY = rect.y + (rect.height - totalH) / 2;

    // Draw bars
    for (let i = 0; i < barWidths.length; i++) {
      const bw = availW * barWidths[i];
      const bx = rect.x + padX;
      const by = startY + i * (barH + gap);

      ctx.beginPath();
      ctx.moveTo(bx + barR, by);
      ctx.lineTo(bx + bw - barR, by);
      ctx.arcTo(bx + bw, by, bx + bw, by + barR, barR);
      ctx.lineTo(bx + bw, by + barH - barR);
      ctx.arcTo(bx + bw, by + barH, bx + bw - barR, by + barH, barR);
      ctx.lineTo(bx + barR, by + barH);
      ctx.arcTo(bx, by + barH, bx, by + barH - barR, barR);
      ctx.lineTo(bx, by + barR);
      ctx.arcTo(bx, by, bx + barR, by, barR);
      ctx.closePath();
      ctx.fillStyle = "rgba(156, 163, 175, 0.15)";
      ctx.fill();
    }

    // Animated shimmer sweep across all bars
    const t = (Date.now() % 1200) / 1200;
    const shimmerW = 40;
    const sweepX = rect.x + padX + t * (availW + shimmerW) - shimmerW;

    ctx.save();
    // Clip to all bars combined
    ctx.beginPath();
    for (let i = 0; i < barWidths.length; i++) {
      const bw = availW * barWidths[i];
      const bx = rect.x + padX;
      const by = startY + i * (barH + gap);
      ctx.moveTo(bx + barR, by);
      ctx.lineTo(bx + bw - barR, by);
      ctx.arcTo(bx + bw, by, bx + bw, by + barR, barR);
      ctx.lineTo(bx + bw, by + barH - barR);
      ctx.arcTo(bx + bw, by + barH, bx + bw - barR, by + barH, barR);
      ctx.lineTo(bx + barR, by + barH);
      ctx.arcTo(bx, by + barH, bx, by + barH - barR, barR);
      ctx.lineTo(bx, by + barR);
      ctx.arcTo(bx, by, bx + barR, by, barR);
      ctx.closePath();
    }
    ctx.clip();

    const grad = ctx.createLinearGradient(sweepX, 0, sweepX + shimmerW, 0);
    grad.addColorStop(0, "rgba(156, 163, 175, 0)");
    grad.addColorStop(0.5, "rgba(156, 163, 175, 0.25)");
    grad.addColorStop(1, "rgba(156, 163, 175, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(sweepX, rect.y, shimmerW, rect.height);
    ctx.restore();

    return true;
  },
};

// ── Category Badge ───────────────────────────────────────────

interface CategoryBadgeData {
  readonly kind: "category-badge";
  readonly label: string;
}

export type CategoryBadgeCell = CustomCell<CategoryBadgeData>;

export function createCategoryBadgeCell(label: string): CategoryBadgeCell {
  return {
    kind: GridCellKind.Custom,
    allowOverlay: false,
    copyData: label,
    data: { kind: "category-badge", label },
  };
}

const categoryBadgeRenderer: CustomRenderer<CategoryBadgeCell> = {
  kind: GridCellKind.Custom,
  isMatch: (cell: CustomCell): cell is CategoryBadgeCell =>
    (cell.data as CategoryBadgeData).kind === "category-badge",

  draw: (args, cell) => {
    const { ctx, rect, theme } = args;
    const { label } = cell.data;

    if (!label) return false;

    ctx.font = `12px ${theme.fontFamily}`;
    const textWidth = ctx.measureText(label).width;
    const padX = 8;
    const padY = 4;
    const pillW = textWidth + padX * 2;
    const pillH = 20;
    const x = rect.x + 8;
    const y = rect.y + (rect.height - pillH) / 2;

    // Rounded rect pill
    const r = 4;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + pillW - r, y);
    ctx.arcTo(x + pillW, y, x + pillW, y + r, r);
    ctx.lineTo(x + pillW, y + pillH - r);
    ctx.arcTo(x + pillW, y + pillH, x + pillW - r, y + pillH, r);
    ctx.lineTo(x + r, y + pillH);
    ctx.arcTo(x, y + pillH, x, y + pillH - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();

    ctx.fillStyle = theme.bgCellMedium;
    ctx.fill();

    // Text
    ctx.fillStyle = theme.textMedium;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + padX, y + pillH / 2 + padY / 4);

    return false;
  },
};

// ── Entity Name (logo + text) ────────────────────────────────

interface EntityNameData {
  readonly kind: "entity-name";
  readonly name: string;
  readonly logoSlug: string;
  readonly logoUrl?: string;
}

export type EntityNameCell = CustomCell<EntityNameData>;

/** Convert a buyer/org name to a logo filename slug */
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createEntityNameCell(
  name: string,
  logoName: string,
  logoUrl?: string
): EntityNameCell {
  return {
    kind: GridCellKind.Custom,
    allowOverlay: false,
    copyData: name,
    data: { kind: "entity-name", name, logoSlug: nameToSlug(logoName), logoUrl },
  };
}

// Image cache for logo rendering + redraw trigger
const logoCache = new Map<string, HTMLImageElement | "loading" | "error">();
let _redrawCallback: (() => void) | null = null;

/** Set a callback that forces grid repaint when logos finish loading */
export function setLogoRedrawCallback(cb: () => void) {
  _redrawCallback = cb;
}

function getLogoImage(slug: string, logoUrl?: string): HTMLImageElement | null {
  // Use logoUrl as primary key if available, otherwise fall back to slug
  const cacheKey = logoUrl || slug;
  if (!cacheKey) return null;

  const cached = logoCache.get(cacheKey);
  if (cached === "loading") return null;
  if (cached === "error") {
    // If DB logo failed, try static fallback (only once)
    if (logoUrl && slug) {
      return getLogoImage(slug);
    }
    return null;
  }
  if (cached) return cached;

  // Start loading
  logoCache.set(cacheKey, "loading");
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = logoUrl || `/logos/${slug}.png`;
  img.onload = () => {
    logoCache.set(cacheKey, img);
    _redrawCallback?.();
  };
  img.onerror = () => {
    logoCache.set(cacheKey, "error");
    _redrawCallback?.();
  };
  return null;
}

const entityNameRenderer: CustomRenderer<EntityNameCell> = {
  kind: GridCellKind.Custom,
  isMatch: (cell: CustomCell): cell is EntityNameCell =>
    (cell.data as EntityNameData).kind === "entity-name",

  draw: (args, cell) => {
    const { ctx, rect, theme } = args;
    const { name, logoSlug, logoUrl } = cell.data;
    const displayName = name || "--";

    const logoSize = 18;
    const logoPad = 10;
    const logoX = rect.x + logoPad;
    const logoY = rect.y + (rect.height - logoSize) / 2;

    const img = (logoSlug || logoUrl) ? getLogoImage(logoSlug, logoUrl) : null;
    let textX = logoX;
    let needsRedraw = false;

    if (img) {
      // Draw rounded logo
      const r = 3;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(logoX + r, logoY);
      ctx.lineTo(logoX + logoSize - r, logoY);
      ctx.arcTo(logoX + logoSize, logoY, logoX + logoSize, logoY + r, r);
      ctx.lineTo(logoX + logoSize, logoY + logoSize - r);
      ctx.arcTo(logoX + logoSize, logoY + logoSize, logoX + logoSize - r, logoY + logoSize, r);
      ctx.lineTo(logoX + r, logoY + logoSize);
      ctx.arcTo(logoX, logoY + logoSize, logoX, logoY + logoSize - r, r);
      ctx.lineTo(logoX, logoY + r);
      ctx.arcTo(logoX, logoY, logoX + r, logoY, r);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
      ctx.restore();

      textX = logoX + logoSize + 8;
    } else if (logoCache.get(logoUrl || logoSlug) === "loading") {
      // Placeholder circle while loading
      ctx.beginPath();
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = theme.bgCellMedium;
      ctx.fill();
      textX = logoX + logoSize + 8;
      needsRedraw = true;
    } else {
      // No logo / error — draw initials circle
      ctx.beginPath();
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = theme.bgCellMedium;
      ctx.fill();

      const initial = displayName.charAt(0).toUpperCase();
      ctx.fillStyle = theme.textMedium;
      ctx.font = `600 10px ${theme.fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initial, logoX + logoSize / 2, logoY + logoSize / 2);
      textX = logoX + logoSize + 8;
    }

    // Always draw name text (even while logo is loading)
    ctx.fillStyle = theme.textDark;
    ctx.font = `13px ${theme.fontFamily}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    const maxTextWidth = rect.x + rect.width - textX - 8;
    let displayText = displayName;
    if (ctx.measureText(displayText).width > maxTextWidth) {
      while (displayText.length > 0 && ctx.measureText(displayText + "…").width > maxTextWidth) {
        displayText = displayText.slice(0, -1);
      }
      displayText += "…";
    }
    ctx.fillText(displayText, textX, rect.y + rect.height / 2);

    return needsRedraw;
  },
};

// ── Exports ──────────────────────────────────────────────────

export const customRenderers: CustomRenderer<CustomCell>[] = [
  scoreBadgeRenderer as unknown as CustomRenderer<CustomCell>,
  textShimmerRenderer as unknown as CustomRenderer<CustomCell>,
  categoryBadgeRenderer as unknown as CustomRenderer<CustomCell>,
  entityNameRenderer as unknown as CustomRenderer<CustomCell>,
];
