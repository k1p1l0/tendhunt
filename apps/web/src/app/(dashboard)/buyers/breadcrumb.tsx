"use client";

import { useEffect } from "react";
import { useBreadcrumb } from "@/components/layout/breadcrumb-context";

export function BuyersListBreadcrumb() {
  const { setBreadcrumb } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumb(
      <span className="text-sm font-medium">Buyers</span>
    );
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);

  return null;
}
