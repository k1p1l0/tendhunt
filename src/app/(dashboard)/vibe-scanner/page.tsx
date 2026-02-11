"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { PromptEditor } from "@/components/vibe-scanner/prompt-editor";

interface Scanner {
  _id: string;
  scoringPrompt: string;
  isDefault: boolean;
  threshold: number;
  contractScores: unknown[];
  buyerScores: unknown[];
}

export default function VibeScannerPage() {
  const [scanner, setScanner] = useState<Scanner | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing scanner on mount
  useEffect(() => {
    async function loadScanner() {
      try {
        const res = await fetch("/api/vibe-scanner");
        if (!res.ok) throw new Error("Failed to load scanner");
        const data = await res.json();
        if (data.scanner) {
          setScanner(data.scanner);
          setPrompt(data.scanner.scoringPrompt);
        }
      } catch (err) {
        console.error("Failed to load scanner:", err);
        setError("Failed to load Vibe Scanner. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    loadScanner();
  }, []);

  // Create a new scanner from company profile
  const handleCreate = useCallback(async () => {
    setIsCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/vibe-scanner/create", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create scanner");
      }
      setScanner(data.scanner);
      setPrompt(data.scanner.scoringPrompt);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create scanner"
      );
    } finally {
      setIsCreating(false);
    }
  }, []);

  // Save edited prompt and trigger scoring (scoring is placeholder for Plan 02)
  const handleApplyScore = useCallback(async () => {
    if (!scanner) return;

    setIsScoring(true);
    setError(null);
    try {
      // Save the prompt first
      const res = await fetch("/api/vibe-scanner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoringPrompt: prompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update prompt");
      }
      setScanner(data.scanner);

      // TODO (Plan 02): Trigger batch scoring after saving prompt
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to apply scoring"
      );
    } finally {
      setIsScoring(false);
    }
  }, [scanner, prompt]);

  // Reset to default prompt by regenerating from company profile
  const handleResetToDefault = useCallback(async () => {
    setIsResetting(true);
    setError(null);
    try {
      const res = await fetch("/api/vibe-scanner", { method: "PUT" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset scanner");
      }
      setScanner(data.scanner);
      setPrompt(data.scanner.scoringPrompt);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reset to default"
      );
    } finally {
      setIsResetting(false);
    }
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vibe Scanner</h1>
          <p className="text-muted-foreground">
            AI-powered contract scoring
          </p>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vibe Scanner</h1>
        <p className="text-muted-foreground">AI-powered contract scoring</p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!scanner ? (
        /* No scanner -- show creation card */
        <div className="flex items-center justify-center py-16">
          <Card className="max-w-md text-center">
            <CardHeader>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Create Your Vibe Scanner</CardTitle>
              <CardDescription>
                The Vibe Scanner uses AI to score government contracts against
                your company profile. It generates a custom scoring prompt
                based on your sectors, capabilities, and preferences, then
                scores every contract on a 1-10 scale so you can focus on
                the best opportunities.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleCreate}
                disabled={isCreating}
                size="lg"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Create Scanner
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Scanner exists -- show prompt editor and placeholder for scored feed */
        <div className="space-y-6">
          <PromptEditor
            prompt={prompt}
            isDefault={scanner.isDefault}
            onPromptChange={setPrompt}
            onApplyScore={handleApplyScore}
            onResetToDefault={handleResetToDefault}
            isScoring={isScoring}
            isResetting={isResetting}
          />

          {/* Placeholder for scored contract feed (Plan 02) */}
          <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Scored contracts will appear here after running the Vibe
              Scanner.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
