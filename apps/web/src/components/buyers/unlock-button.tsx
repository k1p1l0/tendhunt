"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreditStore } from "@/stores/credit-store";

interface UnlockButtonProps {
  buyerId: string;
  isUnlocked: boolean;
  onUnlocked: () => void;
}

export function UnlockButton({
  buyerId,
  isUnlocked,
  onUnlocked,
}: UnlockButtonProps) {
  const { balance, setBalance, setIsAnimating } = useCreditStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already unlocked: no button shown (green badge is on BuyerHeader)
  if (isUnlocked) {
    return null;
  }

  // Zero balance: show "Get More Credits" linking to pricing
  if (balance === 0) {
    return (
      <Button variant="default" asChild>
        <Link href="/pricing">Get More Credits</Link>
      </Button>
    );
  }

  async function handleUnlock() {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/buyers/${buyerId}/reveal`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        // Use server balance as source of truth
        setBalance(data.balance);
        // Trigger animation on sidebar credit counter
        setIsAnimating(true);
        // Notify parent to flip isUnlocked -> true (triggers blur dissolve)
        onUnlocked();
      } else if (res.status === 402) {
        setError("Insufficient credits");
      } else {
        setError(data.error || "Failed to unlock contacts");
      }
    } catch {
      setError("Failed to unlock contacts");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleUnlock}
        disabled={isLoading}
        variant="default"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Lock className="h-4 w-4" />
        )}
        {isLoading ? "Unlocking..." : "Unlock Contacts (1 Credit)"}
      </Button>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
