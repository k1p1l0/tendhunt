"use client";

import { useEffect } from "react";
import { useAgentContext } from "./agent-provider";

import type { AgentPageContext } from "./agent-provider";

interface AgentContextSetterProps {
  context: AgentPageContext;
}

/**
 * Minimal client component that sets the agent page context on mount
 * and resets to dashboard on unmount. Used by server component pages
 * that cannot call hooks directly.
 */
export function AgentContextSetter({ context }: AgentContextSetterProps) {
  const { setContext } = useAgentContext();

  useEffect(() => {
    setContext(context);
    return () => setContext({ page: "dashboard" });
  }, [JSON.stringify(context)]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
