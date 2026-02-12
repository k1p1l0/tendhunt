import { auth } from "@clerk/nextjs/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "@/lib/r2";
import { dbConnect } from "@/lib/mongodb";
import CompanyProfile from "@/models/company-profile";

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { key } = await req.json();

    if (!key || typeof key !== "string") {
      return Response.json(
        { error: "key is required and must be a string" },
        { status: 400 }
      );
    }

    // Delete from R2 first (idempotent — no error if key doesn't exist)
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
      })
    );

    // Remove key from MongoDB documentKeys array
    await dbConnect();
    await CompanyProfile.findOneAndUpdate(
      { userId },
      {
        $pull: { documentKeys: key },
        $set: { lastEditedAt: new Date() },
      }
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error("Document delete error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete document",
      },
      { status: 500 }
    );
  }
}
