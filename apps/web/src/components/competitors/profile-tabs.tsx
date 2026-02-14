"use client";

import { motion } from "motion/react";
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

export function ProfileTabs({ profile, supplierName }: ProfileTabsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
    >
      <Tabs defaultValue="overview" className="w-full">
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

        <TabsContent value="overview" className="mt-6 space-y-6">
          <ProfileStats profile={profile} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectorChart sectors={profile.sectors} />
            <RegionChart regions={profile.regions} />
          </div>
          <TimelineChart timeline={profile.timeline} />
        </TabsContent>

        <TabsContent value="contracts" className="mt-6">
          <ContractsTab supplierName={supplierName} />
        </TabsContent>

        <TabsContent value="buyers" className="mt-6">
          <BuyersTab supplierName={supplierName} />
        </TabsContent>

        <TabsContent value="spend" className="mt-6">
          <SpendTab supplierName={supplierName} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
