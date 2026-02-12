"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export interface AgentPageContext {
  page:
    | "dashboard"
    | "scanner"
    | "buyer_detail"
    | "contract_detail"
    | "contracts"
    | "buyers";
  scannerId?: string;
  scannerType?: string;
  scannerName?: string;
  scannerQuery?: string;
  buyerId?: string;
  buyerName?: string;
  buyerSector?: string;
  buyerRegion?: string;
  contractId?: string;
  contractTitle?: string;
  contractBuyerName?: string;
  selectedRow?: Record<string, unknown>;
}

interface AgentContextValue {
  context: AgentPageContext;
  setContext: (ctx: AgentPageContext) => void;
}

const AgentContext = createContext<AgentContextValue>({
  context: { page: "dashboard" },
  setContext: () => {},
});

export function AgentProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<AgentPageContext>({
    page: "dashboard",
  });

  return (
    <AgentContext.Provider value={{ context, setContext }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgentContext() {
  return useContext(AgentContext);
}
