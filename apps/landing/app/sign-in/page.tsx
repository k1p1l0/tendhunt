import { DivideX } from "@/components/divide";
import { SignIn } from "@/components/sign-in";

import { getSEOTags } from "@/lib/seo";

export const metadata = getSEOTags({
  title: "Sign In | TendHunt",
  description:
    "Sign in to TendHunt and start finding UK government contracts today.",
});

export default function SignupPage() {
  return (
    <main>
      <DivideX />
      <SignIn />
      <DivideX />
    </main>
  );
}
