import type { Db, ObjectId } from "mongodb";
import type { MappedContract } from "../types";

interface WatchlistEntry {
  _id: ObjectId;
  userId: string;
  supplierName: string;
  normalizedName: string;
  notifyEmail: boolean;
  lastSnapshot?: {
    sectors: string[];
    regions: string[];
    contractCount: number;
    totalValue: number;
    snapshotAt: Date;
  };
}

interface NotificationInsert {
  userId: string;
  type: "NEW_CONTRACT" | "NEW_REGION" | "NEW_SECTOR";
  title: string;
  body: string;
  entityLink?: string;
  supplierName: string;
  contractId?: ObjectId;
  metadata?: Record<string, unknown>;
  read: boolean;
  emailSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * After each sync batch, check new awarded contracts against all watchlist entries.
 * Creates in-app notifications for matching suppliers.
 *
 * WATCH-02: Background detection of new contract awards for watched suppliers.
 * WATCH-05: Change detection for new regions and sectors.
 */
export async function checkWatchlistMatches(
  db: Db,
  newContracts: MappedContract[]
): Promise<{ notificationsCreated: number }> {
  // Only check awarded contracts with supplier names
  const awardedContracts = newContracts.filter(
    (c) =>
      c.awardedSuppliers.length > 0 &&
      (c.status === "AWARDED" || c.stage === "AWARD")
  );

  if (awardedContracts.length === 0) {
    return { notificationsCreated: 0 };
  }

  // Collect all unique normalized supplier names from this batch
  const supplierNamesInBatch = new Set<string>();
  for (const contract of awardedContracts) {
    for (const supplier of contract.awardedSuppliers) {
      if (supplier.name) {
        supplierNamesInBatch.add(supplier.name.toLowerCase().trim());
      }
    }
  }

  if (supplierNamesInBatch.size === 0) {
    return { notificationsCreated: 0 };
  }

  // Build regex patterns for fuzzy matching watchlist entries against supplier names.
  // Each watchlist entry has a normalizedName (lowered, suffix-stripped).
  // We match if the supplier name contains the watchlist normalized name.
  const watchlistEntries = await db
    .collection<WatchlistEntry>("watchlists")
    .find({})
    .toArray();

  if (watchlistEntries.length === 0) {
    return { notificationsCreated: 0 };
  }

  const notifications: NotificationInsert[] = [];
  const now = new Date();

  // Index watchlist entries by normalized name for fast lookup
  const watchMap = new Map<string, WatchlistEntry[]>();
  for (const entry of watchlistEntries) {
    const key = entry.normalizedName;
    const list = watchMap.get(key) ?? [];
    list.push(entry);
    watchMap.set(key, list);
  }

  // Build reverse index: supplierNameLower → matching WatchlistEntry[]
  // This runs O(uniqueSuppliers × watchNames) ONCE, then contract iteration
  // becomes O(contracts × suppliers × avgMatchedWatchers) instead of
  // O(contracts × suppliers × allWatchEntries).
  const supplierWatchIndex = new Map<string, WatchlistEntry[]>();
  for (const name of supplierNamesInBatch) {
    const matched: WatchlistEntry[] = [];
    for (const [normalizedName, entries] of watchMap) {
      if (name.includes(normalizedName)) {
        matched.push(...entries);
      }
    }
    if (matched.length > 0) {
      supplierWatchIndex.set(name, matched);
    }
  }

  // Fast path: no suppliers match any watchlist entries
  if (supplierWatchIndex.size === 0) {
    return { notificationsCreated: 0 };
  }

  // For each awarded contract, look up pre-computed matches by supplier name
  for (const contract of awardedContracts) {
    for (const supplier of contract.awardedSuppliers) {
      if (!supplier.name) continue;
      const supplierLower = supplier.name.toLowerCase().trim();

      const matchedEntries = supplierWatchIndex.get(supplierLower);
      if (!matchedEntries) continue;

      // Match found — create notifications for all users watching this supplier
      for (const entry of matchedEntries) {
        const contractTitle = contract.title || "Untitled contract";
        const buyerName = contract.buyerName || "Unknown buyer";
        const value = contract.awardValue ?? contract.valueMax;
        const valueStr = value
          ? `£${(value / 1000).toFixed(0)}k`
          : "undisclosed value";

        notifications.push({
          userId: entry.userId,
          type: "NEW_CONTRACT",
          title: `${entry.supplierName} won a new contract`,
          body: `"${contractTitle}" from ${buyerName} (${valueStr})`,
          entityLink: `/competitors/${encodeURIComponent(entry.supplierName)}`,
          supplierName: entry.supplierName,
          metadata: {
            contractTitle,
            buyerName,
            awardValue: value,
            source: contract.source,
            sector: contract.sector,
            region: contract.buyerRegion,
          },
          read: false,
          emailSent: false,
          createdAt: now,
          updatedAt: now,
        });

        // WATCH-05: Check for new region
        if (
          contract.buyerRegion &&
          entry.lastSnapshot &&
          !entry.lastSnapshot.regions.includes(contract.buyerRegion)
        ) {
          notifications.push({
            userId: entry.userId,
            type: "NEW_REGION",
            title: `${entry.supplierName} expanded to ${contract.buyerRegion}`,
            body: `Won a contract in a new region: "${contractTitle}" from ${buyerName}`,
            entityLink: `/competitors/${encodeURIComponent(entry.supplierName)}`,
            supplierName: entry.supplierName,
            metadata: {
              newRegion: contract.buyerRegion,
              contractTitle,
            },
            read: false,
            emailSent: false,
            createdAt: now,
            updatedAt: now,
          });
        }

        // WATCH-05: Check for new sector
        if (
          contract.sector &&
          entry.lastSnapshot &&
          !entry.lastSnapshot.sectors.includes(contract.sector)
        ) {
          notifications.push({
            userId: entry.userId,
            type: "NEW_SECTOR",
            title: `${entry.supplierName} entered ${contract.sector}`,
            body: `Won their first contract in this sector: "${contractTitle}"`,
            entityLink: `/competitors/${encodeURIComponent(entry.supplierName)}`,
            supplierName: entry.supplierName,
            metadata: {
              newSector: contract.sector,
              contractTitle,
            },
            read: false,
            emailSent: false,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }
  }

  if (notifications.length === 0) {
    return { notificationsCreated: 0 };
  }

  // Deduplicate: skip NEW_CONTRACT notifications if one already exists
  // for the same userId + supplierName + contractTitle within last 24h
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const contractNotifications = notifications.filter(
    (n) => n.type === "NEW_CONTRACT"
  );

  if (contractNotifications.length > 0) {
    const dedupeChecks = contractNotifications.map((n) => ({
      userId: n.userId,
      supplierName: n.supplierName,
      title: n.title,
    }));

    const existingDupes = await db
      .collection("notifications")
      .find({
        type: "NEW_CONTRACT",
        createdAt: { $gte: twentyFourHoursAgo },
        $or: dedupeChecks.map((c) => ({
          userId: c.userId,
          supplierName: c.supplierName,
          title: c.title,
        })),
      })
      .project({ userId: 1, supplierName: 1, title: 1 })
      .toArray();

    const dupeKeys = new Set(
      existingDupes.map(
        (d) => `${d.userId}::${d.supplierName}::${d.title}`
      )
    );

    // Filter out duplicates
    const deduped = notifications.filter((n) => {
      if (n.type !== "NEW_CONTRACT") return true;
      const key = `${n.userId}::${n.supplierName}::${n.title}`;
      return !dupeKeys.has(key);
    });

    if (deduped.length === 0) {
      return { notificationsCreated: 0 };
    }

    notifications.length = 0;
    notifications.push(...deduped);
  }

  // Batch insert notifications
  await db.collection("notifications").insertMany(notifications, {
    ordered: false,
  });

  // Update watchlist snapshots with new regions/sectors.
  // Build a per-watchEntry accumulator of regions/sectors from matched contracts
  // using the pre-computed supplierWatchIndex (avoids re-scanning all watch entries).
  const entryRegions = new Map<ObjectId, Set<string>>();
  const entrySectors = new Map<ObjectId, Set<string>>();

  for (const contract of awardedContracts) {
    if (!contract.buyerRegion && !contract.sector) continue;
    for (const supplier of contract.awardedSuppliers) {
      if (!supplier.name) continue;
      const supplierLower = supplier.name.toLowerCase().trim();
      const matchedEntries = supplierWatchIndex.get(supplierLower);
      if (!matchedEntries) continue;

      for (const entry of matchedEntries) {
        if (contract.buyerRegion) {
          let regions = entryRegions.get(entry._id);
          if (!regions) {
            regions = new Set();
            entryRegions.set(entry._id, regions);
          }
          regions.add(contract.buyerRegion);
        }
        if (contract.sector) {
          let sectors = entrySectors.get(entry._id);
          if (!sectors) {
            sectors = new Set();
            entrySectors.set(entry._id, sectors);
          }
          sectors.add(contract.sector);
        }
      }
    }
  }

  const snapshotUpdates: Array<{
    filter: Record<string, unknown>;
    update: Record<string, unknown>;
  }> = [];

  // Collect all entries that had matches
  const allMatchedEntries = new Map<string, WatchlistEntry>();
  for (const entries of supplierWatchIndex.values()) {
    for (const entry of entries) {
      allMatchedEntries.set(String(entry._id), entry);
    }
  }

  for (const entry of allMatchedEntries.values()) {
    const newRegions = entryRegions.get(entry._id);
    const newSectors = entrySectors.get(entry._id);
    if (!newRegions && !newSectors) continue;

    const regionsToAdd = newRegions
      ? [...newRegions].filter(
          (r) => !entry.lastSnapshot?.regions.includes(r)
        )
      : [];
    const sectorsToAdd = newSectors
      ? [...newSectors].filter(
          (s) => !entry.lastSnapshot?.sectors.includes(s)
        )
      : [];

    if (regionsToAdd.length > 0 || sectorsToAdd.length > 0) {
      const addToSetFields: Record<string, unknown> = {};
      if (regionsToAdd.length > 0) {
        addToSetFields["lastSnapshot.regions"] = { $each: regionsToAdd };
      }
      if (sectorsToAdd.length > 0) {
        addToSetFields["lastSnapshot.sectors"] = { $each: sectorsToAdd };
      }

      snapshotUpdates.push({
        filter: { _id: entry._id },
        update: {
          $addToSet: addToSetFields,
          $set: { "lastSnapshot.snapshotAt": now },
        },
      });
    }
  }

  // Apply snapshot updates in a single bulk operation
  if (snapshotUpdates.length > 0) {
    await db
      .collection("watchlists")
      .bulkWrite(
        snapshotUpdates.map((op) => ({
          updateOne: { filter: op.filter, update: op.update },
        })),
        { ordered: false }
      )
      .catch(() => {
        // Non-critical — snapshot updates can be retried next cycle
      });
  }

  return { notificationsCreated: notifications.length };
}
