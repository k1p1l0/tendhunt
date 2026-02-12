import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";

interface SignalData {
  _id?: string;
  signalType: string;
  title: string;
  insight: string;
  sourceDate?: string | Date | null;
  organizationName?: string;
  source?: string;
}

interface SignalsTabProps {
  signals: SignalData[];
}

const signalTypeColors: Record<string, string> = {
  PROCUREMENT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  STAFFING: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  STRATEGY: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  FINANCIAL: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  PROJECTS: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  REGULATORY: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});

function formatDate(date?: string | Date | null) {
  if (!date) return null;
  return dateFormatter.format(new Date(date));
}

export function SignalsTab({ signals }: SignalsTabProps) {
  if (signals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <Bell className="h-10 w-10" />
        <p className="text-sm">No buying signals found for this buyer</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {signals.length} signal{signals.length !== 1 ? "s" : ""} found
      </p>
      <div className="space-y-3">
        {signals.map((signal, index) => {
          const date = formatDate(signal.sourceDate);
          const colorClass =
            signalTypeColors[signal.signalType] ??
            "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";

          return (
            <Card key={signal._id ? String(signal._id) : index}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={colorClass}>
                        {signal.signalType}
                      </Badge>
                      {date && (
                        <span className="text-xs text-muted-foreground">
                          {date}
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-sm">{signal.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {signal.insight}
                    </p>
                  </div>
                </div>
                {signal.source && (
                  <p className="text-xs text-muted-foreground">
                    Source: {signal.source}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
