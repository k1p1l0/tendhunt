# Phase 12: Settings & Company Profile Management - Research

**Researched:** 2026-02-11
**Domain:** Next.js form management with auto-save, Cloudflare R2 file operations, Clerk user fallback, shadcn/ui components
**Confidence:** HIGH

## Summary

This phase replaces the placeholder Settings page with a full company profile editor and restructures the sidebar to show company identity. The core challenge is building an auto-save form interface that updates individual fields on blur without triggering unnecessary database writes or AI re-scoring, while also implementing logo upload/re-extraction and document management.

The technical stack is well-established: CompanyProfile model exists (Phase 3), R2 presigned URL upload pattern exists (Phase 3), tag-style inputs exist (Phase 9 ProfileReview), and Clerk provides user fallback data. The missing pieces are: sonner toast notifications (not yet installed), auto-save API endpoint pattern, logo upload endpoint, document deletion from R2, and sidebar restructure.

**Primary recommendation:** Use sonner for toast notifications, implement field-level auto-save with `useDebouncedCallback` on blur events, create dedicated API routes for profile updates and logo operations, and restructure the sidebar with company header linking to Settings.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Profile editor layout:**
- Single scrollable page with visual section dividers (not tabs)
- Sections: Company Info (name, website, address, LinkedIn), AI Profile (summary, sectors, capabilities, keywords, certifications, ideal contract, company size, regions), Documents
- Array fields (sectors, capabilities, keywords, certifications, regions) use tag-style pill inputs — same pattern as onboarding wizard
- Summary and ideal contract description are plain textarea fields — no AI regeneration button
- Documents section is fully manageable: show uploaded docs with delete buttons + "Upload more" dropzone (reuse R2 presigned URL upload from onboarding)

**Sidebar restructure:**
- **Header (top):** User's company logo (rounded square, ~32px, Slack-style) + company name
- **Clicking company header** navigates to Settings page
- **Footer:** CreditBalance component first, then TendHunt branding below (small Crosshair icon + "TendHunt" wordmark, muted)
- **Fallback (no profile yet):** Show Clerk user's name + initials avatar circle at sidebar top

**Logo & branding display:**
- Settings page: Large logo (~80px) as header avatar at top of page with company name beside it. Upload overlay on hover.
- Logo upload supported: click to upload new logo (R2 presigned URL) + "Re-extract from website" button to re-run auto-extraction
- Sidebar: Rounded square ~32px logo, matching Slack workspace icon style
- TendHunt footer branding: Small Crosshair icon + "TendHunt" text, muted color, subtle

**Save & sync behavior:**
- Auto-save on blur (each field saves when user clicks out, like Notion)
- Toast notification on successful save ("Profile updated" at bottom-right)
- No Vibe Scanner re-score notification when profile changes — silent, user can manually re-score
- Document upload/removal does NOT trigger AI profile regeneration — documents are just stored

### Claude's Discretion
- Exact section divider styling and spacing
- Field ordering within sections
- Toast notification duration and styling
- Upload dropzone design for documents section
- Error handling for failed saves
- Mobile responsive behavior of the settings form

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sonner | latest | Toast notifications | Recommended by shadcn/ui, replaced deprecated toast component in 2026 |
| use-debounce | 10.1.0 | Auto-save debouncing | Already installed, used in ContractSearch component |
| @aws-sdk/client-s3 | 3.987.0 | R2 file operations (upload, delete) | Already installed for R2 presigned URLs |
| @clerk/nextjs | 6.37.3 | User fallback data (name, email) | Already installed for auth |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next-themes | latest | Dark mode for sonner | Required peer dependency for sonner integration |
| mongoose | 9.2.0 | CompanyProfile updates | Already installed, model exists |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| sonner | react-hot-toast | Sonner is shadcn/ui recommended, has better dark mode integration |
| Field-level auto-save | Form-level auto-save | Field-level provides better UX (saves immediately on blur), less chatty to DB |

