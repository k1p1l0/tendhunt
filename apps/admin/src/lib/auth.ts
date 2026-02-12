import { clerkClient } from "@clerk/nextjs/server";

export async function requireAdmin(userId: string): Promise<boolean> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const role = (user.publicMetadata as Record<string, unknown>)?.role;
  return role === "admin";
}
