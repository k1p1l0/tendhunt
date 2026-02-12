"use client";
import React from "react";
import { Container } from "../container";
import { Badge } from "../badge";
import { SubHeading } from "../subheading";
import { SectionHeading } from "../seciton-heading";
import { Card, CardDescription, CardTitle } from "./card";
import {
  BrainIcon,
  FingerprintIcon,
  MouseBoxIcon,
  NativeIcon,
  RealtimeSyncIcon,
  SDKIcon,
} from "@/icons/bento-icons";
import {
  LLMModelSelectorSkeleton,
  NativeToolsIntegrationSkeleton,
  TextToWorkflowBuilderSkeleton,
} from "./skeletons";
import { AnimateInView } from "../animate-in-view";

export const AgenticIntelligence = () => {
  return (
    <Container className="border-divide border-x">
      <div id="features" className="flex scroll-mt-20 flex-col items-center py-16">
        <AnimateInView>
          <Badge text="Features" />
        </AnimateInView>
        <AnimateInView delay={0.08}>
          <SectionHeading className="mt-4">
            Your Unfair Advantage in Procurement
          </SectionHeading>
        </AnimateInView>

        <AnimateInView delay={0.16}>
          <SubHeading as="p" className="mx-auto mt-6 max-w-lg px-2">
            Six powerful tools that give you early intelligence, qualified leads,
            and a direct line to decision-makers
          </SubHeading>
        </AnimateInView>

        <div className="border-divide divide-divide mt-16 grid grid-cols-1 divide-y border-y md:grid-cols-2 md:divide-x">
          <AnimateInView delay={0}>
            <Card className="overflow-hidden mask-b-from-80%">
              <div className="flex items-center gap-2">
                <BrainIcon />
                <CardTitle>Contract Discovery</CardTitle>
              </div>
              <CardDescription>
                Search 200,000+ contracts from Find a Tender and Contracts Finder.
                Filter by value, sector, region, CPV code, and deadline — all in one place.
              </CardDescription>
              <LLMModelSelectorSkeleton />
            </Card>
          </AnimateInView>
          {/* Vibe Scanner AI — skip animation per user request */}
          <Card className="overflow-hidden mask-b-from-80%">
            <div className="flex items-center gap-2">
              <MouseBoxIcon />
              <CardTitle>Vibe Scanner AI</CardTitle>
            </div>
            <CardDescription>
              Upload your company profile and our AI scores every contract 1-10
              based on fit. See your best opportunities first, not just keyword matches.
            </CardDescription>
            <TextToWorkflowBuilderSkeleton />
          </Card>
        </div>

        <div className="w-full">
          <AnimateInView delay={0.1}>
            <Card className="relative w-full max-w-none overflow-hidden">
              <div className="pointer-events-none absolute inset-0 h-full w-full bg-[radial-gradient(var(--color-dots)_1px,transparent_1px)] mask-radial-from-10% [background-size:10px_10px]"></div>
              <div className="flex items-center gap-2">
                <NativeIcon />
                <CardTitle>Buyer Intelligence</CardTitle>
              </div>
              <CardDescription>
                Reveal decision-maker contact details with one credit. Get emails,
                LinkedIn profiles, and phone numbers for the people who award contracts.
              </CardDescription>
              <NativeToolsIntegrationSkeleton />
            </Card>
          </AnimateInView>
        </div>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <AnimateInView delay={0}>
            <Card>
              <div className="flex items-center gap-2">
                <FingerprintIcon />
                <CardTitle>Buying Signals</CardTitle>
              </div>
              <CardDescription>
                Monitor 6 types of buying signals — staffing changes, strategy docs,
                financial reports — to find opportunities before they are published.
              </CardDescription>
            </Card>
          </AnimateInView>
          <AnimateInView delay={0.1}>
            <Card>
              <div className="flex items-center gap-2">
                <RealtimeSyncIcon />
                <CardTitle>Smart Alerts</CardTitle>
              </div>
              <CardDescription>
                Get notified instantly when new contracts match your criteria. Never
                miss a deadline or relevant opportunity again.
              </CardDescription>
            </Card>
          </AnimateInView>
          <AnimateInView delay={0.2}>
            <Card>
              <div className="flex items-center gap-2">
                <SDKIcon />
                <CardTitle>Export & Reporting</CardTitle>
              </div>
              <CardDescription>
                Export shortlists, generate bid pipeline reports, and share
                opportunities with your team in one click.
              </CardDescription>
            </Card>
          </AnimateInView>
        </div>
      </div>
    </Container>
  );
};
