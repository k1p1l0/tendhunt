export type PipelineStage =
  | "NEW"
  | "QUALIFIED"
  | "PREPARING_BID"
  | "SUBMITTED"
  | "WON"
  | "LOST";

export type PipelineEntityType = "contract" | "buyer" | "signal";

export const STAGE_ORDER: PipelineStage[] = [
  "NEW",
  "QUALIFIED",
  "PREPARING_BID",
  "SUBMITTED",
  "WON",
  "LOST",
];

export const PIPELINE_STAGES: Record<
  PipelineStage,
  {
    label: string;
    color: string;
    textColor: string;
    icon: string;
  }
> = {
  NEW: {
    label: "New",
    color: "bg-blue-500/10",
    textColor: "text-blue-600",
    icon: "inbox",
  },
  QUALIFIED: {
    label: "Qualified",
    color: "bg-indigo-500/10",
    textColor: "text-indigo-600",
    icon: "check-circle",
  },
  PREPARING_BID: {
    label: "Preparing Bid",
    color: "bg-amber-500/10",
    textColor: "text-amber-600",
    icon: "file-edit",
  },
  SUBMITTED: {
    label: "Submitted",
    color: "bg-purple-500/10",
    textColor: "text-purple-600",
    icon: "send",
  },
  WON: {
    label: "Won",
    color: "bg-emerald-500/10",
    textColor: "text-emerald-600",
    icon: "trophy",
  },
  LOST: {
    label: "Lost",
    color: "bg-red-500/10",
    textColor: "text-red-600",
    icon: "x-circle",
  },
};
