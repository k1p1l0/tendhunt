import { create } from "zustand";

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: Array<{
    toolName: string;
    args: Record<string, unknown>;
    result?: string;
    summary?: string;
    isLoading?: boolean;
  }>;
  isError?: boolean;
  isThinking?: boolean;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: AgentMessage[];
  lastMessageAt: Date;
}

export interface EnrichmentStage {
  name: string;
  label: string;
  status: "pending" | "active" | "complete" | "failed";
  detail?: string;
}

export interface EnrichmentConfirmation {
  buyerId: string;
  buyerName: string;
  messageId: string;
}

export interface ActiveEnrichment {
  buyerId: string;
  buyerName: string;
  messageId: string;
  stages: EnrichmentStage[];
  startedAt: Date;
  completedAt?: Date;
  enrichmentScore?: number;
}

interface AgentStore {
  panelOpen: boolean;
  conversations: Conversation[];
  activeConversationId: string | null;
  isStreaming: boolean;
  enrichmentConfirmation: EnrichmentConfirmation | null;
  activeEnrichment: ActiveEnrichment | null;

  setPanelOpen: (open: boolean) => void;
  addMessage: (conversationId: string, message: AgentMessage) => void;
  updateMessage: (
    conversationId: string,
    messageId: string,
    updates: Partial<AgentMessage>
  ) => void;
  createConversation: (id: string, title?: string) => void;
  setActiveConversation: (id: string | null) => void;
  setIsStreaming: (streaming: boolean) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  clearConversation: (conversationId: string) => void;
  setEnrichmentConfirmation: (confirmation: EnrichmentConfirmation | null) => void;
  setActiveEnrichment: (enrichment: ActiveEnrichment | null) => void;
  updateEnrichmentStage: (name: string, status: EnrichmentStage["status"], detail?: string) => void;
  completeEnrichment: (score?: number) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  panelOpen: false,
  conversations: [],
  activeConversationId: null,
  isStreaming: false,
  enrichmentConfirmation: null,
  activeEnrichment: null,

  setPanelOpen: (open) => set({ panelOpen: open }),

  addMessage: (conversationId, message) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              messages: [...c.messages, message],
              lastMessageAt: new Date(),
            }
          : c
      ),
    })),

  updateMessage: (conversationId, messageId, updates) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === messageId ? { ...m, ...updates } : m
              ),
            }
          : c
      ),
    })),

  createConversation: (id, title) =>
    set((state) => ({
      conversations: [
        ...state.conversations,
        {
          id,
          title: title ?? "New conversation",
          messages: [],
          lastMessageAt: new Date(),
        },
      ],
      activeConversationId: id,
    })),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setIsStreaming: (streaming) => set({ isStreaming: streaming }),

  removeMessage: (conversationId, messageId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, messages: c.messages.filter((m) => m.id !== messageId) }
          : c
      ),
    })),

  clearConversation: (conversationId) =>
    set((state) => {
      const filtered = state.conversations.filter(
        (c) => c.id !== conversationId
      );
      return {
        conversations: filtered,
        activeConversationId:
          state.activeConversationId === conversationId
            ? null
            : state.activeConversationId,
      };
    }),

  setEnrichmentConfirmation: (confirmation) => set({ enrichmentConfirmation: confirmation }),

  setActiveEnrichment: (enrichment) => set({ activeEnrichment: enrichment, enrichmentConfirmation: null }),

  updateEnrichmentStage: (name, status, detail) =>
    set((state) => {
      if (!state.activeEnrichment) return state;
      return {
        activeEnrichment: {
          ...state.activeEnrichment,
          stages: state.activeEnrichment.stages.map((s) =>
            s.name === name ? { ...s, status, detail } : s
          ),
        },
      };
    }),

  completeEnrichment: (score) =>
    set((state) => {
      if (!state.activeEnrichment) return state;
      return {
        activeEnrichment: {
          ...state.activeEnrichment,
          completedAt: new Date(),
          enrichmentScore: score,
        },
      };
    }),
}));

/** Get messages for the active conversation */
export function getActiveMessages(state: {
  conversations: Conversation[];
  activeConversationId: string | null;
}): AgentMessage[] {
  if (!state.activeConversationId) return [];
  const conv = state.conversations.find(
    (c) => c.id === state.activeConversationId
  );
  return conv?.messages ?? [];
}
