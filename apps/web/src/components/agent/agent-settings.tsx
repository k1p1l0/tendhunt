"use client";

import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAgentStore } from "@/stores/agent-store";

import type { ResponseDetail } from "@/stores/agent-store";

export function AgentSettings() {
  const settings = useAgentStore((s) => s.conversationSettings);
  const updateSettings = useAgentStore((s) => s.updateConversationSettings);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 rounded-full"
          aria-label="Conversation settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0"
        side="bottom"
        align="end"
        sideOffset={8}
      >
        <div className="px-4 py-3 border-b">
          <p className="text-sm font-medium">Conversation Settings</p>
        </div>

        <div className="p-4 space-y-4">
          {/* Conversation Flow section */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Conversation Flow
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="response-detail" className="text-sm">
                Response Detail
              </Label>
              <Select
                value={settings.responseDetail}
                onValueChange={(v: ResponseDetail) =>
                  updateSettings({ responseDetail: v })
                }
              >
                <SelectTrigger id="response-detail" className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concise">Concise</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="clarifying-questions" className="text-sm">
                Clarifying Questions
              </Label>
              <Switch
                id="clarifying-questions"
                checked={settings.askClarifyingQuestions}
                onCheckedChange={(checked: boolean) =>
                  updateSettings({ askClarifyingQuestions: checked })
                }
              />
            </div>
          </div>

          {/* In Scope section */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              In Scope
            </p>

            <div className="flex gap-2">
              <ScopeButton
                active={settings.contextScope === "table_only"}
                onClick={() =>
                  updateSettings({ contextScope: "table_only" })
                }
                label="Table only"
              />
              <ScopeButton
                active={settings.contextScope === "table_and_business"}
                onClick={() =>
                  updateSettings({ contextScope: "table_and_business" })
                }
                label="Table + Business"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ScopeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}
