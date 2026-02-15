import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ResponseDetail = "concise" | "normal" | "detailed";
export type ContextScope = "table_only" | "table_and_business";

export interface ConversationSettings {
  responseDetail: ResponseDetail;
  askClarifyingQuestions: boolean;
  contextScope: ContextScope;
}

export const DEFAULT_CONVERSATION_SETTINGS: ConversationSettings = {
  responseDetail: "normal",
  askClarifyingQuestions: true,
  contextScope: "table_and_business",
};

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

export interface EnrichmentSummary {
  orgType?: string;
  website?: string;
  hasLogo?: boolean;
  hasLinkedIn?: boolean;
  staffCount?: number;
}

export interface ActiveEnrichment {
  buyerId: string;
  buyerName: string;
  messageId: string;
  stages: EnrichmentStage[];
  startedAt: Date;
  completedAt?: Date;
  enrichmentScore?: number;
  summary?: EnrichmentSummary;
}

interface AgentStore {
  panelOpen: boolean;
  conversations: Conversation[];
  activeConversationId: string | null;
  isStreaming: boolean;
  enrichmentConfirmation: EnrichmentConfirmation | null;
  activeEnrichment: ActiveEnrichment | null;
  conversationSettings: ConversationSettings;

  setPanelOpen: (open: boolean) => void;
  updateConversationSettings: (updates: Partial<ConversationSettings>) => void;
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
  completeEnrichment: (score?: number, summary?: EnrichmentSummary) => void;
}

export const useAgentStore = create<AgentStore>()(
  persist(
    (set) => ({
  panelOpen: false,
  conversations: [],
  activeConversationId: null,
  isStreaming: false,
  enrichmentConfirmation: null,
  activeEnrichment: null,
  conversationSettings: DEFAULT_CONVERSATION_SETTINGS,

  setPanelOpen: (open) => set({ panelOpen: open }),

  updateConversationSettings: (updates) =>
    set((state) => ({
      conversationSettings: { ...state.conversationSettings, ...updates },
    })),

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

  completeEnrichment: (score, summary) =>
    set((state) => {
      if (!state.activeEnrichment) return state;
      return {
        activeEnrichment: {
          ...state.activeEnrichment,
          completedAt: new Date(),
          enrichmentScore: score,
          summary,
        },
      };
    }),
    }),
    {
      name: "sculptor-conversations",
      partialize: (state) => ({
        panelOpen: state.panelOpen,
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
        conversationSettings: state.conversationSettings,
      }),
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str) as { state: Record<string, unknown>; version?: number };
          const convs = parsed.state.conversations as Conversation[] | undefined;
          if (convs) {
            for (const c of convs) {
              c.lastMessageAt = new Date(c.lastMessageAt);
              for (const m of c.messages) {
                m.timestamp = new Date(m.timestamp);
              }
            }
          }
          // Backfill conversationSettings for existing users
          if (!parsed.state.conversationSettings) {
            parsed.state.conversationSettings = DEFAULT_CONVERSATION_SETTINGS;
          }
          return parsed;
        },
        setItem: (name, value) => localStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => localStorage.removeItem(name),
      },
    },
  ),
);

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
