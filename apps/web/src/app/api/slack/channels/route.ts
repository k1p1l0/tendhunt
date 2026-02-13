import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import { decrypt } from "@/lib/encryption";
import SlackIntegration from "@/models/slack-integration";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  await dbConnect();

  const integration = await SlackIntegration.findOne({
    userId,
    isActive: true,
  }).lean();

  if (!integration) {
    return Response.json(
      { error: "No Slack integration found" },
      { status: 404 }
    );
  }

  const botToken = decrypt(integration.botToken as string);

  const res = await fetch(
    "https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=200",
    {
      headers: { Authorization: `Bearer ${botToken}` },
    }
  );

  const data = await res.json();

  if (!data.ok) {
    return Response.json(
      { error: data.error || "Failed to fetch channels" },
      { status: 502 }
    );
  }

  const channels = data.channels.map(
    (ch: { id: string; name: string; is_private: boolean }) => ({
      id: ch.id,
      name: ch.name,
      isPrivate: ch.is_private,
    })
  );

  return Response.json({ channels });
}
