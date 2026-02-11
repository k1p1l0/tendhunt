# Phase 3: Onboarding & Company Profile - Research

**Researched:** 2026-02-11
**Domain:** File upload, AI document analysis, onboarding flow, credit system initialization
**Confidence:** HIGH

## Summary

Phase 3 implements the onboarding flow where new users upload company documents (PDFs, DOCX, capability statements), an AI analyzes those documents to generate a structured company profile, the user reviews/edits the profile, and receives 10 free signup credits. The phase spans four requirements: AUTH-02 (document upload), AUTH-03 (AI profile generation), AUTH-04 (profile review/edit), AUTH-06 (signup credit bonus).

The architecture follows a well-established pattern: client-side drag-and-drop via `react-dropzone`, file storage on Cloudflare R2 via presigned URLs (avoiding server-side file handling), text extraction from PDFs/DOCX on the server, AI analysis via the Anthropic TypeScript SDK with structured JSON output using `output_config` and `json_schema`, and Clerk's `publicMetadata` for tracking onboarding completion state. The credit bonus (AUTH-06) hooks into the existing `CreditAccount` and `CreditTransaction` models already defined in Phase 1.

**Primary recommendation:** Use presigned URL uploads to R2 (files never touch the Next.js server), extract text server-side after upload using `pdf-parse` (PDF) and `officeparser` (DOCX/other), send extracted text to Claude Haiku 4.5 with `output_config` structured JSON output for profile generation, and use Clerk `publicMetadata` + middleware redirect for the onboarding gate.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-dropzone` | ^14.x | Drag-and-drop file upload UI | De facto standard for React file uploads; 10M+ weekly downloads; used by shadcn-dropzone |
| `@aws-sdk/client-s3` | ^3.x | S3-compatible client for R2 uploads | Official AWS SDK, works with Cloudflare R2's S3-compatible API |
| `@aws-sdk/s3-request-presigner` | ^3.x | Generate presigned upload URLs | Standard way to create temporary upload permissions without exposing credentials |
| `@anthropic-ai/sdk` | ^0.37+ | Claude API client for AI profile generation | Official Anthropic TypeScript SDK with structured output support |
| `pdf-parse` | ^3.x | Extract text from PDF documents | Pure TypeScript, cross-platform PDF text extraction; works in Node.js |
| `officeparser` | ^6.x | Extract text from DOCX/PPTX/XLSX | Robust strictly-typed library supporting docx, pptx, xlsx, odt, pdf, rtf |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `nanoid` | ^5.x | Generate unique file keys for R2 | Lightweight ID generation for upload file keys |
| `zod` | ^4.3 (already installed) | Schema validation for profile data | Validate AI-generated profile structure; also for `output_config` schema |
| `zustand` | ^5.0 (already installed) | Client-side upload state management | Track upload progress, file list, upload status in onboarding wizard |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `react-dropzone` | Native HTML5 drag-and-drop | react-dropzone handles edge cases (file rejection, validation, accessibility); not worth hand-rolling |
| R2 presigned URLs | Direct server upload via formData | Presigned URLs avoid Next.js server handling large files; better for production; R2 is the decided storage |
| `pdf-parse` + `officeparser` | `office-text-extractor` | office-text-extractor wraps multiple extractors but adds unnecessary dependencies; separate libs give more control |
| `officeparser` | `mammoth` (DOCX only) | officeparser handles DOCX + PPTX + XLSX in one library; mammoth only does DOCX |
| Claude structured output (`output_config`) | Tool-use forced output | `output_config` with `json_schema` is the native structured output feature; cleaner than tool-use workaround |

**Installation:**
```bash
npm install react-dropzone @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @anthropic-ai/sdk pdf-parse officeparser nanoid
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── onboarding/
│   │   ├── layout.tsx           # Onboarding layout (redirect if already complete)
│   │   ├── page.tsx             # Onboarding wizard (multi-step)
│   │   └── _actions.ts          # Server actions (completeOnboarding, generateProfile)
│   └── api/
│       ├── upload/
│       │   └── presigned/
│       │       └── route.ts     # Generate presigned URL for R2
│       └── profile/
│           └── generate/
│               └── route.ts     # AI profile generation endpoint
├── components/
│   └── onboarding/
│       ├── document-dropzone.tsx # Drag-and-drop upload component
│       ├── upload-progress.tsx   # File upload progress display
│       ├── profile-review.tsx    # Review/edit AI-generated profile
│       └── onboarding-wizard.tsx # Multi-step wizard container
├── lib/
│   ├── r2.ts                    # R2 S3 client singleton
│   ├── anthropic.ts             # Anthropic client singleton
│   └── extract-text.ts          # PDF/DOCX text extraction utilities
├── models/
│   ├── company-profile.ts       # Mongoose schema for company profiles
│   └── document.ts              # Mongoose schema for uploaded documents metadata
└── types/
    └── globals.d.ts             # Clerk session claims types (onboardingComplete)
