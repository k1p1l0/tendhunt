import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import type { TopScore } from "@/lib/dashboard";

function getScoreColor(score: number) {
  if (score >= 8) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
}

interface FreshSignalsFeedProps {
  signals: TopScore[];
}

export function FreshSignalsFeed({ signals }: FreshSignalsFeedProps) {
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-muted-foreground">
            Fresh Signals
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 ml-6">
          Top AI matches from your scanners
        </p>
      </div>

      {signals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-sm font-semibold">No signals yet</h3>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Run your scanners to see top-scoring matches here
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {signals.map((signal, idx) => (
              <Link
                key={`${signal.scannerId}-${signal.entityId}-${signal.columnId}`}
                href={`/scanners/${signal.scannerId}`}
                className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${getScoreColor(signal.score)}`}
                >
                  {signal.score % 1 === 0
                    ? signal.score
                    : signal.score.toFixed(1)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {signal.entityName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {signal.scannerName} &middot; {signal.columnName}
                  </p>
                  {signal.reasoning && (
                    <p className="text-xs text-muted-foreground italic line-clamp-1 mt-0.5">
                      {signal.reasoning}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
