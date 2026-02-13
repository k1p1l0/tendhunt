"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  Hash,
  Loader2,
  MessageSquare,
  Unplug,
  Bell,
  Clock,
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

export function SlackIntegrationSection() {
  const [state, setState] = useState<SlackState>({ connected: false });
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [alertsExpanded, setAlertsExpanded] = useState(false);

  // Alert config state
  const [thresholdEnabled, setThresholdEnabled] = useState(false);
  const [thresholdValue, setThresholdValue] = useState("7");
  const [digestEnabled, setDigestEnabled] = useState(false);
  const [digestTime, setDigestTime] = useState("09:00");

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
    // Check for OAuth callback result
    const params = new URLSearchParams(window.location.search);
    const slackResult = params.get("slack");
    if (slackResult === "success") {
      toast.success("Slack connected successfully");
      void checkConnection();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (slackResult === "error") {
      toast.error(`Slack connection failed: ${params.get("message") || "unknown error"}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
    void checkConnection();
  }, [checkConnection]);

  const handleInstall = () => {
    window.location.href = "/api/slack/install";
  };

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
            <p className="mb-4 text-sm text-muted-foreground">
              Connect Slack to receive procurement alerts and query TendHunt
              data from any channel.
            </p>
            <Button onClick={handleInstall} className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Add to Slack
            </Button>
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
                        <Switch
                          checked={thresholdEnabled}
                          onCheckedChange={setThresholdEnabled}
                        />
                      </div>
                      {thresholdEnabled && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 pl-4"
                        >
                          <Label className="text-xs">Min Score:</Label>
                          <Input
                            type="number"
                            min={0}
                            max={10}
                            value={thresholdValue}
                            onChange={(e) => setThresholdValue(e.target.value)}
                            className="w-20"
                          />
                        </motion.div>
                      )}

                      {/* Daily Digest */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Daily Digest</p>
                          <p className="text-xs text-muted-foreground">
                            Morning summary of new contracts & signals
                          </p>
                        </div>
                        <Switch
                          checked={digestEnabled}
                          onCheckedChange={setDigestEnabled}
                        />
                      </div>
                      {digestEnabled && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 pl-4"
                        >
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Input
                            type="time"
                            value={digestTime}
                            onChange={(e) => setDigestTime(e.target.value)}
                            className="w-32"
                          />
                          <span className="text-xs text-muted-foreground">
                            Mon–Fri
                          </span>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
