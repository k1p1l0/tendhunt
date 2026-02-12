import { auth } from "@clerk/nextjs/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client } from "@/lib/r2";
import { nanoid } from "nanoid";

const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
]);

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { filename, contentType } = await req.json();

  if (!filename || typeof filename !== "string") {
    return Response.json({ error: "filename is required" }, { status: 400 });
  }

  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return Response.json(
      {
        error: `Invalid content type. Allowed: ${[...ALLOWED_CONTENT_TYPES].join(", ")}`,
      },
      { status: 400 }
    );
  }

  const key = `documents/${userId}/${nanoid()}-${filename}`;

  const url = await getSignedUrl(
    r2Client,
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 3600 }
  );

  return Response.json({ url, key });
}
