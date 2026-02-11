# Phase 9: Enhance Onboarding - Company Photo Upload + AI Analysis Animations - Research

**Researched:** 2026-02-11
**Domain:** Image upload (R2 presigned URLs) + CSS step animations (UI polish)
**Confidence:** HIGH

## Summary

This phase adds two UI enhancements to the existing onboarding wizard (built in Phase 3): (1) a company logo upload with circular avatar preview, and (2) animated step-by-step AI analysis progress that replaces the current `Loader2` spinner during profile generation.

The codebase already contains a battle-tested pattern for presigned URL uploads to R2 (document-dropzone.tsx + presigned route). The logo upload is a simplified clone of this pattern: single file, image-only MIME types, circular preview via the existing shadcn Avatar component. The AI analysis animation is a pure CSS/Tailwind component that simulates discrete analysis steps during the 10-20 second profile generation call. No new dependencies are required.

**Primary recommendation:** Clone the existing R2 presigned URL upload pattern for images (new endpoint + new dropzone component), add `logoUrl` to the CompanyProfile model, and build a custom `AIAnalysisProgress` component using Tailwind CSS transitions + `tw-animate-css` utilities (already installed). Do NOT add framer-motion or the Vercel AI Elements library -- build a lightweight, custom stepper that matches the existing design system.

## Standard Stack

### Core (Already Installed -- No New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-dropzone | ^15.0.0 | File drop zone with drag-and-drop | Already used for document uploads; proven pattern in codebase |
| @aws-sdk/client-s3 | ^3.987.0 | R2 PutObjectCommand | Already used for document presigned URLs |
| @aws-sdk/s3-request-presigner | ^3.987.0 | getSignedUrl for presigned PUT | Already used in `/api/upload/presigned` |
| tw-animate-css | ^1.4.0 | Tailwind CSS v4 animation utilities | Already installed; provides `animate-in`, `fade-in`, `slide-in-from-*` classes |
| radix-ui | ^1.4.3 | Avatar, Collapsible primitives | Already installed; Avatar component exists at `src/components/ui/avatar.tsx` |
| lucide-react | ^0.563.0 | Icons (Check, Loader2, Search, FileText, etc.) | Already used throughout codebase |

### Supporting (Already Available)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanoid | ^5.1.6 | Unique key generation for R2 object keys | Already used in presigned route for document keys |
| tailwindcss | ^4 | Utility CSS with native `@keyframes` support | Tailwind v4 supports `@keyframes` in CSS directly |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom CSS stepper | Vercel AI Elements (`chain-of-thought`) | AI Elements adds a dependency, uses Radix Collapsible + Streamdown; overkill for simulated steps. Our component is simpler -- just a list of steps with status icons. |
| Custom CSS stepper | framer-motion | Explicitly excluded per project constraints. CSS transitions are sufficient for fade + slide. |
| `tw-animate-css` classes | Raw `@keyframes` in globals.css | `tw-animate-css` already installed, provides composable `animate-in fade-in slide-in-from-*` utilities. Use it. |
| `URL.createObjectURL` for preview | FileReader.readAsDataURL | `URL.createObjectURL` is faster, uses less memory, and is the react-dropzone recommended pattern. Just remember to revoke on unmount. |

**Installation:**
```bash
# No installation needed -- all dependencies already present
```

## Architecture Patterns

### Recommended File Structure

```
src/
├── app/
│   └── api/
│       └── upload/
│           ├── presigned/
│           │   └── route.ts          # EXISTING: document presigned URLs
│           └── logo/
│               └── route.ts          # NEW: image presigned URL endpoint
├── components/
│   └── onboarding/
│       ├── onboarding-wizard.tsx      # MODIFY: add logo state, replace spinner
│       ├── company-info-form.tsx      # MODIFY: add logo dropzone below company name
│       ├── logo-dropzone.tsx          # NEW: single-image dropzone with circular preview
│       ├── ai-analysis-progress.tsx   # NEW: animated step list replacing Loader2
│       ├── profile-review.tsx         # MODIFY: show logo avatar at top
│       ├── document-dropzone.tsx      # UNCHANGED
│       └── upload-progress.tsx        # UNCHANGED
├── models/
│   └── company-profile.ts            # MODIFY: add logoUrl field
└── app/
    └── onboarding/
        └── _actions.ts               # MODIFY: accept logoUrl in completeOnboarding
```

