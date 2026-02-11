"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DocumentDropzone } from "./document-dropzone";

const STEPS = [
  { label: "Upload", number: 1 },
  { label: "Generate", number: 2 },
  { label: "Review", number: 3 },
] as const;

export function OnboardingWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [documentKeys, setDocumentKeys] = useState<string[]>([]);

  const handleFilesChange = useCallback((keys: string[]) => {
    setDocumentKeys(keys);
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.number} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex size-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  step === s.number
                    ? "bg-primary text-primary-foreground"
                    : step > s.number
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {s.number}
              </div>
              <span
                className={`text-xs ${
                  step === s.number
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mb-5 h-px w-16 ${
                  step > s.number ? "bg-primary/40" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card>
        {step === 1 && (
          <>
            <CardHeader>
              <CardTitle>Upload Company Documents</CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload your company documents (past bids, capability statements,
                certifications) so our AI can build your profile. This helps us
                match you with relevant contracts.
              </p>
            </CardHeader>
            <CardContent>
              <DocumentDropzone onFilesChange={handleFilesChange} />

              <div className="mt-6 flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setStep(2)}
                >
                  Skip for now
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  disabled={documentKeys.length === 0}
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {step === 2 && (
          <>
            <CardHeader>
              <CardTitle>Generating Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
                <p>Generating profile... (Coming in Plan 02)</p>
              </div>
              <div className="mt-6 flex justify-end">
                <Button onClick={() => setStep(3)}>Continue</Button>
              </div>
            </CardContent>
          </>
        )}

        {step === 3 && (
          <>
            <CardHeader>
              <CardTitle>Review Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
                <p>Review profile (Coming in Plan 02)</p>
              </div>
              <div className="mt-6 flex justify-end">
                <Button>Complete Onboarding</Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
