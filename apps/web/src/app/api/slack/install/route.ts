import { auth } from "@clerk/nextjs/server";

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_SCOPES = "chat:write,channels:read,commands";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!SLACK_CLIENT_ID) {
    return Response.json(
      { error: "Slack integration not configured" },
      { status: 503 }
    );
  }

  const state = Buffer.from(JSON.stringify({ userId })).toString("base64url");
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/slack/callback`;

  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", SLACK_CLIENT_ID);
  url.searchParams.set("scope", SLACK_SCOPES);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return Response.redirect(url.toString());
}