```

### Pattern 1: Presigned URL Upload Flow
**What:** Client requests a presigned URL from the server, then uploads directly to R2 from the browser. The server never handles the file bytes.
**When to use:** All file uploads in the onboarding flow.
**Example:**
```typescript
// src/lib/r2.ts - R2 client singleton
// Source: Cloudflare R2 docs (https://developers.cloudflare.com/r2/objects/upload-objects/)
import { S3Client } from "@aws-sdk/client-s3";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// src/app/api/upload/presigned/route.ts
import { auth } from "@clerk/nextjs/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client } from "@/lib/r2";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { filename, contentType } = await req.json();
  const key = `documents/${userId}/${nanoid()}-${filename}`;

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
}
```

### Pattern 2: Clerk Onboarding Gate via Middleware
**What:** Clerk middleware checks `publicMetadata.onboardingComplete` and redirects new users to `/onboarding` until they finish.
**When to use:** Applied globally via `proxy.ts` (Next.js 16 middleware file).
**Example:**
```typescript
// src/proxy.ts - Updated middleware with onboarding gate
// Source: Clerk docs (https://clerk.com/docs/guides/development/add-onboarding-flow)
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  const { userId, sessionClaims } = await auth();

  // Public routes: no auth required
  if (isPublicRoute(request)) return;

  // Not authenticated: redirect to sign-in
  if (!userId) {
    return (await auth()).redirectToSignIn({ returnBackUrl: request.url });
  }

  // Onboarding route: allow through
  if (isOnboardingRoute(request)) return;

  // Check if onboarding is complete
  const onboardingComplete = sessionClaims?.metadata?.onboardingComplete;
  if (!onboardingComplete) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }
});
```

### Pattern 3: AI Profile Generation with Structured Output
**What:** Send extracted document text to Claude Haiku 4.5 with `output_config` specifying a JSON schema, receiving a structured company profile.
**When to use:** After documents are uploaded and text is extracted.
**Example:**
```typescript
// src/lib/anthropic.ts
// Source: Anthropic SDK docs (https://github.com/anthropics/anthropic-sdk-typescript)
import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Profile generation with structured output
// Source: Claude structured outputs (https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
const response = await anthropic.messages.create({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 2048,
  messages: [{
    role: "user",
    content: `Analyze these company documents and extract a structured company profile.

Documents:
${documentTexts.join("\n\n---\n\n")}

Extract: company sectors, capabilities, keywords, certifications, ideal contract description, and company summary.`
  }],
  output_config: {
    format: {
      type: "json_schema",
      schema: {
        type: "object",
        properties: {
          companyName: { type: "string" },
          summary: { type: "string" },
          sectors: { type: "array", items: { type: "string" } },
          capabilities: { type: "array", items: { type: "string" } },
          keywords: { type: "array", items: { type: "string" } },
          certifications: { type: "array", items: { type: "string" } },
          idealContractDescription: { type: "string" },
          companySize: { type: "string" },
          regions: { type: "array", items: { type: "string" } },
        },
        required: ["summary", "sectors", "capabilities", "keywords", "idealContractDescription"],
        additionalProperties: false,
      },
    },
  },
});
```

### Pattern 4: Credit Bonus on Onboarding Completion
**What:** When onboarding completes, create a CreditAccount with 10 credits and a SIGNUP_BONUS transaction, atomically.
**When to use:** In the `completeOnboarding` server action, after profile is saved.
**Example:**
```typescript
// In the completeOnboarding server action
import { CreditAccount, CreditTransaction } from "@/models/credit";
import { dbConnect } from "@/lib/mongodb";

await dbConnect();

