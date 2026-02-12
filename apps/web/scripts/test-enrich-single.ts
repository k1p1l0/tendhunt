/**
 * Test script: Enrich a single buyer via LinkedIn (Stage 1c logic).
 *
 * Calls harvestapi/linkedin-company for one buyer, logs the full API response,
 * then applies the same update logic from 01c-logo-linkedin.ts.
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/test-enrich-single.ts
 *   DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/test-enrich-single.ts "NHS England"
 */
import mongoose from "mongoose";
import { dbConnect } from "../src/lib/mongodb";
import Buyer from "../src/models/buyer";

const BUYER_NAME = process.argv[2] || "Ministry of Defence";
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

if (!APIFY_TOKEN) {
  console.error("Missing APIFY_API_TOKEN in env");
  process.exit(1);
}

async function callApify(searchName: string): Promise<Record<string, unknown>[]> {
  const actorId = "harvestapi~linkedin-company";
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

  console.log(`\nCalling Apify harvestapi/linkedin-company for: "${searchName}"...`);
  const start = Date.now();

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ searches: [searchName] }),
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`Apify responded in ${elapsed}s — status ${response.status}`);

  if (!response.ok) {
    const text = await response.text();
    console.error("Apify error:", text.slice(0, 500));
    return [];
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function main() {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`Test: Enrich "${BUYER_NAME}" via LinkedIn`);
  console.log("═".repeat(60));

  await dbConnect();

  // Find the buyer
  const buyer = await Buyer.findOne({ name: { $regex: `^${BUYER_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } }).lean();
  if (!buyer) {
    console.error(`Buyer "${BUYER_NAME}" not found in database`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`\nFound buyer: ${buyer.name} (${buyer._id})`);
  console.log(`  orgType: ${buyer.orgType || "—"}`);
  console.log(`  contractCount: ${buyer.contractCount || 0}`);
  console.log(`  current linkedinUrl: ${buyer.linkedinUrl || "—"}`);
  console.log(`  current logoUrl: ${buyer.logoUrl || "—"}`);
  console.log(`  current description: ${buyer.description ? buyer.description.slice(0, 80) + "..." : "—"}`);

  // Call Apify
  const results = await callApify(BUYER_NAME);

  if (results.length === 0) {
    console.log("\nNo results from Apify. Exiting.");
    await mongoose.disconnect();
    return;
  }

  // Log full response
  console.log(`\n${"─".repeat(60)}`);
  console.log("FULL APIFY RESPONSE (first result):");
  console.log("─".repeat(60));
  const result = results[0];
  console.log(JSON.stringify(result, null, 2));

  // Build update fields (same logic as Stage 1c)
  console.log(`\n${"─".repeat(60)}`);
  console.log("BUILDING UPDATE FIELDS:");
  console.log("─".repeat(60));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = result as any;
  const fields: Record<string, unknown> = {};

  const linkedinUrl = String(r.linkedinUrl || "");
  if (linkedinUrl.includes("linkedin.com/")) {
    fields.linkedinUrl = linkedinUrl;
  }

  const logo = String(r.logo || "");
  if (logo.startsWith("http")) {
    fields.logoUrl = logo;
  }

  const website = String(r.website || "");
  if (!buyer.website && website.startsWith("http")) {
    fields.website = website;
  }

  const employeeCount = r.employeeCount as number | undefined;
  if (employeeCount && !buyer.staffCount) {
    fields.staffCount = employeeCount;
  }

  // Top-level convenience fields
  const desc = String(r.description || "");
  if (desc && !buyer.description) {
    fields.description = desc;
  }

  const locations = r.locations as Array<Record<string, unknown>> | undefined;
  const hqLocation = locations?.find((l) => l.headquarter);
  const locText = (hqLocation?.parsed as Record<string, unknown>)?.text;
  if (locText && typeof locText === "string") {
    fields.address = locText;
  }

  const industries = r.industries as Array<Record<string, unknown>> | undefined;
  const primaryIndustry = industries?.[0];
  const industryName = typeof primaryIndustry === "string"
    ? primaryIndustry
    : primaryIndustry?.name as string | undefined;
  if (industryName) {
    fields.industry = industryName;
  }

  // Full LinkedIn subdocument
  fields.linkedin = {
    id: String(r.id || ""),
    universalName: String(r.universalName || ""),
    tagline: String(r.tagline || ""),
    companyType: String(r.companyType || ""),
    foundedYear: r.foundedOn?.year ?? null,
    followerCount: r.followerCount ?? null,
    employeeCountRange: r.employeeCountRange ?? null,
    specialities: r.specialities ?? [],
    industries: r.industries ?? [],
    locations: r.locations ?? [],
    logos: r.logos ?? [],
    backgroundCovers: r.backgroundCovers ?? [],
    phone: r.phone ?? null,
    fundingData: r.fundingData ?? null,
    lastFetchedAt: new Date(),
  };

  console.log("\nFields to set:");
  for (const [key, val] of Object.entries(fields)) {
    if (key === "linkedin") {
      console.log(`  linkedin: { ... ${Object.keys(val as object).length} fields }`);
    } else if (key === "description") {
      console.log(`  ${key}: "${String(val).slice(0, 80)}..."`);
    } else {
      console.log(`  ${key}: ${JSON.stringify(val)}`);
    }
  }

  // Apply the update
  console.log(`\n${"─".repeat(60)}`);
  console.log("APPLYING UPDATE...");
  console.log("─".repeat(60));

  const updateResult = await Buyer.updateOne(
    { _id: buyer._id },
    {
      $set: { ...fields, updatedAt: new Date() },
      $addToSet: { enrichmentSources: "linkedin" },
    }
  );

  console.log(`Modified: ${updateResult.modifiedCount}`);

  // Verify by re-reading
  const updated = await Buyer.findById(buyer._id).lean();
  console.log(`\n${"═".repeat(60)}`);
  console.log("VERIFICATION — Updated buyer record:");
  console.log("═".repeat(60));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = updated as any;
  console.log(`  name:           ${u.name}`);
  console.log(`  linkedinUrl:    ${u.linkedinUrl || "—"}`);
  console.log(`  logoUrl:        ${u.logoUrl || "—"}`);
  console.log(`  description:    ${u.description ? u.description.slice(0, 100) + "..." : "—"}`);
  console.log(`  address:        ${u.address || "—"}`);
  console.log(`  industry:       ${u.industry || "—"}`);
  console.log(`  staffCount:     ${u.staffCount || "—"}`);
  console.log(`  linkedin.id:    ${u.linkedin?.id || "—"}`);
  console.log(`  linkedin.type:  ${u.linkedin?.companyType || "—"}`);
  console.log(`  linkedin.year:  ${u.linkedin?.foundedYear || "—"}`);
  console.log(`  linkedin.followers: ${u.linkedin?.followerCount || "—"}`);
  console.log(`  linkedin.industries: ${JSON.stringify(u.linkedin?.industries || [])}`);
  console.log(`  linkedin.specialities: ${JSON.stringify(u.linkedin?.specialities || [])}`);
  console.log(`  linkedin.locations: ${u.linkedin?.locations?.length || 0} locations`);
  console.log(`  enrichmentSources: ${JSON.stringify(u.enrichmentSources || [])}`);
  console.log(`\nDone!`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
