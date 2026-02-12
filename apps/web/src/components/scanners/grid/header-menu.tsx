"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Pin,
  ArrowLeftToLine,
  Pencil,
  Trash2,
  Check,
  X,
  Database,
  Filter,
  Play,
  ChevronRight,
} from "lucide-react";

export interface RunColumnOptions {
  columnId: string;
  limit?: number;
  force?: boolean;
}

interface HeaderMenuProps {
  col: number;
  columnTitle: string;
  columnId: string;
  /** Raw AI column ID for scoring API calls (without "ai-" prefix) */
  aiColumnId?: string;
  isFrozen: boolean;
  isAiColumn: boolean;
  isCustomColumn: boolean;
  position: { x: number; y: number };
  isScoring?: boolean;
  totalRows?: number;
  scoredRows?: number;
  onSort: (col: number, asc: boolean) => void;
  onEditColumn?: (col: number) => void;
  onEditCustomColumn?: (col: number) => void;
  onRenameColumn?: (columnId: string, newName: string) => void;
  onDeleteColumn?: (columnId: string) => void;
  onRunColumn?: (options: RunColumnOptions) => void;
  uniqueValues?: string[];
  activeFilter?: string[];
  onFilter?: (columnId: string, values: string[]) => void;
  onInsertColumn?: (side: "left" | "right") => void;
  onClose: () => void;
}

