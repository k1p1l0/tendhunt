import { AgenticIntelligence } from "@/components/agentic-intelligence";
import { CTA } from "@/components/cta";
import { DivideX } from "@/components/divide";
import { FAQs } from "@/components/faqs";
import { Hero } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import { Pricing } from "@/components/pricing";
import { Security } from "@/components/security";
import { LatestPosts } from "@/components/latest-posts";
import { WaitlistSection } from "@/components/waitlist-section";

import { getSEOTags, generateSchemaObject } from "@/lib/seo";

export const metadata = getSEOTags();

export default async function Home() {
  const schemas = generateSchemaObject();

  return (
    <main>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <DivideX />
      <Hero />
      <DivideX />
      <HowItWorks />
      <DivideX />
      <AgenticIntelligence />
      <DivideX />
      <Pricing />
      <DivideX />
      <Security />
      <DivideX />
      <FAQs />
      <DivideX />
      <LatestPosts />
      <DivideX />
      <WaitlistSection />
      <DivideX />
      <CTA />
      <DivideX />
    </main>
  );
}
