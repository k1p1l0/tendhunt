/**
 * Backfill script: detect and link parent-child buyer relationships.
 *
 * Patterns detected:
 *   1. Comma: "Ministry of Defence, Army" → parent "Ministry of Defence"
 *   2. Dash:  "DIO - Ministry of Defence" → try both sides
 *   3. "hosted by": "X as hosted by Y" → parent "Y"
 *
 * Runs in dry-run mode by default. Pass --write to actually update the database.
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/backfill-parent-buyers.ts
 *   DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/backfill-parent-buyers.ts --write
 */
import { dbConnect } from "../src/lib/mongodb";
import Buyer from "../src/models/buyer";

import type { Types } from "mongoose";

const MIN_PARENT_NAME_LENGTH = 5;
const WRITE_MODE = process.argv.includes("--write");

function extractParentCandidates(buyerName: string): string[] {
  const candidates: string[] = [];

  // Pattern 3: "hosted by"
  const hostedMatch = buyerName.match(/\bas\s+hosted\s+by\s+(.+)/i);
  if (hostedMatch) {
    const name = hostedMatch[1].trim();
    if (name.length >= MIN_PARENT_NAME_LENGTH) {
      candidates.push(name);
    }
  }

  // Pattern 1: Comma split (first comma only)
  const commaIdx = buyerName.indexOf(",");
  if (commaIdx > 0) {
    const left = buyerName.substring(0, commaIdx).trim();
    if (left.length >= MIN_PARENT_NAME_LENGTH && !/^\([A-Z]+\)$/.test(left)) {
      candidates.push(left);
    }
  }

  // Pattern 2: Dash with spaces " - " (first occurrence only)
  const dashIdx = buyerName.indexOf(" - ");
  if (dashIdx > 0) {
    const left = buyerName.substring(0, dashIdx).trim();
    const right = buyerName.substring(dashIdx + 3).trim();
    if (left.length >= MIN_PARENT_NAME_LENGTH) {
      candidates.push(left);
    }
    if (right.length >= MIN_PARENT_NAME_LENGTH) {
      candidates.push(right);
    }
  }

  return candidates;
}

async function backfill() {
  await dbConnect();

  const prefix = WRITE_MODE ? "[WRITE]" : "[DRY RUN]";
  console.log(`\n${prefix} Starting parent-child buyer backfill...\n`);

  // Step 1: Load all buyers with nameLower into a lookup Map
  const allBuyers = await Buyer.find({ nameLower: { $exists: true } })
    .select("_id name nameLower")
    .lean();

  const buyerByNameLower = new Map<string, { _id: Types.ObjectId; name: string }>();
  for (const b of allBuyers) {
    if (b.nameLower) {
      buyerByNameLower.set(b.nameLower, { _id: b._id as Types.ObjectId, name: b.name });
    }
  }

  console.log(`Loaded ${buyerByNameLower.size} buyers into lookup map`);

  // Step 2: Process each buyer
  let linked = 0;
  let skipped = 0;
  const parentChildMap = new Map<string, string[]>(); // parentName → [childName, ...]

  for (const buyer of allBuyers) {
    const buyerNameLower = buyer.name.toLowerCase();
    const candidates = extractParentCandidates(buyer.name);

    let foundParent = false;

    for (const candidateName of candidates) {
      const candidateLower = candidateName.toLowerCase();

      // Skip self-reference
      if (candidateLower === buyerNameLower) continue;

      const parentBuyer = buyerByNameLower.get(candidateLower);
      if (parentBuyer && parentBuyer._id.toString() !== (buyer._id as Types.ObjectId).toString()) {
        console.log(`${prefix} Would link "${buyer.name}" → parent "${parentBuyer.name}"`);

        // Track for summary
        const existing = parentChildMap.get(parentBuyer.name) ?? [];
        existing.push(buyer.name);
        parentChildMap.set(parentBuyer.name, existing);

        if (WRITE_MODE) {
          // Set parentBuyerId on child
          await Buyer.updateOne(
            { _id: buyer._id },
            {
              $set: { parentBuyerId: parentBuyer._id },
              $addToSet: { enrichmentSources: "parent_link" },
            }
          );

          // Update parent: add child + mark as parent
          await Buyer.updateOne(
            { _id: parentBuyer._id },
            {
              $addToSet: {
                childBuyerIds: buyer._id,
                enrichmentSources: "parent_link",
              },
              $set: { isParent: true },
            }
          );
        }

        linked++;
        foundParent = true;
        break;
      }
    }

    if (!foundParent) {
      skipped++;
    }
  }

  // Step 3: Print summary
  console.log(`\n${"=".repeat(60)}`);
  console.log(`${prefix} Summary:`);
  console.log(`  ${linked} children → ${parentChildMap.size} parents`);
  console.log(`  ${skipped} top-level (no parent found)`);
  console.log(`${"=".repeat(60)}\n`);

  // Show top parent orgs by child count
  const sorted = [...parentChildMap.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 20);

  if (sorted.length > 0) {
    console.log("Top parent organisations:");
    for (const [parentName, children] of sorted) {
      console.log(`  ${parentName}: ${children.length} children`);
    }
  }

  process.exit(0);
}

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
