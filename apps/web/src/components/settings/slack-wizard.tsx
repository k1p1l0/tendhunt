"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare,
  Hash,
  Bell,
  Clock,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { ReactNode } from "react";

interface SlackWizardProps {
  onComplete: () => void;
  onCancel: () => void;
  initialStep?: number;
}

interface AlertConfig {
  alertType: string;
  isActive: boolean;
  threshold?: number;
  digestTime?: string;
  digestDays?: number[];
}

const STEP_LABELS = ["Connect", "Channel", "Alerts", "Done"];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
  }),
};

const slideTransition = {
  x: { type: "spring" as const, stiffness: 400, damping: 35 },
  opacity: { duration: 0.15 },
};

function StepIndicator({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <motion.div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
              i < currentStep
                ? "bg-primary text-primary-foreground"
                : i === currentStep
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
            }`}
            animate={{
              scale: i === currentStep ? 1 : 0.85,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            {i < currentStep ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </motion.div>
          {i < totalSteps - 1 && (
            <div className="h-px w-8 bg-border">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: "0%" }}
                animate={{ width: i < currentStep ? "100%" : "0%" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function StepConnect({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#4A154B]/10">
        <MessageSquare className="h-8 w-8 text-[#4A154B]" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold">Connect to Slack</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Link your Slack workspace to receive procurement alerts and query
          TendHunt data from any channel.
        </p>
      </div>
      <Button onClick={onConnect} size="lg" className="gap-2">
        <MessageSquare className="h-4 w-4" />
        Add to Slack
      </Button>
    </div>
  );
}

function StepChannel({
  teamName,
  channelName,
}: {
  teamName: string;
  channelName: string;
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10">
        <Hash className="h-8 w-8 text-green-500" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold">Channel Connected</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Your Slack workspace <span className="font-medium">{teamName}</span>{" "}
          is now connected.
        </p>
      </div>
      {channelName && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-2.5">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{channelName}</span>
          <Check className="ml-1 h-4 w-4 text-green-500" />
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        To change the channel, reconnect your Slack workspace.
      </p>
    </div>
  );
}

function StepAlerts({
  digestEnabled,
  digestTime,
  newContractAlerts,
  onDigestToggle,
  onDigestTimeChange,
  onNewContractToggle,
  saving,
}: {
  digestEnabled: boolean;
  digestTime: string;
  newContractAlerts: boolean;
  onDigestToggle: (checked: boolean) => void;
  onDigestTimeChange: (value: string) => void;
  onNewContractToggle: (checked: boolean) => void;
  saving: boolean;
}) {
  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Configure Alerts</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose which notifications you want to receive in Slack.
        </p>
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Daily Digest</p>
              <p className="text-xs text-muted-foreground">
                Morning summary of new contracts & signals
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            <Switch
              checked={digestEnabled}
              onCheckedChange={onDigestToggle}
            />
          </div>
        </div>

        <AnimatePresence>
          {digestEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 pl-7">
                <Label className="text-xs">Time:</Label>
                <Input
                  type="time"
                  value={digestTime}
                  onChange={(e) => onDigestTimeChange(e.target.value)}
                  className="w-32"
                />
                <span className="text-xs text-muted-foreground">Mon-Fri</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">New Contract Alerts</p>
                <p className="text-xs text-muted-foreground">
                  Notify when AI scores exceed threshold
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              <Switch
                checked={newContractAlerts}
                onCheckedChange={onNewContractToggle}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepSuccess({
  digestEnabled,
  newContractAlerts,
}: {
  digestEnabled: boolean;
  newContractAlerts: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20,
          delay: 0.1,
        }}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 15,
            delay: 0.3,
          }}
        >
          <Check className="h-8 w-8 text-green-500" />
        </motion.div>
      </motion.div>
      <div className="text-center">
        <h3 className="text-lg font-semibold">You&apos;re all set!</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Slack integration is configured and ready to go.
        </p>
      </div>

      <div className="w-full space-y-2 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${digestEnabled ? "bg-green-500" : "bg-muted-foreground/30"}`}
          />
          <span className="text-sm">
            Daily Digest {digestEnabled ? "enabled" : "disabled"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${newContractAlerts ? "bg-green-500" : "bg-muted-foreground/30"}`}
          />
          <span className="text-sm">
            New Contract Alerts{" "}
            {newContractAlerts ? "enabled" : "disabled"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function SlackWizard({
  onComplete,
  onCancel,
  initialStep = 0,
}: SlackWizardProps) {
  const [step, setStep] = useState(initialStep);
  const [direction, setDirection] = useState(1);
  const [teamName, setTeamName] = useState("");
  const [channelName] = useState("");
  const [digestEnabled, setDigestEnabled] = useState(false);
  const [digestTime, setDigestTime] = useState("09:00");
  const [newContractAlerts, setNewContractAlerts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertsLoaded, setAlertsLoaded] = useState(false);
  const initializedRef = useRef(false);

  const saveAlerts = useCallback(
    async (alerts: AlertConfig[]) => {
      setSaving(true);
      try {
        const res = await fetch("/api/settings/slack-alerts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alerts }),
        });
        if (!res.ok) throw new Error("Save failed");
      } catch {
        toast.error("Failed to save alert settings");
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const buildAlerts = useCallback(
    (overrides?: {
      digestEnabled?: boolean;
      digestTime?: string;
      newContractAlerts?: boolean;
    }): AlertConfig[] => {
      const de = overrides?.digestEnabled ?? digestEnabled;
      const dt = overrides?.digestTime ?? digestTime;
      const nc = overrides?.newContractAlerts ?? newContractAlerts;

      return [
        {
          alertType: "daily_digest",
          isActive: de,
          digestTime: dt,
          digestDays: [1, 2, 3, 4, 5],
        },
        {
          alertType: "scanner_threshold",
          isActive: nc,
          threshold: 7,
        },
      ];
    },
    [digestEnabled, digestTime, newContractAlerts]
  );

  const loadAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/slack-alerts");
      if (!res.ok) return;
      const data = await res.json();
      const configs: AlertConfig[] = data.configs || [];

      for (const cfg of configs) {
        if (cfg.alertType === "daily_digest") {
          setDigestEnabled(cfg.isActive);
          if (cfg.digestTime) setDigestTime(cfg.digestTime);
        } else if (cfg.alertType === "scanner_threshold") {
          setNewContractAlerts(cfg.isActive);
        }
      }
      setAlertsLoaded(true);
    } catch {
      setAlertsLoaded(true);
    }
  }, []);

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch("/api/slack/channels");
      if (res.ok) {
        return true;
      }
    } catch {
      // Not connected
    }
    return false;
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const slackResult = params.get("slack");

    if (slackResult === "success") {
      window.history.replaceState({}, "", window.location.pathname);
      void checkConnection().then((connected) => {
        if (connected) {
          setTeamName("Connected");
          setStep(2);
          setDirection(1);
        }
      });
      void loadAlerts();
    } else if (initialStep >= 2) {
      void loadAlerts();
    }
  }, [checkConnection, loadAlerts, initialStep]);

  const goNext = useCallback(() => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, 3));
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleConnect = useCallback(() => {
    window.location.href = "/api/slack/install";
  }, []);

  const handleDigestToggle = useCallback(
    async (checked: boolean) => {
      setDigestEnabled(checked);
      if (!alertsLoaded) return;
      const alerts = buildAlerts({ digestEnabled: checked });
      await saveAlerts(alerts);
    },
    [alertsLoaded, buildAlerts, saveAlerts]
  );

  const handleDigestTimeChange = useCallback(
    async (value: string) => {
      setDigestTime(value);
      if (!alertsLoaded || !digestEnabled) return;
      const alerts = buildAlerts({ digestTime: value });
      await saveAlerts(alerts);
    },
    [alertsLoaded, digestEnabled, buildAlerts, saveAlerts]
  );

  const handleNewContractToggle = useCallback(
    async (checked: boolean) => {
      setNewContractAlerts(checked);
      if (!alertsLoaded) return;
      const alerts = buildAlerts({ newContractAlerts: checked });
      await saveAlerts(alerts);
    },
    [alertsLoaded, buildAlerts, saveAlerts]
  );

  const renderStep = (): ReactNode => {
    switch (step) {
      case 0:
        return <StepConnect key="connect" onConnect={handleConnect} />;
      case 1:
        return (
          <StepChannel
            key="channel"
            teamName={teamName}
            channelName={channelName}
          />
        );
      case 2:
        return (
          <StepAlerts
            key="alerts"
            digestEnabled={digestEnabled}
            digestTime={digestTime}
            newContractAlerts={newContractAlerts}
            onDigestToggle={handleDigestToggle}
            onDigestTimeChange={handleDigestTimeChange}
            onNewContractToggle={handleNewContractToggle}
            saving={saving}
          />
        );
      case 3:
        return (
          <StepSuccess
            key="success"
            digestEnabled={digestEnabled}
            newContractAlerts={newContractAlerts}
          />
        );
      default:
        return null;
    }
  };

  const renderFooter = (): ReactNode => {
    if (step === 0) {
      return (
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="flex justify-end">
          <Button onClick={onComplete} className="gap-2">
            Done
            <Check className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex justify-between">
        <Button variant="ghost" onClick={step === 1 ? onCancel : goBack} className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          {step === 1 ? "Cancel" : "Back"}
        </Button>
        <Button onClick={goNext} className="gap-1">
          {step === 2 ? "Finish" : "Next"}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <StepIndicator currentStep={step} totalSteps={STEP_LABELS.length} />

      <div className="min-h-[280px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      <motion.div
        layout
        transition={{ duration: 0.15 }}
        className="border-t pt-4"
      >
        {renderFooter()}
      </motion.div>
    </div>
  );
}
