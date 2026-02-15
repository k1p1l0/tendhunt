import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  getRecentConversations,
  ACCOUNT_MANAGER,
} from "@/lib/dashboard";
import { SculptorHomepage } from "@/components/sculptor/sculptor-homepage";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [user, recentConversations] = await Promise.all([
    currentUser(),
    getRecentConversations(userId, 5),
  ]);

  return (
    <SculptorHomepage
      userName={user?.firstName || "there"}
      recentConversations={recentConversations}
      accountManager={ACCOUNT_MANAGER}
    />
  );
}
