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
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: AgentMessage[];
  lastMessageAt: Date;
}

interface AgentStore {
  panelOpen: boolean;
  conversations: Conversation[];
  activeConversationId: string | null;
  isStreaming: boolean;

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
  clearConversation: (conversationId: string) => void;
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  panelOpen: false,
  conversations: [],
  activeConversationId: null,
  isStreaming: false,

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
