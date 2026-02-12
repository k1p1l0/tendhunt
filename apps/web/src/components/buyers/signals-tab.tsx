"use client";

import { useState, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SignalData {
  _id?: string;
  signalType: string;
  title: string;
  insight: string;
  sourceDate?: string | Date | null;
  organizationName?: string;
  source?: string;
  confidence?: number;
  quote?: string;
  entities?: {
    companies?: string[];
    amounts?: string[];
    dates?: string[];
    people?: string[];
  };
  boardDocumentId?: string;
}

interface SignalsTabProps {
  signals: SignalData[];
  hasBoardDocuments?: boolean;
}

const SIGNAL_TYPES = [
  "PROCUREMENT",
  "STAFFING",
  "STRATEGY",
  "FINANCIAL",
  "PROJECTS",
  "REGULATORY",
] as const;

const signalTypeColors: Record<string, string> = {
  PROCUREMENT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  STAFFING:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  STRATEGY:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  FINANCIAL:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  PROJECTS:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  REGULATORY: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const signalTypePillColors: Record<
  string,
  { active: string; inactive: string }
> = {
  PROCUREMENT: {
    active:
      "bg-blue-600 text-white dark:bg-blue-500 border-blue-600 dark:border-blue-500",
    inactive:
      "bg-transparent text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950",
  },
  STAFFING: {
    active:
      "bg-purple-600 text-white dark:bg-purple-500 border-purple-600 dark:border-purple-500",
    inactive:
      "bg-transparent text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950",
  },
  STRATEGY: {
    active:
      "bg-green-600 text-white dark:bg-green-500 border-green-600 dark:border-green-500",
    inactive:
      "bg-transparent text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-950",
  },
  FINANCIAL: {
    active:
      "bg-yellow-600 text-white dark:bg-yellow-500 border-yellow-600 dark:border-yellow-500",
    inactive:
      "bg-transparent text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-950",
  },
  PROJECTS: {
    active:
      "bg-orange-600 text-white dark:bg-orange-500 border-orange-600 dark:border-orange-500",
    inactive:
      "bg-transparent text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950",
  },
  REGULATORY: {
    active:
      "bg-red-600 text-white dark:bg-red-500 border-red-600 dark:border-red-500",
    inactive:
      "bg-transparent text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-950",
  },
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});

function formatDate(date?: string | Date | null) {
  if (!date) return null;
  return dateFormatter.format(new Date(date));
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.7) return "text-green-600 dark:text-green-400";
  if (confidence >= 0.4) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function collectEntities(
  entities?: SignalData["entities"]
): { label: string; color: string }[] {
  if (!entities) return [];
  const result: { label: string; color: string }[] = [];
  const maxTotal = 5;

  if (entities.companies) {
    for (const c of entities.companies) {
      if (result.length >= maxTotal) break;
      result.push({
        label: c,
        color:
          "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300",
      });
    }
  }
  if (entities.people) {
    for (const p of entities.people) {
      if (result.length >= maxTotal) break;
      result.push({
        label: p,
        color:
          "border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300",
      });
    }
  }
  if (entities.amounts) {
    for (const a of entities.amounts) {
      if (result.length >= maxTotal) break;
      result.push({
        label: a,
        color:
          "border-green-300 text-green-700 dark:border-green-700 dark:text-green-300",
      });
    }
  }

  return result;
}

export function SignalsTab({ signals, hasBoardDocuments }: SignalsTabProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const signal of signals) {
      counts[signal.signalType] = (counts[signal.signalType] || 0) + 1;
    }
    return counts;
  }, [signals]);

  const availableTypes = useMemo(
    () => SIGNAL_TYPES.filter((t) => (typeCounts[t] || 0) > 0),
    [typeCounts]
  );

  const filteredSignals = useMemo(
    () =>
      activeFilter
        ? signals.filter((s) => s.signalType === activeFilter)
        : signals,
    [signals, activeFilter]
  );

  if (signals.length === 0) {
    if (hasBoardDocuments === false) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <FileText className="h-10 w-10" />
          <p className="text-sm text-center max-w-sm">
            Board documents haven&apos;t been processed yet. Signals will appear
            once board meeting minutes are analyzed.
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <Bell className="h-10 w-10" />
        <p className="text-sm">No buying signals found for this buyer</p>
      </div>
    );
  }

  const renderCountText = () => {
    if (activeFilter) {
      return (
        <span>
          {filteredSignals.length} of {signals.length} signal
          {signals.length !== 1 ? "s" : ""}{" "}
          <span className="font-medium">({activeFilter})</span>
        </span>
      );
    }
    return (
      <span>
        {signals.length} signal{signals.length !== 1 ? "s" : ""} found
      </span>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">{renderCountText()}</p>
      </div>

      {availableTypes.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveFilter(null)}
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors duration-150 ease-in-out min-h-[32px] ${
              activeFilter === null
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            All ({signals.length})
          </button>
          {availableTypes.map((type) => {
            const isActive = activeFilter === type;
            const colors = signalTypePillColors[type];
            return (
              <button
                key={type}
                onClick={() =>
                  setActiveFilter(isActive ? null : type)
                }
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-colors duration-150 ease-in-out min-h-[32px] ${
                  isActive ? colors?.active : colors?.inactive
                }`}
              >
                {type} ({typeCounts[type]})
              </button>
            );
          })}
        </div>
      )}

      {filteredSignals.length === 0 && activeFilter && (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
          <Bell className="h-8 w-8" />
          <p className="text-sm">
            No {activeFilter} signals found
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveFilter(null)}
            className="min-h-[44px]"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear filter
          </Button>
        </div>
      )}

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredSignals.map((signal, index) => {
            const date = formatDate(signal.sourceDate);
            const colorClass =
              signalTypeColors[signal.signalType] ??
              "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
            const entityBadges = collectEntities(signal.entities);

            return (
              <motion.div
                key={signal._id ? String(signal._id) : `signal-${index}`}
                layout={!prefersReducedMotion}
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? {} : { opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <Card>
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
                          {signal.confidence != null && (
                            <span
                              className={`text-xs font-medium ${getConfidenceColor(signal.confidence)}`}
                            >
                              {Math.round(signal.confidence * 100)}%
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-sm">
                          {signal.title}
                        </h4>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {signal.insight}
                        </p>

                        {signal.quote && (
                          <blockquote className="border-l-2 border-muted-foreground/30 pl-3 mt-2 text-xs text-muted-foreground italic">
                            &ldquo;{signal.quote}&rdquo;
                          </blockquote>
                        )}

                        {entityBadges.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap mt-2">
                            {entityBadges.map((entity, i) => (
                              <Badge
                                key={`${entity.label}-${i}`}
                                variant="outline"
                                className={`text-xs py-0 px-1.5 ${entity.color}`}
                              >
                                {entity.label}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {signal.source && (
                      <p className="text-xs text-muted-foreground">
                        Source: {signal.source}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
