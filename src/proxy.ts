import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

const isOnboardingRoute = createRouteMatcher([
  "/onboarding(.*)",
  "/api/profile(.*)",
  "/api/upload(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId, sessionClaims } = await auth();

  // Public routes: no auth required
  if (isPublicRoute(request)) return;

  // Not authenticated: redirect to sign-in
  if (!userId) {
    return (await auth()).redirectToSignIn({ returnBackUrl: request.url });
  }

  // Onboarding routes (page + APIs used during onboarding): allow through
  if (isOnboardingRoute(request)) return;

  // Check if onboarding is complete via JWT session claims
  const onboardingComplete = sessionClaims?.metadata?.onboardingComplete;
  if (onboardingComplete) return;

  // JWT may be stale (Clerk caches tokens ~60s). Fall back to checking
  // Clerk's backend API for the freshest publicMetadata before redirecting.
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    if ((user.publicMetadata as Record<string, unknown>)?.onboardingComplete) {
      return; // DB says onboarded — let them through, JWT will catch up
    }
  } catch {
    // If Clerk API fails, fall through to redirect (safe default)
  }

  return NextResponse.redirect(new URL("/onboarding", request.url));
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
