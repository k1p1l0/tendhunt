/**
 * Re-aggregate spend summaries with new vendor mix + churn fields.
 * Runs Stage 4 logic locally for all buyers with existing spend data.
 *
 * Usage:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/reaggregate-spend.ts
 */
import { MongoClient } from "mongodb";

import type { ObjectId } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

async function reaggregate() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  const summaries = await db.collection("spendsummaries").find({}).toArray();
  console.log(`Found ${summaries.length} spend summaries to re-aggregate\n`);

  for (const summary of summaries) {
    const buyerId = summary.buyerId as ObjectId;
    const buyer = await db.collection("buyers").findOne({ _id: buyerId });
    const buyerName = buyer?.name ?? String(buyerId);

    console.log(`Processing: ${buyerName}`);

    const pipeline = [
      { $match: { buyerId } },
      {
        $facet: {
          byVendorSize: [
            {
              $group: {
                _id: "$vendorNormalized",
                total: { $sum: "$amount" },
                count: { $sum: 1 },
              },
            },
          ],
          byYearVendor: [
            {
              $group: {
                _id: {
                  year: { $year: "$date" },
                  vendor: "$vendorNormalized",
                },
                total: { $sum: "$amount" },
              },
            },
            {
              $group: {
                _id: "$_id.year",
                vendors: { $push: "$_id.vendor" },
                totalSpend: { $sum: "$total" },
              },
            },
            { $sort: { _id: 1 as const } },
          ],
        },
      },
    ];

    const [result] = await db
      .collection("spendtransactions")
      .aggregate(pipeline)
      .toArray();

    if (!result) {
      console.log(`  No transactions found, skipping`);
      continue;
    }

    // Vendor size classification
    const vendorSizeData = result.byVendorSize as Array<{
      _id: string;
      total: number;
      count: number;
    }>;
    let smeTotalSpend = 0,
      smeVendorCount = 0,
      smeTxnCount = 0;
    let largeTotalSpend = 0,
      largeVendorCount = 0,
      largeTxnCount = 0;

    for (const v of vendorSizeData) {
      const isLarge = v.total > 500000 || v.count > 50;
      if (isLarge) {
        largeTotalSpend += v.total;
        largeVendorCount++;
        largeTxnCount += v.count;
      } else {
        smeTotalSpend += v.total;
        smeVendorCount++;
        smeTxnCount += v.count;
      }
    }

    const vendorSizeBreakdown = {
      sme: {
        totalSpend: smeTotalSpend,
        vendorCount: smeVendorCount,
        transactionCount: smeTxnCount,
      },
      large: {
        totalSpend: largeTotalSpend,
        vendorCount: largeVendorCount,
        transactionCount: largeTxnCount,
      },
    };

    // Yearly vendor sets
    const yearlyVendorSets = (
      result.byYearVendor as Array<{
        _id: number;
        vendors: string[];
        totalSpend: number;
      }>
    ).map((y) => ({
      year: y._id,
      vendors: y.vendors,
      totalSpend: y.totalSpend,
    }));

    // SME Openness score
    const totalVendorSpend = smeTotalSpend + largeTotalSpend;
    const smeSpendPct =
      totalVendorSpend > 0 ? (smeTotalSpend / totalVendorSpend) * 100 : 0;
    const smeBonus = smeVendorCount > 20 ? 10 : 0;
    const smeOpennessScore = Math.min(
      100,
      Math.round(smeSpendPct + smeBonus)
    );

    // Vendor Stability score
    let vendorStabilityScore = 50;
    if (yearlyVendorSets.length >= 2) {
      const retentionRates: number[] = [];
      for (let i = 1; i < yearlyVendorSets.length; i++) {
        const prevSet = new Set(yearlyVendorSets[i - 1].vendors);
        const currSet = new Set(yearlyVendorSets[i].vendors);
        const retained = [...currSet].filter((v) => prevSet.has(v)).length;
        const total = new Set([...prevSet, ...currSet]).size;
        if (total > 0) retentionRates.push(retained / total);
      }
      if (retentionRates.length > 0) {
        const avgRetention =
          retentionRates.reduce((a, b) => a + b, 0) / retentionRates.length;
        vendorStabilityScore = Math.round(avgRetention * 100);
      }
    }

    // Update spend summary
    await db.collection("spendsummaries").updateOne(
      { _id: summary._id },
      {
        $set: {
          vendorSizeBreakdown,
          yearlyVendorSets,
          smeOpennessScore,
          vendorStabilityScore,
          lastComputedAt: new Date(),
        },
      }
    );

    console.log(
      `  SME: ${smeVendorCount} vendors, £${(smeTotalSpend / 1e6).toFixed(1)}M (${Math.round(smeSpendPct)}%)`
    );
    console.log(
      `  Large: ${largeVendorCount} vendors, £${(largeTotalSpend / 1e6).toFixed(1)}M (${Math.round(100 - smeSpendPct)}%)`
    );
    console.log(`  SME Openness: ${smeOpennessScore}/100`);
    console.log(
      `  Vendor Stability: ${vendorStabilityScore}/100 (${yearlyVendorSets.length} years)`
    );
    console.log();
  }

  await client.close();
  console.log("Done!");
  process.exit(0);
}

reaggregate().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
