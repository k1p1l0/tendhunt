import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import { encrypt } from "@/lib/encryption";
import SlackIntegration from "@/models/slack-integration";

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return Response.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?slack=error&message=${error}`
    );
  }

  if (!code || !state) {
    return Response.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?slack=error&message=missing_params`
    );
  }

  let userId: string;
  try {
    const decoded = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8")
    );

    if (
      !decoded.timestamp ||
      Date.now() - decoded.timestamp > 300_000
    ) {
      return Response.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?slack=error&message=state_expired`
      );
    }

    const { userId: sessionUserId } = await auth();
    if (!sessionUserId || sessionUserId !== decoded.userId) {
      return Response.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?slack=error&message=user_mismatch`
      );
    }

    userId = decoded.userId;
  } catch {
    return Response.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?slack=error&message=invalid_state`
    );
  }

  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: SLACK_CLIENT_ID || "",
      client_secret: SLACK_CLIENT_SECRET || "",
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/slack/callback`,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.ok) {
    return Response.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?slack=error&message=${tokenData.error}`
    );
  }

  await dbConnect();

  await SlackIntegration.findOneAndUpdate(
    { userId },
    {
      $set: {
        teamId: tokenData.team?.id,
        teamName: tokenData.team?.name,
        botToken: encrypt(tokenData.access_token),
        isActive: true,
      },
    },
    { upsert: true }
  );

  return Response.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/settings?slack=success`
  );
}
