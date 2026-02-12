import { clerkClient } from "@clerk/nextjs/server";
import mongoose from "mongoose";

import { dbConnect } from "./mongodb";

export interface EnrichedUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  createdAt: number;
  lastSignInAt: number | null;
  role: string;
  onboardingComplete: boolean;
  companyName: string | null;
  companyLogo: string | null;
  creditBalance: number;
  totalCreditsSpent: number;
}

interface CompanyProfileDoc {
  userId: string;
  companyName?: string;
  logoUrl?: string;
}

interface CreditAccountDoc {
  userId: string;
  balance?: number;
  totalSpent?: number;
}

export async function fetchEnrichedUsers(): Promise<{
  users: EnrichedUser[];
  total: number;
}> {
  const client = await clerkClient();
  const { data: clerkUsers, totalCount } = await client.users.getUserList({
    limit: 100,
    orderBy: "-created_at",
  });

  await dbConnect();
  // Cast to avoid mongoose-bundled mongodb types vs direct mongodb types conflict
  const db = mongoose.connection.db as NonNullable<typeof mongoose.connection.db>;

  const clerkIds = clerkUsers.map((u) => u.id);

  const [profiles, credits] = await Promise.all([
    db
      .collection<CompanyProfileDoc>("companyprofiles")
      .find({ userId: { $in: clerkIds } })
      .toArray(),
    db
      .collection<CreditAccountDoc>("creditaccounts")
      .find({ userId: { $in: clerkIds } })
      .toArray(),
  ]);

  const profileMap = new Map(profiles.map((p) => [p.userId, p]));
  const creditMap = new Map(credits.map((c) => [c.userId, c]));

  const users: EnrichedUser[] = clerkUsers.map((clerk) => {
    const profile = profileMap.get(clerk.id);
    const credit = creditMap.get(clerk.id);

    return {
      id: clerk.id,
      email: clerk.emailAddresses[0]?.emailAddress ?? null,
      firstName: clerk.firstName,
      lastName: clerk.lastName,
      imageUrl: clerk.imageUrl,
      createdAt: clerk.createdAt,
      lastSignInAt: clerk.lastSignInAt,
      role:
        (clerk.publicMetadata as Record<string, unknown>)?.role === "admin"
          ? "admin"
          : "user",
      onboardingComplete:
        ((clerk.publicMetadata as Record<string, unknown>)
          ?.onboardingComplete as boolean) || false,
      companyName: profile?.companyName || null,
      companyLogo: profile?.logoUrl || null,
      creditBalance: credit?.balance ?? 0,
      totalCreditsSpent: credit?.totalSpent ?? 0,
    };
  });

  return { users, total: totalCount };
}
