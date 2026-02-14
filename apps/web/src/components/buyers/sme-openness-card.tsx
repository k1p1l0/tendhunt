"use client";

import { motion } from "motion/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

import type { VendorMixAnalysis } from "@/lib/spend-analytics";

interface SmeOpennessCardProps {
  data: VendorMixAnalysis;
}

export function SmeOpennessCard({ data }: SmeOpennessCardProps) {
  const signalColor =
    data.signal === "SME-friendly"
      ? "bg-green-500/15 text-green-600 border-green-500/30"
      : data.signal === "Large-org dominated"
        ? "bg-red-500/15 text-red-600 border-red-500/30"
        : "bg-yellow-500/15 text-yellow-600 border-yellow-500/30";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.05 }}
    >
      <Card className="border-l-4 border-l-teal-500 h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-500" />
            <CardTitle className="text-base">SME Openness</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="text-3xl font-bold text-teal-500">
              {data.smeOpennessScore}/100
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {data.sme.percentage}% of spend goes to SMEs ({data.sme.count} vendors)
            </p>
          </div>
          <Badge variant="outline" className={signalColor}>
            {data.signal}
          </Badge>
        </CardContent>
      </Card>
    </motion.div>
  );
}
