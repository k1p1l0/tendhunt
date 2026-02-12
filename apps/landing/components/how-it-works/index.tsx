"use client";
import React, { useEffect, useState } from "react";
import { Container } from "../container";
import { Badge } from "../badge";
import { SubHeading } from "../subheading";
import { SectionHeading } from "../seciton-heading";
import { PixelatedCanvas } from "../pixelated-canvas";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import {
  ConnectYourTooklsSkeleton,
  DeployAndScaleSkeleton,
  DesignYourWorkflowSkeleton,
} from "./skeletons";
import { UserPlus, Search, Unlock } from "lucide-react";
import { AnimateInView } from "../animate-in-view";

type Tab = {
  title: string;
  description: string;
  icon: React.FC<any>;
  id: string;
};

export const HowItWorks = () => {
  const tabs = [
    {
      title: "Sign Up Free",
      description:
        "Create your account in 60 seconds. Get 10 free credits instantly — no credit card required.",
      icon: UserPlus,
      id: "workflow",
      skeleton: <DesignYourWorkflowSkeleton />,
    },
    {
      title: "Search & Filter",
      description:
        "Search 200,000+ UK public sector contracts. Filter by value, sector, region, and deadline. AI scores every opportunity for your business.",
      icon: Search,
      id: "tools",
      skeleton: <ConnectYourTooklsSkeleton />,
    },
    {
      title: "Reveal & Win",
      description:
        "Spend 1 credit to reveal buyer contact details — emails, LinkedIn profiles, and phone numbers for the decision-makers who award contracts.",
      icon: Unlock,
      id: "deploy",
      skeleton: <DeployAndScaleSkeleton />,
    },
  ];

  const [activeTab, setActiveTab] = useState(tabs[0]);

  const DURATION = 8000;

  useEffect(() => {
    const interval = setInterval(() => {
      const currentIndex = tabs.findIndex((tab) => tab.id === activeTab.id);
      const nextIndex = (currentIndex + 1) % tabs.length;
      setActiveTab(tabs[nextIndex]);
    }, DURATION);

    return () => clearInterval(interval);
  }, [activeTab]);
  return (
    <Container className="border-divide border-x">
      <div id="how-it-works" className="flex scroll-mt-20 flex-col items-center pt-16">
        <AnimateInView>
          <Badge text="How it works" />
        </AnimateInView>
        <AnimateInView delay={0.06}>
          <SectionHeading className="mt-4">Three steps to your next contract</SectionHeading>
        </AnimateInView>

        <AnimateInView delay={0.12}>
          <SubHeading as="p" className="mx-auto mt-6 max-w-lg">
            Stop searching multiple portals. TendHunt aggregates every UK public
            sector opportunity into one intelligent platform.
          </SubHeading>
        </AnimateInView>
        {/* Desktop Tabs */}
        <div className="border-divide divide-divide mt-16 hidden w-full grid-cols-2 divide-x border-t lg:grid">
          <div className="divide-divide divide-y">
            {tabs.map((tab, index) => (
              <button
                key={tab.title}
                className="group relative flex w-full flex-col items-start overflow-hidden px-12 py-8 hover:bg-gray-100 dark:hover:bg-neutral-800"
                onClick={() => setActiveTab(tab)}
              >
                {tab.id === activeTab.id && (
                  <Canvas activeTab={tab} duration={2500} />
                )}
                {tab.id === activeTab.id && <Loader duration={DURATION} />}
                <div
                  className={cn(
                    "text-charcoal-700 relative z-20 flex items-center gap-2 font-medium dark:text-neutral-100",
                    activeTab.id !== tab.id && "group-hover:text-brand",
                  )}
                >
                  <tab.icon size={16} className="shrink-0" /> {tab.title}
                </div>
                <p
                  className={cn(
                    "relative z-20 mt-2 text-left text-sm text-gray-600 dark:text-neutral-300",
                    activeTab.id === tab.id && "text-charcoal-700",
                  )}
                >
                  {tab.description}
                </p>
              </button>
            ))}
          </div>
          <div className="relative h-full max-h-[370px] overflow-hidden bg-[radial-gradient(var(--color-dots)_1px,transparent_1px)] mask-r-from-90% mask-l-from-90% mask-radial-from-20% [background-size:10px_10px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab.id}
                className="absolute inset-0"
                initial={{ filter: "blur(10px)", opacity: 0 }}
                animate={{ filter: "blur(0px)", opacity: 1 }}
                exit={{ filter: "blur(10px)", opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                {activeTab.skeleton}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        {/* Mobile Tabs */}
        <div className="divide-divide border-divide mt-16 flex w-full flex-col divide-y overflow-hidden border-t lg:hidden">
          {tabs.map((tab, index) => (
            <div
              key={tab.title + "mobile"}
              className="group relative flex w-full flex-col items-start overflow-hidden px-4 py-4 md:px-12 md:py-8"
            >
              <div className="text-charcoal-700 relative z-20 flex items-center gap-2 font-medium dark:text-neutral-100">
                <tab.icon className="shrink-0" /> {tab.title}
              </div>
              <p className="relative z-20 mt-2 text-left text-sm text-gray-600 dark:text-neutral-300">
                {tab.description}
              </p>
              <div className="relative mx-auto h-80 w-full overflow-hidden mask-t-from-90% mask-r-from-90% mask-b-from-90% mask-l-from-90% sm:h-80 sm:w-160">
                {tab.skeleton}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
};

const Loader = ({ duration = 2500 }: { duration?: number }) => {
  return (
    <motion.div
      className="bg-brand absolute inset-x-0 bottom-0 z-30 h-0.5 w-full rounded-full"
      initial={{ width: 0 }}
      animate={{ width: "100%" }}
      transition={{ duration: duration / 1000 }}
    />
  );
};

const Canvas = ({
  activeTab,
  duration,
}: {
  activeTab: Tab;
  duration: number;
}) => {
  return (
    <>
      <div className="absolute inset-x-0 z-20 h-full w-full bg-white mask-t-from-50% dark:bg-neutral-900" />
      <PixelatedCanvas
        key={activeTab.id}
        isActive={true}
        fillColor="var(--color-canvas)"
        backgroundColor="var(--color-canvas-fill)"
        size={2.5}
        duration={duration}
        className="absolute inset-0 scale-[1.01] opacity-20"
      />
    </>
  );
};

