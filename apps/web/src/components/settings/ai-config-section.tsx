"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AiConfigState {
  hasKey: boolean;
  maskedKey: string | null;
  useOwnKey: boolean;
  preferredScoringModel: string;
  preferredAgentModel: string;
  keyValidatedAt: string | null;
}

const SCORING_MODELS = [
  {
    value: "claude-haiku-4-5-20251001",
    label: "Claude Haiku 4.5",
    description: "Fast & affordable",
  },
  {
    value: "claude-sonnet-4-5-20250929",
    label: "Claude Sonnet 4.5",
    description: "Balanced quality",
  },
] as const;

const AGENT_MODELS = [
  {
    value: "claude-sonnet-4-5-20250929",
    label: "Claude Sonnet 4.5",
    description: "Recommended",
  },
  {
    value: "claude-opus-4-6",
    label: "Claude Opus 4.6",
    description: "Highest quality",
  },
] as const;

export function AiConfigSection() {
  const prefersReducedMotion = useReducedMotion();
  const [config, setConfig] = useState<AiConfigState | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [removing, setRemoving] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/ai-config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch {
      // Silent fail — section shows loading state
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const handleValidateAndSave = async () => {
    if (!apiKey.trim()) return;
    setValidating(true);
    setValidated(false);

    try {
      const res = await fetch("/api/settings/ai-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anthropicApiKey: apiKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to validate key");
        return;
      }

      setValidated(true);
      setApiKey("");
      toast.success("API key validated and saved");
      void loadConfig();
    } catch {
      toast.error("Failed to save key");
    } finally {
      setValidating(false);
    }
  };

  const handleRemoveKey = async () => {
    setRemoving(true);
    try {
      const res = await fetch("/api/settings/ai-config", { method: "DELETE" });
      if (res.ok) {
        toast.success("API key removed");
        setValidated(false);
        void loadConfig();
      } else {
        toast.error("Failed to remove key");
      }
    } catch {
      toast.error("Failed to remove key");
    } finally {
      setRemoving(false);
    }
  };

  const handleToggleUseOwnKey = async (value: boolean) => {
    try {
      await fetch("/api/settings/ai-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useOwnKey: value }),
      });
      setConfig((prev) => (prev ? { ...prev, useOwnKey: value } : prev));
    } catch {
      toast.error("Failed to update preference");
    }
  };

  const handleModelChange = async (
    field: "preferredScoringModel" | "preferredAgentModel",
    value: string
  ) => {
    try {
      await fetch("/api/settings/ai-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      setConfig((prev) => (prev ? { ...prev, [field]: value } : prev));
    } catch {
      toast.error("Failed to update model preference");
    }
  };

  const animationProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, height: 0 },
        animate: { opacity: 1, height: "auto" },
        exit: { opacity: 0, height: 0 },
        transition: { duration: 0.2, ease: "easeOut" },
      };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Bring your own Anthropic API key for AI features (scoring, agent chat).
        Your key is encrypted at rest and only used for your queries.
      </p>

      {/* API Key Input */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          Anthropic API Key
        </Label>

        {config?.hasKey && config.maskedKey ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm font-mono text-muted-foreground">
              {config.maskedKey}
            </div>
            {config.keyValidatedAt && (
              <motion.div
                initial={prefersReducedMotion ? {} : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Validated</span>
              </motion.div>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRemoveKey}
              disabled={removing}
              className="text-muted-foreground hover:text-destructive"
            >
              {removing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span className="ml-1.5">Remove</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Toggle key visibility"
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <Button
              size="sm"
              onClick={handleValidateAndSave}
              disabled={!apiKey.trim() || validating}
            >
              {validating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="ml-1.5">
                {validating ? "Validating..." : "Validate & Save"}
              </span>
            </Button>
            <AnimatePresence mode="wait">
              {validated && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  <Check className="h-5 w-5 text-green-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Use Own Key Toggle */}
      <AnimatePresence>
        {config?.hasKey && (
          <motion.div {...animationProps} className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="use-own-key" className="font-medium">
                  Use my own key
                </Label>
                <p className="text-xs text-muted-foreground">
                  When enabled, all AI features use your personal API key
                  instead of the platform key.
                </p>
              </div>
              <Switch
                id="use-own-key"
                checked={config?.useOwnKey ?? false}
                onCheckedChange={handleToggleUseOwnKey}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Model Preferences */}
      <div className="space-y-4 pt-2">
        <h3 className="text-sm font-medium">Model Preferences</h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Scoring Model</Label>
            <Select
              value={config?.preferredScoringModel || SCORING_MODELS[0].value}
              onValueChange={(v) =>
                handleModelChange("preferredScoringModel", v)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCORING_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    <span>{model.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({model.description})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Used for scanner column scoring
            </p>
          </div>

          <div className="space-y-2">
            <Label>Agent Model</Label>
            <Select
              value={config?.preferredAgentModel || AGENT_MODELS[0].value}
              onValueChange={(v) =>
                handleModelChange("preferredAgentModel", v)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGENT_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    <span>{model.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({model.description})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Used for Sculptor agent chat
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
