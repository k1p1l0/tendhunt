"use client";

import { useCallback, useRef } from "react";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { useAgentStore, getActiveMessages } from "@/stores/agent-store";
import { useAgentContext } from "@/components/agent/agent-provider";

import type { AgentMessage } from "@/stores/agent-store";

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
}

export function useAgent(): UseAgentReturn {
  const router = useRouter();
  const { context } = useAgentContext();
  const abortControllerRef = useRef<AbortController | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  const isStreaming = useAgentStore((s) => s.isStreaming);
  const messages = useAgentStore((s) => getActiveMessages(s));
  const activeConversationId = useAgentStore((s) => s.activeConversationId);

  const handleSSEEvent = useCallback(
    (event: SSEEvent, messageId: string, convId: string) => {
      const { updateMessage } = useAgentStore.getState();

      switch (event.type) {
        case "text_delta": {
          const current = getActiveMessages(useAgentStore.getState());
          const msg = current.find((m) => m.id === messageId);
          updateMessage(convId, messageId, {
            content: (msg?.content ?? "") + (event.content ?? ""),
          });
          break;
        }
        case "tool_call_start": {
          const current = getActiveMessages(useAgentStore.getState());
          const msg = current.find((m) => m.id === messageId);
          const existingToolCalls = msg?.toolCalls ?? [];
          updateMessage(convId, messageId, {
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

          if (event.action?.type === "create_scanner") {
            const scannerId = event.action.scannerId as string | undefined;
            if (scannerId) {
              router.push(`/scanners/${scannerId}`);
            }
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
          const current = getActiveMessages(useAgentStore.getState());
          const msg = current.find((m) => m.id === messageId);
          updateMessage(convId, messageId, {
            content:
              (msg?.content ?? "") +
              `\n\n*Error: ${event.message ?? "Something went wrong"}*`,
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

      // Add user message
      store.addMessage(convId, {
        id: nanoid(),
        role: "user",
        content,
        timestamp: new Date(),
      });

      // Add placeholder assistant message
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
        // Build messages array from the conversation (exclude empty placeholder)
        const allMessages = getActiveMessages(useAgentStore.getState());
        const apiMessages = allMessages
          .filter((m) => m.id !== assistantMessageId)
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

        // Ensure streaming ends
        useAgentStore.getState().setIsStreaming(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          useAgentStore.getState().setIsStreaming(false);
          return;
        }
        useAgentStore.getState().setIsStreaming(false);
        const { updateMessage: update } = useAgentStore.getState();
        const current = getActiveMessages(useAgentStore.getState());
        const msg = current.find((m) => m.id === assistantMessageId);
        update(convId, assistantMessageId, {
          content:
            (msg?.content ?? "") +
            `\n\n*Error: ${err instanceof Error ? err.message : "Connection lost"}*`,
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

  return {
    sendMessage,
    stopStreaming,
    isStreaming,
    messages,
    startNewConversation,
  };
}
