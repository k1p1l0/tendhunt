export type ContractMechanism =
  | "standard"
  | "dps"
  | "framework"
  | "call_off_dps"
  | "call_off_framework";

/**
 * Returns true when a DPS/Framework contract is CLOSED but the underlying
 * agreement is still active (contractEndDate in the future).
 */
export function isDpsFrameworkActive(
  mechanism: ContractMechanism | string | null | undefined,
  status: string,
  contractEndDate: string | Date | null | undefined
): boolean {
  if (!mechanism || mechanism === "standard") return false;
  if (status !== "CLOSED") return false;
  if (!contractEndDate) return false;
  return new Date(contractEndDate) > new Date();
}

/**
 * Returns the display label for a contract status, accounting for DPS/Framework
 * "Window Closed" semantics.
 */
export function statusLabel(
  status: string,
  mechanism?: ContractMechanism | string | null,
  contractEndDate?: string | Date | null
): string {
  if (isDpsFrameworkActive(mechanism, status, contractEndDate)) {
    return "Window Closed";
  }
  return status;
}

/**
 * Returns the adaptive CTA config for a contract based on its mechanism,
 * status, and end date.
 */
export function getActionCTA(
  mechanism: string | null | undefined,
  status: string,
  contractEndDate?: string | Date | null,
  sourceUrl?: string | null
): { label: string; variant: "default" | "secondary" | "outline"; disabled: boolean } {
  const m = mechanism ?? "standard";
  const futureEnd = contractEndDate ? new Date(contractEndDate) > new Date() : false;

  if (m === "call_off_dps" || m === "call_off_framework") {
    return { label: "Framework members only", variant: "outline", disabled: true };
  }

  if (m === "dps") {
    if (status === "OPEN") return { label: "Apply to join this DPS", variant: "default", disabled: false };
    if (status === "CLOSED" && futureEnd) return { label: "Monitor for next reopening", variant: "secondary", disabled: false };
    if (status === "CLOSED") return { label: "DPS expired", variant: "outline", disabled: true };
  }

  if (m === "framework") {
    if (status === "OPEN") return { label: "View framework details", variant: "default", disabled: false };
    if (status === "CLOSED" && futureEnd) return { label: "Framework active -- monitor buyer", variant: "secondary", disabled: false };
  }

  if (status === "OPEN") return { label: "Apply for this tender", variant: "default", disabled: false };
  if (sourceUrl) return { label: "View on source", variant: "outline", disabled: false };
  return { label: "View on source", variant: "outline", disabled: !sourceUrl };
}

export const MECHANISM_LABELS: Record<ContractMechanism, string> = {
  standard: "Standard Tender",
  dps: "DPS",
  framework: "Framework",
  call_off_dps: "DPS Call-off",
  call_off_framework: "FW Call-off",
};
