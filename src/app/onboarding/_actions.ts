"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import CompanyProfile from "@/models/company-profile";
import { CreditAccount, CreditTransaction } from "@/models/credit";

interface ProfileData {
  companyName: string;
  summary: string;
  sectors: string[];
  capabilities: string[];
  keywords: string[];
  certifications: string[];
  idealContractDescription: string;
  companySize: string;
  regions: string[];
  documentKeys: string[];
  isAIGenerated: boolean;
}

export async function completeOnboarding(profileData: ProfileData) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { error: "Not authenticated" };
    }

    await dbConnect();

    // Save company profile (upsert)
    await CompanyProfile.findOneAndUpdate(
      { userId },
      {
        ...profileData,
        userId,
        lastEditedAt: new Date(),
        generatedAt: profileData.isAIGenerated ? new Date() : undefined,
      },
      { upsert: true, new: true }
    );

    // Create credit account with signup bonus (IDEMPOTENT)
    const existing = await CreditAccount.findOne({ userId });
    if (!existing) {
      await CreditAccount.create({
        userId,
        balance: 10,
        totalEarned: 10,
        totalSpent: 0,
      });
      await CreditTransaction.create({
        userId,
        type: "SIGNUP_BONUS",
        amount: 10,
        description: "Welcome to TendHunt! 10 free credits.",
        balanceAfter: 10,
      });
    }

    // Mark onboarding complete in Clerk publicMetadata
    const client = await clerkClient();
    await client.users.updateUser(userId, {
      publicMetadata: { onboardingComplete: true },
    });

    return { success: true };
  } catch (error) {
    console.error("Complete onboarding error:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to complete onboarding",
    };
  }
}
