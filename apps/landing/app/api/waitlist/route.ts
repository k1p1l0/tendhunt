import { getCloudflareContext } from "@opennextjs/cloudflare";

interface WaitlistPayload {
  email: string;
  company: string;
  role: string;
  "cf-turnstile-response": string;
}

export async function POST(request: Request) {
  try {
    const data = (await request.json()) as WaitlistPayload;
    const { email, company, role, "cf-turnstile-response": turnstileToken } = data;

    if (!email || !company || !role || !turnstileToken) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { env } = getCloudflareContext();

    // Verify Turnstile token
    const verifyResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: turnstileToken,
        }),
      }
    );

    const outcome = (await verifyResponse.json()) as { success: boolean };
    if (!outcome.success) {
      return Response.json(
        { error: "Bot verification failed" },
        { status: 403 }
      );
    }

    // Insert into D1
    const db = env.DB;
    await db
      .prepare(
        "INSERT INTO waitlist (email, company, role, created_at) VALUES (?, ?, ?, ?)"
      )
      .bind(email, company, role, new Date().toISOString())
      .run();

    return Response.json(
      {
        success: true,
        message: "You're on the list! We'll email you when TendHunt launches.",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message?.includes("UNIQUE constraint failed")
    ) {
      return Response.json(
        { error: "This email is already on the waitlist" },
        { status: 409 }
      );
    }
    console.error("Waitlist API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
