import type { PipelineStage, PipelineEntityType } from "@/lib/constants/pipeline-stages";

export type { PipelineStage, PipelineEntityType };

export interface PipelineCardData {
  _id: string;
  userId: string;
  entityType: PipelineEntityType;
  entityId: string;
  title: string;
  subtitle?: string;
  value?: number;
  currency?: string;
  deadlineDate?: string;
  sector?: string;
  buyerName?: string;
  logoUrl?: string;
  stage: PipelineStage;
  position: number;
  priority: "LOW" | "MEDIUM" | "HIGH";
  addedBy: "manual" | "auto_rule";
  autoRuleId?: string;
  stageChangedAt?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineNoteData {
  _id: string;
  cardId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface ReorderPayload {
  stage: PipelineStage;
  cardIds: string[];
  movedCard?: {
    cardId: string;
    fromStage: PipelineStage;
  };
  sourceColumn?: {
    stage: PipelineStage;
    cardIds: string[];
  };
}
