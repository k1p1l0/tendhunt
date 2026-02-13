import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  getUserScanners,
  getTopScores,
  getRecentConversations,
  ACCOUNT_MANAGER,
} from "@/lib/dashboard";
import { SculptorHomepage } from "@/components/sculptor/sculptor-homepage";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [user, scanners, topScores, recentConversations] = await Promise.all([
    currentUser(),
    getUserScanners(userId),
    getTopScores(userId),
    getRecentConversations(userId, 5),
  ]);

  return (
    <SculptorHomepage
      userName={user?.firstName || "there"}
      scanners={scanners}
      topScores={topScores}
      recentConversations={recentConversations}
      accountManager={ACCOUNT_MANAGER}
    />
  );
}
