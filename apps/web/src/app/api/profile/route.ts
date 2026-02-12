import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import CompanyProfile from "@/models/company-profile";

/** Whitelist of fields that can be updated via PATCH */
const ALLOWED_FIELDS = new Set([
  "companyName",
  "website",
  "address",
  "linkedinUrl",
  "summary",
  "sectors",
  "capabilities",
  "keywords",
  "certifications",
  "idealContractDescription",
  "companySize",
  "regions",
  "logoUrl",
  "documentKeys",
]);

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    await dbConnect();

    const profile = await CompanyProfile.findOne({ userId }).lean();

    return Response.json({ profile: profile || null });
  } catch (error) {
    console.error("Profile GET error:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch profile",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();

    // Whitelist: only keep allowed fields
    const validatedFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_FIELDS.has(key)) {
        validatedFields[key] = value;
      }
    }

    if (Object.keys(validatedFields).length === 0) {
      return Response.json(
        { error: "No valid fields provided" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Upsert: update if exists, create if not
    const profile = await CompanyProfile.findOneAndUpdate(
      { userId },
      { $set: { ...validatedFields, lastEditedAt: new Date() } },
      { new: true, upsert: true }
    ).lean();

    return Response.json({ profile });
  } catch (error) {
    console.error("Profile PATCH error:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update profile",
      },
      { status: 500 }
    );
  }
}
