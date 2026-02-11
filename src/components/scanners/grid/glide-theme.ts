"use client";

import { useSyncExternalStore } from "react";
import type { Theme } from "@glideapps/glide-data-grid";

/**
 * Convert any CSS color (including oklch) to a hex string via a 1×1 canvas.
 * Canvas fillStyle always resolves to an rgba/hex string the browser supports.
 */
let _ctx: CanvasRenderingContext2D | null = null;
function getCanvasCtx(): CanvasRenderingContext2D {
  if (!_ctx) {
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    _ctx = c.getContext("2d")!;
  }
  return _ctx;
}

function cssColorToHex(cssColor: string): string {
  if (!cssColor) return "#000000";
  if (cssColor.startsWith("#")) return cssColor;

  const ctx = getCanvasCtx();
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = "#000000"; // reset
  ctx.fillStyle = cssColor; // set the CSS color — canvas normalizes it
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function resolveVar(varName: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
}

function resolve(varName: string): string {
  return cssColorToHex(resolveVar(varName));
}

/** Derive a light tint from a hex color (for selection highlight) */
function hexToLightTint(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildTheme(): Partial<Theme> {
  if (typeof window === "undefined") return {};

  const bg = resolve("--background");
  const fg = resolve("--foreground");
  const muted = resolve("--muted");
  const mutedFg = resolve("--muted-foreground");
  const border = resolve("--border");
  const primary = resolve("--primary");
  const primaryFg = resolve("--primary-foreground");
  const card = resolve("--card");
  const accent = resolve("--accent");

  // TendHunt brand lime — used for accents and selection highlights
  const lime = "#E5FF00";
  const limeDark = "#1A1F00"; // dark text on lime backgrounds
  const selectionTint = hexToLightTint(lime, 0.10);

  return {
    accentColor: lime,
    accentLight: selectionTint,
    bgCell: bg,
    bgCellMedium: muted,
    bgHeader: card,
    bgHeaderHasFocus: card,
    bgHeaderHovered: muted,
    bgBubble: muted,
    bgBubbleSelected: lime,
    bgSearchResult: selectionTint,
    textDark: fg,
    textMedium: mutedFg,
    textLight: mutedFg,
    textBubble: fg,
    textHeader: fg,
    textHeaderSelected: limeDark,
    textGroupHeader: fg,
    borderColor: border,
    horizontalBorderColor: border,
    drilldownBorder: border,
    linkColor: lime,
    headerFontStyle: "600 13px",
    baseFontStyle: "13px",
    // Canvas ctx.font cannot resolve CSS variables — resolve to actual font name
    fontFamily: `${resolveVar("--font-geist-sans") || "system-ui"}, sans-serif`,
    editorFontSize: "13px",
  };
}

// External store for dark-mode changes
let currentTheme: Partial<Theme> = {};
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return currentTheme;
}

function refreshTheme() {
  currentTheme = buildTheme();
  listeners.forEach((cb) => cb());
}

// Set up MutationObserver once (client only)
if (typeof window !== "undefined") {
  currentTheme = buildTheme();

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.attributeName === "class" || m.attributeName === "style") {
        refreshTheme();
        break;
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style"],
  });
}

/** Hook that returns a Glide Theme synced with shadcn CSS variables + dark mode. */
export function useGlideTheme(): Partial<Theme> {
  return useSyncExternalStore(subscribe, getSnapshot, () => ({}));
}
