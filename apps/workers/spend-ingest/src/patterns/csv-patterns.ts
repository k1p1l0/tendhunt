// ---------------------------------------------------------------------------
// 12+ regex patterns for CSV/Excel link extraction + anchor keyword scoring
// ---------------------------------------------------------------------------

export interface CsvPattern {
  name: string;
  regex: RegExp;
  weight: number;
}

// 1. Direct file extension (.csv, .xls, .xlsx, .ods)
export const FILE_EXT_PATTERN: CsvPattern = {
  name: "file_extension",
  regex: /\.(?:csv|xls|xlsx|ods)(?:\?[^"'\s]*)?$/i,
  weight: 10,
};

// 2. Download/export URL with CSV context
export const DOWNLOAD_PATTERN: CsvPattern = {
  name: "download_export",
  regex: /(?:download|export|attachment).*(?:csv|xls|xlsx|spending|payment)|(?:csv|xls|xlsx).*(?:download|export|attachment)/i,
  weight: 8,
};

// 3. GOV.UK publication/upload URLs
export const GOVUK_ATTACHMENT_PATTERN: CsvPattern = {
  name: "govuk_attachment",
  regex: /\/government\/(?:publications|uploads)\//i,
  weight: 7,
};

// 4. data.gov.uk dataset URLs
export const DATA_GOV_UK_PATTERN: CsvPattern = {
  name: "data_gov_uk",
  regex: /data\.gov\.uk\/dataset\//i,
  weight: 9,
};

// 5. Document management system URLs (ModernGov, CMIS)
export const DOCUMENT_MGMT_PATTERN: CsvPattern = {
  name: "document_mgmt",
  regex: /(?:Document\.ashx\?Id=|mgDocument\.aspx\?i=|mgConvert2PDF\.aspx|ieListDocuments\.aspx)/i,
  weight: 5,
};

// 6. WordPress upload paths
export const WP_UPLOADS_PATTERN: CsvPattern = {
  name: "wp_uploads",
  regex: /\/wp-content\/uploads\/.*(?:spend|payment|expenditure|transparency|csv|xls)/i,
  weight: 7,
};

// 7. Drupal file paths
export const DRUPAL_FILES_PATTERN: CsvPattern = {
  name: "drupal_files",
  regex: /\/sites\/default\/files\/.*(?:spend|payment|expenditure|transparency|csv|xls)/i,
  weight: 7,
};

// 8. Period-named files (months, quarters, years)
export const PERIOD_NAMED_PATTERN: CsvPattern = {
  name: "period_named",
  regex: /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q[1-4]|quarter|20[12]\d).*\.(?:csv|xls|xlsx)/i,
  weight: 9,
};

// 9. Stream/file download endpoints
export const STREAM_DOWNLOAD_PATTERN: CsvPattern = {
  name: "stream_download",
  regex: /(?:streamfile|filedownload|getfile|openfile|documentdownload|filestream)/i,
  weight: 5,
};

// 10. Numeric file/document ID parameters
export const FILE_ID_PATTERN: CsvPattern = {
  name: "file_id",
  regex: /[?&](?:file_?id|doc_?id|document_?id|attachment_?id|media_?id)=\d+/i,
  weight: 4,
};

// 11. SharePoint document library paths
export const SHAREPOINT_PATTERN: CsvPattern = {
  name: "sharepoint",
  regex: /\/(?:Shared%20Documents|Documents|_layouts\/15\/download\.aspx)/i,
  weight: 5,
};

// 12. Content-disposition style download URLs
export const CONTENT_DOWNLOAD_PATTERN: CsvPattern = {
  name: "content_download",
  regex: /\/download\/(?:file|attachment|document)\/\d+/i,
  weight: 6,
};

export const ALL_CSV_PATTERNS: CsvPattern[] = [
  FILE_EXT_PATTERN,
  DOWNLOAD_PATTERN,
  GOVUK_ATTACHMENT_PATTERN,
  DATA_GOV_UK_PATTERN,
  DOCUMENT_MGMT_PATTERN,
  WP_UPLOADS_PATTERN,
  DRUPAL_FILES_PATTERN,
  PERIOD_NAMED_PATTERN,
  STREAM_DOWNLOAD_PATTERN,
  FILE_ID_PATTERN,
  SHAREPOINT_PATTERN,
  CONTENT_DOWNLOAD_PATTERN,
];

/**
 * Anchor text keywords that boost confidence a link is a spending CSV.
 * If anchor text contains any of these, the link's weight gets +3.
 */
export const SPEND_ANCHOR_KEYWORDS = [
  "spending",
  "expenditure",
  "payments over",
  "spend over",
  "transparency",
  "payment data",
  "csv",
  "download",
  "quarter",
  "monthly",
  "invoice",
  "creditor",
] as const;

export interface ScoredLink {
  url: string;
  score: number;
  matchedPatterns: string[];
  anchorText?: string;
}

/**
 * Score a URL against all CSV patterns.
 * Returns null if no patterns matched.
 */
export function scoreLink(
  href: string,
  anchorText?: string
): ScoredLink | null {
  let totalScore = 0;
  const matchedPatterns: string[] = [];

  for (const pattern of ALL_CSV_PATTERNS) {
    if (pattern.regex.test(href)) {
      totalScore += pattern.weight;
      matchedPatterns.push(pattern.name);
    }
  }

  if (matchedPatterns.length === 0) return null;

  // Anchor text bonus
  if (anchorText) {
    const lowerAnchor = anchorText.toLowerCase();
    for (const keyword of SPEND_ANCHOR_KEYWORDS) {
      if (lowerAnchor.includes(keyword)) {
        totalScore += 3;
        break;
      }
    }
  }

  return { url: href, score: totalScore, matchedPatterns, anchorText };
}
