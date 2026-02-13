"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  ChevronDown,
  FlaskConical,
  Globe,
  Search,
  Linkedin,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface IntegrationData {
  id: string;
  name: string;
  description: string;
  requiresApiKey: boolean;
  category: string;
  isEnabled: boolean;
  hasApiKey: boolean;
  apiKeyMask: string | null;
  lastTestedAt: string | null;
  config: Record<string, unknown>;
}

interface IntegrationCardMeta {
  id: string;
  icon: React.ReactNode;
  accentColor: string;
  keyPlaceholder?: string;
  keyLabel?: string;
  features: string[];
}

const CARD_META: Record<string, IntegrationCardMeta> = {
  apify: {
    id: "apify",
    icon: <Search className="h-5 w-5 text-orange-500" />,
    accentColor: "#FF9800",
    keyPlaceholder: "apify_api_...",
    keyLabel: "Apify API Token",
    features: ["LinkedIn company & people search", "Google search & market research"],
  },
  website_scraper: {
    id: "website_scraper",
    icon: <Globe className="h-5 w-5 text-blue-500" />,
    accentColor: "#2196F3",
    features: ["Extract data from any webpage", "Built-in, no API key needed"],
  },
  companies_house: {
    id: "companies_house",
    icon: <Building2 className="h-5 w-5 text-indigo-500" />,
    accentColor: "#3F51B5",
    keyPlaceholder: "Your Companies House API key",
    keyLabel: "Companies House API Key",
    features: ["UK company filings & accounts", "Director & secretary info"],
  },
};

function IntegrationCard({
  data,
  onToggle,
  onSaveKey,
  onTest,
}: {
  data: IntegrationData;
  onToggle: (id: string, enabled: boolean) => void;
  onSaveKey: (id: string, key: string) => void;
  onTest: (id: string, key?: string) => void;
}) {
  const meta = CARD_META[data.id];
  const [expanded, setExpanded] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  if (!meta) return null;

  const handleToggle = (checked: boolean) => {
    onToggle(data.id, checked);
  };

  const handleSave = async () => {
    if (!apiKey) return;
    setSaving(true);
    try {
      onSaveKey(data.id, apiKey);
      setApiKey("");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integrationId: data.id,
          apiKey: apiKey || undefined,
        }),
      });
      const result = await res.json();
      setTestResult(result.valid);
      if (result.valid) {
        toast.success("Connection test passed");
      } else {
        toast.error("Connection test failed");
      }
    } catch {
      setTestResult(false);
      toast.error("Test failed");
    } finally {
      setTesting(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group rounded-xl border bg-card transition-shadow hover:shadow-md"
    >
      {/* Header row */}
      <div className="flex items-center gap-4 p-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${meta.accentColor}12` }}
        >
          {meta.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{data.name}</h3>
            {data.hasApiKey && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Key set
              </Badge>
            )}
            {data.lastTestedAt && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-600 border-green-200 dark:text-green-400 dark:border-green-800">
                Verified
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{data.description}</p>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            checked={data.isEnabled}
            onCheckedChange={handleToggle}
            aria-label={`Enable ${data.name}`}
          />

          {(data.requiresApiKey || meta.features.length > 0) && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              <motion.div
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4" />
              </motion.div>
            </button>
          )}
        </div>
      </div>

      {/* Expandable config */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="border-t px-4 pb-4 pt-3 space-y-4">
              {/* Features */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Capabilities
                </p>
                <ul className="space-y-1">
                  {meta.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <div className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* API Key input */}
              {data.requiresApiKey && (
                <div className="space-y-2">
                  <Label className="text-xs">{meta.keyLabel}</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={
                          data.hasApiKey
                            ? `${data.apiKeyMask} (saved)`
                            : meta.keyPlaceholder
                        }
                        className="pr-10 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Toggle key visibility"
                      >
                        {showKey ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleTest}
                      disabled={testing || (!apiKey && !data.hasApiKey)}
                      className="gap-1.5"
                    >
                      {testing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FlaskConical className="h-3.5 w-3.5" />
                      )}
                      Test
                    </Button>

                    <AnimatePresence mode="wait">
                      {testResult === true && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 25,
                          }}
                        >
                          <Check className="h-5 w-5 text-green-500" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSave}
                      disabled={!apiKey || saving}
                    >
                      Save
                    </Button>
                  </div>

                  {data.id === "apify" && (
                    <p className="text-[11px] text-muted-foreground">
                      Used for LinkedIn company search and Google search.{" "}
                      <a
                        href="https://console.apify.com/account/integrations"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2 hover:text-foreground transition-colors"
                      >
                        Get your Apify token
                      </a>
                    </p>
                  )}

                  {data.id === "companies_house" && (
                    <p className="text-[11px] text-muted-foreground">
                      Free API key from Companies House.{" "}
                      <a
                        href="https://developer.company-information.service.gov.uk/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2 hover:text-foreground transition-colors"
                      >
                        Register for an API key
                      </a>
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function IntegrationsSection() {
  const [integrations, setIntegrations] = useState<IntegrationData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadIntegrations = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/integrations");
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations);
      }
    } catch {
      toast.error("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIntegrations();
  }, [loadIntegrations]);

  const handleToggle = async (integrationId: string, isEnabled: boolean) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === integrationId ? { ...i, isEnabled } : i
      )
    );

    try {
      const res = await fetch("/api/settings/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationId, isEnabled }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(
        `${integrationId === "website_scraper" ? "Website Scraper" : integrationId} ${isEnabled ? "enabled" : "disabled"}`
      );
    } catch {
      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === integrationId ? { ...i, isEnabled: !isEnabled } : i
        )
      );
      toast.error("Failed to update");
    }
  };

  const handleSaveKey = async (integrationId: string, apiKey: string) => {
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationId, apiKey }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("API key saved");
      void loadIntegrations();
    } catch {
      toast.error("Failed to save API key");
    }
  };

  const handleTest = async (integrationId: string, apiKey?: string) => {
    // test is handled inside the card component via direct fetch
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">
        Extend Sculptor's capabilities with external data sources and tools.
        Toggle integrations on to make them available during AI conversations.
      </p>

      <div className="space-y-3">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            data={integration}
            onToggle={handleToggle}
            onSaveKey={handleSaveKey}
            onTest={handleTest}
          />
        ))}
      </div>
    </>
  );
}
