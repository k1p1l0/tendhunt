import { DivideX } from "@/components/divide";
import { SignUp } from "@/components/sign-up";

import { getSEOTags } from "@/lib/seo";

export const metadata = getSEOTags({
  title: "Sign Up | TendHunt",
  description:
    "Sign up for TendHunt and start finding UK government contracts today.",
});

export default function SignupPage() {
  return (
    <main>
      <DivideX />
      <SignUp />
      <DivideX />
    </main>
  );
}
