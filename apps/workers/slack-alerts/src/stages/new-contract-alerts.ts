import type { Db } from "mongodb";

import type {
  Env,
  StageResult,
  SlackIntegration,
  SlackAlertConfig,
  Contract,
  CompanyProfile,
} from "../types";
import { sendSlackMessage, formatNewContractAlert } from "../slack";

function matchesProfile(
  contract: Contract,
  profile: CompanyProfile
): boolean {
  // Match by sector
  if (profile.sectors?.length > 0 && contract.sector) {
    const contractSectorLower = contract.sector.toLowerCase();
    if (profile.sectors.some((s) => contractSectorLower.includes(s.toLowerCase()))) {
      return true;
    }
  }

  // Match by region
  if (profile.regions?.length > 0 && contract.region) {
    const contractRegionLower = contract.region.toLowerCase();
    if (profile.regions.some((r) => contractRegionLower.includes(r.toLowerCase()))) {
      return true;
    }
  }

  // Match by keyword in title
  if (profile.keywords?.length > 0 && contract.title) {
    const titleLower = contract.title.toLowerCase();
    if (profile.keywords.some((k) => titleLower.includes(k.toLowerCase()))) {
      return true;
    }
  }

  return false;
}

export async function runNewContractAlerts(
  db: Db,
  env: Env
): Promise<StageResult> {
  let sent = 0;
  let errors = 0;

  const configs = await db
    .collection<SlackAlertConfig>("slackalertconfigs")
    .find({ alertType: "new_contracts", isActive: true })
    .toArray();

  if (configs.length === 0) {
    console.log("No active new_contracts alert configs found");
    return { sent: 0, errors: 0 };
  }

  console.log(`Processing ${configs.length} new contract alert configs`);

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recentContracts = await db
    .collection<Contract>("contracts")
    .find({ createdAt: { $gte: twentyFourHoursAgo } })
    .sort({ value: -1 })
    .limit(200)
    .toArray();

  if (recentContracts.length === 0) {
    console.log("No new contracts in last 24h");
    return { sent: 0, errors: 0 };
  }

  console.log(`Found ${recentContracts.length} recent contracts`);

  for (const config of configs) {
    try {
      const integration = await db
        .collection<SlackIntegration>("slackintegrations")
        .findOne({
          _id: config.slackIntegrationId as unknown as SlackIntegration["_id"],
          isActive: true,
        });

      if (!integration) {
        console.warn(`No active Slack integration for user ${config.userId}`);
        continue;
      }

      const profile = await db
        .collection<CompanyProfile>("companyprofiles")
        .findOne({ userId: config.userId });

      // Filter contracts by user's profile preferences
      let matchingContracts: Contract[];
      if (profile && (profile.sectors?.length > 0 || profile.keywords?.length > 0 || profile.regions?.length > 0)) {
        matchingContracts = recentContracts.filter((c) =>
          matchesProfile(c, profile)
        );
      } else {
        // No profile filters — send top 5 by value
        matchingContracts = recentContracts.slice(0, 5);
      }

      if (matchingContracts.length === 0) {
        continue;
      }

      // Cap at 10 alerts per user per run
      const contractsToAlert = matchingContracts.slice(0, 10);
      const channelId = config.channelOverride ?? integration.channelId;

      for (const contract of contractsToAlert) {
        try {
          const contractUrl = `${env.APP_URL}/contracts/${contract._id}`;
          const { blocks, text } = formatNewContractAlert({
            title: contract.title ?? "Untitled Contract",
            buyerName: contract.buyerName ?? "Unknown Buyer",
            value: contract.value ?? 0,
            deadline: contract.deadline ?? "N/A",
            sector: contract.sector ?? "N/A",
            contractUrl,
          });

          const result = await sendSlackMessage(
            integration.botToken,
            channelId,
            blocks,
            text
          );

          if (result.ok) {
            sent++;
          } else {
            errors++;
            console.error(
              `Failed to send contract alert for ${contract._id}: ${result.error}`
            );
          }
        } catch (err) {
          errors++;
          console.error(`Error sending contract alert for ${contract._id}:`, err);
        }
      }

      console.log(
        `Sent ${contractsToAlert.length} contract alerts to user ${config.userId}`
      );
    } catch (err) {
      errors++;
      console.error(
        `Error processing new contract alerts for user ${config.userId}:`,
        err
      );
    }
  }

  console.log(`New contract alerts complete: ${sent} sent, ${errors} errors`);
  return { sent, errors };
}
