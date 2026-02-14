"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";

interface ProfileHeaderProps {
  name: string;
  sectors: string[];
}

export function ProfileHeader({ name, sectors }: ProfileHeaderProps) {
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
      <div className="min-w-0">
        <h1 className="text-xl font-semibold truncate">{name}</h1>
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
