"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, RotateCcw } from "lucide-react";

interface PromptEditorProps {
  prompt: string;
  isDefault: boolean;
  onPromptChange: (prompt: string) => void;
  onApplyScore: () => void;
  onResetToDefault: () => void;
  isScoring: boolean;
  isResetting: boolean;
}

export function PromptEditor({
  prompt,
  isDefault,
  onPromptChange,
  onApplyScore,
  onResetToDefault,
  isScoring,
  isResetting,
}: PromptEditorProps) {
  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor="scoring-prompt"
          className="text-sm font-medium leading-none"
        >
          Scoring Prompt
        </label>
        <p className="text-sm text-muted-foreground mt-1">
          This prompt is used to score contracts against your company profile.
          Edit it to adjust how contracts are evaluated.
        </p>
      </div>

      <Textarea
        id="scoring-prompt"
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        className="min-h-[300px] font-mono text-xs leading-relaxed"
        placeholder="Your scoring prompt will appear here..."
      />

      <div className="flex items-center gap-3">
        {!isDefault && (
          <Button
            variant="outline"
            onClick={onResetToDefault}
            disabled={isResetting || isScoring}
          >
            <RotateCcw className="h-4 w-4" />
            {isResetting ? "Resetting..." : "Reset to Default"}
          </Button>
        )}
        <Button onClick={onApplyScore} disabled={isScoring}>
          <Sparkles className="h-4 w-4" />
          {isScoring ? "Scoring..." : "Apply & Score"}
        </Button>
      </div>
    </div>
  );
}
