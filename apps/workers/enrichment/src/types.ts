import type { ObjectId } from "mongodb";

// ---------------------------------------------------------------------------
// Worker environment bindings
// ---------------------------------------------------------------------------

export interface Env {
  MONGODB_URI: string;
  ANTHROPIC_API_KEY: string;
  APIFY_API_TOKEN: string;
  LOGO_DEV_TOKEN: string;
  DOCS: R2Bucket;
  SPEND_INGEST_WORKER_URL: string;
  BOARD_MINUTES_WORKER_URL: string;
  WORKER_SECRET?: string;
}

// ---------------------------------------------------------------------------
// Enrichment pipeline stages (processed in order)
// ---------------------------------------------------------------------------

export type EnrichmentStage =
  | "parent_link"
  | "classify"
  | "website_discovery"
  | "logo_linkedin"
  | "governance_urls"
  | "moderngov"
  | "scrape"
  | "personnel"
  | "score";

export const STAGE_ORDER: EnrichmentStage[] = [
  "parent_link",
  "classify",
  "website_discovery",
  "logo_linkedin",
  "governance_urls",
  "moderngov",
  "scrape",
  "personnel",
  "score",
];

// Document enrichment stages (process contracts, not buyers)
export type DocEnrichmentStage = "pcs_documents" | "proactis_documents";

export const DOC_STAGE_ORDER: DocEnrichmentStage[] = [
  "pcs_documents",
  "proactis_documents",
];

// ---------------------------------------------------------------------------
// EnrichmentJob — tracks pipeline progress per stage
// ---------------------------------------------------------------------------

export interface EnrichmentJobDoc {
  _id?: ObjectId;
  stage: EnrichmentStage | DocEnrichmentStage;
  status: "running" | "paused" | "complete" | "error";
  cursor: string | null;
  batchSize: number;
  totalProcessed: number;
  totalErrors: number;
  errorLog: string[];
  startedAt: Date;
  lastRunAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// DataSource — canonical UK public sector org registry (seeded from spec)
// ---------------------------------------------------------------------------

export interface DataSourceDoc {
  _id?: ObjectId;
  name: string;
  orgType: string;
  region?: string;
  democracyPortalUrl?: string;
  boardPapersUrl?: string;
  platform?: string;
  website?: string;
  parentOrg?: string;
  tier: number;
  status: "active" | "abolished" | "merged";
  successorOrg?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Buyer — extended with enrichment fields
// ---------------------------------------------------------------------------

export interface BuyerDoc {
  _id?: ObjectId;
  name: string;
  orgId: string;
  sector?: string;
  region?: string;
  website?: string;
  description?: string;
  address?: string;
  industry?: string;
  contractCount?: number;
  contacts?: unknown[];

  // Classification (from enrichment)
  orgType?: string;
  orgSubType?: string;
  dataSourceId?: ObjectId;

  // Governance portals
  democracyPortalUrl?: string;
  democracyPlatform?: string;
  boardPapersUrl?: string;

  // Financial/size
  staffCount?: number;
  annualBudget?: number;

  // Visual / contact enrichment
  logoUrl?: string;
  linkedinUrl?: string;

  // Full LinkedIn company data
  linkedin?: {
    id?: string;
    universalName?: string;
    tagline?: string;
    companyType?: string;
    foundedYear?: number;
    followerCount?: number;
    employeeCountRange?: { start?: number; end?: number };
    specialities?: unknown[];
    industries?: unknown[];
    locations?: unknown[];
    logos?: unknown[];
    backgroundCovers?: unknown[];
    phone?: string;
    fundingData?: unknown;
    lastFetchedAt?: Date;
  };

  // Enrichment metadata
  enrichmentScore?: number;
  enrichmentSources?: string[];
  lastEnrichedAt?: Date;
  enrichmentVersion?: number;
  enrichmentPriority?: number;

  // Parent-child hierarchy
  parentBuyerId?: ObjectId;
  childBuyerIds?: ObjectId[];
  isParent?: boolean;

  nameLower?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// KeyPersonnel — extracted from governance pages
// ---------------------------------------------------------------------------

export interface KeyPersonnelDoc {
  _id?: ObjectId;
  buyerId: ObjectId;
  name: string;
  title?: string;
  role?: string;
  department?: string;
  email?: string;
  phone?: string;
  sourceUrl?: string;
  extractionMethod?: "moderngov_api" | "website_scrape" | "claude_haiku";
  confidence?: number;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// BoardDocument — metadata (content stored in R2)
// ---------------------------------------------------------------------------

export interface BoardDocumentDoc {
  _id?: ObjectId;
  buyerId: ObjectId;
  dataSourceName: string;
  title: string;
  meetingDate?: Date;
  committeeId?: string;
  committeeName?: string;
  documentType?: "minutes" | "agenda" | "report" | "board_pack";
  sourceUrl: string;
  r2Key?: string;
  textContent?: string;
  textLength?: number;
  extractionStatus: "pending" | "extracted" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Stage function signature
// ---------------------------------------------------------------------------

export type StageFn = (
  db: import("mongodb").Db,
  env: Env,
  job: EnrichmentJobDoc,
  maxItems: number
) => Promise<{ processed: number; errors: number; done: boolean }>;
