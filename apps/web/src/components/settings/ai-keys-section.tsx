"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Check, Eye, EyeOff, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AiKeysState {
  hasAnthropic: boolean;
  hasOpenai: boolean;
  preferredProvider: string;
}

export function AiKeysSection() {
  const [state, setState] = useState<AiKeysState | null>(null);
  const [anthropicKey, setAnthropicKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const loadState = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/ai-keys");
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch {
      // Silently fail — section just won't show current state
    }
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const handleSave = async (
    provider: "anthropic" | "openai",
    key: string
  ) => {
    setSaving(true);
    try {
      const body =
        provider === "anthropic"
          ? { anthropicApiKey: key || null }
          : { openaiApiKey: key || null };

      const res = await fetch("/api/settings/ai-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success(`${provider === "anthropic" ? "Anthropic" : "OpenAI"} key saved`);
      void loadState();

      if (provider === "anthropic") setAnthropicKey("");
      else setOpenaiKey("");
    } catch {
      toast.error("Failed to save key");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (provider: "anthropic" | "openai", key: string) => {
    if (!key) return;
    setTesting(provider);
    setTestResult((prev) => ({ ...prev, [provider]: false }));

    try {
      const isValid = await testProviderKey(provider, key);
      setTestResult((prev) => ({ ...prev, [provider]: isValid }));
      if (isValid) {
        toast.success("Connection successful");
      } else {
        toast.error("Invalid API key");
      }
    } catch {
      toast.error("Connection test failed");
    } finally {
      setTesting(null);
    }
  };

  const handleClear = async (provider: "anthropic" | "openai") => {
    await handleSave(provider, "");
    setTestResult((prev) => {
      const next = { ...prev };
      delete next[provider];
      return next;
    });
  };

  const handleProviderChange = async (value: string) => {
    try {
      await fetch("/api/settings/ai-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredProvider: value }),
      });
      setState((prev) => (prev ? { ...prev, preferredProvider: value } : prev));
    } catch {
      toast.error("Failed to update provider preference");
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Required for AI assistant features. Your key is encrypted and only used
        for your queries.
      </p>

      {/* Anthropic Key */}
      <div className="space-y-2">
        <Label>Anthropic API Key</Label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type={showAnthropic ? "text" : "password"}
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder={state?.hasAnthropic ? "sk-ant-...xxxx (set)" : "sk-ant-api03-..."}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowAnthropic(!showAnthropic)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle visibility"
            >
              {showAnthropic ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleTest("anthropic", anthropicKey)}
            disabled={!anthropicKey || testing === "anthropic"}
          >
            {testing === "anthropic" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Test"
            )}
          </Button>
          <AnimatePresence mode="wait">
            {testResult.anthropic && (
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
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSave("anthropic", anthropicKey)}
            disabled={!anthropicKey || saving}
          >
            Save
          </Button>
          {state?.hasAnthropic && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleClear("anthropic")}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Clear Anthropic key"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* OpenAI Key */}
      <div className="space-y-2">
        <Label>OpenAI API Key</Label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type={showOpenai ? "text" : "password"}
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder={state?.hasOpenai ? "sk-...xxxx (set)" : "sk-proj-..."}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowOpenai(!showOpenai)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle visibility"
            >
              {showOpenai ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleTest("openai", openaiKey)}
            disabled={!openaiKey || testing === "openai"}
          >
            {testing === "openai" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Test"
            )}
          </Button>
          <AnimatePresence mode="wait">
            {testResult.openai && (
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
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSave("openai", openaiKey)}
            disabled={!openaiKey || saving}
          >
            Save
          </Button>
          {state?.hasOpenai && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleClear("openai")}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Clear OpenAI key"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Provider Preference */}
      <div className="space-y-2">
        <Label>Preferred Provider</Label>
        <Select
          value={state?.preferredProvider || "anthropic"}
          onValueChange={handleProviderChange}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="anthropic">Anthropic (Recommended)</SelectItem>
            <SelectItem value="openai">OpenAI</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

async function testProviderKey(
  provider: "anthropic" | "openai",
  key: string
): Promise<boolean> {
  try {
    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      return res.ok || res.status === 400;
    } else {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      return res.ok;
    }
  } catch {
    return false;
  }
}
