import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { fetchEnrichedUsers } from "@/lib/users";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Defense-in-depth: verify admin role beyond middleware
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const role = (user.publicMetadata as Record<string, unknown>)?.role;

  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await fetchEnrichedUsers();

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
