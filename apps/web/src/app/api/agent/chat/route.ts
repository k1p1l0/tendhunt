import { auth } from "@clerk/nextjs/server";
import { dbConnect } from "@/lib/mongodb";
import { anthropic } from "@/lib/anthropic";
import CompanyProfile from "@/models/company-profile";
import ChatConversation from "@/models/chat-conversation";
import { buildSystemPrompt } from "@/lib/agent/system-prompt";
import { getToolDefinitions } from "@/lib/agent/tools";
import { executeToolHandler } from "@/lib/agent/tool-handlers";

import type { AgentPageContext } from "@/lib/agent/system-prompt";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { messages, context, conversationId } = (await request.json()) as {
    messages: Array<{ role: string; content: string }>;
    context: AgentPageContext;
    conversationId?: string;
  };

  await dbConnect();

  const profile = await CompanyProfile.findOne({ userId }).lean();
  const systemPrompt = buildSystemPrompt(context, profile);
  const tools = getToolDefinitions();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      };

      try {
        // Build message history for Anthropic
        let currentMessages = messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        // Sliding window: keep last 10 messages to manage token budget
        if (currentMessages.length > 10) {
          currentMessages = currentMessages.slice(-10);
        }

        let iteration = 0;
        const MAX_ITERATIONS = 5;
        let continueLoop = true;

        // Track accumulated text and tool calls for persistence
        let assistantText = "";
        const toolCallSummaries: Array<{ toolName: string; summary: string }> =
          [];

        while (continueLoop && iteration < MAX_ITERATIONS) {
          iteration++;

          const response = await anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 4096,
            system: systemPrompt,
            messages: currentMessages,
            tools,
          });

          const toolUseBlocks = response.content.filter(
            (b) => b.type === "tool_use"
          );
          const textBlocks = response.content.filter(
            (b) => b.type === "text"
          );

          // Stream text blocks and accumulate for persistence
          for (const block of textBlocks) {
            if (block.type === "text" && block.text) {
              send({ type: "text_delta", content: block.text });
              assistantText += block.text;
            }
          }

          // Process tool calls
          if (toolUseBlocks.length > 0) {
            const toolResults: Array<{
              type: "tool_result";
              tool_use_id: string;
              content: string;
            }> = [];

            for (const block of toolUseBlocks) {
              if (block.type === "tool_use") {
                send({
                  type: "tool_call_start",
                  toolName: block.name,
                  args: block.input,
                });

                const result = await executeToolHandler(
                  block.name,
                  block.input as Record<string, unknown>,
                  userId
                );

                send({
                  type: "tool_call_result",
                  toolName: block.name,
                  summary: result.summary,
                  ...(result.action ? { action: result.action } : {}),
                });

                toolCallSummaries.push({
                  toolName: block.name,
                  summary: result.summary,
                });

                toolResults.push({
                  type: "tool_result",
                  tool_use_id: block.id,
                  content: JSON.stringify(result.data),
                });
              }
            }

            // Append assistant message + tool results for next iteration
            currentMessages = [
              ...currentMessages,
              {
                role: "assistant" as const,
                content: response.content as unknown as string,
              },
              {
                role: "user" as const,
                content: toolResults as unknown as string,
              },
            ];
          }

          continueLoop = response.stop_reason === "tool_use";
        }

        // Persist conversation to MongoDB
        const userContent =
          messages[messages.length - 1]?.content || "";
        const now = new Date();

        try {
          if (conversationId) {
            await ChatConversation.findOneAndUpdate(
              { _id: conversationId, userId },
              {
                $push: {
                  messages: {
                    $each: [
                      { role: "user", content: userContent, timestamp: now },
                      {
                        role: "assistant",
                        content: assistantText,
                        toolCalls: toolCallSummaries.map((tc) => ({
                          toolName: tc.toolName,
                          result: tc.summary,
                        })),
                        timestamp: now,
                      },
                    ],
                  },
                },
                $set: { lastMessageAt: now },
              }
            );
          } else {
            const conv = await ChatConversation.create({
              userId,
              title: userContent.slice(0, 50),
              context,
              messages: [
                { role: "user", content: userContent, timestamp: now },
                {
                  role: "assistant",
                  content: assistantText,
                  toolCalls: toolCallSummaries.map((tc) => ({
                    toolName: tc.toolName,
                    result: tc.summary,
                  })),
                  timestamp: now,
                },
              ],
              lastMessageAt: now,
            });
            send({
              type: "conversation_id",
              id: String(conv._id),
            });
          }
        } catch (persistErr) {
          console.error("Failed to persist conversation:", persistErr);
        }

        send({ type: "done" });
      } catch (err) {
        console.error("Agent chat error:", err);
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Agent error",
        });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
