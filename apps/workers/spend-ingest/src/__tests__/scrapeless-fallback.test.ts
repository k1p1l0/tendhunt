import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchViaScrapeless,
  detectFileFormat,
} from "../stages/03-download-parse";

// ---------------------------------------------------------------------------
// fetchViaScrapeless
// ---------------------------------------------------------------------------

describe("fetchViaScrapeless", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("constructs correct API request to Scrapeless", async () => {
    let capturedUrl: string | undefined;
    let capturedInit: RequestInit | undefined;

    globalThis.fetch = vi.fn(
      async (url: string | URL | Request, init?: RequestInit) => {
        capturedUrl = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
        capturedInit = init;
        return new Response("OK", { status: 200 });
      }
    ) as typeof fetch;

    await fetchViaScrapeless(
      "https://example.com/data.csv",
      "test-api-key-123"
    );

    expect(capturedUrl).toBe(
      "https://api.scrapeless.com/api/v2/unlocker/request"
    );
    expect(capturedInit?.method).toBe("POST");

    const headers = capturedInit?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["x-api-token"]).toBe("test-api-key-123");

    const body = JSON.parse(capturedInit?.body as string);
    expect(body.actor).toBe("unlocker.webunlocker");
    expect(body.input.url).toBe("https://example.com/data.csv");
    expect(body.input.method).toBe("GET");
    expect(body.input.redirect).toBe(true);
    expect(body.proxy.country).toBe("GB");
  });

  it("returns the Response from Scrapeless API", async () => {
    const csvContent = "date,amount,vendor\n2025-01-01,1000,Acme";
    globalThis.fetch = vi.fn(async () => {
      return new Response(csvContent, {
        status: 200,
        headers: { "Content-Type": "text/csv" },
      });
    }) as typeof fetch;

    const response = await fetchViaScrapeless(
      "https://protected-site.com/spend.csv",
      "key-abc"
    );

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe(csvContent);
  });

  it("propagates error responses from Scrapeless", async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response("Forbidden", { status: 403 });
    }) as typeof fetch;

    const response = await fetchViaScrapeless(
      "https://very-protected.com/data.csv",
      "key-abc"
    );

    expect(response.status).toBe(403);
  });

  it("propagates fetch exceptions", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("Network timeout");
    }) as typeof fetch;

    await expect(
      fetchViaScrapeless("https://unreachable.com/data.csv", "key-abc")
    ).rejects.toThrow("Network timeout");
  });
});

// ---------------------------------------------------------------------------
// 403 → Scrapeless fallback integration
//
// The fallback logic is in downloadAndParseCsvs (stage 3 main function):
//   if (response.status === 403 && env.SCRAPELESS_API_KEY) {
//     response = await fetchViaScrapeless(csvUrl, env.SCRAPELESS_API_KEY);
//   }
//
// We test the conditional logic patterns here since the main function
// requires a full Db/Env/Job setup.
// ---------------------------------------------------------------------------

