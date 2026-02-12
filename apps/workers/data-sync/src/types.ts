import type { ObjectId } from "mongodb";

// ---------------------------------------------------------------------------
// OCDS Release type (all nested fields optional for resilience)
// ---------------------------------------------------------------------------

export interface OcdsRelease {
  ocid?: string;
  id?: string;
  date?: string;
  tag?: string[];
  language?: string;
  initiationType?: string;
  tender?: {
    id?: string;
    title?: string;
    description?: string;
    status?: string;
    value?: { amount?: number; currency?: string };
    minValue?: { amount?: number; currency?: string };
    tenderPeriod?: { startDate?: string; endDate?: string };
    classification?: { id?: string; description?: string; scheme?: string };
    items?: Array<{
      id?: string;
      description?: string;
      classification?: { id?: string; description?: string; scheme?: string };
    }>;
  };
  parties?: Array<{
    id?: string;
    name?: string;
    roles?: string[];
    address?: {
      streetAddress?: string;
      locality?: string;
      region?: string;
      postalCode?: string;
      countryName?: string;
    };
    contactPoint?: {
      name?: string;
      email?: string;
      telephone?: string;
    };
  }>;
  buyer?: { id?: string; name?: string };
  awards?: Array<{
    id?: string;
    title?: string;
    status?: string;
    date?: string;
    value?: { amount?: number; currency?: string };
    suppliers?: Array<{ id?: string; name?: string }>;
  }>;
}

// ---------------------------------------------------------------------------
// Matches existing Contract Mongoose schema in src/models/contract.ts
// ---------------------------------------------------------------------------

export interface MappedContract {
  ocid: string | null;
  noticeId: string;
  source: "FIND_A_TENDER" | "CONTRACTS_FINDER";
  sourceUrl: string | null;
  title: string;
  description: string | null;
  status: "OPEN" | "CLOSED" | "AWARDED" | "CANCELLED";
  stage: "PLANNING" | "TENDER" | "AWARD";
  buyerName: string;
  buyerOrg: string | null;
  buyerRegion: string | null;
  cpvCodes: string[];
  sector: string | undefined;
  valueMin: number | null;
  valueMax: number | null;
  currency: string;
  publishedDate: Date | null;
  deadlineDate: Date | null;
  rawData: unknown;
  buyerId?: ObjectId | null;
}

// ---------------------------------------------------------------------------
// Matches existing Buyer Mongoose schema in src/models/buyer.ts
// ---------------------------------------------------------------------------

export interface MappedBuyer {
  name: string;
  orgId: string;
  sector?: string;
  region?: string;
  website?: string;
  description?: string;
  contractCount: number;
  contacts: never[];
}

// ---------------------------------------------------------------------------
// Sync job document for tracking backfill/sync progress
// ---------------------------------------------------------------------------

export interface SyncJob {
  _id?: ObjectId;
  source: "FIND_A_TENDER" | "CONTRACTS_FINDER";
  status: "backfilling" | "syncing" | "error";
  cursor: string | null;
  backfillStartDate: string;
  lastSyncedDate: string | null;
  totalFetched: number;
  lastRunAt: Date;
  lastRunFetched: number;
  lastRunErrors: number;
  errorLog: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Worker environment bindings
// ---------------------------------------------------------------------------

export interface Env {
  MONGODB_URI: string;
  BACKFILL_START_DATE?: string;
  ENRICHMENT_WORKER_URL?: string;
}
