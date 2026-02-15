import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import Notification from "@/models/notification";

/**
 * GET /api/notifications — list notifications for the current user
 * Query params: ?unread=true — only unread, ?limit=20, ?offset=0
 */
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "20", 10),
      100
    );
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const filter: Record<string, unknown> = { userId };
    if (unreadOnly) {
      filter.read = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId, read: false }),
    ]);

    return Response.json({
      notifications,
      total,
      unreadCount,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Notifications GET error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications — mark notifications as read
 * Body: { ids: string[] } or { markAllRead: true }
 */
export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const { ids, markAllRead } = body;

    if (markAllRead) {
      await Notification.updateMany(
        { userId, read: false },
        { $set: { read: true } }
      );
      return Response.json({ success: true });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json(
        { error: "ids array or markAllRead required" },
        { status: 400 }
      );
    }

    await Notification.updateMany(
      { _id: { $in: ids }, userId },
      { $set: { read: true } }
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error("Notifications PATCH error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to update notifications" },
      { status: 500 }
    );
  }
}
