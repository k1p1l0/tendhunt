import type { ObjectId } from "mongodb";

// ---------------------------------------------------------------------------
// Worker environment bindings
// ---------------------------------------------------------------------------

export interface Env {
  MONGODB_URI: string;
  ANTHROPIC_API_KEY: string;
  DOCS: R2Bucket;
}

// ---------------------------------------------------------------------------
// Spend ingest pipeline stages (processed in order)
// ---------------------------------------------------------------------------

export type SpendIngestStage =
  | "discover"
  | "extract_links"
  | "download_parse"
  | "aggregate";

export const STAGE_ORDER: SpendIngestStage[] = [
  "discover",
  "extract_links",
  "download_parse",
  "aggregate",
];

// ---------------------------------------------------------------------------
// SpendIngestJob — tracks pipeline progress per stage
// ---------------------------------------------------------------------------

export interface SpendJobDoc {
  _id?: ObjectId;
  stage: SpendIngestStage;
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
// SpendTransaction — individual spend record (mirrors Mongoose schema)
// ---------------------------------------------------------------------------

export interface SpendTransactionDoc {
  _id?: ObjectId;
  buyerId: ObjectId;
  date: Date;
  amount: number;
  vendor: string;
  vendorNormalized: string;
  category: string;
  subcategory?: string;
  department?: string;
  reference?: string;
  sourceFile?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// SpendSummary — pre-computed per-buyer aggregates (mirrors Mongoose schema)
// ---------------------------------------------------------------------------

export interface SpendSummaryDoc {
  _id?: ObjectId;
  buyerId: ObjectId;
  totalTransactions: number;
  totalSpend: number;
  dateRange: {
    earliest?: Date;
    latest?: Date;
  };
  categoryBreakdown: Array<{
    category: string;
    total: number;
    count: number;
  }>;
  vendorBreakdown: Array<{
    vendor: string;
    total: number;
    count: number;
  }>;
  monthlyTotals: Array<{
    year: number;
    month: number;
    total: number;
  }>;
  csvFilesProcessed: string[];
  lastComputedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Buyer — extended with spend fields
// ---------------------------------------------------------------------------

export interface BuyerDoc {
  _id?: ObjectId;
  name: string;
  orgId: string;
  sector?: string;
  region?: string;
  website?: string;
  description?: string;
  orgType?: string;
  transparencyPageUrl?: string;
  csvLinks?: string[];
  csvLinksExtracted?: boolean;
  spendDataIngested?: boolean;
  spendDataAvailable?: boolean;
  discoveryMethod?: string;
  lastSpendIngestAt?: Date;
  enrichmentPriority?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Stage function signature
// ---------------------------------------------------------------------------

export type StageFn = (
  db: import("mongodb").Db,
  env: Env,
  job: SpendJobDoc,
  maxItems: number
) => Promise<{ processed: number; errors: number; done: boolean }>;
