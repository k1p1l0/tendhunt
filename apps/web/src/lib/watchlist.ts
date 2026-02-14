import { dbConnect } from "@/lib/mongodb";
import Watchlist from "@/models/watchlist";
import Notification from "@/models/notification";
import { normalizeSupplierName } from "@/lib/supplier-normalize";

import type { CompetitorProfile } from "@/lib/competitors";

export interface WatchlistEntry {
  _id: string;
  userId: string;
  supplierName: string;
  normalizedName: string;
  notifyEmail: boolean;
  lastSnapshot?: {
    sectors: string[];
    regions: string[];
    contractCount: number;
    totalValue: number;
    snapshotAt: string;
  };
  createdAt: string;
}

export interface WatchlistWithActivity extends WatchlistEntry {
  recentNotifications: number;
  latestNotification?: {
    type: string;
    title: string;
    createdAt: string;
  };
}

/**
 * Get a user's full watchlist with activity counts (recent notification count).
 */
export async function getUserWatchlist(
  userId: string
): Promise<WatchlistWithActivity[]> {
  await dbConnect();

  const entries = await Watchlist.find({ userId })
    .sort({ createdAt: -1 })
    .lean();

  if (entries.length === 0) return [];

  const supplierNames = entries.map(
    (e) => (e as Record<string, unknown>).supplierName as string
  );

  // Get recent notification counts per supplier (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const notifCounts = await Notification.aggregate([
    {
      $match: {
        userId,
        supplierName: { $in: supplierNames },
        createdAt: { $gte: sevenDaysAgo },
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $group: {
        _id: "$supplierName",
        count: { $sum: 1 },
        latestType: { $first: "$type" },
        latestTitle: { $first: "$title" },
        latestDate: { $first: "$createdAt" },
      },
    },
  ]);

  const countMap = new Map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    notifCounts.map((n: any) => [
      n._id as string,
      {
        count: n.count as number,
        latestType: n.latestType as string,
        latestTitle: n.latestTitle as string,
        latestDate: n.latestDate as Date,
      },
    ])
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return entries.map((entry: any) => {
    const activity = countMap.get(entry.supplierName);
    return {
      _id: String(entry._id),
      userId: entry.userId,
      supplierName: entry.supplierName,
      normalizedName: entry.normalizedName,
      notifyEmail: entry.notifyEmail ?? false,
      lastSnapshot: entry.lastSnapshot
        ? {
            sectors: entry.lastSnapshot.sectors ?? [],
            regions: entry.lastSnapshot.regions ?? [],
            contractCount: entry.lastSnapshot.contractCount ?? 0,
            totalValue: entry.lastSnapshot.totalValue ?? 0,
            snapshotAt: entry.lastSnapshot.snapshotAt
              ? new Date(entry.lastSnapshot.snapshotAt).toISOString()
              : new Date().toISOString(),
          }
        : undefined,
      createdAt: new Date(entry.createdAt).toISOString(),
      recentNotifications: activity?.count ?? 0,
      latestNotification: activity
        ? {
            type: activity.latestType,
            title: activity.latestTitle,
            createdAt: activity.latestDate.toISOString(),
          }
        : undefined,
    };
  });
}

/**
 * Update the watchlist snapshot for a supplier (used after profile refresh).
 */
export async function updateWatchlistSnapshot(
  userId: string,
  supplierName: string,
  profile: CompetitorProfile
): Promise<void> {
  await dbConnect();

  const normalizedName = normalizeSupplierName(supplierName);

  await Watchlist.updateOne(
    { userId, normalizedName },
    {
      $set: {
        "lastSnapshot.sectors": profile.sectors.map((s) => s.name),
        "lastSnapshot.regions": profile.regions.map((r) => r.name),
        "lastSnapshot.contractCount": profile.contractCount,
        "lastSnapshot.totalValue": profile.totalValue,
        "lastSnapshot.snapshotAt": new Date(),
      },
    }
  );
}

/**
 * Get unread notification counts per user for email digest.
 * Returns users with notifyEmail=true and unread notifications.
 */
export async function getDigestRecipients(): Promise<
  Array<{
    userId: string;
    unreadCount: number;
    suppliers: string[];
  }>
> {
  await dbConnect();

  // Get all watchlist entries with notifyEmail enabled
  const emailWatchers = await Watchlist.find({ notifyEmail: true })
    .select("userId supplierName")
    .lean();

  if (emailWatchers.length === 0) return [];

  // Group by userId
  const userSuppliers = new Map<string, string[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const entry of emailWatchers as any[]) {
    const list = userSuppliers.get(entry.userId) ?? [];
    list.push(entry.supplierName);
    userSuppliers.set(entry.userId, list);
  }

  // Count unread, unsent notifications per user
  const results: Array<{
    userId: string;
    unreadCount: number;
    suppliers: string[];
  }> = [];

  for (const [userId, suppliers] of userSuppliers) {
    const unreadCount = await Notification.countDocuments({
      userId,
      emailSent: false,
      supplierName: { $in: suppliers },
    });

    if (unreadCount > 0) {
      results.push({ userId, unreadCount, suppliers });
    }
  }

  return results;
}

/**
 * Get notifications for email digest and mark them as emailSent.
 */
export async function getDigestNotifications(
  userId: string,
  supplierNames: string[]
): Promise<
  Array<{
    _id: string;
    type: string;
    title: string;
    body: string;
    supplierName: string;
    createdAt: string;
  }>
> {
  await dbConnect();

  const notifications = await Notification.find({
    userId,
    emailSent: false,
    supplierName: { $in: supplierNames },
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  // Mark them as emailSent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ids = notifications.map((n: any) => n._id);
  if (ids.length > 0) {
    await Notification.updateMany(
      { _id: { $in: ids } },
      { $set: { emailSent: true } }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return notifications.map((n: any) => ({
    _id: String(n._id),
    type: n.type,
    title: n.title,
    body: n.body,
    supplierName: n.supplierName ?? "",
    createdAt: new Date(n.createdAt).toISOString(),
  }));
}
