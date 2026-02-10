import type { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export type ContractSource = "FIND_A_TENDER" | "CONTRACTS_FINDER";

export type ContractStatus = "OPEN" | "CLOSED" | "AWARDED" | "CANCELLED";

export type ContractStage = "PLANNING" | "TENDER" | "AWARD";

export type SignalType =
  | "PROCUREMENT"
  | "STAFFING"
  | "STRATEGY"
  | "FINANCIAL"
  | "PROJECTS"
  | "REGULATORY";

export type CreditTransactionType =
  | "SIGNUP_BONUS"
  | "CONTACT_REVEAL"
  | "PURCHASE"
  | "REFUND";
