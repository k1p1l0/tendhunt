/**
 * Contracts Finder OCDS API Ingestion Script
 *
 * Fetches UK below-threshold procurement contract notices from the
 * Contracts Finder OCDS search endpoint, maps them to the Contract
 * schema, and upserts them into MongoDB.
 *
 * Key differences from Find a Tender (ingest-fat.ts):
 * - Different base URL (Contracts Finder search endpoint)
 * - Uses publishedFrom/publishedTo date params (not updatedFrom/updatedTo)
 * - 60-day lookback window for sufficient volume
 * - Stages include "tender,award" (CF supports comma-separated)
 * - Source is "CONTRACTS_FINDER"
 * - CF returns 403 with no Retry-After header — api-client defaults to 300s
 *
 * Usage: npm run ingest:cf
 */

import { connectDB, disconnectDB } from "./lib/db";
import { fetchAllReleases } from "./lib/api-client";
import { mapOcdsToContract } from "./lib/ocds-mapper";
import Contract from "../src/models/contract";

const CF_BASE_URL =
  "https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search";

async function main(): Promise<void> {
  console.time("ingest-cf");

  await connectDB();

  // Fetch releases from the last 60 days.
  // Contracts Finder covers below-threshold procurements and needs a wider
  // window than FaT to reach 200+ results.
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const publishedFrom = sixtyDaysAgo.toISOString().slice(0, 19); // YYYY-MM-DDTHH:MM:SS
  const publishedTo = now.toISOString().slice(0, 19);

  console.log(
    `Fetching Contracts Finder releases published ${publishedFrom} to ${publishedTo}...`
  );

  const releases = await fetchAllReleases(
    CF_BASE_URL,
    {
      stages: "tender,award",
      publishedFrom,
      publishedTo,
    },
    300
  );

  console.log(`Fetched ${releases.length} raw releases.`);

  // Map releases to Contract documents, catching per-release errors
  const mapped: ReturnType<typeof mapOcdsToContract>[] = [];
  let mapErrors = 0;

  for (const release of releases) {
    try {
      const doc = mapOcdsToContract(release, "CONTRACTS_FINDER");
      mapped.push(doc);
    } catch (err) {
      mapErrors++;
      console.warn(
        `Warning: Failed to map release ${release?.id ?? "unknown"}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  if (mapErrors > 0) {
    console.warn(`${mapErrors} releases failed to map (skipped).`);
  }

  // Filter out garbage records: must have a real title or description
  const filtered = mapped.filter((doc) => {
    const hasTitle = doc.title && doc.title !== "Untitled";
    const hasDescription =
      doc.description && String(doc.description).trim().length > 0;
    return hasTitle || hasDescription;
  });

  console.log(
    `Mapped ${filtered.length} contracts (filtered ${releases.length - filtered.length} garbage records).`
  );

  if (filtered.length === 0) {
    console.log("No contracts to upsert. Exiting.");
    return;
  }

  // Build bulkWrite operations for idempotent upsert
  const ops = filtered.map((doc) => ({
    updateOne: {
      filter: { source: doc.source, noticeId: doc.noticeId },
      update: { $set: doc },
      upsert: true,
    },
  }));

  const result = await Contract.bulkWrite(ops, { ordered: false });

  console.log(
    [
      `Ingestion complete:`,
      `  Fetched:  ${releases.length} releases`,
      `  Mapped:   ${filtered.length} contracts`,
      `  Upserted: ${result.upsertedCount}`,
      `  Modified: ${result.modifiedCount}`,
      `  Matched:  ${result.matchedCount}`,
    ].join("\n")
  );
}

main()
  .catch((err) => {
    console.error("Ingestion failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB();
    console.timeEnd("ingest-cf");
  });
