export async function sendSlackMessage(
  botToken: string,
  channelId: string,
  blocks: unknown[],
  text: string
) {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify({ channel: channelId, blocks, text }),
  });

  const data = (await res.json()) as {
    ok: boolean;
    error?: string;
    ts?: string;
    channel?: string;
  };
  if (!data.ok) {
    console.error("Slack API error:", data.error);
  }
  return data;
}

export async function addReaction(
  botToken: string,
  channelId: string,
  timestamp: string,
  emoji: string
) {
  const res = await fetch("https://slack.com/api/reactions.add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify({
      channel: channelId,
      timestamp,
      name: emoji,
    }),
  });

  const data = (await res.json()) as { ok: boolean; error?: string };
  if (!data.ok && data.error !== "already_reacted") {
    console.error("Slack reaction error:", data.error);
  }
  return data;
}

export async function removeReaction(
  botToken: string,
  channelId: string,
  timestamp: string,
  emoji: string
) {
  const res = await fetch("https://slack.com/api/reactions.remove", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify({
      channel: channelId,
      timestamp,
      name: emoji,
    }),
  });

  const data = (await res.json()) as { ok: boolean; error?: string };
  if (!data.ok && data.error !== "no_reaction") {
    console.error("Slack remove reaction error:", data.error);
  }
  return data;
}
