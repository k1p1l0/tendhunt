"use client";

import { useEffect } from "react";
import { useBreadcrumb } from "@/components/layout/breadcrumb-context";

export function ContractsListBreadcrumb() {
  const { setBreadcrumb } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumb(
      <span className="text-sm font-medium">Contracts</span>
    );
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  return null;
}