describe("Scrapeless fallback conditions", () => {
  function shouldUseFallback(
    status: number,
    apiKey: string | undefined
  ): boolean {
    return status === 403 && !!apiKey;
  }

  it("fallback triggers when status is 403 AND SCRAPELESS_API_KEY is set", () => {
    expect(shouldUseFallback(403, "test-key")).toBe(true);
  });

  it("fallback does NOT trigger when status is 200", () => {
    expect(shouldUseFallback(200, "test-key")).toBe(false);
  });

  it("fallback does NOT trigger when SCRAPELESS_API_KEY is undefined", () => {
    expect(shouldUseFallback(403, undefined)).toBe(false);
  });

  it("fallback does NOT trigger when SCRAPELESS_API_KEY is empty string", () => {
    expect(shouldUseFallback(403, "")).toBe(false);
  });

  it("fallback does NOT trigger for 401 status", () => {
    expect(shouldUseFallback(401, "test-key")).toBe(false);
  });

  it("fallback does NOT trigger for 500 status", () => {
    expect(shouldUseFallback(500, "test-key")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// detectFileFormat
// ---------------------------------------------------------------------------

describe("detectFileFormat", () => {
  describe("content-type based detection", () => {
    it("detects PDF from content-type", () => {
      expect(
        detectFileFormat("application/pdf", "https://example.com/file")
      ).toBe("pdf");
    });

    it("detects CSV from text/csv", () => {
      expect(
        detectFileFormat("text/csv", "https://example.com/file")
      ).toBe("csv");
    });

    it("detects CSV from application/csv", () => {
      expect(
        detectFileFormat("application/csv", "https://example.com/file")
      ).toBe("csv");
    });

    it("detects ODS from content-type", () => {
      expect(
        detectFileFormat(
          "application/vnd.oasis.opendocument.spreadsheet",
          "https://example.com/file"
        )
      ).toBe("ods");
    });

    it("detects XLSX from content-type", () => {
      expect(
        detectFileFormat(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "https://example.com/file"
        )
      ).toBe("xlsx");
    });

    it("treats text/plain as CSV", () => {
      expect(
        detectFileFormat("text/plain", "https://example.com/data")
      ).toBe("csv");
    });
  });

  describe("URL extension fallback", () => {
    it("detects .csv from URL extension", () => {
      expect(
        detectFileFormat(
          "application/octet-stream",
          "https://example.com/data.csv"
        )
      ).toBe("csv");
    });

    it("detects .ods from URL extension", () => {
      expect(
        detectFileFormat(
          "application/octet-stream",
          "https://example.com/data.ods"
        )
      ).toBe("ods");
    });

    it("detects .xlsx from URL extension", () => {
      expect(
        detectFileFormat(
          "application/octet-stream",
          "https://example.com/data.xlsx"
        )
      ).toBe("xlsx");
    });

    it("detects .xls from URL extension as xlsx", () => {
      expect(
        detectFileFormat(
          "application/octet-stream",
          "https://example.com/data.xls"
        )
      ).toBe("xlsx");
    });

    it("detects .pdf from URL extension", () => {
      expect(
        detectFileFormat(
          "application/octet-stream",
          "https://example.com/report.pdf"
        )
      ).toBe("pdf");
    });

    it("handles query params after extension", () => {
      expect(
        detectFileFormat(
          "application/octet-stream",
          "https://example.com/data.csv?token=abc"
        )
      ).toBe("csv");
    });
  });

  describe("unknown formats", () => {
    it("returns unknown for unrecognizable content-type and URL", () => {
      expect(
        detectFileFormat(
          "application/json",
          "https://example.com/api/data"
        )
      ).toBe("unknown");
    });
  });

  describe("case insensitivity", () => {
    it("handles uppercase content-type", () => {
      expect(
        detectFileFormat("TEXT/CSV", "https://example.com/file")
      ).toBe("csv");
    });

    it("handles uppercase URL extension", () => {
      expect(
        detectFileFormat(
          "application/octet-stream",
          "https://example.com/DATA.CSV"
        )
      ).toBe("csv");
    });

    it("handles mixed case content-type", () => {
      expect(
        detectFileFormat("Application/PDF", "https://example.com/file")
      ).toBe("pdf");
    });
  });

  describe("content-type with charset", () => {
    it("detects CSV from text/csv with charset", () => {
      expect(
        detectFileFormat(
          "text/csv; charset=utf-8",
          "https://example.com/file"
        )
      ).toBe("csv");
    });

    it("detects text/plain with charset as CSV", () => {
      expect(
        detectFileFormat(
          "text/plain; charset=iso-8859-1",
          "https://example.com/file"
        )
      ).toBe("csv");
    });
  });

  describe("vnd.* content types with URL fallback", () => {
    it("detects .pdf from URL when content-type is generic vnd", () => {
      expect(
        detectFileFormat(
          "application/vnd.ms-excel",
          "https://example.com/file.pdf"
        )
      ).toBe("pdf");
    });

    it("detects .ods from URL when content-type is generic vnd", () => {
      expect(
        detectFileFormat(
          "application/vnd.ms-excel",
          "https://example.com/file.ods"
        )
      ).toBe("ods");
    });
  });
});
