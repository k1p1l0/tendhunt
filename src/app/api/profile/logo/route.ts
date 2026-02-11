import { auth } from "@clerk/nextjs/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client } from "@/lib/r2";
import { nanoid } from "nanoid";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
  "image/gif",
]);

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { filename, contentType } = await req.json();

    if (!filename || typeof filename !== "string") {
      return Response.json(
        { error: "filename is required" },
        { status: 400 }
      );
    }

    if (!contentType || !ALLOWED_IMAGE_TYPES.has(contentType)) {
      return Response.json(
        {
          error: `Invalid content type. Allowed: ${[...ALLOWED_IMAGE_TYPES].join(", ")}`,
        },
        { status: 400 }
      );
    }

    const key = `logos/${userId}/${nanoid()}-${filename}`;

    const url = await getSignedUrl(
      r2Client,
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 300 }
    );

    return Response.json({ url, key });
  } catch (error) {
    console.error("Logo presigned URL error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate upload URL",
      },
      { status: 500 }
    );
  }
}