### Pattern 1: Image Presigned URL Endpoint (Clone of Document Pattern)

**What:** A new API route at `/api/upload/logo/route.ts` that generates presigned PUT URLs specifically for image uploads.
**When to use:** When the user selects/drops an image file in the logo dropzone.
**Key differences from document presigned route:**
- MIME whitelist: `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`
- R2 key prefix: `logos/{userId}/{nanoid}-{filename}` (not `documents/`)
- Max file size enforced client-side (2MB for logos vs 10MB for documents)
- Single file only (not multi-file)

**Example:**
```typescript
// Source: Adapted from existing src/app/api/upload/presigned/route.ts
const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

// Key pattern: logos/{userId}/{nanoid}-{filename}
const key = `logos/${userId}/${nanoid()}-${filename}`;

const url = await getSignedUrl(
  r2Client,
  new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  }),
  { expiresIn: 3600 }
);

return Response.json({ url, key });
```

### Pattern 2: Logo Dropzone with Circular Avatar Preview

**What:** A `<LogoDropzone>` component using react-dropzone with `accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg'] }`, single file mode, circular preview using the existing shadcn Avatar component.
**When to use:** Embedded in the company info form (Step 1 of onboarding wizard).

**Key details:**
- Use `URL.createObjectURL(file)` for instant preview BEFORE upload completes
- Revoke object URL on unmount to prevent memory leaks (react-dropzone recommended pattern)
- Show upload progress via XHR (same `uploadFileWithProgress` helper from document-dropzone.tsx -- extract to shared util)
- After upload completes, call `onLogoKeyChange(key)` to pass the R2 key to parent
- Avatar sizes: Preview in form = 80x80px (`size-20 rounded-full`), Review step = 64x64px

**Example:**
```tsx
// Source: react-dropzone Context7 - Image Preview with Object URLs
const { getRootProps, getInputProps, isDragActive } = useDropzone({
  accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg'] },
  maxFiles: 1,
  maxSize: 2 * 1024 * 1024, // 2MB
  multiple: false,
  onDrop: async ([file]) => {
    if (!file) return;
    // Instant preview
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    // Upload to R2 via presigned URL
    const res = await fetch("/api/upload/logo", { ... });
    const { url, key } = await res.json();
    await uploadFileWithProgress(url, file, setProgress);
    onLogoKeyChange(key);
  },
});
```

### Pattern 3: AI Analysis Progress Stepper (Simulated Steps)

**What:** An `<AIAnalysisProgress>` component that displays a list of analysis tasks with animated status transitions (pending -> active -> complete). Steps are simulated on a timer, NOT driven by real backend events.
**When to use:** Replaces the `Loader2` spinner in Step 2 of the onboarding wizard.

**Why simulated (not real-time):**
- The profile generation endpoint (`/api/profile/generate`) is a single POST that returns when complete
- Converting to SSE/streaming would require significant backend refactoring
- The 10-20 second wait is predictable enough for timed simulation
- The Vercel AI Elements pattern uses the same approach -- steps advance on timers

**Step sequence (example):**

| Step | Label | Icon | Duration |
|------|-------|------|----------|
| 1 | Analyzing uploaded documents... | FileText | ~3s |
| 2 | Scanning company website... | Globe | ~3s |
| 3 | Reviewing LinkedIn profile... | Linkedin | ~3s |
| 4 | Extracting industry sectors... | Search | ~2s |
| 5 | Identifying core capabilities... | Sparkles | ~2s |
| 6 | Building company profile... | Building2 | Until API returns |

