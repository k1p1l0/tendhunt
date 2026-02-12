import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Radar, Plus, ArrowRight } from "lucide-react";
import type { ScannerSummary } from "@/lib/dashboard";

const TYPE_CONFIG: Record<
  ScannerSummary["type"],
  { label: string; emoji: string; badgeClass: string }
> = {
  rfps: {
    label: "RFPs",
    emoji: "\ud83d\udcc4",
    badgeClass:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  meetings: {
    label: "Meetings",
    emoji: "\ud83d\udcc5",
    badgeClass:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  buyers: {
    label: "Buyers",
    emoji: "\ud83d\udc64",
    badgeClass:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
};

function formatRelativeTime(date: Date | null): string {
  if (!date) return "Never";
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 30) return `${diffDays} days ago`;
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface SavedScannersSectionProps {
  scanners: ScannerSummary[];
}

export function SavedScannersSection({ scanners }: SavedScannersSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radar className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-muted-foreground">
            Your Scanners
          </h2>
        </div>
        {scanners.length > 0 && (
          <Link
            href="/scanners"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View all
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {scanners.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Radar className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-sm font-semibold">No scanners yet</h3>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Create your first scanner to start analyzing opportunities
            </p>
            <Button asChild size="sm" className="mt-4">
              <Link href="/scanners">
                <Plus className="mr-2 h-4 w-4" />
                Create Scanner
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {scanners.slice(0, 5).map((scanner) => {
            const config = TYPE_CONFIG[scanner.type];
            return (
              <Link key={scanner._id} href={`/scanners/${scanner._id}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${config.badgeClass}`}
                      >
                        <span className="mr-1">{config.emoji}</span>
                        {config.label}
                      </Badge>
                      <span className="text-sm font-medium truncate flex-1">
                        {scanner.name}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatRelativeTime(scanner.updatedAt)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground line-clamp-1 flex-1">
                        {scanner.description || "No description"}
                      </p>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {scanner.totalEntries} entities
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
          {scanners.length > 5 && (
            <div className="text-center pt-1">
              <Link
                href="/scanners"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View all {scanners.length} scanners
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
