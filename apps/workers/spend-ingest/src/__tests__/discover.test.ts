import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getAlternateDomains, tryDataGovUk } from "../stages/01-discover";
import {
  extractGoogleLinks,
  transformGoogleUrls,
} from "../stages/02-extract-links";

// ---------------------------------------------------------------------------
// getAlternateDomains
// ---------------------------------------------------------------------------

describe("getAlternateDomains", () => {
  it("generates ICB domain for NHS West Yorkshire", () => {
    const result = getAlternateDomains(
      "NHS West Yorkshire",
      "nhs_icb",
      "https://www.westyorkshire.nhs.uk"
    );
    expect(result).toContain("https://www.westyorkshire.icb.nhs.uk");
  });

  it("generates ICB domain for NHS Surrey Heartlands ICB", () => {
    const result = getAlternateDomains(
      "NHS Surrey Heartlands ICB",
      "nhs_icb",
      "https://www.surreyheartlands.nhs.uk"
    );
    expect(result).toContain("https://www.surreyheartlands.icb.nhs.uk");
  });

  it("generates both concatenated and hyphenated ICB domains when they differ", () => {
    const result = getAlternateDomains(
      "NHS North East London ICB",
      "nhs_icb",
      undefined
    );
    expect(result).toContain("https://www.northeastlondon.icb.nhs.uk");
    expect(result).toContain("https://www.north-east-london.icb.nhs.uk");
  });

  it("detects ICB from buyer name even without orgType", () => {
    const result = getAlternateDomains(
      "NHS Cornwall ICB",
      undefined,
      undefined
    );
    expect(result).toContain("https://www.cornwall.icb.nhs.uk");
  });

  it("strips Integrated Care Board suffix", () => {
    const result = getAlternateDomains(
      "NHS Kent Integrated Care Board",
      "nhs_icb",
      undefined
    );
    expect(result).toContain("https://www.kent.icb.nhs.uk");
  });

  it("generates NHS trust domain when website is not .nhs.uk", () => {
    const result = getAlternateDomains(
      "Royal Berkshire NHS Foundation Trust",
      "nhs_trust_acute",
      "https://www.royalberkshire.nhs.example.com"
    );
    // orgType starts with nhs_trust, website does not contain .nhs.uk
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toMatch(/\.nhs\.uk$/);
  });

  it("returns empty array for non-NHS buyer", () => {
    const result = getAlternateDomains(
      "Manchester City Council",
      "local_council_metro",
      "https://www.manchester.gov.uk"
    );
    expect(result).toEqual([]);
  });

  it("returns empty array for NHS trust with .nhs.uk website", () => {
    const result = getAlternateDomains(
      "Leeds Teaching Hospitals NHS Trust",
      "nhs_trust_acute",
      "https://www.leedsth.nhs.uk"
    );
    // Website already includes .nhs.uk, so no alternate domains needed
    expect(result).toEqual([]);
  });

  it("does not generate domain for very short region names", () => {
    const result = getAlternateDomains("NHS AB ICB", "nhs_icb", undefined);
    // "ab" is only 2 characters, should be rejected
    expect(result).toEqual([]);
  });

  it("handles single-word region correctly", () => {
    const result = getAlternateDomains(
      "NHS Devon ICB",
      "nhs_icb",
      undefined
    );
    expect(result).toContain("https://www.devon.icb.nhs.uk");
    // Single word: concatenated and hyphenated are the same, so only one entry
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// tryDataGovUk — mock global fetch
// ---------------------------------------------------------------------------

describe("tryDataGovUk", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns CSV links from a matching data.gov.uk dataset", async () => {
    // The matching logic extracts keywords from buyer name (stripping nhs/icb/the/of/and/for),
    // then matches against the dataset title. Requires >= 50% keyword match.
    // "NHS Devon ICB" → keyword "devon" (nhs/icb stripped) → threshold = max(1, ceil(1*0.5)) = 1
    // Title "Devon Spending Over 25k" contains "devon" → 1 match >= 1 threshold
    const searchHtml = `
      <h2><a href="/dataset/devon-spend-over-25k">Devon Spending Over 25k</a></h2>
      <h2><a href="/dataset/unrelated-data">Unrelated Dataset</a></h2>
    `;
    const datasetHtml = `
      <a href="https://data.gov.uk/files/devon-jan-2025.csv">Download</a>
      <a href="https://data.gov.uk/files/devon-feb-2025.csv">Download</a>
    `;

    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
      if (urlStr.includes("data.gov.uk/search")) {
        return new Response(searchHtml, { status: 200 });
      }
      if (urlStr.includes("data.gov.uk/dataset")) {
        return new Response(datasetHtml, { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    }) as typeof fetch;

    const result = await tryDataGovUk("NHS Devon ICB");
    expect(result).not.toBeNull();
    expect(result!.csvLinks).toHaveLength(2);
    expect(result!.csvLinks[0]).toContain("devon-jan-2025.csv");
    expect(result!.csvLinks[1]).toContain("devon-feb-2025.csv");
    expect(result!.url).toContain("/dataset/devon-spend-over-25k");
  });

  it("returns null when no datasets match buyer name keywords in title", async () => {
    // "NHS Somerset ICB" → keyword "somerset" after stripping nhs/icb
    // Title "Wind Farm Locations 2024" does not contain "somerset"
    const searchHtml = `
      <h2><a href="/dataset/completely-unrelated">Wind Farm Locations 2024</a></h2>
    `;

    globalThis.fetch = vi.fn(async () => {
      return new Response(searchHtml, { status: 200 });
    }) as typeof fetch;

    const result = await tryDataGovUk("NHS Somerset ICB");
    expect(result).toBeNull();
  });

  it("returns null when data.gov.uk search returns non-OK status", async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response("Server error", { status: 500 });
    }) as typeof fetch;

    const result = await tryDataGovUk("NHS Devon ICB");
    expect(result).toBeNull();
  });

  it("returns null when no search results found", async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response("<html><body>No results</body></html>", {
        status: 200,
      });
    }) as typeof fetch;

    const result = await tryDataGovUk("Obscure Organisation");
    expect(result).toBeNull();
  });

  it("skips dataset pages that return errors", async () => {
    const searchHtml = `
      <h2><a href="/dataset/devon-spend">Devon Spend Data</a></h2>
    `;

    let callCount = 0;
    globalThis.fetch = vi.fn(async () => {
      callCount++;
      if (callCount === 1) {
        return new Response(searchHtml, { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    }) as typeof fetch;

    const result = await tryDataGovUk("Devon County Council");
    expect(result).toBeNull();
  });

  it("returns null when datasets have no CSV links", async () => {
    const searchHtml = `
      <h2><a href="/dataset/devon-spend">Devon Spend Data</a></h2>
    `;
    const datasetHtml = `
      <a href="https://example.com/page">View Report</a>
      <p>No CSV files available</p>
    `;

    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
      if (urlStr.includes("data.gov.uk/search")) {
        return new Response(searchHtml, { status: 200 });
      }
      return new Response(datasetHtml, { status: 200 });
    }) as typeof fetch;

    const result = await tryDataGovUk("Devon County Council");
    expect(result).toBeNull();
  });

  it("deduplicates CSV links within a dataset page", async () => {
    // "Devon County Council" → keywords ["devon", "county", "council"] (3 keywords, threshold = ceil(3*0.5) = 2)
    // Title must match at least 2 keywords. "Devon County Spend Data" matches "devon" + "county" = 2 >= 2.
    const searchHtml = `
      <h2><a href="/dataset/devon-county-spend">Devon County Spend Data</a></h2>
    `;
    const datasetHtml = `
      <a href="https://data.gov.uk/files/devon-q1.csv">Q1</a>
      <a href="https://data.gov.uk/files/devon-q1.csv">Q1 duplicate</a>
      <a href="https://data.gov.uk/files/devon-q2.csv">Q2</a>
    `;

    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      const urlStr = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
      if (urlStr.includes("data.gov.uk/search")) {
        return new Response(searchHtml, { status: 200 });
      }
      return new Response(datasetHtml, { status: 200 });
    }) as typeof fetch;

    const result = await tryDataGovUk("Devon County Council");
    expect(result).not.toBeNull();
    expect(result!.csvLinks).toHaveLength(2);
  });

  it("handles fetch network error gracefully", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("Network error");
    }) as typeof fetch;

    const result = await tryDataGovUk("NHS Devon ICB");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractGoogleLinks
