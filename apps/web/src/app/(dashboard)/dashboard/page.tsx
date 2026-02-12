import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AgentContextSetter } from "@/components/agent/agent-context-setter";
import {
  getUserScanners,
  getTopScores,
  ACCOUNT_MANAGER,
} from "@/lib/dashboard";
import { AccountManagerCard } from "@/components/dashboard/account-manager-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { SavedScannersSection } from "@/components/dashboard/saved-scanners-section";
import { FreshSignalsFeed } from "@/components/dashboard/fresh-signals-feed";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [user, scanners, topScores] = await Promise.all([
    currentUser(),
    getUserScanners(userId),
    getTopScores(userId),
  ]);

  return (
    <div className="space-y-8">
      <AgentContextSetter context={{ page: "dashboard" }} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.firstName || "there"}
        </h1>
        <p className="text-muted-foreground">
          Your procurement intelligence hub
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left column */}
        <div className="space-y-6">
          <AccountManagerCard {...ACCOUNT_MANAGER} />
          <SavedScannersSection scanners={scanners} />
          <FreshSignalsFeed signals={topScores} />
        </div>

        {/* Right column */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
