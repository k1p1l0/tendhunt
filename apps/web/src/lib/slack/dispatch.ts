import { dbConnect } from "@/lib/mongodb";
import SlackIntegration from "@/models/slack-integration";
import SlackAlertConfig from "@/models/slack-alert-config";
import { sendSlackMessage } from "./client";
import { formatScannerAlert } from "./formatters";

export async function dispatchScannerAlert(
  userId: string,
  scannerId: string,
  columnId: string,
  entityId: string,
  score: number,
  entity: { name?: string; title?: string },
  reasoning: string
) {
  await dbConnect();

  const configs = await SlackAlertConfig.find({
    userId,
    alertType: "scanner_threshold",
    scannerId,
    columnId,
    isActive: true,
  }).lean();

  if (configs.length === 0) return;

  const integration = await SlackIntegration.findOne({
    userId,
    isActive: true,
  }).lean();

  if (!integration) return;

  for (const config of configs) {
    if (score < (config.threshold ?? 0)) continue;

    const channelId =
      config.channelOverride || (integration.channelId as string | undefined);
    if (!channelId) continue;

    const entityName = entity.name || entity.title || entityId;
    const { blocks, text } = formatScannerAlert({
      scannerName: "Scanner",
      columnName: columnId,
      entityName,
      score,
      reasoning,
      entityUrl: `/scanners/${scannerId}`,
    });

    void sendSlackMessage(
      integration.botToken as string,
      channelId,
      blocks,
      text
    );
  }
}
