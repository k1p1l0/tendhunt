// ---------------------------------------------------------------------------
// Nav/footer-focused HTML extraction + spend keyword detection
// ---------------------------------------------------------------------------

const SPEND_KEYWORDS = [
  "spending",
  "expenditure",
  "transparency",
  "payments over",
  "spend over",
  "csv",
  ".csv",
  ".xls",
  "download",
  "freedom of information",
  "publication scheme",
  "invoices over",
  "payments to suppliers",
  "payment data",
  "spend data",
  "monthly spend",
  "financial transparency",
  "open government licence",
  "open data",
  "25,000",
  "£25",
  "£500",
  "procurement",
] as const;

/**
 * Extract nav, header, footer, and sidebar sections from HTML.
 * These sections are where transparency links typically live on UK public sector sites.
 * Falls back to stripped HTML if nav/footer extraction yields insufficient content.
 */
export function extractNavAndFooter(
  html: string,
  maxChars = 20000
): string {
  const sections: string[] = [];

  // Extract <nav> sections
  const navMatches = html.match(/<nav[\s\S]*?<\/nav>/gi) ?? [];
  sections.push(...navMatches);

  // Extract <header> sections
  const headerMatches = html.match(/<header[\s\S]*?<\/header>/gi) ?? [];
  sections.push(...headerMatches);

  // Extract <footer> sections
  const footerMatches = html.match(/<footer[\s\S]*?<\/footer>/gi) ?? [];
  sections.push(...footerMatches);

  // Extract sidebar/aside sections
  const asideMatches = html.match(/<aside[\s\S]*?<\/aside>/gi) ?? [];
  sections.push(...asideMatches);

  // Extract common sidebar class patterns
  const sidebarMatches =
    html.match(/<div[^>]*class="[^"]*(?:sidebar|side-nav|subnav)[^"]*"[\s\S]*?<\/div>/gi) ?? [];
  sections.push(...sidebarMatches);

  const combined = sections.join("\n");

  // If we found substantial nav/footer content (>2K chars), use it
  if (combined.length > 2000) {
    return stripScriptsAndStyles(combined).slice(0, maxChars);
  }

  // Fallback: full stripped HTML with higher limit
  return stripScriptsAndStyles(html).slice(0, maxChars);
}

/**
 * Extract main content sections from HTML. Used as fallback when nav/footer
 * extraction yields insufficient content for AI analysis.
 * Priority: <main> → <article> → #content/.content → stripped body.
 */
export function extractMainContent(
  html: string,
  maxChars = 30000
): string {
  // Try <main> sections
  const mainMatches = html.match(/<main[\s\S]*?<\/main>/gi) ?? [];
  if (mainMatches.length > 0) {
    const content = stripScriptsAndStyles(mainMatches.join("\n"));
    if (content.length > 1000) return content.slice(0, maxChars);
  }

  // Try <article> sections
  const articleMatches = html.match(/<article[\s\S]*?<\/article>/gi) ?? [];
  if (articleMatches.length > 0) {
    const content = stripScriptsAndStyles(articleMatches.join("\n"));
    if (content.length > 1000) return content.slice(0, maxChars);
  }

  // Try #content or .content divs
  const contentDivMatches =
    html.match(/<div[^>]*(?:id="content"|class="[^"]*content[^"]*")[^>]*>[\s\S]*?<\/div>/gi) ?? [];
  if (contentDivMatches.length > 0) {
    const content = stripScriptsAndStyles(contentDivMatches.join("\n"));
    if (content.length > 1000) return content.slice(0, maxChars);
  }

  // Fallback: full body stripped of scripts/styles
  return stripScriptsAndStyles(html).slice(0, maxChars);
}

/**
 * Check if HTML content contains spend-related keywords.
 */
export function containsSpendKeywords(html: string): boolean {
  const lowerHtml = html.toLowerCase();
  return SPEND_KEYWORDS.some((keyword) => lowerHtml.includes(keyword));
}

/**
 * Strip script, style, and noscript tags from HTML.
 */
function stripScriptsAndStyles(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
}

/**
 * Decode common HTML entities in URLs.
 */
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_m, code) =>
      String.fromCharCode(parseInt(code, 10))
    );
}
