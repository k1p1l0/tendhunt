"use client";

import { useState, useCallback, type KeyboardEvent, type ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Sparkles } from "lucide-react";

export interface ProfileData {
  companyName: string;
  website: string;
  address: string;
  linkedinUrl: string;
  summary: string;
  sectors: string[];
  capabilities: string[];
  keywords: string[];
  certifications: string[];
  idealContractDescription: string;
  companySize: string;
  regions: string[];
}

interface ProfileReviewProps {
  initialProfile: ProfileData;
  onSave: (data: ProfileData) => void;
  isSaving: boolean;
  isAIGenerated?: boolean;
}

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

/** Reusable tag input for array fields */
function TagInput({
  label,
  tags,
  onChange,
  placeholder,
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = useState("");

  const addTag = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed && !tags.includes(trimmed)) {
        onChange([...tags, trimmed]);
      }
      setInputValue("");
    },
    [tags, onChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTag(inputValue);
      }
      if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
        onChange(tags.slice(0, -1));
      }
    },
    [inputValue, tags, onChange, addTag]
  );

  const removeTag = useCallback(
    (index: number) => {
      onChange(tags.filter((_, i) => i !== index));
    },
    [tags, onChange]
  );

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-md border p-2">
        {tags.map((tag, i) => (
          <Badge key={`${tag}-${i}`} variant="secondary" className="gap-1 py-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="ml-0.5 rounded-full hover:bg-muted"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <Input
          value={inputValue}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setInputValue(e.target.value)
          }
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (inputValue.trim()) addTag(inputValue);
          }}
          placeholder={tags.length === 0 ? placeholder : "Add more..."}
          className="h-7 min-w-[120px] flex-1 border-0 p-0 shadow-none focus-visible:ring-0"
        />
      </div>
    </div>
  );
}

export function ProfileReview({
  initialProfile,
  onSave,
  isSaving,
  isAIGenerated,
}: ProfileReviewProps) {
  const [profile, setProfile] = useState<ProfileData>(initialProfile);

  const updateField = useCallback(
    <K extends keyof ProfileData>(key: K, value: ProfileData[K]) => {
      setProfile((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  return (
    <div className="space-y-6">
      {isAIGenerated && (
        <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
          <Sparkles className="size-4" />
          AI-generated profile -- review and edit before saving
        </div>
      )}

      {/* Company Name */}
      <div className="space-y-2">
        <Label htmlFor="companyName">Company Name</Label>
        <Input
          id="companyName"
          value={profile.companyName}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            updateField("companyName", e.target.value)
          }
          placeholder="Your company name"
        />
      </div>

      {/* Website URL */}
      <div className="space-y-2">
        <Label htmlFor="pr-website">Website URL</Label>
        <Input
          id="pr-website"
          type="url"
          value={profile.website}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            updateField("website", e.target.value)
          }
          placeholder="https://yourcompany.com"
        />
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="pr-address">Address</Label>
        <Input
          id="pr-address"
          value={profile.address}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            updateField("address", e.target.value)
          }
          placeholder="Company address"
        />
      </div>

      {/* LinkedIn Company Page */}
      <div className="space-y-2">
        <Label htmlFor="pr-linkedinUrl">LinkedIn Company Page</Label>
        <Input
          id="pr-linkedinUrl"
          type="url"
          value={profile.linkedinUrl}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            updateField("linkedinUrl", e.target.value)
          }
          placeholder="https://linkedin.com/company/your-company"
        />
      </div>

      {/* Summary */}
      <div className="space-y-2">
        <Label htmlFor="summary">Company Summary</Label>
        <Textarea
          id="summary"
          value={profile.summary}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            updateField("summary", e.target.value)
          }
          placeholder="A brief description of what your company does..."
          rows={3}
        />
      </div>

      {/* Sectors */}
      <TagInput
        label="Sectors"
        tags={profile.sectors}
        onChange={(v) => updateField("sectors", v)}
        placeholder="e.g., IT, Healthcare, Construction..."
      />

      {/* Capabilities */}
      <TagInput
        label="Capabilities"
        tags={profile.capabilities}
        onChange={(v) => updateField("capabilities", v)}
        placeholder="e.g., Cloud Migration, Data Analytics..."
      />

      {/* Keywords */}
      <TagInput
        label="Keywords"
        tags={profile.keywords}
        onChange={(v) => updateField("keywords", v)}
        placeholder="e.g., SaaS, Agile, DevOps..."
      />

      {/* Certifications */}
      <TagInput
        label="Certifications"
        tags={profile.certifications}
        onChange={(v) => updateField("certifications", v)}
        placeholder="e.g., ISO 27001, Cyber Essentials..."
      />

      {/* Ideal Contract Description */}
      <div className="space-y-2">
        <Label htmlFor="idealContract">Ideal Contract Description</Label>
        <Textarea
          id="idealContract"
          value={profile.idealContractDescription}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            updateField("idealContractDescription", e.target.value)
          }
          placeholder="Describe the type of government contracts you are looking for..."
          rows={4}
        />
      </div>

      {/* Company Size */}
      <div className="space-y-2">
        <Label>Company Size</Label>
        <Select
          value={profile.companySize}
          onValueChange={(v) => updateField("companySize", v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select company size" />
          </SelectTrigger>
          <SelectContent>
            {COMPANY_SIZES.map((size) => (
              <SelectItem key={size} value={size}>
                {size} employees
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Regions */}
      <TagInput
        label="UK Regions"
        tags={profile.regions}
        onChange={(v) => updateField("regions", v)}
        placeholder="e.g., London, South East, National..."
      />

      {/* Save Button */}
      <Button
        onClick={() => onSave(profile)}
        disabled={isSaving}
        className="w-full"
        size="lg"
      >
        {isSaving ? "Saving..." : "Save & Continue to Dashboard"}
      </Button>
    </div>
  );
}