// ---------------------------------------------------------------------------

describe("extractGoogleLinks", () => {
  it("extracts Google Sheets links from HTML", () => {
    const html = `
      <a href="https://docs.google.com/spreadsheets/d/1abcDEF_ghi/edit">Spreadsheet</a>
    `;
    const result = extractGoogleLinks(html);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("docs.google.com/spreadsheets/d/1abcDEF_ghi");
  });

  it("extracts Google Drive file links", () => {
    const html = `
      <a href="https://drive.google.com/file/d/1xYZ_abc/view">Drive file</a>
    `;
    const result = extractGoogleLinks(html);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("drive.google.com/file/d/1xYZ_abc");
  });

  it("extracts Google Drive open links", () => {
    const html = `
      <a href="https://drive.google.com/open?id=1xYZ_abc">Open file</a>
    `;
    const result = extractGoogleLinks(html);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain("drive.google.com/open?id=1xYZ_abc");
  });

  it("extracts multiple Google links from same HTML", () => {
    const html = `
      <a href="https://docs.google.com/spreadsheets/d/sheet1/edit">Sheet 1</a>
      <a href="https://docs.google.com/spreadsheets/d/sheet2/edit">Sheet 2</a>
      <a href="https://drive.google.com/file/d/file1/view">File 1</a>
    `;
    const result = extractGoogleLinks(html);
    expect(result).toHaveLength(3);
  });

  it("deduplicates identical links", () => {
    const html = `
      <a href="https://docs.google.com/spreadsheets/d/sheet1/edit">Link 1</a>
      <a href="https://docs.google.com/spreadsheets/d/sheet1/edit">Link 2</a>
    `;
    const result = extractGoogleLinks(html);
    expect(result).toHaveLength(1);
  });

  it("returns empty array for HTML with no Google links", () => {
    const html = `
      <a href="https://example.com/data.csv">CSV file</a>
      <a href="https://www.gov.uk/spending">Spending</a>
    `;
    const result = extractGoogleLinks(html);
    expect(result).toEqual([]);
  });

  it("handles http:// Google links", () => {
    const html = `
      <a href="http://docs.google.com/spreadsheets/d/legacy-sheet/edit">Old link</a>
    `;
    const result = extractGoogleLinks(html);
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// transformGoogleUrls
// ---------------------------------------------------------------------------

describe("transformGoogleUrls", () => {
  it("transforms Google Sheets URL to CSV export", () => {
    const result = transformGoogleUrls([
      "https://docs.google.com/spreadsheets/d/1abcDEF/edit#gid=0",
    ]);
    expect(result).toEqual([
      "https://docs.google.com/spreadsheets/d/1abcDEF/export?format=csv",
    ]);
  });

  it("transforms Google Drive file URL to direct download", () => {
    const result = transformGoogleUrls([
      "https://drive.google.com/file/d/1xYZ_abc/view?usp=sharing",
    ]);
    expect(result).toEqual([
      "https://drive.google.com/uc?export=download&id=1xYZ_abc",
    ]);
  });

  it("transforms Google Drive open URL to direct download", () => {
    const result = transformGoogleUrls([
      "https://drive.google.com/open?id=1xYZ_abc",
    ]);
    expect(result).toEqual([
      "https://drive.google.com/uc?export=download&id=1xYZ_abc",
    ]);
  });

  it("passes non-Google URLs through unchanged", () => {
    const urls = [
      "https://example.com/data.csv",
      "https://www.gov.uk/uploads/spend.ods",
    ];
    const result = transformGoogleUrls(urls);
    expect(result).toEqual(urls);
  });

  it("handles mixed Google and non-Google URLs", () => {
    const result = transformGoogleUrls([
      "https://docs.google.com/spreadsheets/d/sheet1/edit",
      "https://example.com/file.csv",
      "https://drive.google.com/file/d/file1/view",
    ]);
    expect(result).toEqual([
      "https://docs.google.com/spreadsheets/d/sheet1/export?format=csv",
      "https://example.com/file.csv",
      "https://drive.google.com/uc?export=download&id=file1",
    ]);
  });

  it("handles empty array", () => {
    expect(transformGoogleUrls([])).toEqual([]);
  });

  it("preserves complex Google Sheets IDs with hyphens and underscores", () => {
    const result = transformGoogleUrls([
      "https://docs.google.com/spreadsheets/d/1a-bC_dEf-2gHi/edit",
    ]);
    expect(result).toEqual([
      "https://docs.google.com/spreadsheets/d/1a-bC_dEf-2gHi/export?format=csv",
    ]);
  });
});
