"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Building2, FileText } from "lucide-react";
import { EnrichmentBadge } from "@/components/buyers/enrichment-badge";

import type { ChildBuyerData } from "@/components/buyers/buyer-detail-client";

interface DepartmentsTabProps {
  departments: ChildBuyerData[];
}

function orgTypeLabel(orgType: string): string {
  const labels: Record<string, string> = {
    local_council_london: "London Borough",
    local_council_metro: "Metropolitan Borough",
    local_council_district: "District Council",
    local_council_county: "County Council",
    local_council_unitary: "Unitary Authority",
    nhs_trust_acute: "NHS Trust (Acute)",
    nhs_trust_mental_health: "NHS Trust (Mental Health)",
    nhs_icb: "NHS ICB",
    nhs_other: "NHS Body",
    central_government: "Central Government",
    devolved_government: "Devolved Government",
    university: "University",
    private_company: "Private Company",
  };
  return labels[orgType] ?? orgType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DepartmentsTab({ departments }: DepartmentsTabProps) {
  if (departments.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {departments.map((child, i) => (
        <motion.div
          key={child._id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: i * 0.03 }}
        >
          <Link
            href={`/buyers/${child._id}`}
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
          >
            {/* Logo */}
            <div className="w-10 h-10 rounded-lg bg-muted flex-shrink-0 flex items-center justify-center border border-border">
              {child.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={child.logoUrl}
                  alt=""
                  className="w-7 h-7 object-contain rounded"
                />
              ) : (
                <Building2 className="w-5 h-5 text-muted-foreground" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{child.name}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                {child.orgType && (
                  <span>{orgTypeLabel(child.orgType)}</span>
                )}
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {child.contractCount}
                </span>
              </div>
            </div>

            {/* Enrichment Score */}
            {child.enrichmentScore != null && child.enrichmentScore > 0 && (
              <div className="flex-shrink-0">
                <EnrichmentBadge score={child.enrichmentScore} size="sm" />
              </div>
            )}
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
