"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useBreadcrumb } from "@/components/layout/breadcrumb-context";

export function SchoolBreadcrumb({ name }: { name: string }) {
  const { setBreadcrumb } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumb(
      <nav className="flex items-center gap-1.5 text-sm">
        <Link
          href="/scanners"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Scanners
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Schools</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium truncate max-w-[250px]">{name}</span>
      </nav>
    );
    return () => setBreadcrumb(null);
  }, [name, setBreadcrumb]);

  return null;
}
