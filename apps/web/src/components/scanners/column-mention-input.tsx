"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { KeyboardEvent, ChangeEvent } from "react";
import { createPortal } from "react-dom";

interface ColumnOption {
  name: string;
  type: "core" | "custom" | "ai";
}

interface ColumnMentionInputProps {
  value: string;
  onChange: (value: string) => void;
  columns: ColumnOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

const TYPE_LABELS: Record<string, string> = {
  core: "Data",
  custom: "Custom",
  ai: "AI",
};

export function ColumnMentionInput({
  value,
  onChange,
  columns,
  placeholder,
  className,
  disabled,
  id,
}: ColumnMentionInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [showDropdown, setShowDropdown] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [triggerStart, setTriggerStart] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const filtered = columns.filter((col) =>
    col.name.toLowerCase().includes(filterText.toLowerCase())
  );

  const computeDropdownPosition = useCallback(() => {
    const textarea = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!textarea || !mirror || triggerStart < 0) return;

    const styles = window.getComputedStyle(textarea);
    mirror.style.font = styles.font;
    mirror.style.letterSpacing = styles.letterSpacing;
    mirror.style.padding = styles.padding;
    mirror.style.border = styles.border;
    mirror.style.width = `${textarea.clientWidth}px`;
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.wordWrap = "break-word";
    mirror.style.overflowWrap = "break-word";

    const textBefore = value.substring(0, triggerStart);
    mirror.textContent = textBefore;

    const span = document.createElement("span");
    span.textContent = "@";
    mirror.appendChild(span);

    const rect = textarea.getBoundingClientRect();
    const spanRect = span.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();

    const offsetTop = spanRect.top - mirrorRect.top;
    const offsetLeft = spanRect.left - mirrorRect.left;

    const lineHeight = parseInt(styles.lineHeight) || parseInt(styles.fontSize) * 1.4;

    setDropdownPos({
      top: rect.top + offsetTop + lineHeight - textarea.scrollTop + window.scrollY,
      left: rect.left + offsetLeft + window.scrollX,
    });
  }, [triggerStart, value]);

  useEffect(() => {
    if (showDropdown) {
      computeDropdownPosition();
    }
  }, [showDropdown, computeDropdownPosition, filterText]);

  useEffect(() => {
    if (!showDropdown) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  function openDropdown(cursorPos: number) {
    setTriggerStart(cursorPos);
    setFilterText("");
    setSelectedIndex(0);
    setShowDropdown(true);
  }

  function closeDropdown() {
    setShowDropdown(false);
    setTriggerStart(-1);
    setFilterText("");
  }

  function selectColumn(col: ColumnOption) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const before = value.substring(0, triggerStart);
    const after = value.substring(cursorPos);
    const insertion = `{{${col.name}}}`;
    const newValue = before + insertion + after;

    onChange(newValue);
    closeDropdown();

    requestAnimationFrame(() => {
      const newCursorPos = triggerStart + insertion.length;
      textarea.selectionStart = newCursorPos;
      textarea.selectionEnd = newCursorPos;
      textarea.focus();
    });
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value;
    onChange(newValue);

    const cursorPos = e.target.selectionStart;

    if (showDropdown && triggerStart >= 0) {
      const textSinceTrigger = newValue.substring(triggerStart + 1, cursorPos);
      if (textSinceTrigger.includes(" ") && textSinceTrigger.length > 20) {
        closeDropdown();
        return;
      }
      if (cursorPos <= triggerStart) {
        closeDropdown();
        return;
      }
      setFilterText(textSinceTrigger);
      setSelectedIndex(0);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!showDropdown) {
      if (e.key === "@") {
        const cursorPos = e.currentTarget.selectionStart;
        requestAnimationFrame(() => openDropdown(cursorPos));
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        if (filtered[selectedIndex]) {
          e.preventDefault();
          selectColumn(filtered[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        closeDropdown();
        break;
      case "Tab":
        if (filtered[selectedIndex]) {
          e.preventDefault();
          selectColumn(filtered[selectedIndex]);
        } else {
          closeDropdown();
        }
        break;
    }
  }

  const dropdown =
    showDropdown && filtered.length > 0
      ? createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] max-h-56 w-64 overflow-y-auto rounded-lg border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95 duration-100"
            style={{
              top: dropdownPos.top,
              left: dropdownPos.left,
            }}
          >
            {filtered.map((col, idx) => (
              <button
                key={`${col.type}-${col.name}`}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  idx === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "text-popover-foreground hover:bg-accent/50"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectColumn(col);
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <span className="truncate flex-1">{col.name}</span>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    col.type === "ai"
                      ? "bg-lime-400/20 text-lime-300"
                      : col.type === "custom"
                        ? "bg-blue-400/20 text-blue-300"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {TYPE_LABELS[col.type]}
                </span>
              </button>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />
      {/* Hidden mirror div for cursor position measurement */}
      <div
        ref={mirrorRef}
        aria-hidden
        className="pointer-events-none invisible fixed left-0 top-0"
      />
      {dropdown}
    </div>
  );
}