**Animation approach with tw-animate-css:**
```tsx
// Each step enters with animate-in + fade-in + slide-in-from-bottom
// Active step has a pulsing dot (CSS animation)
// Completed steps show a green check with fade transition

<div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
  <div className="flex items-center gap-3">
    {status === "complete" && <Check className="size-4 text-green-500" />}
    {status === "active" && <div className="size-2 animate-pulse rounded-full bg-primary" />}
    {status === "pending" && <div className="size-2 rounded-full bg-muted" />}
    <span className={status === "active" ? "font-medium" : "text-muted-foreground"}>
      {label}
    </span>
  </div>
</div>
```

**Timer mechanism:**
```typescript
// Use setInterval to advance steps every ~2-3 seconds
// Last step stays "active" (pulsing) until the real API response arrives
// On API success: mark all steps complete, auto-advance to step 3
// On API error: show error state on the currently active step
useEffect(() => {
  if (!isGenerating) return;
  const interval = setInterval(() => {
    setActiveStep(prev => Math.min(prev + 1, STEPS.length - 1));
  }, 2500);
  return () => clearInterval(interval);
}, [isGenerating]);
```

### Pattern 4: R2 Image Serving (Read Path)

**What:** How to display the uploaded logo after it's saved in R2.
**Critical decision:** R2 presigned URLs are for the S3 API domain only (`ACCOUNT_ID.r2.cloudflarestorage.com`). They CANNOT be used with custom domains. For displaying images, the options are:

1. **Presigned GET URL (simplest, recommended for now):** Generate a short-lived read URL server-side when rendering the profile. This avoids needing public bucket access.
2. **R2 public bucket + `r2.dev` URL:** Enable public access on the bucket; images get a `https://pub-HASH.r2.dev/logos/...` URL. Rate-limited but free.
3. **Cloudflare Worker proxy:** Route `images.tendhunt.com` through a Worker that reads from R2. Most production-ready but more setup.

**Recommendation for this phase:** Use presigned GET URLs. Add a server utility function:
```typescript
// src/lib/r2.ts - add getPublicUrl helper
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function getR2SignedReadUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(
    r2Client,
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    }),
    { expiresIn }
  );
}
```

Then in the profile review and dashboard, resolve `logoUrl` (R2 key) to a signed read URL server-side before passing to the client component.

**Next.js Image optimization:** If using `<Image>` tag, add the R2 domain to `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
    ],
  },
};
```

### Anti-Patterns to Avoid

- **Streaming/SSE for analysis progress:** Do NOT refactor the profile generation API to stream progress events. The simulated stepper achieves the same UX with zero backend changes. Real progress would require breaking the single Claude API call into substeps, which is not how the generation works.
- **Storing blob URLs in database:** Never save `URL.createObjectURL()` URLs to MongoDB. These are ephemeral browser-only URLs. Store the R2 object key (`logos/user123/abc-logo.png`) and resolve to a presigned read URL server-side.
- **Adding framer-motion:** Explicitly forbidden per project constraints. Use `tw-animate-css` classes + CSS transitions.
- **Large Avatar component with Image:** Don't use `<AvatarImage>` from shadcn for the upload preview -- it has Radix fallback behavior that adds unnecessary complexity. Use a plain `<img>` inside a `rounded-full overflow-hidden` container for the preview, and reserve the Avatar component for the final display in the review/dashboard.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File drop zone | Custom drag-and-drop handlers | `react-dropzone` (already installed) | Handles browser compat, MIME validation, drag state |
| Image preview | FileReader + canvas | `URL.createObjectURL()` | Faster, less memory, react-dropzone recommended |
| Upload progress | fetch API progress | XHR `upload.onprogress` | fetch API lacks upload progress events (known limitation) |
| Presigned URLs | Manual S3 signing | `@aws-sdk/s3-request-presigner` (already installed) | Handles v4 signing correctly |
| Enter animations | Raw @keyframes | `tw-animate-css` classes (`animate-in fade-in`) | Already installed, composable, Tailwind-native |
| Unique filenames | `Date.now()` or `uuid` | `nanoid` (already installed) | URL-safe, shorter, faster |

