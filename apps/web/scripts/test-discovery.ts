/**
 * Test script: verify website discovery + logo.dev + LinkedIn enrichment on 5 real buyers.
 *
 * Usage: DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/test-discovery.ts
 */
import { dbConnect } from "../src/lib/mongodb";
import Buyer from "../src/models/buyer";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN!;
const LOGO_DEV_TOKEN = process.env.LOGO_DEV_PUBLIC_KEY || process.env.LOGO_DEV_TOKEN || "";

if (!APIFY_TOKEN) {
  console.error("Missing APIFY_API_TOKEN in env");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Apify helper (standalone — uses tilde format for actor IDs)
// ---------------------------------------------------------------------------

async function callApify(actorId: string, input: Record<string, unknown>): Promise<unknown[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const encodedId = actorId.replace("/", "~");
    const url = `https://api.apify.com/v2/acts/${encodedId}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;
    console.log(`  → Calling Apify: ${actorId}...`);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const body = await response.text();
      console.error(`  ✗ Apify ${response.status}: ${body.slice(0, 200)}`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    clearTimeout(timeout);
    console.error(`  ✗ Apify call failed:`, err instanceof Error ? err.message : err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Website discovery (Google Search via Apify)
// ---------------------------------------------------------------------------

const EXCLUDED_DOMAINS = [
  "wikipedia.org", "linkedin.com", "facebook.com", "twitter.com",
  "x.com", "youtube.com", "companies-house.gov.uk", "moderngov.co.uk",
];

function extractWebsite(results: Record<string, unknown>[]): string | null {
  for (const result of results) {
    const url = String(result.url || result.link || "");
    if (!url || !url.startsWith("http")) continue;
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      if (!EXCLUDED_DOMAINS.some(d => hostname.includes(d))) {
        const parsed = new URL(url);
        return `${parsed.protocol}//${parsed.hostname}`;
      }
    } catch { continue; }
  }
  return null;
}

async function discoverWebsite(buyerName: string): Promise<string | null> {
  const query = `"${buyerName}" official website site:*.gov.uk OR site:*.nhs.uk OR site:*.ac.uk OR site:*.org.uk`;
  const pageResults = await callApify("apify/google-search-scraper", {
    queries: query,
    maxPagesPerQuery: 1,
    resultsPerPage: 5,
  });

  // Extract organicResults from page objects
  const organicResults: Record<string, unknown>[] = [];
  for (const page of pageResults as Record<string, unknown>[]) {
    const organic = page.organicResults;
    if (Array.isArray(organic)) {
      organicResults.push(...organic as Record<string, unknown>[]);
    }
  }

  console.log(`  → Google returned ${organicResults.length} organic results`);
  if (organicResults.length > 0) {
    const first = organicResults[0];
    console.log(`  → Top result: ${first.title || "?"} — ${first.url || "?"}`);
  }

  return extractWebsite(organicResults);
}

// ---------------------------------------------------------------------------
// LinkedIn company lookup (harvestapi/linkedin-company)
// ---------------------------------------------------------------------------

async function lookupLinkedIn(buyerNames: string[]): Promise<Map<string, {
  linkedinUrl: string;
  logo: string;
  website: string;
  employeeCount: number | null;
}>> {
  const results = await callApify("harvestapi/linkedin-company", {
    searches: buyerNames,
  });

  const map = new Map<string, {
    linkedinUrl: string;
    logo: string;
    website: string;
    employeeCount: number | null;
  }>();

  for (const r of results as Record<string, unknown>[]) {
    const name = String(r.name || "");
    map.set(name.toLowerCase(), {
      linkedinUrl: String(r.linkedinUrl || ""),
      logo: String(r.logo || ""),
      website: String(r.website || ""),
      employeeCount: (r.employeeCount as number) || null,
    });
  }

  return map;
}

// ---------------------------------------------------------------------------
// Logo.dev CDN
// ---------------------------------------------------------------------------

function buildLogoUrl(website: string): string | null {
  try {
    const domain = new URL(website).hostname;
    return `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=128&format=png`;
  } catch { return null; }
}

async function testLogoUrl(logoUrl: string): Promise<boolean> {
  try {
    const resp = await fetch(logoUrl, { method: "HEAD" });
    return resp.ok;
  } catch { return false; }
}

// ---------------------------------------------------------------------------
// Main test
// ---------------------------------------------------------------------------

async function main() {
  await dbConnect();

  // Pick 5 well-known UK public sector buyers without website
  const testBuyers = await Buyer.find({
    orgType: { $exists: true, $ne: null },
    $or: [{ website: null }, { website: { $exists: false } }],
  })
    .sort({ contractCount: -1 })
    .limit(5)
    .select("name orgType sector website contractCount staffCount")
    .lean();

  console.log(`\n=== Testing Discovery on ${testBuyers.length} Buyers ===\n`);
  const buyerNames = testBuyers.map(b => b.name);
  console.log(`Buyers: ${buyerNames.join(", ")}\n`);

  // Step 1: Batch LinkedIn lookup (all 5 at once)
  console.log(`${"─".repeat(60)}`);
  console.log(`[1] LinkedIn Batch Lookup (harvestapi/linkedin-company)...\n`);
  const linkedInMap = await lookupLinkedIn(buyerNames);
  console.log(`  → Found ${linkedInMap.size} LinkedIn matches\n`);

  // Step 2: Test results per buyer
  for (const buyer of testBuyers) {
    console.log(`${"─".repeat(60)}`);
    console.log(`BUYER: ${buyer.name}`);
    console.log(`  orgType: ${buyer.orgType || "—"} | sector: ${buyer.sector || "—"} | contracts: ${buyer.contractCount || 0}`);

    // LinkedIn results
    const li = linkedInMap.get(buyer.name.toLowerCase());
    if (li) {
      console.log(`  LinkedIn: ${li.linkedinUrl || "—"}`);
      console.log(`  Website (from LinkedIn): ${li.website || "—"}`);
      console.log(`  Logo (from LinkedIn): ${li.logo ? li.logo.slice(0, 80) + "..." : "—"}`);
      console.log(`  Employees: ${li.employeeCount || "—"}`);
    } else {
      console.log(`  LinkedIn: NOT FOUND (no match in results)`);
    }

    // Website discovery (only if LinkedIn didn't return one)
    const websiteFromLinkedIn = li?.website?.startsWith("http") ? li.website : null;
    if (!websiteFromLinkedIn && !buyer.website) {
      console.log(`\n  [2] Website Discovery (Google Search)...`);
      const website = await discoverWebsite(buyer.name);
      console.log(`  → Website: ${website || "NOT FOUND"}`);

      // Logo.dev test
      if (website) {
        const logoUrl = buildLogoUrl(website);
        if (logoUrl) {
          const works = await testLogoUrl(logoUrl);
          console.log(`  → Logo.dev: ${works ? "✓ accessible" : "✗ not found"} (${logoUrl.slice(0, 60)}...)`);
        }
      }
    } else {
      const site = websiteFromLinkedIn || buyer.website;
      if (site) {
        const logoUrl = buildLogoUrl(site);
        if (logoUrl) {
          const works = await testLogoUrl(logoUrl);
          console.log(`  Logo.dev fallback: ${works ? "✓ accessible" : "✗ not found"}`);
        }
      }
    }
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log("Test complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
