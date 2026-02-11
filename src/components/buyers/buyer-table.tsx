"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Building2, Unlock, Lock } from "lucide-react";

interface BuyerRow {
  _id: string;
  name: string;
  sector?: string;
  region?: string;
  contractCount: number;
  contactCount: number;
  isUnlocked: boolean;
}

interface BuyerTableProps {
  buyers: BuyerRow[];
  total: number;
}

type SortColumn = "name" | "sector" | "region" | "contracts";

const columns: { key: SortColumn; label: string }[] = [
  { key: "name", label: "Organization" },
  { key: "sector", label: "Sector" },
  { key: "region", label: "Region" },
  { key: "contracts", label: "Contracts" },
];

export function BuyerTable({ buyers, total }: BuyerTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentSort = searchParams.get("sort") ?? "name";
  const currentOrder = searchParams.get("order") ?? "asc";

  function handleSort(column: SortColumn) {
    const params = new URLSearchParams(searchParams.toString());
    if (currentSort === column) {
      params.set("order", currentOrder === "asc" ? "desc" : "asc");
    } else {
      params.set("sort", column);
      params.set("order", "asc");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function SortIcon({ column }: { column: SortColumn }) {
    if (currentSort !== column) return null;
    return currentOrder === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 inline ml-1" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 inline ml-1" />
    );
  }

  if (buyers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 gap-3">
        <Building2 className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No buyer organizations found
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => handleSort(col.key)}
              >
                {col.label}
                <SortIcon column={col.key} />
              </TableHead>
            ))}
            <TableHead>Contacts</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {buyers.map((buyer) => (
            <TableRow key={buyer._id}>
              <TableCell>
                <Link
                  href={`/buyers/${buyer._id}`}
                  className="text-primary hover:underline font-medium"
                >
                  {buyer.name}
                </Link>
              </TableCell>
              <TableCell>
                {buyer.sector ? (
                  <Badge variant="outline">{buyer.sector}</Badge>
                ) : (
                  <span className="text-muted-foreground">--</span>
                )}
              </TableCell>
              <TableCell>
                {buyer.region || (
                  <span className="text-muted-foreground">--</span>
                )}
              </TableCell>
              <TableCell>{buyer.contractCount}</TableCell>
              <TableCell>{buyer.contactCount}</TableCell>
              <TableCell>
                {buyer.isUnlocked ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <Unlock className="h-3 w-3" />
                    Unlocked
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Lock className="h-3 w-3" />
                    Locked
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {total > 0 && (
        <div className="px-4 py-3 border-t text-xs text-muted-foreground">
          Showing {buyers.length} of {total} buyer organizations
        </div>
      )}
    </div>
  );
}
