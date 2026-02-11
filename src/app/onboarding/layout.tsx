import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Crosshair } from "lucide-react";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (sessionClaims?.metadata?.onboardingComplete === true) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Branding header */}
      <header className="flex h-14 items-center border-b px-6">
        <div className="flex items-center gap-2">
          <Crosshair className="size-5 text-primary" />
          <span className="text-lg font-semibold">TendHunt</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex flex-1 items-start justify-center px-4 py-12">
        {children}
      </main>
    </div>
  );
}
