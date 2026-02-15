/**
 * Backfill script: classify contractMechanism for existing contracts.
 *
 * Uses procurementMethodDetails + title patterns to derive mechanism type:
 *   - "Call-off from a dynamic purchasing system" -> call_off_dps
 *   - "Call-off from a framework agreement" -> call_off_framework
 *   - Title contains "Dynamic Purchasing System" or "DPS" -> dps
 *   - Title contains "Framework Agreement" or "Framework" -> framework
 *   - Everything else -> standard
 *
 * Runs in dry-run mode by default. Pass --write to update the database.
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/backfill-contract-mechanism.ts
 *   DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/backfill-contract-mechanism.ts --write
 */
import { dbConnect } from "../src/lib/mongodb";
import Contract from "../src/models/contract";

import type { AnyBulkWriteOperation } from "mongodb";

const WRITE_MODE = process.argv.includes("--write");
const BATCH_SIZE = 1000;

type ContractMechanism =
  | "standard"
  | "dps"
  | "framework"
  | "call_off_dps"
  | "call_off_framework";

function classifyMechanism(
  procurementMethodDetails: string | null | undefined,
  title: string
): ContractMechanism {
  const pmd = procurementMethodDetails?.toLowerCase() ?? "";

  if (pmd.includes("call-off from a dynamic purchasing system")) {
    return "call_off_dps";
  }
  if (pmd.includes("call-off from a framework agreement")) {
    return "call_off_framework";
  }

  if (/\bdynamic purchasing system\b/i.test(title) || /\bDPS\b/.test(title)) {
    return "dps";
  }
  if (/\bframework\s+agreement\b/i.test(title)) {
    return "framework";
  }
  if (/\bframework\b/i.test(title)) {
    return "framework";
  }

  return "standard";
}

async function backfill() {
  await dbConnect();

  const prefix = WRITE_MODE ? "[WRITE]" : "[DRY RUN]";
  console.log(`\n${prefix} Starting contractMechanism backfill...\n`);

  const contracts = await Contract.find(
    { $or: [{ contractMechanism: null }, { contractMechanism: { $exists: false } }] },
    { title: 1, procurementMethodDetails: 1 }
  ).lean();

  console.log(`Found ${contracts.length} contracts to classify\n`);

  const counts: Record<ContractMechanism, number> = {
    standard: 0,
    dps: 0,
    framework: 0,
    call_off_dps: 0,
    call_off_framework: 0,
  };

  const ops: AnyBulkWriteOperation[] = [];

  for (const contract of contracts) {
    const mechanism = classifyMechanism(
      contract.procurementMethodDetails as string | null,
      contract.title as string
    );
    counts[mechanism]++;

    ops.push({
      updateOne: {
        filter: { _id: contract._id },
        update: { $set: { contractMechanism: mechanism } },
      },
    });
  }

  // Execute in batches
  if (WRITE_MODE && ops.length > 0) {
    for (let i = 0; i < ops.length; i += BATCH_SIZE) {
      const batch = ops.slice(i, i + BATCH_SIZE);
      await Contract.bulkWrite(batch);
      console.log(
        `${prefix} Wrote batch ${Math.floor(i / BATCH_SIZE) + 1}` +
        `/${Math.ceil(ops.length / BATCH_SIZE)}`
      );
    }
  }

  // Print summary
  console.log(`\n${"=".repeat(60)}`);
  console.log(`${prefix} Classification Summary:`);
  console.log(`  Total contracts: ${contracts.length}`);
  console.log(`  standard:           ${counts.standard}`);
  console.log(`  dps:                ${counts.dps}`);
  console.log(`  framework:          ${counts.framework}`);
  console.log(`  call_off_dps:       ${counts.call_off_dps}`);
  console.log(`  call_off_framework: ${counts.call_off_framework}`);
  console.log(`${"=".repeat(60)}\n`);

  process.exit(0);
}

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