**Key insight:** Every tool needed for this phase is already installed in `package.json`. The implementation is purely about composing existing patterns into two new UI components.

## Common Pitfalls

### Pitfall 1: Object URL Memory Leaks
**What goes wrong:** Creating `URL.createObjectURL()` preview URLs without revoking them causes memory leaks. Each created URL holds a reference to the file data in memory.
**Why it happens:** Developers forget cleanup, especially when the component re-renders or the user replaces the file.
**How to avoid:** Revoke the previous URL before creating a new one, and revoke on unmount:
```typescript
useEffect(() => {
  return () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  };
}, [previewUrl]);
```
**Warning signs:** Growing memory usage when users repeatedly select different files.

### Pitfall 2: Race Condition Between Simulated Steps and Real API Response
**What goes wrong:** The API response arrives before all simulated steps have completed, causing a jarring jump from step 2 to "done". Or the API takes longer than expected and all steps complete with the last one stuck in "active" for too long.
**Why it happens:** Fixed timers don't match actual API latency.
**How to avoid:**
- Keep the last step ("Building company profile...") as the catch-all that stays active until the API responds
- Space earlier steps to fill only ~60-70% of the expected wait time (e.g., 5 steps at 2.5s each = 12.5s out of ~15-20s)
- On API response, immediately mark all steps complete with a brief transition
**Warning signs:** Steps finishing before the spinner disappears, or long idle periods on the last step.

### Pitfall 3: CORS on R2 Presigned PUT
**What goes wrong:** Browser blocks the XHR PUT to the presigned URL with a CORS error.
**Why it happens:** R2 bucket CORS rules not configured, or missing `Content-Type` header in the request.
**How to avoid:** This is already solved -- the existing document upload works, meaning CORS is configured on the R2 bucket. The logo upload uses the same bucket, so it inherits the same CORS rules. Just ensure the presigned URL sets `ContentType` correctly.
**Warning signs:** 403 or CORS error in browser console during upload.

### Pitfall 4: logoUrl vs logoKey Naming Confusion
**What goes wrong:** Storing a full URL in the `logoUrl` field but it's actually an R2 object key, or vice versa.
**Why it happens:** The field name `logoUrl` implies a URL, but the value stored is an R2 key like `logos/user123/abc.png`.
**How to avoid:** Name the MongoDB field `logoKey` (consistent with `documentKeys`) and resolve to a URL only when needed for display. Alternatively, keep `logoUrl` but document clearly that it stores an R2 key, not a URL.
**Recommendation:** Use `logoKey` for the model field to be consistent with `documentKeys`.

### Pitfall 5: Conditional Steps Based on Missing Inputs
**What goes wrong:** Showing "Scanning company website..." when no website was provided, or "Reviewing LinkedIn profile..." when no LinkedIn URL was given.
**Why it happens:** Using a static step list regardless of what the user actually provided.
**How to avoid:** Build the step list dynamically based on what inputs were provided:
```typescript
const steps = [
  ...(documentKeys.length > 0 ? [{ label: "Analyzing uploaded documents...", icon: FileText }] : []),
  ...(companyInfo.website ? [{ label: "Scanning company website...", icon: Globe }] : []),
  ...(companyInfo.linkedinUrl ? [{ label: "Reviewing LinkedIn profile...", icon: Linkedin }] : []),
  { label: "Extracting industry sectors...", icon: Search },
  { label: "Identifying core capabilities...", icon: Sparkles },
  { label: "Building company profile...", icon: Building2 },
];
```

