import { Contact } from "@/components/contact";
import { DivideX } from "@/components/divide";
import { SignUp } from "@/components/sign-up";

import { getSEOTags } from "@/lib/seo";

export const metadata = getSEOTags({
  title: "Contact | TendHunt",
  description:
    "Get in touch with TendHunt for UK procurement intelligence.",
});

export default function SignupPage() {
  return (
    <main>
      <DivideX />
      <Contact />
      <DivideX />
    </main>
  );
}
