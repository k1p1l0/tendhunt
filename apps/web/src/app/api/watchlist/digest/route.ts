import { dbConnect } from "@/lib/mongodb";
import User from "@/models/user";
import {
  getDigestRecipients,
  getDigestNotifications,
} from "@/lib/watchlist";

/**
 * POST /api/watchlist/digest — trigger email digest for all eligible users.
 *
 * WATCH-06: Email digest summarizing watched competitor activity.
 *
 * Called by a cron job (weekly). Protected by CRON_SECRET header.
 *
 * For v1, this endpoint collects digest data and logs it.
 * In production, connect to Resend or SES to send actual emails.
 */
export async function POST(request: Request) {
  // Verify cron secret
  const cronSecret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && cronSecret !== expectedSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();

    const recipients = await getDigestRecipients();

    if (recipients.length === 0) {
      return Response.json({
        message: "No digest recipients",
        emailsSent: 0,
      });
    }

    let emailsSent = 0;
    const errors: string[] = [];

    for (const recipient of recipients) {
      try {
        // Get user email
        const user = await User.findOne({ clerkId: recipient.userId })
          .select("email firstName")
          .lean();

        if (!user) continue;

        // Get pending notifications for this user
        const notifications = await getDigestNotifications(
          recipient.userId,
          recipient.suppliers
        );

        if (notifications.length === 0) continue;

        // Group notifications by supplier
        const bySupplier = new Map<
          string,
          Array<{ type: string; title: string; body: string; createdAt: string }>
        >();
        for (const n of notifications) {
          const list = bySupplier.get(n.supplierName) ?? [];
          list.push({
            type: n.type,
            title: n.title,
            body: n.body,
            createdAt: n.createdAt,
          });
          bySupplier.set(n.supplierName, list);
        }

        // Build email content (plain text for v1)
        const userDoc = user as unknown as { email: string; firstName: string };
        const greeting = userDoc.firstName
          ? `Hi ${userDoc.firstName}`
          : "Hi there";

        let emailBody = `${greeting},\n\nHere's your weekly competitor activity digest:\n\n`;

        for (const [supplier, items] of bySupplier) {
          emailBody += `--- ${supplier} ---\n`;
          for (const item of items) {
            const typeLabel =
              item.type === "NEW_CONTRACT"
                ? "New contract"
                : item.type === "NEW_REGION"
                  ? "New region"
                  : "New sector";
            emailBody += `  [${typeLabel}] ${item.title}\n  ${item.body}\n\n`;
          }
        }

        emailBody += `View all activity: ${process.env.NEXT_PUBLIC_APP_URL || "https://app.tendhunt.com"}/competitors\n`;
        emailBody += `\n-- TendHunt Competitor Intelligence\n`;

        // In production: send via Resend/SES
        // For v1, log the digest and mark as sent (notifications already marked in getDigestNotifications)
        if (process.env.RESEND_API_KEY) {
          try {
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: "TendHunt <alerts@tendhunt.com>",
                to: [userDoc.email],
                subject: `Competitor Digest: ${notifications.length} new ${notifications.length === 1 ? "update" : "updates"}`,
                text: emailBody,
              }),
            });

            if (res.ok) {
              emailsSent++;
            } else {
              const errText = await res.text();
              errors.push(`Failed to email ${userDoc.email}: ${errText}`);
            }
          } catch (err) {
            errors.push(
              `Email send error for ${userDoc.email}: ${err instanceof Error ? err.message : String(err)}`
            );
          }
        } else {
          // No email provider configured — log the digest
          console.log(
            `[DIGEST] Would email ${userDoc.email}: ${notifications.length} notifications for ${bySupplier.size} suppliers`
          );
          emailsSent++;
        }
      } catch (err) {
        errors.push(
          `Digest error for user ${recipient.userId}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    return Response.json({
      message: `Digest complete`,
      recipientsProcessed: recipients.length,
      emailsSent,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Digest API error:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process digest",
      },
      { status: 500 }
    );
  }
}
