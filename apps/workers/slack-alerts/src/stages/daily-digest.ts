import type { Db } from "mongodb";

import type { Env, StageResult, SlackIntegration, SlackAlertConfig, Contract, Signal } from "../types";
import { sendSlackMessage, formatDailyDigest } from "../slack";

export async function runDailyDigest(db: Db, env: Env): Promise<StageResult> {
  let sent = 0;
  let errors = 0;

  const configs = await db
    .collection<SlackAlertConfig>("slackalertconfigs")
    .find({ alertType: "daily_digest", isActive: true })
    .toArray();

  if (configs.length === 0) {
    console.log("No active daily_digest alert configs found");
    return { sent: 0, errors: 0 };
  }

  console.log(`Processing ${configs.length} daily digest configs`);

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recentContracts = await db
    .collection<Contract>("contracts")
    .find({ createdAt: { $gte: twentyFourHoursAgo } })
    .sort({ value: -1 })
    .limit(50)
    .toArray();

  const recentSignals = await db
    .collection<Signal>("signals")
    .find({ createdAt: { $gte: twentyFourHoursAgo } })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  const totalContracts = recentContracts.length;
  const totalSignals = recentSignals.length;
  const topContracts = recentContracts.slice(0, 5).map((c) => ({
    title: c.title,
    buyerName: c.buyerName,
    value: c.value ?? 0,
  }));
  const topSignals = recentSignals.slice(0, 5).map((s) => ({
    title: s.title,
    type: s.type,
  }));

  // Group configs by userId to avoid duplicate messages
  const configsByUser = new Map<string, SlackAlertConfig>();
  for (const config of configs) {
    if (!configsByUser.has(config.userId)) {
      configsByUser.set(config.userId, config);
    }
  }

  for (const [userId, config] of configsByUser) {
    try {
      const integration = await db
        .collection<SlackIntegration>("slackintegrations")
        .findOne({
          _id: config.slackIntegrationId as unknown as SlackIntegration["_id"],
          isActive: true,
        });

      if (!integration) {
        console.warn(`No active Slack integration for user ${userId}`);
        continue;
      }

      const channelId = config.channelOverride ?? integration.channelId;
      const { blocks, text } = formatDailyDigest({
        newContracts: totalContracts,
        newSignals: totalSignals,
        topContracts,
        topSignals,
      });

      const result = await sendSlackMessage(
        integration.botToken,
        channelId,
        blocks,
        text
      );

      if (result.ok) {
        sent++;
        console.log(`Sent daily digest to user ${userId} in channel ${channelId}`);
      } else {
        errors++;
        console.error(`Failed to send digest to user ${userId}: ${result.error}`);
      }
    } catch (err) {
      errors++;
      console.error(`Error processing daily digest for user ${userId}:`, err);
    }
  }

  console.log(`Daily digest complete: ${sent} sent, ${errors} errors`);
  return { sent, errors };
}
