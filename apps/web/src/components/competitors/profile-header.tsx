"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Radar } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { WatchButton } from "./watch-button";

interface ProfileHeaderProps {
  name: string;
  sectors: string[];
}

export function ProfileHeader({ name, sectors }: ProfileHeaderProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreateScanner() {
    setIsCreating(true);
    try {
      const res = await fetch("/api/scanners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "rfps",
          name: `Contracts: ${name}`,
          description: `Track all contracts awarded to ${name}`,
          searchQuery: name,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create scanner");
      }

      const data = await res.json();
      router.push(`/scanners/${data.scanner._id}`);
    } catch (err) {
      console.error("Failed to create scanner:", err);
      setIsCreating(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex items-start gap-4"
    >
      <Link
        href="/competitors"
        className="mt-1 shrink-0 h-8 w-8 rounded-md border flex items-center justify-center hover:bg-accent transition-colors"
        aria-label="Back to search"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-semibold truncate">{name}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <WatchButton supplierName={name} />
            <Button
              size="sm"
              onClick={handleCreateScanner}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Radar className="h-3.5 w-3.5" />
                  Track Contracts
                </>
              )}
            </Button>
          </div>
        </div>
        {sectors.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {sectors.slice(0, 4).map((sector) => (
              <span
                key={sector}
                className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
              >
                {sector}
              </span>
            ))}
            {sectors.length > 4 && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                +{sectors.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
