"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  totalPages,
  currentPage,
}: {
  totalPages: number;
  currentPage: number;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  if (totalPages <= 1) return null;

  const createPageURL = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-between border-t border-border pt-4">
      <span className="text-xs text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>

      <div className="flex gap-2">
        {currentPage <= 1 ? (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft />
            Previous
          </Button>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link href={createPageURL(currentPage - 1)}>
              <ChevronLeft />
              Previous
            </Link>
          </Button>
        )}

        {currentPage >= totalPages ? (
          <Button variant="outline" size="sm" disabled>
            Next
            <ChevronRight />
          </Button>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link href={createPageURL(currentPage + 1)}>
              Next
              <ChevronRight />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