### Pitfall 6: Next.js Image Component and Presigned URLs
**What goes wrong:** Using `<Image>` from Next.js with presigned GET URLs causes issues because the URL changes on every render (new signature), breaking Next.js image caching.
**Why it happens:** Next.js Image optimization caches by URL. Presigned URLs are unique each time.
**How to avoid:** For logo display, use a plain `<img>` tag OR set up a stable public URL (R2 public access or Worker proxy). If using `<Image>`, ensure the presigned URL is cached for the component's lifetime (e.g., pass via server component prop, not re-fetched on every render).

## Code Examples

Verified patterns from the existing codebase:

### XHR Upload with Progress (Existing Pattern)
```typescript
// Source: src/components/onboarding/document-dropzone.tsx (lines 8-36)
function uploadFileWithProgress(
  url: string,
  file: File,
  onProgress: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed with status ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });
}
```
**Note:** This helper should be extracted to a shared utility (e.g., `src/lib/upload-with-progress.ts`) so both `DocumentDropzone` and `LogoDropzone` can use it.

### Avatar Component (Existing shadcn)
```tsx
// Source: src/components/ui/avatar.tsx
// Already supports size variants: "default" (32px), "sm" (24px), "lg" (40px)
// For logo preview, use custom className for larger size:
<Avatar className="size-20">
  <AvatarImage src={previewUrl} alt="Company logo" />
  <AvatarFallback>
    <Building2 className="size-8 text-muted-foreground" />
  </AvatarFallback>
</Avatar>
```

### tw-animate-css Enter Animation (Verified)
```html
<!-- Source: tw-animate-css docs (Context7 /wombosvideo/tw-animate-css) -->
<!-- Fade in + slide from bottom with duration -->
<div class="animate-in fade-in slide-in-from-bottom-2 duration-300">
  Step content here
</div>

<!-- Fade in + zoom for checkmark -->
<div class="animate-in fade-in zoom-in duration-200">
  <Check class="size-4 text-green-500" />
</div>
```

### Presigned URL Generation (Existing Pattern to Clone)
```typescript
// Source: src/app/api/upload/presigned/route.ts
const key = `logos/${userId}/${nanoid()}-${filename}`;
const url = await getSignedUrl(
  r2Client,
  new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  }),
  { expiresIn: 3600 }
);
return Response.json({ url, key });
```

