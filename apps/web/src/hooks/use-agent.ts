"use client";

import { useCallback, useRef } from "react";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { useAgentStore } from "@/stores/agent-store";
import { getActiveMessages } from "@/stores/agent-store";
import { useAgentContext } from "@/components/agent/agent-provider";

import type { AgentMessage } from "@/stores/agent-store";

const EMPTY_MESSAGES: AgentMessage[] = [];

interface SSEEvent {
  type: string;
  content?: string;
  toolName?: string;
  args?: Record<string, unknown>;
  summary?: string;
  action?: { type: string; [key: string]: unknown };
  message?: string;
  id?: string;
}

export interface UseAgentReturn {
  sendMessage: (content: string) => Promise<void>;
  stopStreaming: () => void;
  isStreaming: boolean;
  messages: AgentMessage[];
  startNewConversation: () => void;
  retryLastMessage: () => void;
}

export function useAgent(): UseAgentReturn {
  const router = useRouter();
  const { context } = useAgentContext();
  const abortControllerRef = useRef<AbortController | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  const isStreaming = useAgentStore((s) => s.isStreaming);
  const activeConversationId = useAgentStore((s) => s.activeConversationId);
  const messages = useAgentStore((s) => {
    if (!s.activeConversationId) return EMPTY_MESSAGES;
    const conv = s.conversations.find((c) => c.id === s.activeConversationId);
    return conv?.messages ?? EMPTY_MESSAGES;
  });

  const handleSSEEvent = useCallback(
    (event: SSEEvent, messageId: string, convId: string) => {
      const { updateMessage } = useAgentStore.getState();

      switch (event.type) {
        case "text_delta": {
          const current = getActiveMessages(useAgentStore.getState());
          const msg = current.find((m) => m.id === messageId);
          updateMessage(convId, messageId, {
            content: (msg?.content ?? "") + (event.content ?? ""),
            isThinking: false,
          });
          break;
        }
        case "thinking": {
          updateMessage(convId, messageId, { isThinking: true });
          break;
        }
        case "tool_call_start": {
          const current = getActiveMessages(useAgentStore.getState());
          const msg = current.find((m) => m.id === messageId);
          const existingToolCalls = msg?.toolCalls ?? [];
          updateMessage(convId, messageId, {
            isThinking: false,
            toolCalls: [
              ...existingToolCalls,
              {
                toolName: event.toolName ?? "unknown",
                args: event.args ?? {},
                isLoading: true,
              },
            ],
          });
          break;
        }
        case "tool_call_result": {
          const current = getActiveMessages(useAgentStore.getState());
          const msg = current.find((m) => m.id === messageId);
          const toolCalls = (msg?.toolCalls ?? []).map((tc) =>
            tc.toolName === event.toolName && tc.isLoading
              ? {
                  ...tc,
                  isLoading: false,
                  summary: event.summary,
                  result: event.summary,
                }
              : tc
          );
          updateMessage(convId, messageId, { toolCalls });

          if (event.action?.type === "navigate") {
            const url = event.action.url as string | undefined;
            if (url) {
              router.push(url);
            }
          }

          if (event.action?.type === "enrich_started") {
            startEnrichmentStream(
              event.action.buyerId as string,
              event.action.buyerName as string,
              messageId
            );
          }
          break;
        }
        case "conversation_id": {
          if (event.id) {
            conversationIdRef.current = event.id;
          }
          break;
        }
        case "done": {
          useAgentStore.getState().setIsStreaming(false);
          break;
        }
        case "error": {
          useAgentStore.getState().setIsStreaming(false);
          updateMessage(convId, messageId, {
            content: event.message ?? "Something went wrong. Please try again.",
            isError: true,
          });
          break;
        }
      }
    },
    [router]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (useAgentStore.getState().isStreaming) return;

      const store = useAgentStore.getState();
      let convId = activeConversationId;

      if (!convId) {
        convId = nanoid();
        store.createConversation(convId, content.slice(0, 60));
      }

      store.addMessage(convId, {
        id: nanoid(),
        role: "user",
        content,
        timestamp: new Date(),
      });

      const assistantMessageId = nanoid();
      store.addMessage(convId, {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        toolCalls: [],
        timestamp: new Date(),
      });

      store.setIsStreaming(true);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const allMessages = getActiveMessages(useAgentStore.getState());
        const apiMessages = allMessages
          .filter((m) => m.id !== assistantMessageId && !m.isError)
          .map((m) => ({ role: m.role, content: m.content }));

        const response = await fetch("/api/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            context,
            conversationId: conversationIdRef.current,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            (errorData as Record<string, string>).error ?? "Agent request failed"
          );
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const event = JSON.parse(line.slice(6)) as SSEEvent;
                handleSSEEvent(event, assistantMessageId, convId);
              } catch {
                // skip malformed events
              }
            }
          }
        }

        useAgentStore.getState().setIsStreaming(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          useAgentStore.getState().setIsStreaming(false);
          return;
        }
        useAgentStore.getState().setIsStreaming(false);
        const { updateMessage: update } = useAgentStore.getState();
        update(convId, assistantMessageId, {
          content: err instanceof Error ? err.message : "Connection lost. Please try again.",
          isError: true,
        });
      } finally {
        abortControllerRef.current = null;
      }
    },
    [activeConversationId, context, handleSSEEvent]
  );

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    useAgentStore.getState().setIsStreaming(false);
  }, []);

  const startNewConversation = useCallback(() => {
    const newId = nanoid();
    useAgentStore.getState().createConversation(newId);
    conversationIdRef.current = null;
  }, []);

  const retryLastMessage = useCallback(() => {
    const allMessages = getActiveMessages(useAgentStore.getState());
    const convId = useAgentStore.getState().activeConversationId;
    if (!convId || allMessages.length < 2) return;

    const errorMessage = allMessages[allMessages.length - 1];
    if (!errorMessage?.isError) return;

    // Find the last user message before the error
    const lastUserMessage = [...allMessages]
      .reverse()
      .find((m) => m.role === "user");
    if (!lastUserMessage) return;

    // Remove the error assistant message
    useAgentStore.getState().removeMessage(convId, errorMessage.id);

    // Remove the last user message (sendMessage will re-add it)
    useAgentStore.getState().removeMessage(convId, lastUserMessage.id);

    // Re-send
    sendMessage(lastUserMessage.content);
  }, [sendMessage]);

  const startEnrichmentStream = useCallback(
    (buyerId: string, buyerName: string, messageId: string) => {
      const store = useAgentStore.getState();
      store.setActiveEnrichment({
        buyerId,
        buyerName,
        messageId,
        stages: [],
        startedAt: new Date(),
      });

      const eventSource = new EventSource(`/api/enrichment/${buyerId}/progress`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as Record<string, unknown>;
          const s = useAgentStore.getState();

          switch (data.type) {
            case "init": {
              const stages = data.stages as Array<{ name: string; label: string; status: string }>;
              s.setActiveEnrichment({
                buyerId,
                buyerName,
                messageId,
                stages: stages.map((st) => ({
                  name: st.name,
                  label: st.label,
                  status: st.status as "pending",
                })),
                startedAt: new Date(),
              });
              break;
            }
            case "stage_active":
              s.updateEnrichmentStage(data.stage as string, "active");
              break;
            case "stage_complete":
              s.updateEnrichmentStage(data.stage as string, "complete");
              break;
            case "done":
              s.completeEnrichment(data.enrichmentScore as number);
              eventSource.close();
              break;
          }
        } catch {
          // skip malformed events
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        useAgentStore.getState().completeEnrichment();
      };
    },
    []
  );

  return {
    sendMessage,
    stopStreaming,
    isStreaming,
    messages,
    startNewConversation,
    retryLastMessage,
  };
}