**Installation:**
```bash
# Only sonner + next-themes needed (use-debounce already installed)
npx shadcn@latest add sonner
npm install next-themes
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (dashboard)/
│   │   └── settings/
│   │       └── page.tsx              # Settings page with auto-save form
│   └── api/
│       ├── profile/
│       │   ├── route.ts              # GET profile, PATCH field updates
│       │   ├── logo/
│       │   │   └── route.ts          # POST logo upload, DELETE logo
│       │   ├── logo-extract/
│       │   │   └── route.ts          # POST re-extract logo from website
│       │   └── documents/
│       │       └── route.ts          # DELETE document from R2
│       └── upload/
│           └── presigned/
│               └── route.ts          # Already exists for R2 uploads
├── components/
│   ├── layout/
│   │   └── app-sidebar.tsx           # Restructured with company header + footer
│   ├── settings/
│   │   ├── profile-form.tsx          # Main auto-save form component
│   │   ├── company-info-section.tsx  # Company Info fields
│   │   ├── ai-profile-section.tsx    # AI Profile fields (reuse TagInput)
│   │   ├── documents-section.tsx     # Document list + upload dropzone
│   │   └── logo-upload.tsx           # Logo with hover overlay
│   └── ui/
│       └── sonner.tsx                # Sonner component (via shadcn add)
└── lib/
    └── auto-save.ts                  # Reusable auto-save hook (optional)
```

### Pattern 1: Field-Level Auto-Save with onBlur
**What:** Each field saves independently when user clicks out (blur event), debounced to avoid duplicate saves if user tabs quickly
**When to use:** All text, textarea, and select fields
**Example:**
```typescript
// Source: Existing use-debounce pattern from contract-search.tsx
"use client";

import { useDebouncedCallback } from "use-debounce";
import { toast } from "sonner";

export function CompanyInfoSection({ initialData, userId }) {
  const [companyName, setCompanyName] = useState(initialData.companyName);

  const saveField = useDebouncedCallback(async (field, value) => {
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast("Profile updated");
    } catch (error) {
      toast.error("Failed to save changes");
    }
  }, 300);

  return (
    <Input
      value={companyName}
      onChange={(e) => setCompanyName(e.target.value)}
      onBlur={() => saveField("companyName", companyName)}
      placeholder="Your company name"
    />
  );
}
```

### Pattern 2: Logo Upload with Hover Overlay
**What:** Image container with absolute-positioned hover overlay showing upload icon
**When to use:** Logo display on Settings page (large ~80px version)
**Example:**
```typescript
// Source: TailwindCSS hover overlay pattern + R2 presigned URL upload
"use client";

import { useState } from "react";
import { Upload } from "lucide-react";

export function LogoUpload({ logoUrl, onUploadComplete }) {
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (file: File) => {
    setUploading(true);
    try {
      // 1. Get presigned URL for logo upload
      const res = await fetch("/api/profile/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      });
      const { url, key } = await res.json();

      // 2. Upload to R2
      await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      // 3. Update profile with new logoUrl
      const updateRes = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: key }),
      });

      if (updateRes.ok) {
        onUploadComplete(key);
        toast("Logo updated");
      }
    } catch (error) {
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative group size-20 rounded-lg overflow-hidden">
      {logoUrl && (
        <img
          src={logoUrl}
          alt="Company logo"
          className="size-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}

      {/* Hover overlay */}
      <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
        <Upload className="size-6 text-white" />
        <input
          type="file"
          className="sr-only"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        />
      </label>
    </div>
  );
}
```

### Pattern 3: Clerk User Fallback for Sidebar Header
**What:** If no CompanyProfile exists yet, show Clerk user's name + Avatar with initials
**When to use:** AppSidebar header when profile is loading or doesn't exist
**Example:**
```typescript
// Source: Clerk documentation + shadcn/ui Avatar component
"use client";

import { useUser } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function SidebarHeader() {
  const { user } = useUser();
  const [profile, setProfile] = useState<CompanyProfile | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then(res => res.ok ? res.json() : null)
      .then(data => setProfile(data?.profile || null));
  }, []);

  if (profile?.logoUrl || profile?.companyName) {
    return (
      <Link href="/settings" className="flex items-center gap-2 p-3">
        <Avatar className="size-8 rounded-md">
          <AvatarImage src={profile.logoUrl || ""} />
          <AvatarFallback className="rounded-md">
            {profile.companyName?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium">{profile.companyName}</span>
      </Link>
    );
  }

  // Fallback: Clerk user
  return (
    <Link href="/settings" className="flex items-center gap-2 p-3">
      <Avatar className="size-8">
        <AvatarImage src={user?.imageUrl} />
        <AvatarFallback>
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </AvatarFallback>
      </Avatar>
      <span className="font-medium">
        {user?.firstName} {user?.lastName}
      </span>
    </Link>
  );
}
```