### Conditional Step Generation
```typescript
// Build analysis steps dynamically based on available inputs
interface AnalysisStep {
  label: string;
  icon: LucideIcon;
  status: "pending" | "active" | "complete";
}

function buildAnalysisSteps(
  hasDocuments: boolean,
  hasWebsite: boolean,
  hasLinkedin: boolean
): Omit<AnalysisStep, "status">[] {
  return [
    ...(hasDocuments ? [{ label: "Analyzing uploaded documents...", icon: FileText }] : []),
    ...(hasWebsite ? [{ label: "Scanning company website...", icon: Globe }] : []),
    ...(hasLinkedin ? [{ label: "Reviewing LinkedIn profile...", icon: Linkedin }] : []),
    { label: "Extracting industry sectors...", icon: Search },
    { label: "Identifying core capabilities...", icon: Sparkles },
    { label: "Building company profile...", icon: Building2 },
  ];
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| framer-motion for enter/exit animations | CSS `animate-in`/`animate-out` via tw-animate-css | Tailwind v4 (2024) | No JS animation library needed; lighter bundle |
| FileReader.readAsDataURL for previews | URL.createObjectURL | Always better, but now universally recommended | Synchronous, less memory, faster |
| Tailwind config file for custom animations | Inline `@keyframes` in globals.css or `@theme` block | Tailwind v4 (2024) | No tailwind.config.js needed; CSS-native |
| shadcn/ui v1 Avatar (class-based variants) | shadcn/ui v2 Avatar (data-attributes: `data-size`) | 2025 | Already using latest pattern in codebase |

**Deprecated/outdated:**
- `tailwindcss-animate` plugin: Replaced by `tw-animate-css` for Tailwind v4. The codebase already uses the correct library.
- Radix UI separate packages: The codebase uses `radix-ui` unified package (^1.4.3), which is the current standard.

## Open Questions

1. **R2 Public Access vs Presigned GET for Logo Display**
   - What we know: Presigned PUT for upload works. For displaying the logo, we need a read URL.
   - What's unclear: Whether the R2 bucket already has public access enabled. If not, presigned GET URLs work but change on every generation (breaks caching).
   - Recommendation: Start with presigned GET URLs generated server-side. If caching becomes an issue, enable R2 public access or add a Worker proxy later. This is a low-risk decision that can be changed without schema changes (the stored `logoKey` stays the same regardless of serving strategy).

2. **Logo Upload Placement in Wizard Flow**
   - What we know: The todo suggests "after the first onboarding step." The company info form currently has: Company Name, Website, Address, LinkedIn URL.
   - What's unclear: Should the logo upload be inside the company info form (above the fields, between Company Name and Website) or in a separate section below the form?
   - Recommendation: Place it at the top of the company info form, right after the heading and before the Company Name field. A circular dropzone with camera icon centered above the form fields is the standard pattern (similar to profile setup in Slack, Discord, etc.).

3. **Adaptive Step Timing**
   - What we know: Profile generation takes 10-20 seconds. Step count varies (3-6 steps depending on inputs).
   - What's unclear: Exact timing distribution. Should steps be evenly spaced, or front-loaded?
   - Recommendation: Calculate `stepInterval = estimatedDuration * 0.7 / (totalSteps - 1)`. This fills 70% of the expected time with step transitions, leaving the last step as a catch-all buffer. Use ~2.5s per step as default, adjusting based on step count.

## Sources

### Primary (HIGH confidence)
- **Codebase files (direct read):**
  - `src/app/api/upload/presigned/route.ts` -- existing presigned URL pattern
  - `src/components/onboarding/document-dropzone.tsx` -- XHR upload with progress pattern
  - `src/components/onboarding/onboarding-wizard.tsx` -- wizard structure, Step 2 spinner (lines 297-311)
  - `src/components/onboarding/profile-review.tsx` -- ProfileData interface, form layout
  - `src/models/company-profile.ts` -- CompanyProfile schema (needs `logoKey` field)
  - `src/app/onboarding/_actions.ts` -- completeOnboarding server action
  - `src/lib/r2.ts` -- R2 client configuration
  - `src/components/ui/avatar.tsx` -- shadcn Avatar with size variants
  - `src/app/globals.css` -- tw-animate-css import confirmed
  - `package.json` -- all dependencies verified present

- **Context7 /wombosvideo/tw-animate-css** -- `animate-in`, `fade-in`, `slide-in-from-*`, `duration-*` class syntax verified
- **Context7 /react-dropzone/react-dropzone** -- Image preview with `URL.createObjectURL`, `accept` prop for MIME types, memory leak prevention via `URL.revokeObjectURL`

### Secondary (MEDIUM confidence)
- **Vercel AI Elements docs (https://elements.ai-sdk.dev)** -- Component architecture for chain-of-thought/reasoning/task; confirms simulated-step approach is standard for AI progress display
- **Cloudflare R2 presigned URL docs (https://developers.cloudflare.com/r2/api/s3/presigned-urls/)** -- Confirms presigned URLs work only with S3 API domain, not custom domains
- **Cloudflare community (https://community.cloudflare.com/t/general-advice-concerning-public-r2-buckets-vs-pre-signed-urls/718993)** -- Public bucket vs presigned URL tradeoffs

### Tertiary (LOW confidence)
- None -- all findings verified with primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and used in codebase; zero new dependencies
- Architecture: HIGH -- patterns directly cloned from existing codebase code; file locations known
- Pitfalls: HIGH -- identified from real patterns in codebase (CORS already solved, memory leaks well-documented in react-dropzone)
- AI animation approach: MEDIUM -- simulated steps is standard (confirmed by Vercel AI Elements), but exact timing may need tuning

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (stable -- no fast-moving dependencies)
