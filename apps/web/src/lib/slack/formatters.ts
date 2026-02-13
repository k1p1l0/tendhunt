interface ScannerAlertParams {
  scannerName: string;
  columnName: string;
  entityName: string;
  score: number;
  reasoning: string;
  entityUrl: string;
}

interface DailyDigestParams {
  newContracts: number;
  newSignals: number;
  topContracts: Array<{ title: string; buyerName: string; value: number }>;
  topSignals: Array<{ title: string; type: string }>;
}

interface NewContractAlertParams {
  title: string;
  buyerName: string;
  value: number;
  deadline: string;
  sector: string;
  contractUrl: string;
}

export function formatScannerAlert(params: ScannerAlertParams): {
  blocks: unknown[];
  text: string;
} {
  const { scannerName, columnName, entityName, score, reasoning, entityUrl } =
    params;

  const scoreEmoji =
    score >= 8 ? ":fire:" : score >= 6 ? ":dart:" : ":mag:";

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${scoreEmoji} Scanner Alert`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Scanner:*\n${scannerName}` },
        { type: "mrkdwn", text: `*Column:*\n${columnName}` },
        { type: "mrkdwn", text: `*Entity:*\n${entityName}` },
        {
          type: "mrkdwn",
          text: `*Score:*\n${scoreEmoji} ${score}/10`,
        },
      ],
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `*Reasoning:* ${reasoning.slice(0, 500)}`,
        },
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View Entity", emoji: true },
          url: entityUrl,
          action_id: "view_entity",
        },
      ],
    },
  ];

  const text = `Scanner Alert: ${entityName} scored ${score}/10 on ${columnName} in ${scannerName}`;

  return { blocks, text };
}

export function formatDailyDigest(params: DailyDigestParams): {
  blocks: unknown[];
  text: string;
} {
  const { newContracts, newSignals, topContracts, topSignals } = params;

  const blocks: unknown[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: ":newspaper: Daily Procurement Digest",
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*:page_facing_up: New Contracts:*\n${newContracts}`,
        },
        {
          type: "mrkdwn",
          text: `*:chart_with_upwards_trend: New Signals:*\n${newSignals}`,
        },
      ],
    },
  ];

  if (topContracts.length > 0) {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "*Top New Contracts*" },
    });

    for (const contract of topContracts.slice(0, 5)) {
      const valueStr =
        contract.value > 0
          ? `\u00a3${contract.value.toLocaleString("en-GB")}`
          : "N/A";
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${contract.title}*\n${contract.buyerName} \u2022 ${valueStr}`,
        },
      });
    }
  }

  if (topSignals.length > 0) {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "*Top New Signals*" },
    });

    for (const signal of topSignals.slice(0, 5)) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${signal.title}*\n_${signal.type}_`,
        },
      });
    }
  }

  const text = `Daily Digest: ${newContracts} new contracts, ${newSignals} new signals`;

  return { blocks, text };
}

export function formatNewContractAlert(params: NewContractAlertParams): {
  blocks: unknown[];
  text: string;
} {
  const { title, buyerName, value, deadline, sector, contractUrl } = params;

  const valueStr =
    value > 0 ? `\u00a3${value.toLocaleString("en-GB")}` : "N/A";

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: ":rotating_light: New Contract",
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Title:*\n${title}` },
        { type: "mrkdwn", text: `*Buyer:*\n${buyerName}` },
        { type: "mrkdwn", text: `*Value:*\n${valueStr}` },
        { type: "mrkdwn", text: `*Deadline:*\n${deadline}` },
        { type: "mrkdwn", text: `*Sector:*\n${sector}` },
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View Contract", emoji: true },
          url: contractUrl,
          action_id: "view_contract",
        },
      ],
    },
  ];

  const text = `New Contract: ${title} from ${buyerName} (${valueStr})`;

  return { blocks, text };
}