### Pattern 4: Document Deletion from R2
**What:** Delete object from R2 bucket using DeleteObjectCommand
**When to use:** When user clicks delete button on uploaded document
**Example:**
```typescript
// Source: Cloudflare R2 presigned URLs documentation + AWS SDK
// app/api/profile/documents/route.ts
import { auth } from "@clerk/nextjs/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "@/lib/r2";
import CompanyProfile from "@/models/company-profile";

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { key } = await req.json();
  if (!key || typeof key !== "string") {
    return Response.json({ error: "key is required" }, { status: 400 });
  }

  // 1. Delete from R2
  await r2Client.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  }));

  // 2. Remove from CompanyProfile.documentKeys
  await CompanyProfile.findOneAndUpdate(
    { userId },
    { $pull: { documentKeys: key }, lastEditedAt: new Date() }
  );

  return Response.json({ success: true });
}
```

### Pattern 5: Sonner Toast Integration
**What:** Add Toaster component to root layout and use toast() function in components
**When to use:** Success/error notifications for auto-save, uploads, deletes
**Example:**
```typescript
// Source: shadcn/ui sonner documentation
// app/layout.tsx
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
        <Toaster />
      </body>
    </html>
  );
}

// In any component
import { toast } from "sonner";

toast("Profile updated"); // Success
toast.error("Failed to save changes"); // Error
toast.loading("Uploading..."); // Loading
```

### Anti-Patterns to Avoid
- **Form-level auto-save on onChange:** Causes excessive database writes and poor UX (saves while typing)
- **Synchronous field updates:** Always use debounce to batch rapid changes (user tabbing through fields)
- **Triggering AI re-scoring on profile change:** User decision says silent updates only
- **Using deprecated toast component:** shadcn/ui deprecated it in favor of sonner in 2026
- **Deleting logo without removing logoUrl from profile:** Always update both R2 and MongoDB together
- **Re-extracting logo without user confirmation:** Could overwrite manually uploaded logo

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast component with positioning, timing, stacking | sonner via shadcn/ui | Handles dark mode, stacking, animations, accessibility, positioning — deceptively complex |
| Auto-save debouncing | Custom setTimeout/clearTimeout logic | useDebouncedCallback from use-debounce | Handles cleanup, ref stability, edge cases (component unmount mid-debounce) |
| Avatar fallback initials | Custom initials extraction + styling | Avatar/AvatarFallback from shadcn/ui | Handles image loading states, accessibility, consistent styling |
| File upload progress | Custom XHR progress tracking | Reuse existing DocumentDropzone pattern | Already handles XHR, progress bars, error states, retry logic |
| R2 presigned URLs | Custom signed URL generation | Reuse existing /api/upload/presigned route | Already handles auth, validation, key generation, expiry |

**Key insight:** Auto-save seems simple but has many edge cases: debouncing, concurrent updates, optimistic UI, error recovery, network failures, component unmount during save. Use battle-tested libraries and existing patterns rather than rolling custom solutions.

## Common Pitfalls

### Pitfall 1: Race Conditions on Concurrent Field Updates
**What goes wrong:** User rapidly tabs through fields, triggering multiple concurrent PATCH requests. Last write wins, potentially overwriting earlier saves.
**Why it happens:** No coordination between concurrent API calls, no optimistic locking
**How to avoid:**
- Use debounce to batch rapid changes (300ms is good UX)
- PATCH endpoint should only update provided fields (not full document replacement)
- Consider optimistic UI updates with rollback on error
**Warning signs:** User reports "changes disappeared" or "old value came back"

