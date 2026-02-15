"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, Settings2, Infinity } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface BudgetConfig {
  enabled: boolean;
  limit: number;
}

interface WorkerBudgets {
  enrichment: BudgetConfig;
  "data-sync": BudgetConfig;
  "spend-ingest": BudgetConfig;
  "board-minutes": BudgetConfig;
}

const WORKER_INFO: Record<
  keyof WorkerBudgets,
  { label: string; description: string; defaultLimit: number }
> = {
  enrichment: {
    label: "Enrichment",
    description: "9-stage buyer enrichment pipeline (classify, website, logo, governance, scrape, personnel, score)",
    defaultLimit: 500,
  },
  "data-sync": {
    label: "Data Sync",
    description: "Fetches contracts from Find a Tender + Contracts Finder APIs",
    defaultLimit: 9000,
  },
  "spend-ingest": {
    label: "Spend Ingest",
    description: "4-stage spend data ingest (discover, extract, download, aggregate)",
    defaultLimit: 200,
  },
  "board-minutes": {
    label: "Board Minutes",
    description: "Signal extraction from board documents via Claude Haiku",
    defaultLimit: 100,
  },
};

const WORKER_ORDER: (keyof WorkerBudgets)[] = [
  "enrichment",
  "data-sync",
  "spend-ingest",
  "board-minutes",
];

export default function SettingsPage() {
  const [budgets, setBudgets] = useState<WorkerBudgets | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setBudgets(data.workerBudgets);
      }
    } catch (error) {
      console.error("[settings] Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  function handleToggle(worker: keyof WorkerBudgets, enabled: boolean) {
    if (!budgets) return;
    setBudgets({
      ...budgets,
      [worker]: { ...budgets[worker], enabled },
    });
    setDirty(true);
    setSaveMessage(null);
  }

  function handleLimitChange(worker: keyof WorkerBudgets, value: string) {
    if (!budgets) return;
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) return;
    setBudgets({
      ...budgets,
      [worker]: { ...budgets[worker], limit: num },
    });
    setDirty(true);
    setSaveMessage(null);
  }

  async function handleSave() {
    if (!budgets) return;
    setSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerBudgets: budgets }),
      });

      if (res.ok) {
        const data = await res.json();
        setBudgets(data.workerBudgets);
        setDirty(false);
        setSaveMessage("Settings saved");
      } else {
        const data = await res.json();
        setSaveMessage(`Error: ${data.error ?? "Unknown"}`);
      }
    } catch (error) {
      setSaveMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure worker budget limits and pipeline behavior
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span
              className={`text-sm ${
                saveMessage.startsWith("Error") ? "text-red-500" : "text-green-600"
              }`}
            >
              {saveMessage}
            </span>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Budget Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Worker Budget Limits</CardTitle>
          </div>
          <CardDescription>
            Control the maximum number of items each worker processes per run.
            Disable the budget to let workers process all remaining items in a single invocation.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-1">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : budgets ? (
            WORKER_ORDER.map((worker, i) => {
              const info = WORKER_INFO[worker];
              const config = budgets[worker];

              return (
                <div key={worker}>
                  {i > 0 && <Separator className="my-4" />}
                  <div className="flex items-start justify-between gap-6">
                    {/* Left side: info + input */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{info.label}</span>
                        {config.enabled ? (
                          <Badge variant="outline" className="text-xs">
                            {config.limit.toLocaleString()} per run
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Infinity className="h-3 w-3" />
                            Unlimited
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{info.description}</p>

                      {config.enabled && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground w-20 shrink-0">
                            Max items:
                          </span>
                          <Input
                            type="number"
                            min={1}
                            value={config.limit}
                            onChange={(e) => handleLimitChange(worker, e.target.value)}
                            className="h-8 w-32 text-sm"
                          />
                        </div>
                      )}
                    </div>

                    {/* Right side: toggle */}
                    <div className="flex flex-col items-center gap-1 pt-0.5">
                      <Switch
                        checked={config.enabled}
                        onCheckedChange={(checked) => handleToggle(worker, checked)}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {config.enabled ? "Limited" : "Unlimited"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">Failed to load settings</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