export function HeaderMenu({
  col,
  columnTitle,
  columnId,
  aiColumnId,
  isFrozen,
  isAiColumn,
  isCustomColumn,
  position,
  isScoring,
  totalRows,
  scoredRows,
  onSort,
  onEditColumn,
  onEditCustomColumn,
  onRenameColumn,
  onDeleteColumn,
  onRunColumn,
  uniqueValues,
  activeFilter,
  onFilter,
  onInsertColumn,
  onClose,
}: HeaderMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(columnTitle);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showRunSubmenu, setShowRunSubmenu] = useState(false);
  const [customRowCount, setCustomRowCount] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  const unscoredRows = (totalRows ?? 0) - (scoredRows ?? 0);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (isRenaming) {
          setIsRenaming(false);
          setRenameValue(columnTitle);
        } else {
          onClose();
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [onClose, isRenaming, columnTitle]);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  useEffect(() => {
    if (showCustomInput && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [showCustomInput]);

  function handleRenameSubmit() {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== columnTitle) {
      onRenameColumn?.(columnId, trimmed);
    }
    setIsRenaming(false);
    onClose();
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDeleteColumn?.(columnId);
    onClose();
  }

  const isDeletable = isAiColumn || isCustomColumn;

  return (
    <div
      ref={ref}
      className="fixed z-50 overflow-visible rounded-md border bg-popover p-1 text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95"
      style={{ left: position.x, top: position.y, width: 220, maxWidth: 220 }}
    >
      {/* Column name — click to rename */}
      {isRenaming ? (
        <div className="flex items-center gap-1 px-1 py-1">
          <input
            ref={inputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSubmit();
            }}
            className="flex-1 rounded border bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={handleRenameSubmit}
            className="rounded p-1 hover:bg-accent"
            title="Confirm"
          >
            <Check className="h-3.5 w-3.5 text-green-500" />
          </button>
          <button
            onClick={() => {
              setIsRenaming(false);
              setRenameValue(columnTitle);
            }}
            className="rounded p-1 hover:bg-accent"
            title="Cancel"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      ) : (
        <button
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
          onClick={() => setIsRenaming(true)}
          title="Click to rename"
        >
          <span className="truncate flex-1 text-left">{columnTitle}</span>
          <Pencil className="h-3 w-3 shrink-0 opacity-50" />
        </button>
      )}
      <div className="h-px bg-border my-1" />

      {/* Edit Column prompt (AI columns only) */}
      {isAiColumn && onEditColumn && (
        <button
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          onClick={() => {
            onEditColumn(col);
            onClose();
          }}
        >
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          Edit Prompt
        </button>
      )}

      {/* Run column (AI columns only) */}
      {isAiColumn && onRunColumn && (
        <div className="relative">
          <button
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            onMouseEnter={() => setShowRunSubmenu(true)}
            onClick={() => setShowRunSubmenu(!showRunSubmenu)}
            disabled={isScoring}
          >
            <Play className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="flex-1 text-left">Run column</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          {showRunSubmenu && (
            <div
              className="absolute left-full top-0 z-50 ml-1 w-[220px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95"
              onMouseLeave={() => {
                if (!showCustomInput) setShowRunSubmenu(false);
              }}
            >
              {/* Custom number input */}
              {showCustomInput ? (
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <input
                    ref={customInputRef}
                    type="number"
                    min={1}
                    max={totalRows ?? 999}
                    placeholder="# of rows"
                    value={customRowCount}
                    onChange={(e) => setCustomRowCount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const num = parseInt(customRowCount);
                        if (num > 0) {
                          onRunColumn({ columnId: aiColumnId!, limit: num });
                          onClose();
                        }
                      }
                      if (e.key === "Escape") setShowCustomInput(false);
                    }}
                    className="flex-1 rounded border bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring w-20"
                  />
                  <button
                    onClick={() => {
                      const num = parseInt(customRowCount);
                      if (num > 0) {
                        onRunColumn({ columnId: aiColumnId!, limit: num });
                        onClose();
                      }
                    }}
                    className="rounded p-1 hover:bg-accent"
                  >
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  </button>
                  <button
                    onClick={() => setShowCustomInput(false)}
                    className="rounded p-1 hover:bg-accent"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <button
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                  onClick={() => setShowCustomInput(true)}
                >
                  Choose number of rows to run
                </button>
              )}

              {/* Run unscored rows */}
              {unscoredRows > 0 && (
                <button
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                  onClick={() => {
                    onRunColumn({ columnId: aiColumnId! });
                    onClose();
                  }}
                >
                  Run {unscoredRows} unscored row{unscoredRows !== 1 ? "s" : ""}...
                </button>
              )}

              {/* Force run all */}
              <button
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => {
                  onRunColumn({ columnId: aiColumnId!, force: true });
                  onClose();
                }}
              >
                Force run all {totalRows ?? 0} rows...
              </button>
            </div>
          )}
        </div>
      )}

      {isAiColumn && <div className="h-px bg-border my-1" />}

      {/* Edit Field (custom columns only) */}
      {isCustomColumn && onEditCustomColumn && (
        <>
          <button
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => {
              onEditCustomColumn(col);
              onClose();
            }}
          >
            <Database className="h-3.5 w-3.5 text-muted-foreground" />
            Edit Field
          </button>
          <div className="h-px bg-border my-1" />
        </>
      )}

      {/* Insert column left/right */}
      {onInsertColumn && (
        <>
          <button
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => {
              onInsertColumn("left");
              onClose();
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
            Insert 1 column left
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => {
              onInsertColumn("right");
              onClose();
            }}
          >
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            Insert 1 column right
          </button>
          <div className="h-px bg-border my-1" />
        </>
      )}

      {/* Sort actions */}
      <button
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        onClick={() => {
          onSort(col, true);
          onClose();
        }}
      >
        <ArrowUp className="h-3.5 w-3.5 text-muted-foreground" />
        Sort A → Z
      </button>
      <button
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        onClick={() => {
          onSort(col, false);
          onClose();
        }}
      >
        <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
        Sort Z → A
      </button>

      {/* Filter by value section */}
      {uniqueValues && uniqueValues.length > 0 && onFilter && (
        <>
          <div className="h-px bg-border my-1" />
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Filter className="h-3 w-3" />
            Filter by value
          </div>
          <div className="max-h-[180px] overflow-y-auto overflow-x-hidden px-1">
            {uniqueValues.map((val) => {
              const isChecked = activeFilter?.includes(val) ?? false;
              return (
                <label
                  key={val}
                  className="flex items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-accent cursor-pointer min-w-0"
                  title={val}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      const current = activeFilter ?? [];
                      const next = isChecked
                        ? current.filter((v) => v !== val)
                        : [...current, val];
                      onFilter(columnId, next);
                    }}
                    className="h-3.5 w-3.5 shrink-0 rounded border-border accent-primary"
                  />
                  <span className="truncate">{val}</span>
                </label>
              );
            })}
          </div>
          {activeFilter && activeFilter.length > 0 && (
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => onFilter(columnId, [])}
            >
              <X className="h-3 w-3" />
              Clear filter
            </button>
          )}
        </>
      )}

      <div className="h-px bg-border my-1" />

      {/* Frozen column indicator */}
      {isFrozen && (
        <div className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground cursor-default">
          <Pin className="h-3.5 w-3.5" />
          Pinned column
        </div>
      )}

      {/* Fit to content */}
      <button
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        onClick={onClose}
      >
        <ArrowLeftToLine className="h-3.5 w-3.5 text-muted-foreground" />
        Fit to content
      </button>

      {/* Delete column (AI or custom columns) */}
      {isDeletable && onDeleteColumn && (
        <>
          <div className="h-px bg-border my-1" />
          <button
            className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors ${
              confirmDelete
                ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                : "text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
            }`}
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {confirmDelete ? "Click again to confirm" : "Delete Column"}
          </button>
        </>
      )}
    </div>
  );
}