### Pitfall 2: Not Cleaning Up Deleted R2 Objects
**What goes wrong:** Document deleted from CompanyProfile.documentKeys but orphaned in R2 bucket, costing storage
**Why it happens:** Forgetting to call DeleteObjectCommand or transaction failure between R2 and MongoDB
**How to avoid:**
- Always delete from R2 first, then MongoDB (R2 delete is idempotent)
- Log failures for manual cleanup
- Consider background job to scan for orphaned objects
**Warning signs:** R2 storage costs creeping up, documentKeys array out of sync with R2 bucket

### Pitfall 3: Logo Upload Overwrites Manual Edits
**What goes wrong:** User manually uploads custom logo, then clicks "Re-extract from website" which overwrites it without warning
**Why it happens:** No tracking of manual vs auto-extracted logos
**How to avoid:**
- Show confirmation dialog before re-extraction: "This will replace your current logo. Continue?"
- Add isLogoManuallyUploaded field to CompanyProfile to track source
- Disable re-extract button if logo was manually uploaded (or show stronger warning)
**Warning signs:** User complaints about "logo keeps changing back"

### Pitfall 4: Toaster Not Appearing Due to Missing Root Integration
**What goes wrong:** Calling toast() has no effect, no notification appears
**Why it happens:** Forgot to add <Toaster /> component to root layout
**How to avoid:**
- Always add Toaster to layout.tsx as first step after installing sonner
- Check browser console for sonner errors
- Test toast in development before building auto-save logic
**Warning signs:** toast() calls succeed but nothing renders

### Pitfall 5: Sidebar Logo Not Updating After Upload
**What goes wrong:** User uploads new logo on Settings page, but sidebar still shows old logo
**Why it happens:** Sidebar component doesn't refresh after profile update
**How to avoid:**
- Use client-side state management (useState + useEffect polling) OR
- Trigger re-fetch via event (window.dispatchEvent on upload success) OR
- Use optimistic update (update local state immediately, revert on error)
**Warning signs:** User refreshes page and logo appears, but not live

### Pitfall 6: Large Text Field Updates Cause Slow Auto-Save
**What goes wrong:** User types in long textarea (summary, ideal contract), every blur triggers 5KB+ network request
**Why it happens:** No check for actual changes before saving
**How to avoid:**
- Compare current value with initial value before calling saveField()
- Only PATCH if value actually changed: `if (value !== initialValue) saveField(...)`
- Show subtle "Saved" indicator after successful save
**Warning signs:** Network tab shows many identical PATCH requests

## Code Examples

Verified patterns from official sources and existing codebase:

### Sonner Toast Installation and Usage
```typescript
// Source: shadcn/ui sonner documentation (Context7)
// Install
npx shadcn@latest add sonner
npm install next-themes

// app/layout.tsx
import { Toaster } from "@/components/ui/sonner"

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
        <Toaster />
      </body>
    </html>
  )
}

// Usage in components
import { toast } from "sonner"

toast("Profile updated")
toast.error("Failed to save changes")
toast.success("Logo uploaded successfully")
toast.loading("Extracting logo...")
```

### Auto-Save Field with Debounce (from existing pattern)
```typescript
// Source: src/components/contracts/contract-search.tsx (existing codebase)
"use client";

import { useDebouncedCallback } from "use-debounce";

const handleFieldChange = useDebouncedCallback(async (field: string, value: any) => {
  try {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });

    if (!res.ok) throw new Error("Failed to save");
    toast("Profile updated");
  } catch (error) {
    toast.error("Failed to save changes");
  }
}, 300);

// In component
<Input
  value={companyName}
  onChange={(e) => setCompanyName(e.target.value)}
  onBlur={() => handleFieldChange("companyName", companyName)}
/>
```