// Create credit account with signup bonus (idempotent check)
const existing = await CreditAccount.findOne({ userId });
if (!existing) {
  await CreditAccount.create({
    userId,
    balance: 10,
    totalEarned: 10,
    totalSpent: 0,
  });

  await CreditTransaction.create({
    userId,
    type: "SIGNUP_BONUS",
    amount: 10,
    description: "Welcome to TendHunt! 10 free credits.",
    balanceAfter: 10,
  });
}
```

### Anti-Patterns to Avoid
- **Uploading files through Next.js API routes:** Files should go directly to R2 via presigned URLs. Routing multi-MB files through the serverless function wastes memory and adds latency.
- **Storing files in MongoDB:** GridFS is not appropriate here. Use R2 for binary file storage, MongoDB for metadata only.
- **Calling Claude on every keystroke in the profile editor:** Only call the AI once after document upload; subsequent edits are purely client-side until save.
- **Blocking the onboarding flow on AI processing:** Show a loading state during AI analysis; don't make the user wait without feedback.
- **Skipping idempotency on credit creation:** The webhook could fire twice; always check for existing CreditAccount before creating.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop file upload | Custom HTML5 DnD handlers | `react-dropzone` | File validation, accessibility, edge cases (iOS, touch) are deceptively complex |
| PDF text extraction | Custom PDF parser | `pdf-parse` | PDF format is complex with fonts, encodings, embedded objects |
| DOCX text extraction | Custom XML parser for .docx | `officeparser` | DOCX is a ZIP of XML files; table handling, styles, headers/footers are complex |
| S3-compatible presigned URLs | Manual AWS v4 signature | `@aws-sdk/s3-request-presigner` | SigV4 signing is error-prone and not worth implementing |
| Structured JSON from AI | Custom JSON parsing/retrying | Claude `output_config` with `json_schema` | Schema-constrained generation guarantees valid JSON matching your schema |
| Onboarding flow gating | Custom session/cookie checks | Clerk `publicMetadata` + middleware | Clerk handles session tokens, metadata sync, and provides type-safe session claims |

**Key insight:** Every piece of this pipeline has a mature, standard solution. The value is in how they compose together, not in building any one piece from scratch.

## Common Pitfalls

### Pitfall 1: Presigned URL CORS Errors
**What goes wrong:** Browser upload to R2 fails with CORS error because the bucket CORS policy is not configured.
**Why it happens:** R2 buckets have no CORS rules by default. Browser PUT requests trigger CORS preflight (OPTIONS).
**How to avoid:** Configure R2 bucket CORS policy in Cloudflare dashboard before first upload:
```json
[
  {
    "AllowedOrigins": ["https://app.tendhunt.com", "http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```
**Warning signs:** Network tab shows `OPTIONS` request failing with no `Access-Control-Allow-Origin` header.

### Pitfall 2: Large File Upload Timeouts
**What goes wrong:** Users uploading large PDFs (10MB+) experience timeouts or failures.
**Why it happens:** Presigned URL expiry too short, or no progress feedback so user navigates away.
**How to avoid:** Set presigned URL expiry to 3600 seconds (1 hour). Show upload progress bar using XMLHttpRequest or fetch with ReadableStream. Set reasonable file size limit (10MB per file for hackathon).
**Warning signs:** Uploads succeed locally but fail on slow connections.

### Pitfall 3: Text Extraction Failure on Scanned PDFs
**What goes wrong:** `pdf-parse` returns empty string for scanned/image-based PDFs (no selectable text).
**Why it happens:** Scanned PDFs contain images, not text layers. Text extraction only works on text-based PDFs.
**How to avoid:** Accept this limitation for hackathon MVP. Show a warning: "We couldn't extract text from this document. It may be a scanned image. Try uploading a text-based PDF or DOCX." Fall back gracefully -- let user proceed with other documents.
**Warning signs:** `result.text.trim().length === 0` after extraction.

### Pitfall 4: Clerk Session Token Not Updated After Metadata Change
**What goes wrong:** After setting `publicMetadata.onboardingComplete = true`, the middleware still redirects to onboarding.
**Why it happens:** Clerk session tokens are cached. The `publicMetadata` update via `clerkClient.users.updateUser()` doesn't immediately reflect in the current session token.
**How to avoid:** Call `user.reload()` on the client after the server action completes (forces token refresh). The Clerk docs explicitly recommend this pattern.
**Warning signs:** User gets stuck in redirect loop after completing onboarding.

### Pitfall 5: AI Profile Generation Costs
**What goes wrong:** Large documents consume excessive tokens and cost more than expected.
**Why it happens:** Sending full document text to Claude without truncation.
**How to avoid:** Truncate extracted text to ~8000 tokens (~32000 characters) before sending to Claude Haiku 4.5. For multiple documents, take the first N characters from each. The profile generation doesn't need every word -- it needs key themes.
**Warning signs:** API costs spike, or responses take too long (>30s).

### Pitfall 6: Onboarding Route Not Excluded from Auth Protection
**What goes wrong:** New users get redirected to sign-in when trying to access /onboarding, or get caught in infinite redirect loop.
**Why it happens:** The existing `proxy.ts` middleware calls `auth.protect()` on non-public routes, which would redirect to sign-in for users without the right metadata.
**How to avoid:** The middleware must explicitly allow the `/onboarding` route for authenticated users AND check onboarding status BEFORE calling `auth.protect()`.
**Warning signs:** Infinite redirects or 307 loops in browser network tab.

### Pitfall 7: Zod 4 vs Zod 3 for Anthropic SDK
**What goes wrong:** `zodOutputFormat` or `zodToJsonSchema` fails because the Anthropic SDK may expect Zod 3 syntax.
**Why it happens:** This project uses Zod 4 (^4.3.6) which has a different API from Zod 3. The Anthropic SDK's Zod helpers may not be compatible yet.
**How to avoid:** Use `output_config` with a raw `json_schema` object instead of Zod helpers. Define the JSON schema manually -- it's simple for this use case and avoids Zod version conflicts entirely.
**Warning signs:** TypeScript errors on `zodOutputFormat` import or runtime schema conversion failures.

## Code Examples

Verified patterns from official sources:

### Document Dropzone Component
```typescript
// src/components/onboarding/document-dropzone.tsx
// Source: react-dropzone docs (https://react-dropzone.js.org/)
"use client";

import { useDropzone } from "react-dropzone";
import { useCallback, useState } from "react";

interface UploadedFile {
  file: File;
  key: string;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
}

export function DocumentDropzone({
  onFilesUploaded,
}: {
  onFilesUploaded: (keys: string[]) => void;
}) {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      key: "",
      status: "pending" as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);

    const uploadedKeys: string[] = [];

    for (const fileEntry of newFiles) {
      // 1. Get presigned URL
      const res = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: fileEntry.file.name,
          contentType: fileEntry.file.type,
        }),
      });
      const { url, key } = await res.json();

      // 2. Upload to R2
      await fetch(url, {
        method: "PUT",
        body: fileEntry.file,
        headers: { "Content-Type": fileEntry.file.type },
      });

      uploadedKeys.push(key);
    }

    onFilesUploaded(uploadedKeys);
  }, [onFilesUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
      "text/plain": [".txt"],
    },
    maxFiles: 10,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <div
      {...getRootProps()}
      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-primary"
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop your documents here...</p>
      ) : (
        <p>Drag & drop company documents here, or click to select</p>
      )}
      <p className="text-sm text-muted-foreground mt-2">
        PDF, DOCX, DOC, TXT (max 10MB each, up to 10 files)
      </p>
    </div>
  );
}
```

### Text Extraction Utility
```typescript
// src/lib/extract-text.ts
// Source: pdf-parse docs (https://github.com/mehmet-kozan/pdf-parse)
// Source: officeparser docs (https://github.com/harshankur/officeParser)
import { PDFParse } from "pdf-parse";

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === "application/pdf") {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    // officeparser v6 returns AST, call toText() for plain text
    const { parseOffice } = await import("officeparser");
    const ast = await parseOffice(buffer);
    return ast.toText();
  }

  if (mimeType === "text/plain") {
    return buffer.toString("utf-8");
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}
```

### Company Profile Mongoose Schema
```typescript
// src/models/company-profile.ts
import mongoose, { Schema, type InferSchemaType } from "mongoose";

const companyProfileSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true }, // Clerk user ID
    companyName: { type: String, default: "" },
    summary: { type: String, default: "" },
    sectors: [{ type: String }],
    capabilities: [{ type: String }],
    keywords: [{ type: String }],
    certifications: [{ type: String }],
    idealContractDescription: { type: String, default: "" },
    companySize: { type: String, default: "" },
    regions: [{ type: String }],
    // Document references (R2 keys)
    documentKeys: [{ type: String }],
    // AI generation metadata
    generatedAt: { type: Date },
    lastEditedAt: { type: Date },
    isAIGenerated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type ICompanyProfile = InferSchemaType<typeof companyProfileSchema>;

const CompanyProfile =
  mongoose.models.CompanyProfile ||
  mongoose.model("CompanyProfile", companyProfileSchema);

export default CompanyProfile;
```

### Clerk Session Claims TypeScript Declaration
```typescript
// src/types/globals.d.ts
// Source: Clerk docs (https://clerk.com/docs/guides/development/add-onboarding-flow)
declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      onboardingComplete?: boolean;
    };
  }
}

export {};
```

### Complete Onboarding Server Action
```typescript
// src/app/onboarding/_actions.ts
"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import CompanyProfile from "@/models/company-profile";
import { CreditAccount, CreditTransaction } from "@/models/credit";

export async function completeOnboarding(profileData: {
  companyName: string;
  summary: string;
  sectors: string[];
  capabilities: string[];
  keywords: string[];
  certifications: string[];
  idealContractDescription: string;
  companySize: string;
  regions: string[];
  documentKeys: string[];
}) {
  const { userId } = await auth();
  if (!userId) return { error: "Not authenticated" };

  await dbConnect();

  // Save company profile
  await CompanyProfile.findOneAndUpdate(
    { userId },
    { ...profileData, lastEditedAt: new Date() },
    { upsert: true, new: true }
  );

  // Create credit account with signup bonus (idempotent)
  const existingAccount = await CreditAccount.findOne({ userId });
  if (!existingAccount) {
    await CreditAccount.create({
      userId,
      balance: 10,
      totalEarned: 10,
      totalSpent: 0,
    });
    await CreditTransaction.create({
      userId,
      type: "SIGNUP_BONUS",
      amount: 10,
      description: "Welcome to TendHunt! 10 free credits.",
      balanceAfter: 10,
    });
  }

  // Mark onboarding complete in Clerk
  const client = await clerkClient();
  await client.users.updateUser(userId, {
    publicMetadata: { onboardingComplete: true },
  });

  return { success: true };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Upload via formData to API route | Presigned URL direct-to-storage | 2023+ | Server never handles file bytes; better for serverless |
| Claude tool_choice for JSON | `output_config` with `json_schema` | Mid-2025 | Native structured output; guaranteed schema compliance |
| Clerk `unsafeMetadata` for onboarding | Clerk `publicMetadata` + session claims | 2024+ | Server-side accessible, synced to session token |
| pdf-parse v1 (callback API) | pdf-parse v3 (class-based, async) | 2025 | `new PDFParse({ data: buffer })` instead of `pdfParse(buffer)` |
| officeparser v5 (plain text) | officeparser v6 (AST output) | Dec 2025 | Returns structured AST; call `.toText()` for plain text extraction |
| `middleware.ts` in Next.js | `proxy.ts` in Next.js 16 | Next.js 16 | File renamed; existing project already uses `proxy.ts` |

**Deprecated/outdated:**
- `pdf-parse` v1 callback style (`pdfParse(buffer).then(...)`) -- use v3 class-based `PDFParse` constructor
- `officeparser` v5 simple text API -- v6 returns AST; migration needed if previously used
- Claude `tool_choice` trick for structured JSON -- `output_config.format.type: "json_schema"` is the proper approach now
- `claude-3-5-haiku-20241022` -- superseded by `claude-haiku-4-5-20251001` (better performance, same pricing tier at $1/MTok input, $5/MTok output)

## Environment Variables

New environment variables required for Phase 3:

```env
# Cloudflare R2 Storage
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<your-r2-access-key>
R2_SECRET_ACCESS_KEY=<your-r2-secret-key>
R2_BUCKET_NAME=tendhunt-documents

# Anthropic Claude API
ANTHROPIC_API_KEY=<your-anthropic-api-key>

# Clerk (update existing)
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding  # Changed from /dashboard
```

These need to be added to both `.env.local` and `.env.example`, and the `env.ts` Zod schema should be updated to validate them.

## Onboarding Flow Design

### Multi-Step Wizard

The onboarding flow should be a 3-step wizard:

1. **Step 1: Upload Documents** -- Drag-and-drop zone for PDFs, DOCX, TXT. User can upload 1-10 documents. "Skip" option available.
2. **Step 2: AI Profile Generation** -- Loading state while AI analyzes documents. Show extracted sectors/capabilities as they populate. If user skipped upload, show empty profile form.
3. **Step 3: Review & Edit Profile** -- Editable form with AI-generated fields pre-filled. User can modify any field. "Save & Continue" button.

After saving, the server action:
- Saves CompanyProfile to MongoDB
- Creates CreditAccount with 10 credits + SIGNUP_BONUS transaction
- Updates Clerk publicMetadata with `onboardingComplete: true`
- Client calls `user.reload()` and redirects to `/dashboard`

### Skip Option

Users should be able to skip document upload and manually fill in their profile. This prevents blocking users who don't have documents ready. The profile form should work both with AI pre-fill and manual entry.

## Open Questions

1. **R2 Bucket Creation**
   - What we know: R2 is the decided storage backend; presigned URLs are the upload pattern
   - What's unclear: Whether the R2 bucket is already created in Cloudflare dashboard, and whether API tokens exist
   - Recommendation: Plan should include a manual step or verification for R2 bucket + CORS setup

2. **Anthropic API Key**
   - What we know: Claude Haiku 4.5 is the decided AI model; structured output is supported
   - What's unclear: Whether an Anthropic API key is already provisioned
   - Recommendation: Plan should include env var setup step; document that `ANTHROPIC_API_KEY` is required

3. **officeparser v6 Breaking Changes**
   - What we know: v6 changed from plain text output to AST-based output
   - What's unclear: Exact import syntax and whether `parseOffice(buffer).toText()` is the correct v6 API
   - Recommendation: LOW confidence on exact officeparser v6 API; verify at implementation time. Fallback: use `mammoth` for DOCX-only extraction if officeparser causes issues

4. **File Size Limits on Cloudflare Pages**
   - What we know: Presigned URLs bypass Next.js server for the actual upload
   - What's unclear: Whether there are request body limits for the presigned URL generation API route itself (it only sends filename/contentType, so should be fine)
   - Recommendation: The presigned URL request is tiny JSON; the actual file goes directly to R2. No issue expected.

## Sources

### Primary (HIGH confidence)
- Context7 `/vercel/next.js/v16.1.5` -- File upload API route patterns, FormData handling
- Context7 `/websites/developers_cloudflare_r2` -- R2 presigned URLs, CORS config, S3-compatible upload
- Context7 `/anthropics/anthropic-sdk-typescript` -- Message creation, tool use, SDK patterns
- Context7 `/react-dropzone/react-dropzone` -- useDropzone hook, accept/maxFiles/maxSize options
- Context7 `/mehmet-kozan/pdf-parse` -- PDFParse class constructor, getText(), buffer loading
- Context7 `/websites/platform_claude_en` -- Structured output with `output_config`, `json_schema` format, zodOutputFormat
- Clerk official docs (https://clerk.com/docs/guides/development/add-onboarding-flow) -- Onboarding flow with publicMetadata and middleware
- Anthropic model overview (https://platform.claude.com/docs/en/about-claude/models/overview) -- `claude-haiku-4-5-20251001` model ID, pricing

### Secondary (MEDIUM confidence)
- WebFetch of https://ruanmartinelli.com/blog/cloudflare-r2-pre-signed-urls/ -- Complete R2 presigned URL implementation pattern
- WebSearch verified: officeparser v6 AST-based API with `.toText()` method
- WebSearch verified: Claude structured output via `output_config.format.type: "json_schema"`
- WebSearch verified: Clerk `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL` for post-signup redirect

### Tertiary (LOW confidence)
- officeparser v6 exact import/API syntax -- verified multiple sources but v6 is very new (Dec 2025); may have undocumented quirks
- `@anthropic-ai/sdk` Zod 4 compatibility -- the SDK ships Zod helpers but project uses Zod 4; raw JSON schema recommended as safe path

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries are well-established with official docs verified via Context7
- Architecture: HIGH -- Presigned URL + middleware gating + structured AI output are proven patterns with multiple production references
- Pitfalls: HIGH -- Common issues documented in official docs and community threads
- officeparser v6 API: LOW -- Very new release, limited community verification

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (stable domain; 30 days)
