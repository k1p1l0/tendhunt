"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  Play,
  Copy,
  ClipboardList,
  PanelRight,
  ExternalLink,
} from "lucide-react";

interface CellContextMenuProps {
  position: { x: number; y: number };
  isAiColumn: boolean;
  isScoring: boolean;
  onScoreCell: () => void;
  onCopyCell: () => void;
  onCopyRow: () => void;
  onViewDetails: () => void;
  onOpenEntity: () => void;
  onClose: () => void;
}

export function CellContextMenu({
  isAiColumn,
  isScoring,
  onScoreCell,
  onCopyCell,
  onCopyRow,
  onViewDetails,
  onOpenEntity,
  onClose,
  position,
}: CellContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const focusedIndex = useRef(-1);

  const getItems = useCallback(() => {
    if (!ref.current) return [];
    return Array.from(
      ref.current.querySelectorAll<HTMLButtonElement>('button[data-menu-item]')
    );
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = getItems();
        if (items.length === 0) return;
        if (e.key === "ArrowDown") {
          focusedIndex.current = Math.min(focusedIndex.current + 1, items.length - 1);
        } else {
          focusedIndex.current = Math.max(focusedIndex.current - 1, 0);
        }
        items[focusedIndex.current]?.focus();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, getItems]);

  // Clamp position to viewport
  const menuWidth = 220;
  const menuHeight = isAiColumn ? 230 : 140;
  const clampedX = Math.min(position.x, window.innerWidth - menuWidth - 8);
  const clampedY = Math.min(position.y, window.innerHeight - menuHeight - 8);

  return (
    <div
      ref={ref}
      className="fixed z-50 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95"
      style={{ left: clampedX, top: clampedY, width: menuWidth }}
    >
      {isAiColumn && (
        <>
          <button
            data-menu-item
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
            onClick={() => {
              onScoreCell();
              onClose();
            }}
            disabled={isScoring}
          >
            <Play className="h-3.5 w-3.5 text-muted-foreground" />
            Run 1 cell
          </button>
          <div className="h-px bg-border my-1" />
        </>
      )}

      <button
        data-menu-item
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        onClick={() => {
          onCopyCell();
          onClose();
        }}
      >
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        Copy cell
      </button>
      <button
        data-menu-item
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        onClick={() => {
          onCopyRow();
          onClose();
        }}
      >
        <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
        Copy row
      </button>

      <div className="h-px bg-border my-1" />

      {isAiColumn && (
        <button
          data-menu-item
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          onClick={() => {
            onViewDetails();
            onClose();
          }}
        >
          <PanelRight className="h-3.5 w-3.5 text-muted-foreground" />
          View details
        </button>
      )}

      <button
        data-menu-item
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        onClick={() => {
          onOpenEntity();
          onClose();
        }}
      >
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        Open entity
      </button>
    </div>
  );
}
