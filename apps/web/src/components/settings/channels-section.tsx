"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare,
  Loader2,
  Unplug,
  Settings2,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SlackWizard } from "@/components/settings/slack-wizard";

interface ChannelCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
  connected: boolean;
  comingSoon?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onConfigure?: () => void;
  connecting?: boolean;
  disconnecting?: boolean;
  teamName?: string;
}

function ChannelCard({
  name,
  description,
  icon,
  accentColor,
  connected,
  comingSoon,
  onConnect,
  onDisconnect,
  onConfigure,
  connecting,
  disconnecting,
  teamName,
}: ChannelCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group relative flex flex-col gap-4 rounded-xl border bg-card p-5 transition-shadow hover:shadow-md"
    >
      {/* Subtle top accent line */}
      <div
        className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl opacity-60 transition-opacity group-hover:opacity-100"
        style={{ backgroundColor: accentColor }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${accentColor}15` }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{name}</h3>
              {comingSoon && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0"
                >
                  Coming soon
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>

        {/* Status dot */}
        <AnimatePresence mode="wait">
          {connected ? (
            <motion.div
              key="connected"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="flex items-center gap-1.5"
            >
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                Connected
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="disconnected"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="flex items-center gap-1.5"
            >
              <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
              <span className="text-xs text-muted-foreground">
                Not connected
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Connected info */}
      <AnimatePresence>
        {connected && teamName && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="text-xs text-muted-foreground overflow-hidden"
          >
            Connected to <span className="font-medium">{teamName}</span>
          </motion.p>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto">
        {comingSoon ? (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => toast.success(`You'll be notified when ${name} is available`)}
          >
            <Bell className="h-3.5 w-3.5" />
            Notify me
          </Button>
        ) : connected ? (
          <>
            {onConfigure && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={onConfigure}
              >
                <Settings2 className="h-3.5 w-3.5" />
                Configure
              </Button>
            )}
            {onDisconnect && (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                onClick={onDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Unplug className="h-3.5 w-3.5" />
                )}
                Disconnect
              </Button>
            )}
          </>
        ) : (
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            onClick={onConnect}
            disabled={connecting}
          >
            {connecting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <MessageSquare className="h-3.5 w-3.5" />
            )}
            Connect
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function SlackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"
        fill="#E01E5A"
      />
      <path
        d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"
        fill="#36C5F0"
      />
      <path
        d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.164 0a2.528 2.528 0 0 1 2.521 2.522v6.312z"
        fill="#2EB67D"
      />
      <path
        d="M15.164 18.956a2.528 2.528 0 0 1 2.521 2.522A2.528 2.528 0 0 1 15.164 24a2.528 2.528 0 0 1-2.521-2.522v-2.522h2.521zm0-1.271a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.314A2.528 2.528 0 0 1 24 15.164a2.528 2.528 0 0 1-2.522 2.521h-6.314z"
        fill="#ECB22E"
      />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#25D366">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#0088CC">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

export function ChannelsSection() {
  const [slackConnected, setSlackConnected] = useState(false);
  const [slackTeamName, setSlackTeamName] = useState<string | undefined>();
  const [disconnecting, setDisconnecting] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardInitialStep, setWizardInitialStep] = useState(0);

  const checkSlackConnection = useCallback(async () => {
    try {
      const res = await fetch("/api/slack/channels");
      if (res.ok) {
        setSlackConnected(true);
        setSlackTeamName("Connected");
      } else {
        setSlackConnected(false);
        setSlackTeamName(undefined);
      }
    } catch {
      setSlackConnected(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slackResult = params.get("slack");
    if (slackResult === "success") {
      toast.success("Slack connected successfully");
      void checkSlackConnection();
      window.history.replaceState({}, "", window.location.pathname);
      setWizardOpen(true);
      setWizardInitialStep(2);
    } else if (slackResult === "error") {
      toast.error(
        `Slack connection failed: ${params.get("message") || "unknown error"}`
      );
      window.history.replaceState({}, "", window.location.pathname);
    }
    void checkSlackConnection();
  }, [checkSlackConnection]);

  const handleSlackDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/slack/install", { method: "DELETE" });
      if (res.ok) {
        setSlackConnected(false);
        setSlackTeamName(undefined);
        toast.success("Slack disconnected");
      }
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleWizardComplete = useCallback(() => {
    setWizardOpen(false);
    void checkSlackConnection();
  }, [checkSlackConnection]);

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">
        Connect messaging channels to receive procurement alerts and interact
        with Sculptor, your AI procurement assistant.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ChannelCard
          name="Slack"
          description="Receive alerts and query TendHunt from any channel"
          icon={<SlackIcon />}
          accentColor="#4A154B"
          connected={slackConnected}
          teamName={slackTeamName}
          onConnect={() => {
            setWizardInitialStep(0);
            setWizardOpen(true);
          }}
          onDisconnect={handleSlackDisconnect}
          onConfigure={() => {
            setWizardInitialStep(2);
            setWizardOpen(true);
          }}
          disconnecting={disconnecting}
        />

        <ChannelCard
          name="WhatsApp"
          description="Get procurement updates directly in WhatsApp"
          icon={<WhatsAppIcon />}
          accentColor="#25D366"
          connected={false}
          comingSoon
        />

        <ChannelCard
          name="Telegram"
          description="Fast alerts and AI queries via Telegram bot"
          icon={<TelegramIcon />}
          accentColor="#0088CC"
          connected={false}
          comingSoon
        />
      </div>

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
            onCancel={() => setWizardOpen(false)}
            initialStep={wizardInitialStep}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
