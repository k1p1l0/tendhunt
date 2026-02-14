"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileStats } from "./profile-stats";
import { SectorChart } from "./sector-chart";
import { RegionChart } from "./region-chart";
import { TimelineChart } from "./timeline-chart";
import { ContractsTab } from "./contracts-tab";
import { BuyersTab } from "./buyers-tab";
import { SpendTab } from "./spend-tab";

import type { CompetitorProfile } from "@/lib/competitors";

interface ProfileTabsProps {
  profile: CompetitorProfile;
  supplierName: string;
}

const TAB_TRANSITION = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.2, ease: "easeOut" as const },
};

export function ProfileTabs({ profile, supplierName }: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contracts">
            Contracts ({profile.contractCount.toLocaleString()})
          </TabsTrigger>
          <TabsTrigger value="buyers">
            Buyers ({profile.buyerCount.toLocaleString()})
          </TabsTrigger>
          <TabsTrigger value="spend">Spend</TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} {...TAB_TRANSITION}>
            <TabsContent value="overview" className="mt-6 space-y-6" forceMount={activeTab === "overview" ? true : undefined}>
              {activeTab === "overview" && (
                <>
                  <ProfileStats profile={profile} />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SectorChart sectors={profile.sectors} />
                    <RegionChart regions={profile.regions} />
                  </div>
                  <TimelineChart timeline={profile.timeline} />
                </>
              )}
            </TabsContent>

            <TabsContent value="contracts" className="mt-6" forceMount={activeTab === "contracts" ? true : undefined}>
              {activeTab === "contracts" && (
                <ContractsTab supplierName={supplierName} />
              )}
            </TabsContent>

            <TabsContent value="buyers" className="mt-6" forceMount={activeTab === "buyers" ? true : undefined}>
              {activeTab === "buyers" && (
                <BuyersTab supplierName={supplierName} />
              )}
            </TabsContent>

            <TabsContent value="spend" className="mt-6" forceMount={activeTab === "spend" ? true : undefined}>
              {activeTab === "spend" && (
                <SpendTab supplierName={supplierName} />
              )}
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </motion.div>
  );
}
