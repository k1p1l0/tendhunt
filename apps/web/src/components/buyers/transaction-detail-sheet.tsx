"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Building2,
  Tag,
  Layers,
  FileText,
  Hash,
  ExternalLink,
} from "lucide-react";

interface Transaction {
  _id: string;
  date: string | null;
  vendor: string;
  amount: number;
  category: string;
  subcategory?: string | null;
  department?: string | null;
  reference?: string | null;
  sourceFile?: string | null;
}

interface TransactionDetailSheetProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "Unknown";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatAmount(amount: number) {
  return `£${Math.abs(amount).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function TransactionDetailSheet({
  transaction,
  open,
  onOpenChange,
}: TransactionDetailSheetProps) {
  if (!transaction) return null;

  const isNegative = transaction.amount < 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">Transaction Detail</SheetTitle>
          <SheetDescription className="text-left">
            {formatDate(transaction.date)}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          {/* Amount hero */}
          <div className="rounded-lg bg-muted/50 p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
              Amount
            </p>
            <p
              className={`text-3xl font-bold tracking-tight ${
                isNegative
                  ? "text-destructive"
                  : "text-foreground"
              }`}
            >
              {isNegative ? "-" : ""}
              {formatAmount(transaction.amount)}
            </p>
          </div>

          <Separator />

          {/* Detail rows */}
          <div className="space-y-4">
            <DetailRow
              icon={<Building2 className="h-4 w-4" />}
              label="Vendor"
              value={transaction.vendor}
            />

            <DetailRow
              icon={<Calendar className="h-4 w-4" />}
              label="Date"
              value={formatDate(transaction.date)}
            />

            <DetailRow
              icon={<Tag className="h-4 w-4" />}
              label="Category"
            >
              <Badge variant="secondary">{transaction.category}</Badge>
            </DetailRow>

            {transaction.subcategory && (
              <DetailRow
                icon={<Layers className="h-4 w-4" />}
                label="Subcategory"
              >
                <Badge variant="outline">{transaction.subcategory}</Badge>
              </DetailRow>
            )}

            {transaction.department && (
              <DetailRow
                icon={<Building2 className="h-4 w-4" />}
                label="Department"
                value={transaction.department}
              />
            )}

            {transaction.reference && (
              <DetailRow
                icon={<Hash className="h-4 w-4" />}
                label="Reference"
                value={transaction.reference}
              />
            )}

            <DetailRow
              icon={<FileText className="h-4 w-4" />}
              label="Transaction ID"
              value={transaction._id}
              mono
            />
          </div>

          {transaction.sourceFile && (
            <>
              <Separator />
              <a
                href={transaction.sourceFile}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border p-3 text-sm font-medium text-blue-600 transition-colors hover:bg-muted/50 dark:text-blue-400"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                  View Source File
                </span>
              </a>
              <p className="text-xs text-muted-foreground">
                Opens the original transparency report on GOV.UK
              </p>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({
  icon,
  label,
  value,
  children,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  children?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {children ?? (
          <p
            className={`text-sm ${mono ? "font-mono text-xs text-muted-foreground break-all" : "font-medium"}`}
          >
            {value}
          </p>
        )}
      </div>
    </div>
  );
}
