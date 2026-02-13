import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import SlackAlertConfig from "@/models/slack-alert-config";
import SlackIntegration from "@/models/slack-integration";

import type { NextRequest } from "next/server";

interface AlertConfigPayload {
  alertType: string;
  isActive: boolean;
  threshold?: number;
  digestTime?: string;
  digestDays?: number[];
  channelOverride?: string;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  await dbConnect();

  const configs = await SlackAlertConfig.find({ userId }).lean();

  return Response.json({ configs });
}

export async function PUT(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const alerts: AlertConfigPayload[] = body.alerts;

  if (!Array.isArray(alerts)) {
    return Response.json(
      { error: "alerts must be an array" },
      { status: 400 }
    );
  }

  await dbConnect();

  const integration = await SlackIntegration.findOne({
    userId,
    isActive: true,
  }).lean();

  if (!integration) {
    return Response.json(
      { error: "No active Slack integration found" },
      { status: 404 }
    );
  }

  const ops = alerts.map((alert) => ({
    updateOne: {
      filter: { userId, alertType: alert.alertType },
      update: {
        $set: {
          slackIntegrationId: integration._id,
          isActive: alert.isActive,
          ...(alert.threshold !== undefined && { threshold: alert.threshold }),
          ...(alert.digestTime !== undefined && { digestTime: alert.digestTime }),
          ...(alert.digestDays !== undefined && { digestDays: alert.digestDays }),
        },
      },
      upsert: true,
    },
  }));

  await SlackAlertConfig.bulkWrite(ops);

  return Response.json({ success: true });
}
