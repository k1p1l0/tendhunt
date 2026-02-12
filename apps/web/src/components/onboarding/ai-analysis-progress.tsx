"use client";

import { useState, useEffect, useMemo } from "react";
import { FileText, Globe, Linkedin, Brain, Sparkles, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface AiAnalysisProgressProps {
  hasDocuments: boolean;
  hasWebsite: boolean;
  hasLinkedIn: boolean;
  isComplete: boolean;
}

interface AnalysisStep {
  label: string;
  icon: LucideIcon;
  duration: number;
}

export function AiAnalysisProgress({
  hasDocuments,
  hasWebsite,
  hasLinkedIn,
  isComplete,
}: AiAnalysisProgressProps) {
  const steps = useMemo<AnalysisStep[]>(() => {
    const result: AnalysisStep[] = [];

    if (hasDocuments) {
      result.push({
        label: "Extracting text from documents...",
        icon: FileText,
        duration: 2500,
      });
    }
    if (hasWebsite) {
      result.push({
        label: "Analyzing company website...",
        icon: Globe,
        duration: 2500,
      });
    }
    if (hasLinkedIn) {
      result.push({
        label: "Fetching LinkedIn company data...",
        icon: Linkedin,
        duration: 2500,
      });
    }
    result.push({
      label: "Building your company profile with AI...",
      icon: Brain,
      duration: 2500,
    });
    result.push({
      label: "Finalizing profile...",
      icon: Sparkles,
      duration: Infinity,
    });

    return result;
  }, [hasDocuments, hasWebsite, hasLinkedIn]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Auto-advance steps based on duration
  useEffect(() => {
    if (currentStepIndex >= steps.length) return;

    const currentDuration = steps[currentStepIndex].duration;
    if (!isFinite(currentDuration)) return; // Last step - don't auto-advance

    const timer = setTimeout(() => {
      setCurrentStepIndex((prev) => prev + 1);
    }, currentDuration);

    return () => clearTimeout(timer);
  }, [currentStepIndex, steps]);

  // When isComplete becomes true, mark all steps as done
  useEffect(() => {
    if (isComplete) {
      // Defer to avoid synchronous setState in effect (react-hooks lint)
      const raf = requestAnimationFrame(() => setCurrentStepIndex(steps.length));
      return () => cancelAnimationFrame(raf);
    }
  }, [isComplete, steps.length]);

  return (
    <div className="flex min-h-[200px] flex-col justify-center py-4">
      <div className="space-y-1">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isActive = index === currentStepIndex;
          const StepIcon = step.icon;

          return (
            <div
              key={step.label}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-opacity duration-300 ${
                isCompleted
                  ? "opacity-100"
                  : isActive
                    ? "opacity-100"
                    : "opacity-50"
              }`}
            >
              {/* Icon */}
              <div className="flex size-5 shrink-0 items-center justify-center">
                {isCompleted ? (
                  <Check className="size-5 animate-in fade-in slide-in-from-left-2 duration-300 text-green-500" />
                ) : (
                  <StepIcon
                    className={`size-5 ${
                      isActive
                        ? "animate-pulse text-primary"
                        : "text-muted-foreground/50"
                    }`}
                  />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-sm ${
                  isCompleted
                    ? "text-foreground"
                    : isActive
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