### Delete Document from R2 and MongoDB
```typescript
// Source: Cloudflare R2 documentation + AWS SDK DeleteObjectCommand
// app/api/profile/documents/route.ts
import { auth } from "@clerk/nextjs/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "@/lib/r2";
import { dbConnect } from "@/lib/mongodb";
import CompanyProfile from "@/models/company-profile";

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key } = await req.json();
  if (!key || typeof key !== "string") {
    return Response.json({ error: "key is required" }, { status: 400 });
  }

  // 1. Delete from R2 (idempotent, safe to retry)
  await r2Client.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  }));

  // 2. Remove from CompanyProfile.documentKeys
  await dbConnect();
  await CompanyProfile.findOneAndUpdate(
    { userId },
    {
      $pull: { documentKeys: key },
      lastEditedAt: new Date(),
    }
  );

  return Response.json({ success: true });
}
```

### Clerk User Fallback in Sidebar
```typescript
// Source: Clerk documentation (Context7) + shadcn/ui Avatar
"use client";

import { useUser } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

export function SidebarCompanyHeader() {
  const { user } = useUser();
  const [profile, setProfile] = useState<CompanyProfile | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then(res => res.ok ? res.json() : null)
      .then(data => setProfile(data?.profile || null))
      .catch(() => setProfile(null));
  }, []);

  if (profile?.companyName) {
    return (
      <Link href="/settings" className="flex items-center gap-2 p-3 hover:bg-sidebar-accent transition-colors">
        <Avatar className="size-8 rounded-md">
          <AvatarImage src={profile.logoUrl || ""} />
          <AvatarFallback className="rounded-md bg-primary/10">
            {profile.companyName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium truncate">{profile.companyName}</span>
      </Link>
    );
  }

  // Fallback: Clerk user
  if (user) {
    const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`;
    return (
      <Link href="/settings" className="flex items-center gap-2 p-3 hover:bg-sidebar-accent transition-colors">
        <Avatar className="size-8">
          <AvatarImage src={user.imageUrl} />
          <AvatarFallback>{initials || "U"}</AvatarFallback>
        </Avatar>
        <span className="font-medium truncate">
          {user.firstName} {user.lastName}
        </span>
      </Link>
    );
  }

  return null;
}
```

### Reuse TagInput from ProfileReview
```typescript
// Source: src/components/onboarding/profile-review.tsx (existing codebase)
// Extract TagInput into shared component at src/components/ui/tag-input.tsx
// Then reuse in Settings page for array fields (sectors, capabilities, keywords, certifications, regions)

import { TagInput } from "@/components/ui/tag-input";

<TagInput
  label="Sectors"
  tags={profile.sectors}
  onChange={(v) => updateField("sectors", v)}
  onBlur={() => saveField("sectors", profile.sectors)}
  placeholder="e.g., IT, Healthcare, Construction..."
/>
```

### Logo Re-Extraction from Website
```typescript
// Source: src/app/api/profile/generate/route.ts (existing LinkedIn/og:image extraction)
// app/api/profile/logo-extract/route.ts
import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import CompanyProfile from "@/models/company-profile";
import { fetchWebContentWithOgImage } from "@/lib/fetch-web-content";
import { scrapeLinkedInCompany } from "@/lib/linkedin-scraper";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const profile = await CompanyProfile.findOne({ userId });
  if (!profile) {
    return Response.json({ error: "Profile not found" }, { status: 404 });
  }

  // Re-run extraction logic from profile generation
  const [websiteResult, linkedInResult] = await Promise.allSettled([
    profile.website ? fetchWebContentWithOgImage(profile.website) : null,
    profile.linkedinUrl ? scrapeLinkedInCompany(profile.linkedinUrl) : null,
  ]);

  let logoUrl: string | null = null;
  if (linkedInResult.status === "fulfilled" && linkedInResult.value?.logoUrl) {
    logoUrl = linkedInResult.value.logoUrl;
  } else if (websiteResult.status === "fulfilled" && websiteResult.value?.ogImage) {
    logoUrl = websiteResult.value.ogImage;
  }

  if (!logoUrl) {
    return Response.json({ error: "No logo found" }, { status: 404 });
  }

  // Update profile
  await CompanyProfile.findOneAndUpdate(
    { userId },
    { logoUrl, lastEditedAt: new Date() }
  );

  return Response.json({ logoUrl });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| shadcn/ui toast component | sonner component | January 2026 | Toast component deprecated, must use sonner for new projects |
