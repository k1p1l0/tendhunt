"use client";

import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface CompanyInfo {
  companyName: string;
  website: string;
  address: string;
  linkedinUrl: string;
}

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

      {/* LinkedIn Company Page */}
      <div className="space-y-2">
        <Label htmlFor="ci-linkedinUrl">LinkedIn Company Page</Label>
        <Input
          id="ci-linkedinUrl"
          type="url"
          value={value.linkedinUrl}
          onChange={(e) => updateField("linkedinUrl", e.target.value)}
          placeholder="https://linkedin.com/company/your-company"
        />
      </div>
    </div>
  );
}
