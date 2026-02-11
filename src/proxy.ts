import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  const { userId, sessionClaims } = await auth();

  // Public routes: no auth required
  if (isPublicRoute(request)) return;

  // Not authenticated: redirect to sign-in
  if (!userId) {
    return (await auth()).redirectToSignIn({ returnBackUrl: request.url });
  }

  // Onboarding route: allow through (authenticated users can always access)
  if (isOnboardingRoute(request)) return;

  // Check if onboarding is complete -- if not, redirect to /onboarding
  const onboardingComplete = sessionClaims?.metadata?.onboardingComplete;
  if (!onboardingComplete) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
