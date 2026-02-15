"use client";

import { useEffect } from "react";
import { useBreadcrumb } from "@/components/layout/breadcrumb-context";

export function CompetitorsListBreadcrumb() {
  const { setBreadcrumb } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumb(
      <span className="text-sm font-medium">Competitors</span>
    );
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  return null;
}
