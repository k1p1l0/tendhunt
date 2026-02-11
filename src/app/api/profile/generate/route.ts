import { auth } from "@clerk/nextjs/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "@/lib/r2";
import { anthropic } from "@/lib/anthropic";
import { extractTextFromBuffer, MAX_TEXT_LENGTH } from "@/lib/extract-text";
import { fetchWebContentWithOgImage } from "@/lib/fetch-web-content";
import { extractWebInfo } from "@/lib/extract-web-info";
import { scrapeLinkedInCompany } from "@/lib/linkedin-scraper";

/** Map file extension to MIME type for text extraction */
function mimeTypeFromKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "doc":
      return "application/msword";
    case "txt":
      return "text/plain";
    default:
      return "application/octet-stream";
  }
}

interface CompanyInfo {
  companyName?: string;
  website?: string;
  address?: string;
  linkedinUrl?: string;
}

interface RequestBody {
  documentKeys?: string[];
  companyInfo?: CompanyInfo;
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await request.json()) as RequestBody;
    const { documentKeys, companyInfo } = body;

    // Relaxed validation: require either documentKeys (non-empty) OR companyInfo with at least companyName or website
    const hasDocuments =
      Array.isArray(documentKeys) &&
      documentKeys.length > 0 &&
      documentKeys.every((k: unknown) => typeof k === "string");

    const hasCompanyInfo =
      companyInfo &&
      ((companyInfo.companyName && companyInfo.companyName.trim()) ||
        (companyInfo.website && companyInfo.website.trim()));

    if (!hasDocuments && !hasCompanyInfo) {
      return Response.json(
        {
          error:
            "Provide either documentKeys (non-empty array) or companyInfo with at least companyName or website",
        },
        { status: 400 }
      );
    }

    // ---- 1. Extract text from documents (existing logic) ----
    const extractedTexts: string[] = [];

    if (hasDocuments && documentKeys) {
      for (const key of documentKeys) {
        try {
          const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: key,
          });
          const response = await r2Client.send(command);

          if (!response.Body) {
            console.warn(`Empty body for document: ${key}`);
            continue;
          }

          // Convert stream to buffer
          const chunks: Uint8Array[] = [];
          const stream = response.Body as AsyncIterable<Uint8Array>;
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
          const buffer = Buffer.concat(chunks);

          const mimeType = mimeTypeFromKey(key);
          const text = await extractTextFromBuffer(buffer, mimeType);

          if (text.trim().length === 0) {
            console.warn(
              `No text extracted from document: ${key} (may be scanned/image-based)`
            );
            continue;
          }

          extractedTexts.push(text);
        } catch (err) {
          console.warn(`Failed to process document ${key}:`, err);
          continue;
        }
      }
    }

    // ---- 2. Fetch web content and LinkedIn data IN PARALLEL ----
    const webExtractions: string[] = [];

    // Website content extraction (returns both text and og:image)
    const websitePromise =
      companyInfo?.website?.trim()
        ? fetchWebContentWithOgImage(companyInfo.website)
        : Promise.resolve({ text: null, ogImage: null });

    // LinkedIn scraping via Apify actors
    const linkedInPromise =
      companyInfo?.linkedinUrl?.trim()
        ? scrapeLinkedInCompany(companyInfo.linkedinUrl)
        : Promise.resolve({ profile: null, posts: null, logoUrl: null });

    const [websiteResult, linkedInResult] = await Promise.allSettled([
      websitePromise,
      linkedInPromise,
    ]);

    // Extract og:image and logo URLs for logoUrl resolution
    let ogImageUrl: string | null = null;
    let linkedInLogoUrl: string | null = null;

    // Add website extraction
    if (
      websiteResult.status === "fulfilled" &&
      websiteResult.value
    ) {
      ogImageUrl = websiteResult.value.ogImage;
      const websiteText = websiteResult.value.text;
      if (websiteText) {
        const extracted = await extractWebInfo(websiteText, "company website");
        if (extracted) {
          webExtractions.push(
            `--- Company Website ---\n${extracted}`
          );
        }
      }
    }

    // Add LinkedIn profile data
    if (linkedInResult.status === "fulfilled") {
      const linkedInData = linkedInResult.value;
      linkedInLogoUrl = linkedInData.logoUrl;
      if (linkedInData.profile) {
        webExtractions.push(
          `--- LinkedIn Company Profile ---\n${linkedInData.profile}`
        );
      }
      if (linkedInData.posts) {
        webExtractions.push(
          `--- LinkedIn Recent Activity ---\n${linkedInData.posts}`
        );
      }
    }

    // Determine final logoUrl: LinkedIn logo (priority) > og:image (fallback) > null
    const logoUrl = linkedInLogoUrl || ogImageUrl || null;

    // ---- 3. Build combined context ----
    const contextParts: string[] = [];

    // a. Company metadata
    if (companyInfo?.companyName?.trim()) {
      contextParts.push(`Company Name: ${companyInfo.companyName.trim()}`);
    }
    if (companyInfo?.address?.trim()) {
      contextParts.push(`Address: ${companyInfo.address.trim()}`);
    }

    // b. Document text
    if (extractedTexts.length > 0) {
      contextParts.push(
        `--- Uploaded Documents ---\n${extractedTexts.join("\n\n---\n\n")}`
      );
    }

    // c. Web extractions
    if (webExtractions.length > 0) {
      contextParts.push(
        `--- Web Content ---\n${webExtractions.join("\n\n")}`
      );
    }

    // Edge case: if ALL sources yield no content
    if (contextParts.length === 0) {
      return Response.json({
        profile: null,
        logoUrl: null,
        warning:
          "No content could be gathered from documents, website, or LinkedIn. Please provide more information.",
      });
    }

    // Concatenate and truncate
    let combinedText = contextParts.join("\n\n");
    if (combinedText.length > MAX_TEXT_LENGTH) {
      combinedText = combinedText.substring(0, MAX_TEXT_LENGTH);
    }

    // ---- 4. Call Claude Haiku 4.5 with structured output ----
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system:
        "You are an expert at analyzing company information for UK government procurement. Extract structured company intelligence from the provided content, which may include uploaded documents, website content, and LinkedIn company profile data including recent posts. Be thorough but concise.",
      messages: [
        {
          role: "user",
          content: `Analyze the following company information and extract a structured company profile for UK government procurement matching. The content may include uploaded documents, website content, LinkedIn company profile data, and recent LinkedIn posts.

Content:
${combinedText}

Extract the following information:
- Company name (if identifiable)
- Website URL (if available)
- Company address (if available)
- LinkedIn company page URL (if available)
- A concise 2-3 sentence summary of what the company does
- Industry sectors they operate in (e.g., IT, Healthcare, Construction, Defence)
- Key capabilities and services they offer
- Important keywords for contract matching
- Any certifications mentioned (e.g., ISO 27001, Cyber Essentials, G-Cloud)
- A description of their ideal government contract
- Estimated company size (e.g., "1-10", "11-50", "51-200", "201-1000", "1000+")
- UK regions they operate in (e.g., "London", "South East", "National")`,
        },
      ],
      // Raw JSON schema -- not zodOutputFormat (avoids Zod 4 compatibility issues)
      output_config: {
        format: {
          type: "json_schema" as const,
          schema: {
            type: "object" as const,
            properties: {
              companyName: { type: "string" as const },
              website: { type: "string" as const },
              address: { type: "string" as const },
              linkedinUrl: { type: "string" as const },
              summary: { type: "string" as const },
              sectors: {
                type: "array" as const,
                items: { type: "string" as const },
              },
              capabilities: {
                type: "array" as const,
                items: { type: "string" as const },
              },
              keywords: {
                type: "array" as const,
                items: { type: "string" as const },
              },
              certifications: {
                type: "array" as const,
                items: { type: "string" as const },
              },
              idealContractDescription: { type: "string" as const },
              companySize: { type: "string" as const },
              regions: {
                type: "array" as const,
                items: { type: "string" as const },
              },
            },
            required: [
              "summary",
              "sectors",
              "capabilities",
              "keywords",
              "idealContractDescription",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    // Parse the structured response
    const content = response.content[0];
    if (content.type === "text") {
      const profile = JSON.parse(content.text);
      return Response.json({ profile, logoUrl });
    }

    return Response.json(
      { error: "Unexpected response format from AI" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Profile generation error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate profile",
      },
      { status: 500 }
    );
  }
}
