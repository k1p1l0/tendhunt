"use client";

import { useState, useCallback } from "react";
import type { KeyboardEvent, ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export interface TagInputProps {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  onBlur?: () => void;
  placeholder?: string;
}

/** Reusable tag input for array fields — pill-style badges with inline text input */
export function TagInput({
  label,
  tags,
  onChange,
  onBlur,
  placeholder,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addTag = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed && !tags.includes(trimmed)) {
        onChange([...tags, trimmed]);
      }
      setInputValue("");
    },
    [tags, onChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTag(inputValue);
      }
      if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
        onChange(tags.slice(0, -1));
      }
    },
    [inputValue, tags, onChange, addTag]
  );

  const removeTag = useCallback(
    (index: number) => {
      onChange(tags.filter((_, i) => i !== index));
      onBlur?.();
    },
    [tags, onChange, onBlur]
  );

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-md border p-2">
        {tags.map((tag, i) => (
          <Badge key={`${tag}-${i}`} variant="secondary" className="gap-1 py-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="ml-0.5 rounded-full hover:bg-muted"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <Input
          value={inputValue}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setInputValue(e.target.value)
          }
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (inputValue.trim()) addTag(inputValue);
            onBlur?.();
          }}
          placeholder={tags.length === 0 ? placeholder : "Add more..."}
          className="h-7 min-w-[120px] flex-1 border-0 p-0 shadow-none focus-visible:ring-0"
        />
      </div>
    </div>
  );
}
