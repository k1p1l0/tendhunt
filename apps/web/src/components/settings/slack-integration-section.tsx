"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  Hash,
  Loader2,
  MessageSquare,
  Unplug,
  Bell,
  Clock,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SlackWizard } from "@/components/settings/slack-wizard";

interface SlackState {
  connected: boolean;
  teamName?: string;
  channelName?: string;
  channelId?: string;
}

interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
}

interface AlertConfig {
  alertType: string;
  isActive: boolean;
  threshold?: number;
  digestTime?: string;
  digestDays?: number[];
}

function SaveIndicator({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="text-green-500"
        >
          <Check className="h-4 w-4" />
        </motion.span>
      )}
    </AnimatePresence>
  );
}

export function SlackIntegrationSection() {
  const [state, setState] = useState<SlackState>({ connected: false });
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardInitialStep, setWizardInitialStep] = useState(0);

  const [thresholdEnabled, setThresholdEnabled] = useState(false);
  const [thresholdValue, setThresholdValue] = useState("7");
  const [digestEnabled, setDigestEnabled] = useState(false);
  const [digestTime, setDigestTime] = useState("09:00");

  const [savedField, setSavedField] = useState<string | null>(null);
  const [alertsLoaded, setAlertsLoaded] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const showSaved = useCallback((field: string) => {
    setSavedField(field);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => setSavedField(null), 1500);
  }, []);

  const saveAlerts = useCallback(
    async (alerts: AlertConfig[]) => {
      try {
        const res = await fetch("/api/settings/slack-alerts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alerts }),
        });
        if (!res.ok) throw new Error("Save failed");
      } catch {
        toast.error("Failed to save alert settings");
      }
    },
    []
  );

  const buildAlerts = useCallback(
    (overrides?: Partial<Record<string, unknown>>): AlertConfig[] => {
      const te =
        overrides?.thresholdEnabled !== undefined
          ? (overrides.thresholdEnabled as boolean)
          : thresholdEnabled;
      const tv =
        overrides?.thresholdValue !== undefined
          ? (overrides.thresholdValue as string)
          : thresholdValue;
      const de =
        overrides?.digestEnabled !== undefined
          ? (overrides.digestEnabled as boolean)
          : digestEnabled;
      const dt =
        overrides?.digestTime !== undefined
          ? (overrides.digestTime as string)
          : digestTime;

      return [
        {
          alertType: "scanner_threshold",
          isActive: te,
          threshold: Number(tv),
        },
        {
          alertType: "daily_digest",
          isActive: de,
          digestTime: dt,
          digestDays: [1, 2, 3, 4, 5],
        },
      ];
    },
    [thresholdEnabled, thresholdValue, digestEnabled, digestTime]
  );

  const loadAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/slack-alerts");
      if (!res.ok) return;
      const data = await res.json();
      const configs: AlertConfig[] = data.configs || [];

      for (const cfg of configs) {
        if (cfg.alertType === "scanner_threshold") {
          setThresholdEnabled(cfg.isActive);
          if (cfg.threshold !== undefined) {
            setThresholdValue(String(cfg.threshold));
          }
        } else if (cfg.alertType === "daily_digest") {
          setDigestEnabled(cfg.isActive);
          if (cfg.digestTime) {
            setDigestTime(cfg.digestTime);
          }
        }
      }
      setAlertsLoaded(true);
    } catch {
      // Silently fail — alerts will use defaults
    }
  }, []);

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch("/api/slack/channels");
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
        setState({ connected: true, teamName: "Connected" });
      }
    } catch {
      // Not connected
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slackResult = params.get("slack");
    if (slackResult === "success") {
      toast.success("Slack connected successfully");
      void checkConnection();
      window.history.replaceState({}, "", window.location.pathname);
      setWizardOpen(true);
      setWizardInitialStep(2);
    } else if (slackResult === "error") {
      toast.error(
        `Slack connection failed: ${params.get("message") || "unknown error"}`
      );
      window.history.replaceState({}, "", window.location.pathname);
    }
    void checkConnection();
    void loadAlerts();
  }, [checkConnection, loadAlerts]);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/slack/install", { method: "DELETE" });
      if (res.ok) {
        setState({ connected: false });
        setChannels([]);
        toast.success("Slack disconnected");
      }
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleChannelSelect = async (channelId: string) => {
    const channel = channels.find((c) => c.id === channelId);
    if (channel) {
      setState((prev) => ({
        ...prev,
        channelId,
        channelName: channel.name,
      }));
    }
  };

  const loadChannels = async () => {
    setLoadingChannels(true);
    try {
      const res = await fetch("/api/slack/channels");
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
      }
    } catch {
      toast.error("Failed to load channels");
    } finally {
      setLoadingChannels(false);
    }
  };

  const handleThresholdToggle = async (checked: boolean) => {
    setThresholdEnabled(checked);
    if (!alertsLoaded) return;
    const alerts = buildAlerts({ thresholdEnabled: checked });
    await saveAlerts(alerts);
    showSaved("threshold");
    toast.success("Alert saved");
  };

  const handleThresholdChange = async (value: string) => {
    setThresholdValue(value);
    if (!alertsLoaded || !thresholdEnabled) return;
    const alerts = buildAlerts({ thresholdValue: value });
    await saveAlerts(alerts);
    showSaved("threshold");
  };

  const handleDigestToggle = async (checked: boolean) => {
    setDigestEnabled(checked);
    if (!alertsLoaded) return;
    const alerts = buildAlerts({ digestEnabled: checked });
    await saveAlerts(alerts);
    showSaved("digest");
    toast.success("Alert saved");
  };

  const handleDigestTimeChange = async (value: string) => {
    setDigestTime(value);
    if (!alertsLoaded || !digestEnabled) return;
    const alerts = buildAlerts({ digestTime: value });
    await saveAlerts(alerts);
    showSaved("digest");
  };

  const handleOpenWizard = useCallback((startStep?: number) => {
    setWizardInitialStep(startStep ?? 0);
    setWizardOpen(true);
  }, []);

  const handleWizardComplete = useCallback(() => {
    setWizardOpen(false);
    void checkConnection();
    void loadAlerts();
  }, [checkConnection, loadAlerts]);

  const handleWizardCancel = useCallback(() => {
    setWizardOpen(false);
  }, []);

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {!state.connected ? (
          <motion.div
            key="disconnected"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="rounded-lg border border-dashed p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mb-1 text-sm font-medium">
                Connect your Slack workspace
              </p>
              <p className="mb-4 text-xs text-muted-foreground">
                Receive procurement alerts and query TendHunt data from any
                channel.
              </p>
              <Button
                onClick={() => handleOpenWizard(0)}
                className="gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Set up Slack Integration
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="connected"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-4"
          >
            {/* Connection Status */}
            <div className="flex items-center justify-between rounded-lg border border-green-500/20 bg-green-500/5 p-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium">
                  Connected to {state.teamName}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-muted-foreground"
                  onClick={() => handleOpenWizard(2)}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  <span className="text-xs">Reconfigure</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                >
                  {disconnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Unplug className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Channel Selector */}
            <div className="space-y-2">
              <Label>Default Channel</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={state.channelId || ""}
                  onValueChange={handleChannelSelect}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>
                        <div className="flex items-center gap-1.5">
                          <Hash className="h-3 w-3 text-muted-foreground" />
                          {ch.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadChannels}
                  disabled={loadingChannels}
                >
                  {loadingChannels ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Refresh"
                  )}
                </Button>
              </div>
            </div>

            {/* Alert Configuration */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setAlertsExpanded(!alertsExpanded)}
                className="flex w-full items-center gap-2 text-sm font-medium hover:text-foreground transition-colors"
              >
                <Bell className="h-4 w-4" />
                Alert Settings
                <motion.span
                  animate={{ rotate: alertsExpanded ? 90 : 0 }}
                  transition={{ duration: 0.15 }}
                  className="ml-auto"
                >
                  ›
                </motion.span>
              </button>

              <AnimatePresence>
                {alertsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-4 rounded-lg border p-4">
                      {/* Scanner Threshold Alerts */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            Scanner Score Alerts
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Notify when AI scores exceed threshold
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <SaveIndicator
                            show={savedField === "threshold"}
                          />
                          <Switch
                            checked={thresholdEnabled}
                            onCheckedChange={handleThresholdToggle}
                          />
                        </div>
                      </div>
                      <AnimatePresence>
                        {thresholdEnabled && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="flex items-center gap-2 pl-4"
                          >
                            <Label className="text-xs">Min Score:</Label>
                            <Input
                              type="number"
                              min={0}
                              max={10}
                              value={thresholdValue}
                              onChange={(e) =>
                                handleThresholdChange(e.target.value)
                              }
                              className="w-20"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Daily Digest */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Daily Digest</p>
                          <p className="text-xs text-muted-foreground">
                            Morning summary of new contracts & signals
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <SaveIndicator show={savedField === "digest"} />
                          <Switch
                            checked={digestEnabled}
                            onCheckedChange={handleDigestToggle}
                          />
                        </div>
                      </div>
                      <AnimatePresence>
                        {digestEnabled && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="flex items-center gap-2 pl-4"
                          >
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <Input
                              type="time"
                              value={digestTime}
                              onChange={(e) =>
                                handleDigestTimeChange(e.target.value)
                              }
                              className="w-32"
                            />
                            <span className="text-xs text-muted-foreground">
                              Mon-Fri
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slack Wizard Dialog */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Slack Integration</DialogTitle>
            <DialogDescription>
              Set up Slack to receive procurement alerts.
            </DialogDescription>
          </DialogHeader>
          <SlackWizard
            onComplete={handleWizardComplete}
            onCancel={handleWizardCancel}
            initialStep={wizardInitialStep}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
