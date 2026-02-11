"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DocumentDropzone } from "./document-dropzone";
import { ProfileReview, type ProfileData } from "./profile-review";
import { completeOnboarding } from "@/app/onboarding/_actions";
import { Loader2, AlertTriangle, Check } from "lucide-react";

const STEPS = [
  { label: "Upload", number: 1 },
  { label: "Generate", number: 2 },
  { label: "Review", number: 3 },
] as const;

const EMPTY_PROFILE: ProfileData = {
  companyName: "",
  summary: "",
  sectors: [],
  capabilities: [],
  keywords: [],
  certifications: [],
  idealContractDescription: "",
  companySize: "",
  regions: [],
};

export function OnboardingWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [documentKeys, setDocumentKeys] = useState<string[]>([]);

  // AI generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isAIGenerated, setIsAIGenerated] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationWarning, setGenerationWarning] = useState<string | null>(
    null
  );

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleFilesChange = useCallback((keys: string[]) => {
    setDocumentKeys(keys);
  }, []);

  // Trigger AI generation when entering step 2 with documents
  useEffect(() => {
    if (step !== 2 || documentKeys.length === 0 || isGenerating) return;

    let cancelled = false;

    async function generateProfile() {
      setIsGenerating(true);
      setGenerationError(null);
      setGenerationWarning(null);

      try {
        const res = await fetch("/api/profile/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentKeys }),
        });

        if (cancelled) return;

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to generate profile");
        }

        const data = await res.json();

        if (data.warning) {
          setGenerationWarning(data.warning);
        }

        if (data.profile) {
          setProfileData({
            companyName: data.profile.companyName || "",
            summary: data.profile.summary || "",
            sectors: data.profile.sectors || [],
            capabilities: data.profile.capabilities || [],
            keywords: data.profile.keywords || [],
            certifications: data.profile.certifications || [],
            idealContractDescription:
              data.profile.idealContractDescription || "",
            companySize: data.profile.companySize || "",
            regions: data.profile.regions || [],
          });
          setIsAIGenerated(true);
          setStep(3);
        } else {
          // No profile generated (e.g., scanned docs)
          setGenerationWarning(
            data.warning ||
              "Could not extract text from your documents. You can fill in your profile manually."
          );
        }
      } catch (err) {
        if (cancelled) return;
        setGenerationError(
          err instanceof Error ? err.message : "Failed to generate profile"
        );
      } finally {
        if (!cancelled) {
          setIsGenerating(false);
        }
      }
    }

    generateProfile();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleSkipToReview = useCallback(() => {
    setProfileData(null);
    setIsAIGenerated(false);
    setStep(3);
  }, []);

  const handleSave = useCallback(
    async (data: ProfileData) => {
      setIsSaving(true);
      setSaveError(null);

      try {
        const result = await completeOnboarding({
          ...data,
          documentKeys,
          isAIGenerated,
        });

        if (result.error) {
          setSaveError(result.error);
          return;
        }

        // Full page reload to refresh Clerk session token with updated publicMetadata
        // NOTE: Do NOT use router.push() -- Clerk session token needs a full page
        // load to pick up the new onboardingComplete metadata (Pitfall 4)
        window.location.href = "/dashboard";
      } catch (err) {
        setSaveError(
          err instanceof Error
            ? err.message
            : "Failed to complete onboarding"
        );
      } finally {
        setIsSaving(false);
      }
    },
    [documentKeys, isAIGenerated]
  );

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
                {step > s.number ? (
                  <Check className="size-4" />
                ) : (
                  s.number
                )}
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
        {/* Step 1: Upload Documents */}
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
                <Button variant="ghost" onClick={handleSkipToReview}>
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

        {/* Step 2: AI Generation */}
        {step === 2 && (
          <>
            <CardHeader>
              <CardTitle>Generating Your Profile</CardTitle>
            </CardHeader>
            <CardContent>
              {isGenerating && (
                <div className="flex min-h-[200px] flex-col items-center justify-center gap-4">
                  <Loader2 className="size-10 animate-spin text-primary" />
                  <div className="text-center">
                    <p className="font-medium">
                      Analyzing your documents...
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Our AI is extracting your company profile from the
                      uploaded documents. This usually takes 10-20 seconds.
                    </p>
                  </div>
                </div>
              )}

              {generationError && !isGenerating && (
                <div className="flex min-h-[200px] flex-col items-center justify-center gap-4">
                  <AlertTriangle className="size-10 text-destructive" />
                  <div className="text-center">
                    <p className="font-medium text-destructive">
                      Generation Failed
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {generationError}
                    </p>
                  </div>
                  <Button onClick={handleSkipToReview} variant="outline">
                    Continue with empty profile
                  </Button>
                </div>
              )}

              {generationWarning && !isGenerating && !generationError && (
                <div className="flex min-h-[200px] flex-col items-center justify-center gap-4">
                  <AlertTriangle className="size-10 text-yellow-500" />
                  <div className="text-center">
                    <p className="font-medium">
                      Could not extract text
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {generationWarning}
                    </p>
                  </div>
                  <Button onClick={handleSkipToReview} variant="outline">
                    Continue with empty profile
                  </Button>
                </div>
              )}
            </CardContent>
          </>
        )}

        {/* Step 3: Review & Edit Profile */}
        {step === 3 && (
          <>
            <CardHeader>
              <CardTitle>Review Your Profile</CardTitle>
              <p className="text-sm text-muted-foreground">
                {profileData
                  ? "Review and edit your AI-generated profile before saving."
                  : "Fill in your company profile to help us match you with relevant contracts."}
              </p>
            </CardHeader>
            <CardContent>
              {saveError && (
                <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {saveError}
                </div>
              )}

              <ProfileReview
                initialProfile={profileData || EMPTY_PROFILE}
                onSave={handleSave}
                isSaving={isSaving}
                isAIGenerated={isAIGenerated}
              />
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