| Form-level auto-save with onChange | Field-level auto-save with onBlur + debounce | 2024-2025 | Better UX (doesn't save while typing), fewer DB writes |
| Optimistic locking with version fields | Idempotent field updates with $set | 2025+ | Simpler for auto-save (no version conflicts), works with retries |
| Manual logo upload only | Auto-extraction + manual upload | Phase 9 (2026-02) | Users can re-extract from website or upload custom |

**Deprecated/outdated:**
- **shadcn/ui toast component:** Replaced by sonner in January 2026. Use `npx shadcn@latest add sonner` instead.
- **Global form validation on submit:** Auto-save eliminates need for submit button, validation happens per-field on blur

## Open Questions

1. **Should logo upload overwrite existing logo without confirmation?**
   - What we know: User can manually upload OR re-extract from website
   - What's unclear: If logo exists, should upload/re-extract show confirmation dialog?
   - Recommendation: Show confirmation for re-extract ("Replace current logo?"), but allow direct upload (less destructive, user intent is clear)

2. **Should Settings page be server-rendered or client-rendered?**
   - What we know: Need auto-save (client-side state), but could SSR initial data
   - What's unclear: Performance tradeoff of full client component vs RSC with client islands
   - Recommendation: Server-render page shell + initial data, client-render form sections (best of both)

3. **Should sidebar poll for profile updates or use event-driven refresh?**
   - What we know: Logo upload on Settings should update sidebar logo
   - What's unclear: Polling interval vs event listener vs full client state sync
   - Recommendation: Event-driven (window.postMessage or custom event on successful upload), no polling (chatty)

4. **Should document deletion be soft-delete or hard-delete?**
   - What we know: User can delete documents, no mention of restore
   - What's unclear: Should we track deleted docs for potential restore?
   - Recommendation: Hard-delete from R2 + MongoDB (no restore requirement stated), simplest implementation

## Sources

### Primary (HIGH confidence)
- Context7: /shadcn-ui/ui - Sonner component documentation, Avatar component API
- Context7: /clerk/clerk-nextjs-app-quickstart - Server/client authentication patterns
- Existing codebase: src/components/onboarding/profile-review.tsx - TagInput pattern
- Existing codebase: src/components/contracts/contract-search.tsx - useDebouncedCallback pattern
- Existing codebase: src/app/api/profile/generate/route.ts - Logo extraction logic
- Existing codebase: src/models/company-profile.ts - CompanyProfile schema
- Cloudflare R2 Documentation: Presigned URLs for DELETE operations

### Secondary (MEDIUM confidence)
- [shadcn/ui Toast - Deprecated](https://ui.shadcn.com/docs/components/radix/toast) - Toast component deprecated in favor of Sonner
- [shadcn/ui Sonner](https://ui.shadcn.com/docs/components/radix/sonner) - Current recommended toast component
- [Darius Marlowe - useAutoSave Hook with Debounce](https://darius-marlowe.medium.com/smarter-forms-in-react-building-a-useautosave-hook-with-debounce-and-react-query-d4d7f9bb052e) - Auto-save pattern guidance
- [Cloudflare R2 with Next.js Example](https://github.com/diwosuwanto/cloudflare-r2-with-nextjs-upload-download-delete) - File upload/delete patterns
- [Tailwind CSS Image Hover Overlay](https://www.kindacode.com/snippet/tailwind-css-create-image-hover-overlay-effects/) - Hover upload UI pattern

### Tertiary (LOW confidence)
- [Slack's New Design Overview](https://slack.com/help/articles/16764236868755-An-overview-of-Slacks-new-design) - Workspace switcher UI inspiration (no specific rounded-square specs found)
- [MongoDB Optimistic Concurrency](https://thecodebarbarian.com/whats-new-in-mongoose-5-10-optimistic-concurrency.html) - Version-based updates (not needed for field-level auto-save)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - sonner is official shadcn/ui recommendation, use-debounce already installed and proven
- Architecture: HIGH - All patterns based on existing codebase or official docs
- Pitfalls: HIGH - Common auto-save issues documented across multiple sources

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days - stable ecosystem, no fast-moving dependencies)
