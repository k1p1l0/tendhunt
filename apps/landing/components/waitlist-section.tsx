"use client";

import { Container } from "./container";
import { SectionHeading } from "./seciton-heading";
import { SubHeading } from "./subheading";
import { Badge } from "./badge";
import { WaitlistForm } from "./waitlist-form";
import { AnimateInView } from "./animate-in-view";

export function WaitlistSection() {
  return (
    <section id="waitlist" className="scroll-mt-20">
      <Container className="border-divide border-x px-4 py-20">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4">
          <AnimateInView>
            <Badge text="Early Access" />
          </AnimateInView>
          <AnimateInView delay={0.06}>
            <SectionHeading>Join the Waitlist</SectionHeading>
          </AnimateInView>
          <AnimateInView delay={0.12}>
            <SubHeading as="p" className="mb-4">
              Be among the first to access UK procurement intelligence. No credit
              card required.
            </SubHeading>
          </AnimateInView>
          <AnimateInView delay={0.18} y={10} className="w-full">
            <div className="w-full">
              <WaitlistForm />
            </div>
          </AnimateInView>
        </div>
      </Container>
    </section>
  );
}
