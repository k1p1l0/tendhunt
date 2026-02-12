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
import { Loader2, Database, Sparkles } from "lucide-react";
import {
  ENTITY_FIELDS,
  type DataType,
  type EntityField,
} from "@/components/scanners/table-columns";
import type { ScannerType } from "@/models/scanner";
import {
  AI_USE_CASES,
  AI_MODELS,
  PROMPT_TEMPLATES,
  type AIUseCase,
  type AIModel,
} from "@/lib/ai-column-config";

type TabKind = "data" | "ai";

interface AddColumnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scannerId: string;
  scannerType: ScannerType;
  onColumnAdded: (column: {
    columnId: string;
    name: string;
    kind: "ai" | "custom";
    prompt?: string;
    accessor?: string;
    dataType?: string;
    useCase?: string;
    model?: string;
  }) => void;
}

const DATA_TYPE_LABELS: Record<DataType, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  currency: "Currency",
  badge: "Badge",
  url: "URL",
  email: "Email",
  checkbox: "Checkbox",
  paragraph: "Paragraph",
};

export function AddColumnModal({
  open,
  onOpenChange,
  scannerId,
  scannerType,
  onColumnAdded,
}: AddColumnModalProps) {
  const [tab, setTab] = useState<TabKind>("data");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data column fields
  const [selectedField, setSelectedField] = useState<string>("");
  const [dataType, setDataType] = useState<DataType>("text");

  // AI column fields
  const [prompt, setPrompt] = useState("");
  const [useCase, setUseCase] = useState<AIUseCase>("score");
  const [model, setModel] = useState<AIModel>("haiku");
  const [promptModified, setPromptModified] = useState(false);

  const entityFields = ENTITY_FIELDS[scannerType] ?? [];

  function handleFieldChange(field: string) {
    setSelectedField(field);
    const found = entityFields.find((f) => f.field === field);
    if (found) {
      setDataType(found.suggestedType);
      if (!name.trim()) {
        setName(found.label);
      }
    }
  }

  function handleUseCaseChange(value: AIUseCase) {
    setUseCase(value);
    if (!promptModified) {
      setPrompt(PROMPT_TEMPLATES[value]);
    }
    if (!name.trim()) {
      const uc = AI_USE_CASES.find((u) => u.value === value);
      if (uc) setName(uc.label);
    }
  }

  function resetForm() {
    setName("");
    setPrompt("");
    setSelectedField("");
    setDataType("text");
    setUseCase("score");
    setModel("haiku");
    setPromptModified(false);
    setError(null);
    setTab("data");
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Column name is required");
      return;
    }

    if (tab === "ai" && !prompt.trim()) {
      setError("Prompt is required");
      return;
    }

    if (tab === "data" && !selectedField) {
      setError("Please select a field");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const body: Record<string, string> =
        tab === "data"
          ? {
              name: name.trim(),
              accessor: selectedField,
              dataType,
            }
          : {
              name: name.trim(),
              prompt: prompt.trim(),
              useCase,
              model,
            };

      const res = await fetch(`/api/scanners/${scannerId}/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add column");
      }

      const { column, kind } = (await res.json()) as {
        column: {
          columnId: string;
          name: string;
          prompt?: string;
          accessor?: string;
          dataType?: string;
          useCase?: string;
          model?: string;
        };
        kind: "ai" | "custom";
      };

      onColumnAdded({
        columnId: column.columnId,
        name: column.name,
        kind,
        prompt: column.prompt,
        accessor: column.accessor,
        dataType: column.dataType,
        useCase: column.useCase,
        model: column.model,
      });

      resetForm();
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
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Column</DialogTitle>
          <DialogDescription>
            Add a data column to show entity fields, or an AI column for
            automated analysis.
          </DialogDescription>
        </DialogHeader>

        {/* Tab toggle */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "data"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => {
              setTab("data");
              setError(null);
            }}
          >
            <Database className="h-3.5 w-3.5" />
            Data Column
          </button>
          <button
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "ai"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => {
              setTab("ai");
              setError(null);
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Column
          </button>
        </div>

        <div className="space-y-4">
          {/* Column Name (shared) */}
          <div className="space-y-2">
            <Label htmlFor="column-name">Column Name</Label>
            <Input
              id="column-name"
              placeholder={
                tab === "data"
                  ? "e.g., Status"
                  : "e.g., Contract Risk Assessment"
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* ── Data Column Tab ─────────────────────────── */}
          {tab === "data" && (
            <>
              <div className="space-y-2">
                <Label>Entity Field</Label>
                <Select
                  value={selectedField}
                  onValueChange={handleFieldChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a field..." />
                  </SelectTrigger>
                  <SelectContent>
                    {entityFields.map((f: EntityField) => (
                      <SelectItem key={f.field} value={f.field}>
                        <span>{f.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {f.field}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data Type</Label>
                <Select
                  value={dataType}
                  onValueChange={(v) => setDataType(v as DataType)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(DATA_TYPE_LABELS) as [DataType, string][]).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Auto-filled from the selected field. You can override to change how data renders.
                </p>
              </div>
            </>
          )}

          {/* ── AI Column Tab ──────────────────────────── */}
          {tab === "ai" && (
            <>
              {/* Use Case */}
              <div className="space-y-2">
                <Label>Use Case</Label>
                <Select
                  value={useCase}
                  onValueChange={(v) => handleUseCaseChange(v as AIUseCase)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_USE_CASES.map((uc) => (
                      <SelectItem key={uc.value} value={uc.value}>
                        {uc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  Haiku is fastest and cheapest. Sonnet and Opus produce higher-quality analysis.
                </p>
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <Label htmlFor="column-prompt">Prompt</Label>
                <Textarea
                  id="column-prompt"
                  placeholder="Describe what you want the AI to analyze for each row..."
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    setPromptModified(true);
                  }}
                  disabled={isSubmitting}
                  className="min-h-[150px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Pre-filled from the selected use case. Customise to refine the analysis for your needs.
                </p>
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {tab === "ai" ? "Add & Score" : "Add Column"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
