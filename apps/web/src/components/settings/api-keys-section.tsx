"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { Copy, Key, Plus, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ApiKeyDisplay {
  _id: string;
  keyPrefix: string;
  name: string;
  scopes: string[];
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
}

interface NewKeyResponse {
  _id: string;
  rawKey: string;
  keyPrefix: string;
  name: string;
  scopes: string[];
  createdAt: string;
}

export function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKeyDisplay[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKey, setNewKey] = useState<NewKeyResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/public/keys");
      if (!res.ok) throw new Error("Failed to load keys");
      const data = await res.json();
      setKeys(data.keys);
      setLoaded(true);
    } catch {
      toast.error("Failed to load API keys");
    }
  }, []);

  // Load keys on first render
  if (!loaded) {
    void loadKeys();
  }

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);

    try {
      const res = await fetch("/api/public/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create key");
      }

      const data = await res.json();
      setNewKey(data.key);
      setNewKeyName("");
      void loadKeys();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      const res = await fetch(`/api/public/keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke key");
      setKeys((prev) => prev.filter((k) => k._id !== id));
      toast.success("API key revoked");
    } catch {
      toast.error("Failed to revoke key");
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setNewKey(null);
      setNewKeyName("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Use API keys to access TendHunt data from external tools and
          integrations.
        </p>
        <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="mr-1.5 h-4 w-4" />
              Create Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {newKey ? "API Key Created" : "Create API Key"}
              </DialogTitle>
            </DialogHeader>

            {newKey ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Copy this key now. You won&apos;t be able to see it again.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm font-mono break-all">
                    {newKey.rawKey}
                  </code>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleCopy(newKey.rawKey)}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button
                  className="w-full"
                  onClick={() => handleDialogChange(false)}
                >
                  Done
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="key-name">Key Name</Label>
                  <Input
                    id="key-name"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., OpenClaw Integration"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleCreate();
                    }}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreate}
                  disabled={!newKeyName.trim() || creating}
                >
                  {creating ? "Creating..." : "Create Key"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {keys.map((key) => (
            <motion.div
              key={key._id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Key className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{key.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {key.keyPrefix}...
                    {key.lastUsedAt && (
                      <span className="ml-2">
                        Last used{" "}
                        {new Date(key.lastUsedAt).toLocaleDateString("en-GB")}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleRevoke(key._id)}
                aria-label={`Revoke ${key.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>

        {loaded && keys.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No API keys yet. Create one to get started.
          </p>
        )}
      </div>
    </div>
  );
}
