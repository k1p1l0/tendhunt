import { XMLParser } from "fast-xml-parser";
import { fetchWithDomainDelay } from "./rate-limiter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModernGovMeeting {
  id: number;
  committeeId: number;
  committeeName: string;
  date: string;
  title: string;
  location: string;
}

export interface ModernGovCommittee {
  id: number;
  name: string;
  type: string;
}

// ---------------------------------------------------------------------------
// XML parser configured for SOAP responses
// ---------------------------------------------------------------------------

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true, // Strips soap:, mg: prefixes
  attributeNamePrefix: "@_",
});

// ---------------------------------------------------------------------------
// SOAP envelope builder
// ---------------------------------------------------------------------------

function buildSoapEnvelope(body: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    ${body}
  </soap:Body>
</soap:Envelope>`;
}

// ---------------------------------------------------------------------------
// GetMeetings
// ---------------------------------------------------------------------------

/**
 * Fetch meetings from a ModernGov SOAP API for the given date range.
 *
 * CRITICAL: The SOAP response contains XML-in-XML. The GetMeetingsResult
 * element contains an XML string that must be parsed a second time.
 *
 * @param baseUrl - ModernGov portal base URL (e.g., "https://democracy.camden.gov.uk")
 * @param startDate - Start date in dd/MM/yyyy format
 * @param endDate - End date in dd/MM/yyyy format
 * @returns Array of meetings, or empty array on error
 */
export async function getMeetings(
  baseUrl: string,
  startDate: string,
  endDate: string
): Promise<ModernGovMeeting[]> {
  const soapBody = `
    <GetMeetings xmlns="http://tempuri.org/">
      <sStartDate>${startDate}</sStartDate>
      <sEndDate>${endDate}</sEndDate>
    </GetMeetings>`;

  const url = `${baseUrl.replace(/\/$/, "")}/mgWebService.asmx`;

  try {
    const res = await fetchWithDomainDelay(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: "http://tempuri.org/GetMeetings",
      },
      body: buildSoapEnvelope(soapBody),
    });

    if (!res.ok) {
      console.warn(
        `ModernGov GetMeetings failed for ${baseUrl}: HTTP ${res.status}`
      );
      return [];
    }

    const xml = await res.text();

    // First parse: SOAP envelope
    const envelope = parser.parse(xml);
    const resultXml =
      envelope?.Envelope?.Body?.GetMeetingsResponse?.GetMeetingsResult;

    if (!resultXml || typeof resultXml !== "string") {
      // No meetings or empty result
      return [];
    }

    // Second parse: inner XML string from GetMeetingsResult
    const innerDoc = parser.parse(resultXml);
    const meetings = innerDoc?.Meetings?.Meeting;

    if (!meetings) return [];

    // Normalize to array (single meeting returns as object)
    const meetingArray = Array.isArray(meetings) ? meetings : [meetings];

    return meetingArray.map((m: Record<string, unknown>) => ({
      id: Number(m["@_id"] || m.Id || m.id || 0),
      committeeId: Number(m.CommitteeId || m.committeeid || 0),
      committeeName: String(m.CommitteeName || m.committeename || "Unknown"),
      date: String(m.Date || m.date || ""),
      title: String(
        m.Title || m.title || m.CommitteeName || m.committeename || "Meeting"
      ),
      location: String(m.Location || m.location || ""),
    }));
  } catch (err) {
    console.warn(
      `ModernGov GetMeetings error for ${baseUrl}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return [];
  }
}

// ---------------------------------------------------------------------------
// GetCommittees
// ---------------------------------------------------------------------------

/**
 * Fetch committees from a ModernGov SOAP API.
 *
 * @param baseUrl - ModernGov portal base URL
 * @returns Array of committees, or empty array on error
 */
export async function getCommittees(
  baseUrl: string
): Promise<ModernGovCommittee[]> {
  const soapBody = `
    <GetCommitteesByUser xmlns="http://tempuri.org/">
      <lUserID>0</lUserID>
    </GetCommitteesByUser>`;

  const url = `${baseUrl.replace(/\/$/, "")}/mgWebService.asmx`;

  try {
    const res = await fetchWithDomainDelay(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: "http://tempuri.org/GetCommitteesByUser",
      },
      body: buildSoapEnvelope(soapBody),
    });

    if (!res.ok) {
      console.warn(
        `ModernGov GetCommittees failed for ${baseUrl}: HTTP ${res.status}`
      );
      return [];
    }

    const xml = await res.text();

    // First parse: SOAP envelope
    const envelope = parser.parse(xml);
    const resultXml =
      envelope?.Envelope?.Body?.GetCommitteesByUserResponse
        ?.GetCommitteesByUserResult;

    if (!resultXml || typeof resultXml !== "string") {
      return [];
    }

    // Second parse: inner XML string
    const innerDoc = parser.parse(resultXml);
    const committees = innerDoc?.Committees?.Committee;

    if (!committees) return [];

    const committeeArray = Array.isArray(committees)
      ? committees
      : [committees];

    return committeeArray.map((c: Record<string, unknown>) => ({
      id: Number(c["@_id"] || c.Id || c.id || 0),
      name: String(c.Name || c.name || "Unknown"),
      type: String(c.Type || c.type || ""),
    }));
  } catch (err) {
    console.warn(
      `ModernGov GetCommittees error for ${baseUrl}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return [];
  }
}

// ---------------------------------------------------------------------------
// Connection test
// ---------------------------------------------------------------------------

/**
 * Quick health check: test if a ModernGov SOAP API is accessible.
 * Uses a lightweight GetCommitteesByUser call with a 5-second timeout.
 *
 * @param baseUrl - ModernGov portal base URL
 * @returns true if SOAP API responds, false otherwise
 */
export async function testConnection(baseUrl: string): Promise<boolean> {
  const soapBody = `
    <GetCommitteesByUser xmlns="http://tempuri.org/">
      <lUserID>0</lUserID>
    </GetCommitteesByUser>`;

  const url = `${baseUrl.replace(/\/$/, "")}/mgWebService.asmx`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: "http://tempuri.org/GetCommitteesByUser",
        "User-Agent": "TendHunt/1.0 (procurement data platform)",
      },
      body: buildSoapEnvelope(soapBody),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}
