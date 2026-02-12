import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/user";

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req);

    const eventType = evt.type;

    if (eventType === "user.created") {
      await dbConnect();

      const { id, email_addresses, first_name, last_name, image_url } =
        evt.data;
      const primaryEmail = email_addresses?.[0]?.email_address;

      await User.create({
        clerkId: id,
        email: primaryEmail,
        firstName: first_name ?? "",
        lastName: last_name ?? "",
        imageUrl: image_url ?? "",
      });
    }

    if (eventType === "user.updated") {
      await dbConnect();

      const { id, email_addresses, first_name, last_name, image_url } =
        evt.data;
      const primaryEmail = email_addresses?.[0]?.email_address;

      await User.findOneAndUpdate(
        { clerkId: id },
        {
          email: primaryEmail,
          firstName: first_name ?? "",
          lastName: last_name ?? "",
          imageUrl: image_url ?? "",
          updatedAt: new Date(),
        }
      );
    }

    if (eventType === "user.deleted") {
      await dbConnect();

      const { id } = evt.data;
      await User.findOneAndDelete({ clerkId: id });
    }

    return new Response("Webhook received", { status: 200 });
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error verifying webhook", { status: 400 });
  }
}
