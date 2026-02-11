"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { ScannerType } from "@/models/scanner";

interface ScannerCreationFormProps {
  type: ScannerType;
  onSave: (scanner: { _id: string }) => void;
  onCancel: () => void;
}

export function ScannerCreationForm({
  type,
  onSave,
  onCancel,
}: ScannerCreationFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate AI query on mount
  useEffect(() => {
    async function generate() {
      setIsGenerating(true);
      setError(null);
      try {
        const res = await fetch("/api/scanners/generate-query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to generate query");
        }
        const data = await res.json();
        setName(data.name || "");
        setDescription(data.description || "");
        setSearchQuery(data.searchQuery || "");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to generate query"
        );
      } finally {
        setIsGenerating(false);
      }
    }
    generate();
  }, [type]);

  async function handleCreate() {
    if (!name.trim()) {
      setError("Scanner name is required");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/scanners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          type,
          searchQuery: searchQuery.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create scanner");
      }

      const data = await res.json();
      onSave({ _id: data.scanner._id });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create scanner"
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isGenerating ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-16 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-40 w-full" />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Generating AI-powered configuration from your company profile...
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="scanner-name">Scanner Name</Label>
            <Input
              id="scanner-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. IT Services Contract Monitor"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scanner-description">Description</Label>
            <Textarea
              id="scanner-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this scanner monitor?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scanner-query">Search Query</Label>
            <Textarea
              id="scanner-query"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="AI-generated OR-joined conditions..."
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              AI-generated search conditions based on your company profile. The
              scanner uses this to evaluate relevance.
            </p>
          </div>
        </>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={isCreating}>
          Back
        </Button>
        <Button
          onClick={handleCreate}
          disabled={isGenerating || isCreating || !name.trim()}
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create & Open"
          )}
        </Button>
      </div>
    </div>
  );
}
