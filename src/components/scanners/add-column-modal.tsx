"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface AddColumnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scannerId: string;
  onColumnAdded: (column: {
    columnId: string;
    name: string;
    prompt: string;
  }) => void;
}

export function AddColumnModal({
  open,
  onOpenChange,
  scannerId,
  onColumnAdded,
}: AddColumnModalProps) {
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    // Validate
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), prompt: prompt.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add column");
      }

      const { column } = (await res.json()) as {
        column: { columnId: string; name: string; prompt: string };
      };

      onColumnAdded(column);

      // Reset form and close
      setName("");
      setPrompt("");
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add column"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add AI Column</DialogTitle>
          <DialogDescription>
            Define a custom analysis column. The AI will evaluate every row
            using your prompt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Column Name */}
          <div className="space-y-2">
            <Label htmlFor="column-name">Column Name</Label>
            <Input
              id="column-name"
              placeholder="e.g., Contract Risk Assessment"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="column-prompt">Prompt</Label>
            <Textarea
              id="column-prompt"
              placeholder="Describe what you want the AI to analyze for each row..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isSubmitting}
              className="min-h-[150px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Tip: Reference row data like the contract title, buyer name, or
              sector in your prompt for more targeted analysis.
            </p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Add &amp; Score
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
