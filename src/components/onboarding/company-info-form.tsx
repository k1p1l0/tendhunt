"use client";

import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";

export interface CompanyInfo {
  companyName: string;
  website: string;
  address: string;
  socialLinks: Array<{ platform: string; url: string }>;
}

const PLATFORM_OPTIONS = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "twitter", label: "X / Twitter" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "other", label: "Other" },
] as const;

const MAX_SOCIAL_LINKS = 5;

interface CompanyInfoFormProps {
  value: CompanyInfo;
  onChange: (v: CompanyInfo) => void;
}

export function CompanyInfoForm({ value, onChange }: CompanyInfoFormProps) {
  const updateField = useCallback(
    <K extends keyof CompanyInfo>(key: K, val: CompanyInfo[K]) => {
      onChange({ ...value, [key]: val });
    },
    [value, onChange]
  );

  const addSocialLink = useCallback(() => {
    if (value.socialLinks.length >= MAX_SOCIAL_LINKS) return;
    onChange({
      ...value,
      socialLinks: [...value.socialLinks, { platform: "linkedin", url: "" }],
    });
  }, [value, onChange]);

  const removeSocialLink = useCallback(
    (index: number) => {
      onChange({
        ...value,
        socialLinks: value.socialLinks.filter((_, i) => i !== index),
      });
    },
    [value, onChange]
  );

  const updateSocialLink = useCallback(
    (index: number, field: "platform" | "url", val: string) => {
      const updated = [...value.socialLinks];
      updated[index] = { ...updated[index], [field]: val };
      onChange({ ...value, socialLinks: updated });
    },
    [value, onChange]
  );

  return (
    <div className="space-y-4">
      {/* Company Name */}
      <div className="space-y-2">
        <Label htmlFor="ci-companyName">Company Name</Label>
        <Input
          id="ci-companyName"
          value={value.companyName}
          onChange={(e) => updateField("companyName", e.target.value)}
          placeholder="Your company name"
        />
      </div>

      {/* Website URL */}
      <div className="space-y-2">
        <Label htmlFor="ci-website">Website URL</Label>
        <Input
          id="ci-website"
          type="url"
          value={value.website}
          onChange={(e) => updateField("website", e.target.value)}
          placeholder="https://yourcompany.com"
        />
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="ci-address">Address</Label>
        <Input
          id="ci-address"
          value={value.address}
          onChange={(e) => updateField("address", e.target.value)}
          placeholder="Company address"
        />
      </div>

      {/* Social Links */}
      <div className="space-y-2">
        <Label>Social Links</Label>
        {value.socialLinks.map((link, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-1/3">
              <Select
                value={link.platform}
                onValueChange={(v) => updateSocialLink(i, "platform", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Input
                type="url"
                value={link.url}
                onChange={(e) => updateSocialLink(i, "url", e.target.value)}
                placeholder="https://..."
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeSocialLink(i)}
              className="size-9 shrink-0"
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
        {value.socialLinks.length < MAX_SOCIAL_LINKS && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSocialLink}
            className="mt-1"
          >
            <Plus className="mr-1 size-4" />
            Add social link
          </Button>
        )}
      </div>
    </div>
  );
}
