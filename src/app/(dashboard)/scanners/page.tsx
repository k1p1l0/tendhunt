"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScannerList } from "@/components/scanners/scanner-list";
import { CreateScannerModal } from "@/components/scanners/create-scanner-modal";
import type { ScannerType } from "@/models/scanner";

interface ScannerRow {
  _id: string;
  name: string;
  type: ScannerType;
  description?: string;
  lastScoredAt?: string;
  createdAt: string;
  updatedAt: string;
  aiColumns: Array<{ columnId: string; name: string }>;
  totalEntries?: number;
  creditsUsed?: number;
}

export default function ScannersPage() {
  const router = useRouter();
  const [scanners, setScanners] = useState<ScannerRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadScanners = useCallback(async () => {
    try {
      const res = await fetch("/api/scanners");
      if (!res.ok) throw new Error("Failed to load scanners");
      const data = await res.json();
      setScanners(data.scanners || []);
    } catch (err) {
      console.error("Failed to load scanners:", err);
      setError("Failed to load scanners. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScanners();
  }, [loadScanners]);

  function handleScannerClick(id: string) {
    router.push(`/scanners/${id}`);
  }

  async function handleDeleteScanner(id: string) {
    try {
      const res = await fetch(`/api/scanners?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete scanner");
      }
      setScanners((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete scanner"
      );
    }
  }

  function handleCreated(scanner: { _id: string }) {
    loadScanners();
    router.push(`/scanners/${scanner._id}`);
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scanners</h1>
          <p className="text-muted-foreground">
            AI-powered analysis across contracts, signals, and organizations
          </p>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scanners</h1>
          <p className="text-muted-foreground">
            AI-powered analysis across contracts, signals, and organizations
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Scanner
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <ScannerList
        scanners={scanners}
        onScannerClick={handleScannerClick}
        onDeleteScanner={handleDeleteScanner}
      />

      <CreateScannerModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}
