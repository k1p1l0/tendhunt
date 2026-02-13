"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import { AI_USE_CASES, AI_MODELS } from "@/lib/ai-column-config";
import type { AIModel } from "@/lib/ai-column-config";

export interface EditColumnData {
  columnId: string;
  name: string;
  prompt: string;
  useCase?: string;
  model?: string;
}

interface EditColumnSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  column: EditColumnData | null;
  scannerId: string;
  onColumnUpdated: (column: EditColumnData, rescore: boolean) => void;
}

export function EditColumnSheet({
  open,
  onOpenChange,
  column,
  scannerId,
  onColumnUpdated,
}: EditColumnSheetProps) {
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<AIModel>("haiku");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync form state when column changes
  useEffect(() => {
    if (column) {
      setName(column.name);
      setPrompt(column.prompt);
      setModel((column.model as AIModel) || "haiku");
      setError(null);
    }
  }, [column]);

  const hasChanges =
    column &&
    (name.trim() !== column.name ||
      prompt.trim() !== column.prompt ||
      model !== ((column.model as AIModel) || "haiku"));
  const promptChanged = column && prompt.trim() !== column.prompt;
  const modelChanged = column && model !== ((column.model as AIModel) || "haiku");

  // Resolve the use case label for the read-only badge
  const useCaseLabel = column?.useCase
    ? AI_USE_CASES.find((u) => u.value === column.useCase)?.label ?? column.useCase
    : "Score / Evaluate";

  async function handleSave(rescore: boolean) {
    if (!column) return;
    if (!name.trim()) {
      setError("Column name is required");
      return;
    }
    if (!prompt.trim()) {
      setError("Prompt is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/scanners/${scannerId}/columns`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          columnId: column.columnId,
          name: name.trim(),
          prompt: prompt.trim(),
          model,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update column");
      }

      onColumnUpdated(
        {
          columnId: column.columnId,
          name: name.trim(),
          prompt: prompt.trim(),
          useCase: column.useCase,
          model,
        },
        rescore
      );
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update column"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit Column</SheetTitle>
          <SheetDescription>
            Customize this AI analysis column. The AI will evaluate every row
            using your prompt.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6 space-y-5">
          {/* Info banner */}
          <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#E5FF00]" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Use Custom AI Analysis to analyze any column in your scanner.
              Common examples include generating summaries, scoring accounts or
              signals, or drafting recommendations based on entity data.
            </p>
          </div>

          {/* Use Case (read-only badge) */}
          <div className="space-y-2">
            <Label>Use Case</Label>
            <div>
              <Badge variant="secondary">{useCaseLabel}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              To change use case, create a new AI column.
            </p>
          </div>

          {/* Column Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-column-name">
              Column Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-column-name"
              placeholder="e.g., Vibe Score"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label>Model</Label>
            <Select
              value={model}
              onValueChange={(v) => setModel(v as AIModel)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    <span>{m.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {m.description}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Changing the model affects quality and cost of future scoring runs.
            </p>
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="edit-column-prompt">
              Prompt <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="edit-column-prompt"
              placeholder="Describe what you want the AI to analyze for each row..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isSubmitting}
              className="min-h-[240px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Type @ to reference a column. The AI receives each row&apos;s data
              alongside this prompt.
            </p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleSave(false)}
              disabled={isSubmitting || !hasChanges}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Update Column
            </Button>
            {(promptChanged || modelChanged) && (
              <Button
                variant="secondary"
                onClick={() => handleSave(true)}
                disabled={isSubmitting}
              >
                <RefreshCw className="h-4 w-4" />
                Update &amp; Re-score
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
