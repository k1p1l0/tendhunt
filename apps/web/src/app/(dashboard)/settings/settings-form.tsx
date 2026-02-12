"use client";

import { useState, useCallback, useRef, type ChangeEvent } from "react";
import { useDebouncedCallback } from "use-debounce";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagInput } from "@/components/ui/tag-input";
import { LogoUpload } from "@/components/settings/logo-upload";
import { DocumentsSection } from "@/components/settings/documents-section";

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

export interface ProfileFormData {
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
  logoUrl: string;
  documentKeys: string[];
  lastEditedAt: string | null;
}

const EMPTY_PROFILE: ProfileFormData = {
  companyName: "",
  website: "",
  address: "",
  linkedinUrl: "",
  summary: "",
  sectors: [],
  capabilities: [],
  keywords: [],
  certifications: [],
  idealContractDescription: "",
  companySize: "",
  regions: [],
  logoUrl: "",
  documentKeys: [],
  lastEditedAt: null,
};

interface SettingsFormProps {
  initialProfile: ProfileFormData | null;
}

export function SettingsForm({ initialProfile }: SettingsFormProps) {
  const profile = initialProfile ?? EMPTY_PROFILE;

  // Text fields
  const [companyName, setCompanyName] = useState(profile.companyName);
  const [website, setWebsite] = useState(profile.website);
  const [address, setAddress] = useState(profile.address);
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedinUrl);
  const [summary, setSummary] = useState(profile.summary);
  const [idealContractDescription, setIdealContractDescription] = useState(
    profile.idealContractDescription
  );
  const [companySize, setCompanySize] = useState(profile.companySize);

  // Array fields
  const [sectors, setSectors] = useState<string[]>(profile.sectors);
  const [capabilities, setCapabilities] = useState<string[]>(
    profile.capabilities
  );
  const [keywords, setKeywords] = useState<string[]>(profile.keywords);
  const [certifications, setCertifications] = useState<string[]>(
    profile.certifications
  );
  const [regions, setRegions] = useState<string[]>(profile.regions);

  // Logo & documents
  const [logoUrl, setLogoUrl] = useState(profile.logoUrl);
  const [documentKeys, setDocumentKeys] = useState<string[]>(
    profile.documentKeys
  );

  const [lastEditedAt, setLastEditedAt] = useState(profile.lastEditedAt);

  // Track initial values for comparison to avoid unnecessary saves
  const initialRef = useRef(profile);

  // Track latest array values via refs to avoid stale closure in onBlur
  // (onBlur fires in same tick as onChange, before React re-renders)
  const arrayRefs = useRef({
    sectors: profile.sectors,
    capabilities: profile.capabilities,
    keywords: profile.keywords,
    certifications: profile.certifications,
    regions: profile.regions,
  });

  const saveField = useDebouncedCallback(
    async (field: string, value: unknown) => {
      try {
        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value }),
        });
        if (!res.ok) throw new Error("Failed to save");
        const data = await res.json();
        if (data.profile?.lastEditedAt) {
          setLastEditedAt(data.profile.lastEditedAt);
        }
        toast.success("Profile updated");
      } catch {
        toast.error("Failed to save changes");
      }
    },
    300
  );

  // Save on blur only if value changed from initial
  const handleTextBlur = useCallback(
    (field: keyof ProfileFormData, value: string) => {
      if (value !== initialRef.current[field]) {
        initialRef.current = { ...initialRef.current, [field]: value };
        saveField(field, value);
      }
    },
    [saveField]
  );

  // Save array fields on blur — reads from ref to get latest value
  // (avoids stale closure since onBlur fires before React re-renders after onChange)
  const handleArraySave = useCallback(
    (field: "sectors" | "capabilities" | "keywords" | "certifications" | "regions") => {
      const value = arrayRefs.current[field];
      if (
        JSON.stringify(value) !== JSON.stringify(initialRef.current[field])
      ) {
        initialRef.current = { ...initialRef.current, [field]: value };
        saveField(field, value);
      }
    },
    [saveField]
  );

  // Wrapper setters that update both state and ref
  const updateArray = useCallback(
    (
      field: "sectors" | "capabilities" | "keywords" | "certifications" | "regions",
      setter: React.Dispatch<React.SetStateAction<string[]>>,
      value: string[]
    ) => {
      arrayRefs.current[field] = value;
      setter(value);
    },
    []
  );

  // Select change saves immediately (no blur needed for selects)
  const handleSelectChange = useCallback(
    (field: keyof ProfileFormData, value: string) => {
      if (value !== initialRef.current[field]) {
        initialRef.current = { ...initialRef.current, [field]: value };
        saveField(field, value);
      }
    },
    [saveField]
  );

  const handleLogoUpdated = useCallback((newUrl: string) => {
    setLogoUrl(newUrl);
    // Dispatch custom event for sidebar refresh (consumed in Plan 03)
    window.dispatchEvent(
      new CustomEvent("profile-updated", { detail: { logoUrl: newUrl } })
    );
  }, []);

  const handleDocumentsUpdated = useCallback((newKeys: string[]) => {
    setDocumentKeys(newKeys);
  }, []);

  return (
    <>
      {/* Page header: logo + company name + last edited */}
      <div className="flex items-center gap-4">
        <LogoUpload
          logoUrl={logoUrl || null}
          companyName={companyName}
          onLogoUpdated={handleLogoUpdated}
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-3xl font-bold tracking-tight">
            {companyName || "Company Settings"}
          </h1>
          {lastEditedAt && (
            <p className="text-sm text-muted-foreground">
              Last edited{" "}
              {new Date(lastEditedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      </div>

      {/* Section 1: Company Info */}
      <section>
        <h2 className="mb-4 border-b pb-2 text-xl font-semibold">
          Company Info
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="settings-companyName">Company Name</Label>
            <Input
              id="settings-companyName"
              value={companyName}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setCompanyName(e.target.value)
              }
              onBlur={() => handleTextBlur("companyName", companyName)}
              placeholder="Your company name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings-website">Website</Label>
            <Input
              id="settings-website"
              type="url"
              value={website}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setWebsite(e.target.value)
              }
              onBlur={() => handleTextBlur("website", website)}
              placeholder="https://yourcompany.com"
            />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="settings-address">Address</Label>
            <Textarea
              id="settings-address"
              value={address}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setAddress(e.target.value)
              }
              onBlur={() => handleTextBlur("address", address)}
              placeholder="Company address"
              rows={2}
            />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="settings-linkedinUrl">LinkedIn Company Page</Label>
            <Input
              id="settings-linkedinUrl"
              type="url"
              value={linkedinUrl}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setLinkedinUrl(e.target.value)
              }
              onBlur={() => handleTextBlur("linkedinUrl", linkedinUrl)}
              placeholder="https://linkedin.com/company/your-company"
            />
          </div>
        </div>
      </section>

      {/* Section 2: AI Profile */}
      <section>
        <h2 className="mb-4 border-b pb-2 text-xl font-semibold">
          AI Profile
        </h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settings-summary">Company Summary</Label>
            <Textarea
              id="settings-summary"
              value={summary}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setSummary(e.target.value)
              }
              onBlur={() => handleTextBlur("summary", summary)}
              placeholder="A brief description of what your company does..."
              rows={4}
            />
          </div>

          <TagInput
            label="Sectors"
            tags={sectors}
            onChange={(v) => updateArray("sectors", setSectors, v)}
            onBlur={() => handleArraySave("sectors")}
            placeholder="e.g., IT, Healthcare, Construction..."
          />

          <TagInput
            label="Capabilities"
            tags={capabilities}
            onChange={(v) => updateArray("capabilities", setCapabilities, v)}
            onBlur={() => handleArraySave("capabilities")}
            placeholder="e.g., Cloud Migration, Data Analytics..."
          />

          <TagInput
            label="Keywords"
            tags={keywords}
            onChange={(v) => updateArray("keywords", setKeywords, v)}
            onBlur={() => handleArraySave("keywords")}
            placeholder="e.g., SaaS, Agile, DevOps..."
          />

          <TagInput
            label="Certifications"
            tags={certifications}
            onChange={(v) => updateArray("certifications", setCertifications, v)}
            onBlur={() => handleArraySave("certifications")}
            placeholder="e.g., ISO 27001, Cyber Essentials..."
          />

          <div className="space-y-2">
            <Label htmlFor="settings-idealContract">
              Ideal Contract Description
            </Label>
            <Textarea
              id="settings-idealContract"
              value={idealContractDescription}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setIdealContractDescription(e.target.value)
              }
              onBlur={() =>
                handleTextBlur(
                  "idealContractDescription",
                  idealContractDescription
                )
              }
              placeholder="Describe the type of government contracts you are looking for..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label>Company Size</Label>
              <Select
                value={companySize}
                onValueChange={(v) => {
                  setCompanySize(v);
                  handleSelectChange("companySize", v);
                }}
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
          </div>

          <TagInput
            label="UK Regions"
            tags={regions}
            onChange={(v) => updateArray("regions", setRegions, v)}
            onBlur={() => handleArraySave("regions")}
            placeholder="e.g., London, South East, National..."
          />
        </div>
      </section>

      {/* Section 3: Documents */}
      <section>
        <h2 className="mb-4 border-b pb-2 text-xl font-semibold">
          Documents
        </h2>
        <DocumentsSection
          documentKeys={documentKeys}
          onDocumentsUpdated={handleDocumentsUpdated}
        />
      </section>
    </>
  );
}
