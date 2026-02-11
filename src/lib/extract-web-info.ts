import { anthropic } from "@/lib/anthropic";

/** Maximum characters to send to Claude for web extraction */
const MAX_WEB_CONTENT_LENGTH = 15_000;

/**
 * Extract concise company information from web content using Claude Haiku.
 * Returns plain text summary (not JSON) -- feeds into the main profile generation prompt as additional context.
 * Returns null if content is empty, too short, or extraction fails.
 */
export async function extractWebInfo(
  content: string,
  sourceLabel: string
): Promise<string | null> {
  if (!content || content.length < 50) {
    return null;
  }

  const truncated =
    content.length > MAX_WEB_CONTENT_LENGTH
      ? content.substring(0, MAX_WEB_CONTENT_LENGTH)
      : content;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system:
        "You extract concise company information from web content. Output only the relevant company facts, services, and capabilities. Be brief and factual.",
      messages: [
        {
          role: "user",
          content: `Extract key company information from this ${sourceLabel} content. Focus on: what the company does, services offered, industries served, certifications, locations, and team size. Ignore navigation, ads, and boilerplate.\n\nContent:\n${truncated}`,
        },
      ],
    });

    const textBlock = response.content[0];
    if (textBlock.type === "text" && textBlock.text.length > 20) {
      return textBlock.text;
    }

    return null;
  } catch (err) {
    console.warn(`Failed to extract web info from ${sourceLabel}:`, err);
    return null;
  }
}
