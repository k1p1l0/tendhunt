import { authenticatePublicApi, publicApiResponse, publicApiError } from "@/lib/public-api-helpers";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/user";

export async function GET(request: Request) {
  const { auth, errorResponse } = await authenticatePublicApi(request);
  if (errorResponse) return errorResponse;

  await dbConnect();

  try {
    const user = await User.findOne({ clerkId: auth!.userId }).lean();

    if (!user) {
      return publicApiResponse({
        summary: "User not found",
        data: null,
      });
    }

    return publicApiResponse({
      summary: `User ${user.firstName} ${user.lastName}`,
      data: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        imageUrl: user.imageUrl,
      },
    });
  } catch (err) {
    return publicApiError(
      err instanceof Error ? err.message : "Failed to fetch user",
      500
    );
  }
}
