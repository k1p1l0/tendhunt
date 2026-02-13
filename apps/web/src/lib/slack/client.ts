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

  const data = (await res.json()) as { ok: boolean; error?: string };
  if (!data.ok) {
    console.error("Slack API error:", data.error);
  }
  return data;
}
