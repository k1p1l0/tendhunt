import { CTA } from "@/components/cta";
import { DivideX } from "@/components/divide";
import { FAQs } from "@/components/faqs";
import { Pricing } from "@/components/pricing";
import { PricingTable } from "@/components/pricing-table";

import { getSEOTags } from "@/lib/seo";

export const metadata = getSEOTags({
  title: "Pricing - TendHunt | UK Procurement Intelligence",
  description:
    "TendHunt is a UK procurement intelligence platform. Find government contracts before your competitors, reveal buyer contacts, and track procurement signals.",
});

export default function PricingPage() {
  return (
    <main>
      <DivideX />
      <Pricing />
      <DivideX />
      <PricingTable />
      {/* <DivideX /> */}
      <FAQs />
      <DivideX />
      <CTA />
      <DivideX />
    </main>
  );
}
