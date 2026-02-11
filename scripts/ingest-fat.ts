/**
 * Find a Tender OCDS API Ingestion Script
 *
 * Fetches UK above-threshold procurement contract notices from the
 * Find a Tender OCDS release packages endpoint, maps them to the
 * Contract schema, and upserts them into MongoDB.
 *
 * Usage: npm run ingest:fat
 */

import { connectDB, disconnectDB } from "./lib/db";
import { fetchAllReleases } from "./lib/api-client";
import { mapOcdsToContract } from "./lib/ocds-mapper";
import Contract from "../src/models/contract";

const FAT_BASE_URL =
  "https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages";

async function main(): Promise<void> {
  console.time("ingest-fat");

  await connectDB();

  // Fetch releases from the last 60 days to ensure 200+ contracts.
  // The API does not support comma-separated stages, so we fetch
  // "tender" and "award" stages separately and merge them.
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const updatedFrom = sixtyDaysAgo.toISOString().slice(0, 19); // YYYY-MM-DDTHH:MM:SS

  console.log(`Fetching Find a Tender releases updated since ${updatedFrom}...`);

  const tenderReleases = await fetchAllReleases(
    FAT_BASE_URL,
    { stages: "tender", updatedFrom },
    400
  );
  console.log(`  tender stage: ${tenderReleases.length} releases`);

  const awardReleases = await fetchAllReleases(
    FAT_BASE_URL,
    { stages: "award", updatedFrom },
    200
  );
  console.log(`  award stage: ${awardReleases.length} releases`);

  // Merge and deduplicate by release id
  const seen = new Set<string>();
  const releases: any[] = [];
  for (const r of [...tenderReleases, ...awardReleases]) {
    const key = r.id ?? r.ocid ?? JSON.stringify(r);
    if (!seen.has(key)) {
      seen.add(key);
      releases.push(r);
    }
  }

  console.log(`Fetched ${releases.length} raw releases.`);

  // Map releases to Contract documents
  const mapped = releases
    .map((release) => mapOcdsToContract(release, "FIND_A_TENDER"))
    .filter((doc) => {
      // Filter out garbage records: must have a real title or description
      const hasTitle = doc.title && doc.title !== "Untitled";
      const hasDescription =
        doc.description && doc.description.trim().length > 0;
      return hasTitle || hasDescription;
    });

  console.log(
    `Mapped ${mapped.length} contracts (filtered ${releases.length - mapped.length} garbage records).`
  );

  if (mapped.length === 0) {
    console.log("No contracts to upsert. Exiting.");
    return;
  }

  // Build bulkWrite operations for idempotent upsert
  const ops = mapped.map((doc) => ({
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
      `  Mapped:   ${mapped.length} contracts`,
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
    console.timeEnd("ingest-fat");
  });
