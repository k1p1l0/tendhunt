"use client";

import { useState } from "react";
import { FileText, Landmark, Building2, GraduationCap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScannerCreationForm } from "@/components/scanners/scanner-creation-form";
import type { ScannerType } from "@/models/scanner";

interface CreateScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (scanner: { _id: string }) => void;
}

const SCANNER_TYPES: Array<{
  type: ScannerType;
  title: string;
  description: string;
  icon: typeof FileText;
}> = [
  {
    type: "rfps",
    title: "RFPs / Contracts",
    description:
      "Score government contracts and tenders against your company profile",
    icon: FileText,
  },
  {
    type: "meetings",
    title: "Board Meetings & Strategic Plans",
    description:
      "Analyze board meeting signals for buying intent and relevance",
    icon: Landmark,
  },
  {
    type: "buyers",
    title: "Buyers / Organizations",
    description: "Score buyer organizations as potential accounts",
    icon: Building2,
  },
  {
    type: "schools",
    title: "Schools (Ofsted)",
    description:
      "Find recently downgraded schools and assess tuition needs from Ofsted data",
    icon: GraduationCap,
  },
];

export function CreateScannerModal({
  open,
  onOpenChange,
  onCreated,
}: CreateScannerModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<ScannerType | null>(null);

  function handleTypeSelect(type: ScannerType) {
    setSelectedType(type);
    setStep(2);
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      // Reset state when closing
      setStep(1);
      setSelectedType(null);
    }
    onOpenChange(isOpen);
  }

  function handleBack() {
    setStep(1);
    setSelectedType(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Create Scanner</DialogTitle>
              <DialogDescription>
                Choose the type of data you want to analyze with AI
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {SCANNER_TYPES.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  className="flex flex-col items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => handleTypeSelect(item.type)}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{item.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {item.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && selectedType && (
          <>
            <DialogHeader>
              <DialogTitle>Configure Scanner</DialogTitle>
              <DialogDescription>
                AI will generate a name, description, and search query based on
                your company profile. You can edit everything before saving.
              </DialogDescription>
            </DialogHeader>

            <ScannerCreationForm
              type={selectedType}
              onSave={(scanner) => {
                handleClose(false);
                onCreated(scanner);
              }}
              onCancel={handleBack}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
