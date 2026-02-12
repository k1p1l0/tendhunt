import type { ObjectId } from "mongodb";

// ---------------------------------------------------------------------------
// Worker environment bindings
// ---------------------------------------------------------------------------

export interface Env {
  MONGODB_URI: string;
  ANTHROPIC_API_KEY: string;
}

// ---------------------------------------------------------------------------
// Signal ingest pipeline stages (processed in order)
// ---------------------------------------------------------------------------

export type SignalIngestStage = "extract_signals" | "deduplicate";

export const STAGE_ORDER: SignalIngestStage[] = [
  "extract_signals",
  "deduplicate",
];

// ---------------------------------------------------------------------------
// SignalIngestJob -- tracks pipeline progress per stage
// ---------------------------------------------------------------------------

export interface SignalJobDoc {
  _id?: ObjectId;
  stage: SignalIngestStage;
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
// BoardDocument -- metadata for scraped board papers/meeting docs
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
  signalExtractionStatus?: "pending" | "extracted" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Signal -- extracted buying signal from board minutes
// ---------------------------------------------------------------------------

export interface SignalDoc {
  _id?: ObjectId;
  buyerId: ObjectId;
  boardDocumentId?: ObjectId;
  organizationName: string;
  signalType:
    | "PROCUREMENT"
    | "STAFFING"
    | "STRATEGY"
    | "FINANCIAL"
    | "PROJECTS"
    | "REGULATORY";
  title: string;
  insight: string;
  source?: string;
  sourceDate?: Date;
  sector?: string;
  confidence: number;
  quote?: string;
  entities?: {
    companies: string[];
    amounts: string[];
    dates: string[];
    people: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Stage function signature
// ---------------------------------------------------------------------------

export type StageFn = (
  db: import("mongodb").Db,
  env: Env,
  job: SignalJobDoc,
  maxItems: number
) => Promise<{ processed: number; errors: number; done: boolean }>;
