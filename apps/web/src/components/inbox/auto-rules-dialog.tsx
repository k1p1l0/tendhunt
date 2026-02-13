"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface AutoRule {
  _id: string;
  scannerId: string;
  columnId: string;
  columnName?: string;
  scannerName?: string;
  threshold: number;
  stage: string;
  isActive: boolean;
}

interface AutoRulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scannerId: string;
  scannerName: string;
  columnId: string;
  columnName: string;
}

export function AutoRulesDialog({
  open,
  onOpenChange,
  scannerId,
  scannerName,
  columnId,
  columnName,
}: AutoRulesDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingRule, setExistingRule] = useState<AutoRule | null>(null);
  const [threshold, setThreshold] = useState(7);
  const [stage, setStage] = useState("NEW");
  const [isActive, setIsActive] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchRule = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/inbox/auto-rules?scannerId=${scannerId}`
      );
      if (!res.ok) return;
      const data = (await res.json()) as { rules: AutoRule[] };
      const match = data.rules.find((r) => r.columnId === columnId);
      if (match) {
        setExistingRule(match);
        setThreshold(match.threshold);
        setStage(match.stage);
        setIsActive(match.isActive);
      } else {
        setExistingRule(null);
        setThreshold(7);
        setStage("NEW");
        setIsActive(true);
      }
    } catch {
      toast.error("Failed to load auto-send rule");
    } finally {
      setLoading(false);
    }
  }, [scannerId, columnId]);

  useEffect(() => {
    if (open) {
      setConfirmDelete(false);
      fetchRule();
    }
  }, [open, fetchRule]);

  async function handleSave() {
    setSaving(true);
    try {
      if (existingRule) {
        const res = await fetch(
          `/api/inbox/auto-rules/${existingRule._id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ threshold, stage, isActive }),
          }
        );
        if (!res.ok) {
          toast.error("Failed to update rule");
          return;
        }
        toast.success("Auto-send rule updated");
      } else {
        const res = await fetch("/api/inbox/auto-rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scannerId,
            scannerName,
            columnId,
            columnName,
            threshold,
            stage,
          }),
        });
        if (!res.ok) {
          toast.error("Failed to create rule");
          return;
        }
        toast.success("Auto-send rule created");
      }
      onOpenChange(false);
    } catch {
      toast.error("Failed to save rule");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!existingRule) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/inbox/auto-rules/${existingRule._id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        toast.error("Failed to delete rule");
        return;
      }
      toast.success("Auto-send rule deleted");
      onOpenChange(false);
    } catch {
      toast.error("Failed to delete rule");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Auto-send to Inbox</DialogTitle>
          <DialogDescription>
            Automatically add entities to your inbox when &ldquo;{columnName}&rdquo; scores
            above a threshold.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="threshold">
                Score threshold (0&ndash;10)
              </Label>
              <Input
                id="threshold"
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={threshold}
                onChange={(e) =>
                  setThreshold(parseFloat(e.target.value) || 0)
                }
              />
              <p className="text-xs text-muted-foreground">
                Entities scoring at or above this value will be auto-added
                to your inbox.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stage">Target stage</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger id="stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="QUALIFIED">Qualified</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Which pipeline stage auto-created cards land in.
              </p>
            </div>

            {existingRule && (
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label
                  htmlFor="active-toggle"
                  className="text-sm font-normal"
                >
                  {isActive ? "Active" : "Paused"}
                </Label>
                <Switch
                  id="active-toggle"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {existingRule && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={saving}
              className="mr-auto"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              {confirmDelete ? "Confirm Delete" : "Delete Rule"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={loading || saving}
          >
            {saving && (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            )}
            {existingRule ? "Update Rule" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
