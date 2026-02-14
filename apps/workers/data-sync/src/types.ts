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
    contractPeriod?: { startDate?: string; endDate?: string };
    classification?: { id?: string; description?: string; scheme?: string };
    items?: Array<{
      id?: string;
      description?: string;
      classification?: { id?: string; description?: string; scheme?: string };
    }>;
    procurementMethod?: string;
    procurementMethodDetails?: string;
    submissionMethod?: string[];
    submissionMethodDetails?: string;
    lotDetails?: {
      maximumLotsBidPerSupplier?: number;
    };
    documents?: Array<{
      id?: string;
      documentType?: string;
      title?: string;
      description?: string;
      url?: string;
      datePublished?: string;
      format?: string;
    }>;
    lots?: Array<{
      id?: string;
      title?: string;
      description?: string;
      status?: string;
      value?: { amount?: number; currency?: string };
      contractPeriod?: { durationInDays?: number };
      renewal?: { description?: string };
      options?: { description?: string };
      variants?: { policy?: string };
      submissionTerms?: { variantPolicy?: string };
      awardCriteria?: {
        criteria?: Array<{
          name?: string;
          type?: string;
          description?: string;
          numbers?: Array<{
            number?: number;
          }>;
        }>;
      };
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
    contractPeriod?: { startDate?: string; endDate?: string };
  }>;
}

// ---------------------------------------------------------------------------
// Matches existing Contract Mongoose schema in src/models/contract.ts
// ---------------------------------------------------------------------------

export interface MappedContractDocument {
  id?: string;
  documentType?: string;
  title?: string;
  description?: string;
  url?: string;
  datePublished?: string;
  format?: string;
}

export interface MappedContractLotCriterion {
  name: string;
  criteriaType: string;
  weight: number | null;
}

export interface MappedContractLot {
  lotId: string;
  title: string | null;
  description: string | null;
  value: number | null;
  currency: string;
  contractPeriodDays: number | null;
  hasRenewal: boolean;
  renewalDescription: string | null;
  hasOptions: boolean;
  optionsDescription: string | null;
  variantPolicy: string | null;
  status: string | null;
  awardCriteria: MappedContractLotCriterion[];
}

export interface MappedBuyerContact {
  name: string | null;
  email: string | null;
  telephone: string | null;
}

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
  contractStartDate: Date | null;
  contractEndDate: Date | null;
  rawData: unknown;
  buyerId?: ObjectId | null;
  procurementMethod: string | null;
  procurementMethodDetails: string | null;
  contractMechanism: "standard" | "dps" | "framework" | "call_off_dps" | "call_off_framework";
  submissionMethod: string[];
  submissionPortalUrl: string | null;
  buyerContact: MappedBuyerContact | null;
  documents: MappedContractDocument[];
  lots: MappedContractLot[];
  lotCount: number;
  maxLotsBidPerSupplier: number | null;
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
  WORKER_SECRET?: string;
}
