# Phase 19: Research Agent Chat Panel - Research

**Researched:** 2026-02-12
**Domain:** Conversational AI Agent with Tool Use, Next.js SSE Streaming, MongoDB Persistence
**Confidence:** HIGH

## Summary

This phase builds a right-side slide-out chat panel that provides a conversational AI research agent across all TendHunt dashboard pages. The agent uses Claude Sonnet with tool-use to query all internal data collections (Buyers, Contracts, Signals, KeyPersonnel, SpendSummary, SpendTransaction, BoardDocument) and perform web research. Conversations persist to MongoDB.

The codebase already has all the building blocks: the `@anthropic-ai/sdk` (v0.74+) is installed and configured (`apps/web/src/lib/anthropic.ts`), SSE streaming via `ReadableStream` is battle-tested in the scoring engine (`apps/web/src/app/api/scanners/[id]/score-column/route.ts`), the Sheet component from shadcn/ui is used extensively, `motion` (Framer Motion v12.34+) is installed, `marked` (v17) is installed for markdown rendering, `zustand` (v5) manages scanner state, and the `BreadcrumbProvider` pattern already demonstrates how to inject page-level context into a global provider.

**Primary recommendation:** Use the manual `anthropic.messages.create()` loop pattern (not the `toolRunner` helper) for full control over tool execution and SSE event emission. Stream text deltas and tool call indicators as custom SSE events from a `POST /api/agent/chat` route, following the exact same `ReadableStream` + `TextEncoder` pattern already used in `score-column/route.ts`.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | ^0.74.0 | Claude API calls with tool-use | Already installed, supports streaming + tools |
| `motion` | ^12.34.0 | Panel/message animations | Already installed, project mandates Motion for all transitions |
| `marked` | ^17.0.1 | Markdown rendering in agent messages | Already installed, lightweight |
| `zustand` | ^5.0.11 | Agent panel state management | Already used for scanner-store |
| shadcn/ui Sheet | (built-in) | Slide-out panel primitive | Already used for EntityDetailSheet, EditColumnSheet |
| `mongoose` | (installed) | ChatConversation model + tool query handlers | Already used for all data models |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `p-limit` | (installed) | Concurrency control for parallel tool calls | When agent invokes multiple tools simultaneously |
| `lucide-react` | (installed) | Icons for panel UI | Trigger button, tool indicators, close button |
| DOMPurify or similar | - | Sanitize markdown HTML output | If using `marked` to render HTML (security) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `marked` (string-to-HTML) | `react-markdown` (component-based) | react-markdown gives better React integration but is heavier; `marked` is already installed and sufficient for MVP |
| Manual tool loop | `anthropic.beta.messages.toolRunner()` | toolRunner auto-handles tool loops but gives less control over SSE events; manual loop needed for custom streaming |
| Separate agent store (zustand) | React Context only | Zustand preferred for cross-component state sharing (panel open/close, conversations) without prop drilling |

**Installation:**
```bash
# No new packages needed - all dependencies already installed
# Optional: DOMPurify for markdown HTML sanitization
pnpm add dompurify @types/dompurify
```

## Architecture Patterns

### Recommended File Structure

```
apps/web/src/
  app/api/agent/
    chat/route.ts              -- POST handler: SSE streaming, tool execution loop
  lib/agent/
    tools.ts                   -- Tool definitions (Anthropic format) + server-side handlers
    system-prompt.ts           -- System prompt builder with context injection
    tool-handlers.ts           -- Individual tool handler implementations
  components/agent/
    agent-provider.tsx         -- React context: panel state, conversation, context
    agent-panel.tsx            -- Sheet-based slide-out panel (main container)
    agent-panel-header.tsx     -- Header: title, context pill, new chat, close
    agent-message-list.tsx     -- Scrollable message area with auto-scroll
    agent-message.tsx          -- Single message renderer (user/assistant/tool-call)
    agent-input.tsx            -- Textarea + send button
    tool-call-indicator.tsx    -- Collapsible tool execution display
    suggested-actions.tsx      -- Context-based suggested prompts
  hooks/
    use-agent.ts               -- Hook: send message, stream response, manage conversation
  models/
    chat-conversation.ts       -- MongoDB model for persistent conversations
  stores/
    agent-store.ts             -- Zustand store: panel open, conversations, active context
```

### Pattern 1: SSE Streaming API Route with Tool Loop

**What:** The `POST /api/agent/chat` route receives messages + context, runs a tool-use loop with Claude, and streams events back via SSE.

**When to use:** Every agent chat interaction.

**How it works:**
1. Client sends `{ messages, context, conversationId }` to the API route
2. Route authenticates via Clerk, loads system prompt with injected context
3. Calls `anthropic.messages.create()` with tools defined
4. If response has `stop_reason === "tool_use"`, executes tools server-side, appends results, and calls Claude again
5. For each text content block, streams `text_delta` events
6. For each tool call, streams `tool_call_start` and `tool_call_result` events
7. The loop continues until `stop_reason === "end_turn"` (no more tool calls)
8. Streams `done` event when complete

**Example (based on existing score-column/route.ts pattern):**
```typescript
// Source: Codebase pattern from apps/web/src/app/api/scanners/[id]/score-column/route.ts
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { messages, context, conversationId } = await request.json();
  await dbConnect();

  const systemPrompt = buildSystemPrompt(context, userId);
  const tools = getToolDefinitions();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        let currentMessages = [...messages];
        let continueLoop = true;

        while (continueLoop) {
          const response = await anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 4096,
            system: systemPrompt,
            messages: currentMessages,
            tools,
          });

          // Process content blocks
          for (const block of response.content) {
            if (block.type === "text") {
              send({ type: "text_delta", content: block.text });
            }
            if (block.type === "tool_use") {
              send({ type: "tool_call_start", toolName: block.name, args: block.input });
              const result = await executeToolHandler(block.name, block.input, userId);
              send({ type: "tool_call_result", toolName: block.name, summary: result.summary });

              // Append assistant message + tool result for next loop iteration
              currentMessages.push({ role: "assistant", content: response.content });
              currentMessages.push({
                role: "user",
                content: [{ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result.data) }],
              });
            }
          }

          continueLoop = response.stop_reason === "tool_use";
        }

        send({ type: "done" });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "Agent error" });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
```

**Confidence: HIGH** - This pattern is directly adapted from the working `score-column/route.ts` in the codebase.

### Pattern 2: Agent Context Provider (following BreadcrumbProvider)

**What:** A React context that wraps the dashboard layout, allowing any page to set the current agent context (page type, entity ID/name, scanner data).

**When to use:** Wrap `<BreadcrumbProvider>` children in the dashboard layout.

**Example (based on existing breadcrumb-context.tsx):**
```typescript
// Source: apps/web/src/components/layout/breadcrumb-context.tsx pattern
"use client";
import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

interface AgentContext {
  page: "dashboard" | "scanner" | "buyer_detail" | "contract_detail" | "contracts" | "buyers";
  scannerId?: string;
  scannerType?: string;
  scannerName?: string;
  scannerQuery?: string;
  buyerId?: string;
  buyerName?: string;
  contractId?: string;
  contractTitle?: string;
  selectedRow?: Record<string, unknown>;
}

interface AgentContextValue {
  context: AgentContext;
  setContext: (ctx: AgentContext) => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
}

const AgentCtx = createContext<AgentContextValue>({ /* defaults */ });

export function AgentProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<AgentContext>({ page: "dashboard" });
  const [panelOpen, setPanelOpen] = useState(false);
  return (
    <AgentCtx.Provider value={{ context, setContext, panelOpen, setPanelOpen }}>
      {children}
    </AgentCtx.Provider>
  );
}

export function useAgentContext() { return useContext(AgentCtx); }
```

**Confidence: HIGH** - Directly follows the existing `BreadcrumbProvider` pattern.

### Pattern 3: Tool-Use Loop with Multiple Tool Calls

**What:** Claude can return multiple `tool_use` blocks in a single response. The API route must execute ALL of them before sending tool results back.

**When to use:** When Claude decides to query buyers AND signals in a single turn (parallel tool calls).

**Key detail from Anthropic SDK docs:** When `stop_reason === "tool_use"`, the `content` array may contain multiple `tool_use` blocks. All must be resolved and returned as an array of `tool_result` items in the next user message.

```typescript
// Source: Context7 - /anthropics/anthropic-sdk-typescript - Manual Tool Use
const toolUseBlocks = response.content.filter(b => b.type === "tool_use");
const toolResults = await Promise.all(
  toolUseBlocks.map(async (block) => {
    const result = await executeToolHandler(block.name, block.input, userId);
    return { type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result.data) };
  })
);
// Send ALL results back in one user message
currentMessages.push({ role: "assistant", content: response.content });
currentMessages.push({ role: "user", content: toolResults });
```

**Confidence: HIGH** - Verified against Context7 Anthropic SDK docs.

### Pattern 4: Bidirectional State Sync for Write Tools

**What:** When the agent executes write tools (`create_scanner`, `apply_scanner_filter`, `add_scanner_column`), the UI must update to reflect the changes.

**When to use:** Agent creates a scanner or modifies the current scanner.

**Implementation approach:**
1. Write tool handlers return action payloads alongside data results
2. SSE events include an `action` field for write tools
3. Client-side hook detects action events and dispatches to the appropriate state update

```typescript
// SSE event from server:
{ type: "tool_call_result", toolName: "create_scanner", summary: "Created scanner 'NHS IT Contracts'",
  action: { type: "navigate", url: "/scanners/abc123" } }

{ type: "tool_call_result", toolName: "apply_scanner_filter", summary: "Applied sector filter: NHS",
  action: { type: "update_scanner_filters", filters: { sector: "NHS" } } }

// Client-side handler:
if (event.action?.type === "navigate") {
  router.push(event.action.url);
}
if (event.action?.type === "update_scanner_filters") {
  // Update scanner store or trigger page reload
}
```

**Confidence: MEDIUM** - Pattern is sound but exact state sync mechanism depends on implementation of cross-component communication. The scanner page uses a mix of local state + zustand store; write tools need to trigger a `loadData()` refresh or directly update store state.

### Pattern 5: Conversation Persistence with Lazy Writes

**What:** Save conversations to MongoDB after each message exchange, debounced to avoid excessive writes.

**When to use:** After each completed agent response.

**Schema design:**
```typescript
const chatConversationSchema = new Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, default: "New conversation" },
  context: { type: Schema.Types.Mixed }, // Page context at conversation start
  messages: [{
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    toolCalls: [{
      toolName: { type: String },
      args: { type: Schema.Types.Mixed },
      result: { type: String },
    }],
    timestamp: { type: Date, default: Date.now },
  }],
  lastMessageAt: { type: Date, index: true },
}, { timestamps: true });

chatConversationSchema.index({ userId: 1, lastMessageAt: -1 });
```

**Confidence: HIGH** - Standard MongoDB document pattern, follows existing model conventions.

### Anti-Patterns to Avoid

- **Sending full conversation + all tool results to the client:** Tool results can be large (hundreds of buyer records). Summarize before sending to the client; only send the full data to Claude.
- **Letting Claude generate raw MongoDB queries:** Security risk. All tools accept structured parameters and the server builds the query. This is explicitly called out in the requirements (NFR-02d).
- **Streaming text character-by-character:** The API route should NOT use `anthropic.messages.stream()` for the tool loop. Use non-streaming `create()` in the loop, then stream the final text response. This avoids complexity of handling partial tool_use JSON deltas.
- **Storing tool results in conversation history:** Tool results can be massive. Store only summaries in the ChatConversation model. Reconstruct full context from the summary when resuming.
- **Using a single global Sheet state:** The agent panel must coexist with EntityDetailSheet, AiCellDrawer, EditColumnSheet. Close conflicting sheets when the agent opens, or use different z-index layers.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slide-out panel | Custom positioned div with transitions | shadcn/ui `Sheet` (right side, overlay) | Already used 4+ times in codebase, handles overlay/backdrop/escape/focus trap |
| Markdown rendering | Custom parser | `marked` library (v17, already installed) | Handles tables, lists, bold, links, code blocks out of the box |
| SSE streaming | WebSocket or custom protocol | `ReadableStream` + `text/event-stream` pattern | Already proven in score-column route, works with Next.js App Router |
| State management | React Context for everything | Zustand store for agent state | Follows existing scanner-store pattern, avoids re-render cascade |
| Tool-use loop | Custom retry/polling logic | Anthropic SDK's `messages.create()` in a while loop | SDK handles retries, rate limits; loop is simple `while(stop_reason === "tool_use")` |
| HTML sanitization | Regex-based cleaning | DOMPurify (if needed) | `marked` + `dangerouslySetInnerHTML` needs sanitization; DOMPurify is the standard |

**Key insight:** Every major building block already exists in the codebase. The agent panel is essentially a composition of existing patterns (Sheet + SSE streaming + MongoDB models + React context) with the new addition of a tool-use conversation loop.

## Common Pitfalls

### Pitfall 1: Token Budget Explosion from Tool Results

**What goes wrong:** Tool results (e.g., `query_buyers` returning 50 buyer objects) consume massive token counts in the conversation context, causing Claude to run out of context window or become very expensive.
**Why it happens:** Raw MongoDB query results include all fields, and conversation history accumulates tool results across turns.
**How to avoid:**
- Limit all tool results to top N items (e.g., 10-20 results max)
- Select only relevant fields in queries (use `.select()` like existing API routes do)
- Summarize tool results before including in conversation history for subsequent turns
- Set a hard cap on conversation history length (e.g., last 10 messages) as the spec suggests
**Warning signs:** API costs spike, response times degrade, "context length exceeded" errors.

### Pitfall 2: Infinite Tool Loop

**What goes wrong:** Claude keeps calling tools in a loop without converging to a final answer.
**Why it happens:** Poorly constrained system prompt, or tool results that trigger further investigation.
**How to avoid:**
- Set a maximum tool loop iteration count (e.g., 5 iterations max)
- Include explicit instructions in the system prompt: "After gathering data, synthesize your findings and respond directly"
- Track iteration count in the API route and force end_turn after limit
**Warning signs:** Request takes > 30 seconds, multiple repeated tool calls with same parameters.

### Pitfall 3: Sheet Conflict with Existing Panels

**What goes wrong:** Opening the agent panel while EntityDetailSheet or AiCellDrawer is open causes visual layering issues or dual overlays.
**Why it happens:** Multiple Radix Dialog/Sheet instances fighting for z-index and overlay.
**How to avoid:**
- Close the agent panel when any scanner-specific sheet opens (entity detail, AI cell drawer, edit column)
- OR use a different approach: render the agent panel as a fixed sidebar (not a Sheet/Dialog) that doesn't use the Radix overlay
- The requirements say "overlay with backdrop" which matches the Sheet pattern, so the close-on-conflict approach is safer
**Warning signs:** Multiple dark overlays stacking, inability to close inner panel.

### Pitfall 4: Stale Context After Navigation

**What goes wrong:** User opens agent panel on buyer detail page, navigates to dashboard, but agent still thinks it's on the buyer page.
**Why it happens:** Context is set on page mount but not cleared on unmount.
**How to avoid:**
- Each page's `useEffect` that calls `setContext()` should return a cleanup function that resets to a default context
- The agent should detect context changes and offer to continue or start fresh (FR-02f)
**Warning signs:** Suggested prompts reference wrong entity, agent makes tool calls with stale IDs.

### Pitfall 5: Race Condition in Streaming Responses

**What goes wrong:** User sends a new message while the previous response is still streaming, causing interleaved or corrupted state.
**Why it happens:** No guard against concurrent requests.
**How to avoid:**
- Disable the input field while streaming (FR-03g is explicit about this)
- Use an AbortController to cancel the current stream if the user sends a stop signal
- The existing scoring system uses `scoringAbortRef` for this exact pattern
**Warning signs:** Garbled messages, duplicate responses, UI showing wrong loading states.

### Pitfall 6: Non-streaming Tool Loop Appearing Slow

**What goes wrong:** The tool-use loop uses non-streaming `messages.create()`, so there's no visible progress during Claude's "thinking" phase between tool calls.
**Why it happens:** Each iteration of the loop is a full API call with no intermediate output.
**How to avoid:**
- Stream tool_call_start events immediately when a tool is invoked, showing "Searching buyers..." in the UI
- Stream tool_call_result events immediately when the tool handler returns
- Only the text synthesis at the end needs to feel "streaming" - consider using `messages.stream()` for the FINAL iteration (when stop_reason will be end_turn)
**Warning signs:** Long pauses with no UI feedback, users think the agent is stuck.

## Code Examples

Verified patterns from the existing codebase:

### SSE Response Pattern (from score-column route)
```typescript
// Source: apps/web/src/app/api/scanners/[id]/score-column/route.ts (lines 219-378)
const encoder = new TextEncoder();
const stream = new ReadableStream({
  async start(controller) {
    try {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "column_start", total: 100 })}\n\n`)
      );
      // ... do work ...
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "complete" })}\n\n`)
      );
    } catch (err) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "error", message: "..." })}\n\n`)
      );
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
```

### SSE Client-Side Reader (from scanner page)
```typescript
// Source: apps/web/src/app/(dashboard)/scanners/[id]/page.tsx (lines 82-107)
async function readSSEStream(response: Response, onEvent: (event: SSEEvent) => void) {
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
          const event = JSON.parse(line.slice(6));
          onEvent(event);
        } catch { /* skip malformed */ }
      }
    }
  }
}
```

### Context Provider Pattern (from breadcrumb-context)
```typescript
// Source: apps/web/src/components/layout/breadcrumb-context.tsx
"use client";
import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface BreadcrumbContextValue {
  breadcrumb: ReactNode | null;
  setBreadcrumb: (node: ReactNode | null) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  breadcrumb: null,
  setBreadcrumb: () => {},
});

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [breadcrumb, setBreadcrumb] = useState<ReactNode | null>(null);
  return (
    <BreadcrumbContext.Provider value={{ breadcrumb, setBreadcrumb }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumb() {
  return useContext(BreadcrumbContext);
}
```

### Anthropic Tool Definition Format
```typescript
// Source: Context7 - /anthropics/anthropic-sdk-typescript
const tools: Anthropic.Tool[] = [
  {
    name: "query_buyers",
    description: "Search UK public sector buyers by name, sector, region, org type, or enrichment score range",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Text search across buyer names" },
        sector: { type: "string", description: "Filter by sector (e.g., 'NHS', 'Education')" },
        region: { type: "string", description: "Filter by region" },
        orgType: { type: "string", description: "Filter by org type (e.g., 'nhs_trust_acute')" },
        minEnrichmentScore: { type: "number", description: "Minimum enrichment score (0-100)" },
        limit: { type: "number", description: "Max results to return (default 10)" },
      },
    },
  },
];
```

### Sheet Component Usage (from entity-detail-sheet)
```typescript
// Source: apps/web/src/components/scanners/entity-detail-sheet.tsx
<Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent side="right" className="overflow-y-auto sm:max-w-lg w-full">
    <SheetHeader className="pb-2">
      <SheetTitle className="text-lg leading-tight pr-6">
        {title}
      </SheetTitle>
    </SheetHeader>
    <div className="space-y-5 px-4 pb-8">
      {/* Content */}
    </div>
  </SheetContent>
</Sheet>
```

### Dashboard Layout Provider Nesting (current)
```typescript
// Source: apps/web/src/app/(dashboard)/layout.tsx
// AgentProvider will wrap inside BreadcrumbProvider
<SidebarProvider>
  <AppSidebar />
  <SidebarInset>
    <BreadcrumbProvider>
      <AgentProvider>  {/* NEW - wraps everything inside BreadcrumbProvider */}
        <Header />
        <main className="flex-1 p-6">{children}</main>
        <AgentPanel />  {/* NEW - rendered here, outside main content */}
      </AgentProvider>
    </BreadcrumbProvider>
  </SidebarInset>
</SidebarProvider>
```

## Existing MongoDB Models and Query Patterns

All tool handlers will reuse existing models and query functions. Here is a summary of each collection the agent tools will query:

### Buyer (`apps/web/src/models/buyer.ts`)
- **Key fields:** `name`, `sector`, `region`, `orgType`, `enrichmentScore`, `annualBudget`, `staffCount`, `contractCount`, `contacts[]`, `website`, `linkedinUrl`
- **Indexes:** `name`, `sector`, `region`, `orgType`, `enrichmentPriority`
- **Existing query lib:** `apps/web/src/lib/buyers.ts` - `fetchBuyers(filters)` + `fetchBuyerById(id)`
- **Tool mapping:** `query_buyers` uses `fetchBuyers`, `get_buyer_detail` uses `fetchBuyerById`

### Contract (`apps/web/src/models/contract.ts`)
- **Key fields:** `title`, `description`, `buyerName`, `sector`, `buyerRegion`, `valueMin`, `valueMax`, `status`, `deadlineDate`, `publishedDate`, `cpvCodes`
- **Indexes:** text index on `title+description`, `status`, `sector`, `buyerRegion`, `publishedDate`, `deadlineDate`
- **Existing query lib:** `apps/web/src/lib/contracts.ts` - `fetchContracts(filters)` + `fetchContractById(id)`
- **Tool mapping:** `query_contracts` uses `fetchContracts`, `get_contract_detail` uses `fetchContractById`

### Signal (`apps/web/src/models/signal.ts`)
- **Key fields:** `organizationName`, `signalType` (PROCUREMENT/STAFFING/STRATEGY/FINANCIAL/PROJECTS/REGULATORY), `title`, `insight`, `sourceDate`, `sector`, `confidence`
- **Indexes:** text index on `title+insight`, `organizationName`, `signalType`, `sourceDate`, `sector`
- **Existing query route:** `apps/web/src/app/api/signals/route.ts` - filters by `q`, `signalType`, `sector`
- **Tool mapping:** `query_signals` - new handler with date range support

### KeyPersonnel (`apps/web/src/models/key-personnel.ts`)
- **Key fields:** `buyerId`, `name`, `title`, `role` (chief_executive/director/procurement_lead/etc.), `department`, `confidence`
- **Indexes:** `buyerId+name` (unique compound)
- **Tool mapping:** `query_key_personnel` - query by buyerId or role type

### SpendSummary (`apps/web/src/models/spend-summary.ts`)
- **Key fields:** `buyerId`, `totalTransactions`, `totalSpend`, `categoryBreakdown[]`, `vendorBreakdown[]`, `monthlyTotals[]`
- **Tool mapping:** `query_spend_data` - aggregated spending analytics per buyer

### SpendTransaction (`apps/web/src/models/spend-transaction.ts`)
- **Key fields:** `buyerId`, `date`, `amount`, `vendor`, `vendorNormalized`, `category`, `subcategory`, `department`
- **Indexes:** `buyerId+date`, `buyerId+category`, `buyerId+vendorNormalized`
- **Tool mapping:** `query_spend_data` - for detailed transaction queries

### BoardDocument (`apps/web/src/models/board-document.ts`)
- **Key fields:** `buyerId`, `title`, `meetingDate`, `committeeName`, `documentType` (minutes/agenda/report/board_pack), `sourceUrl`
- **Indexes:** `buyerId+sourceUrl` (unique compound)
- **Tool mapping:** `query_board_documents` - by buyer, committee, date range

### Scanner (`apps/web/src/models/scanner.ts`)
- **Key fields:** `userId`, `name`, `type` (rfps/meetings/buyers), `searchQuery`, `filters`, `aiColumns[]`, `scores[]`
- **Existing CRUD:** `apps/web/src/app/api/scanners/route.ts` - GET/POST/DELETE
- **Tool mapping:** `create_scanner` (POST), `apply_scanner_filter` (PATCH), `add_scanner_column` (POST to /columns)

### CompanyProfile (`apps/web/src/models/company-profile.ts`)
- **Key fields:** `userId`, `companyName`, `sectors[]`, `capabilities[]`, `keywords[]`, `certifications[]`, `regions[]`, `idealContractDescription`
- **Used for:** Injecting company context into the agent system prompt (same as scoring engine)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `client.messages.stream()` with manual event parsing | `client.messages.create()` with tool loop + final streaming | Anthropic SDK v0.50+ | Simpler control over tool execution; stream only the final response |
| WebSockets for real-time chat | SSE via ReadableStream in App Router | Next.js 13+ (stable) | No WebSocket server needed; works with serverless/edge |
| `react-markdown` for rendering | `marked` (string-based) already in project | - | Either works; `marked` is already a dependency |
| `toolRunner` helper (beta) | Manual tool loop | SDK v0.74 | toolRunner is convenient but less control; manual loop is more flexible for SSE |

**Deprecated/outdated:**
- `mobiledoc` format: Not relevant here but noted in project rules (Ghost CMS uses Lexical)
- `framer-motion` package name: Now published as `motion` (the project already uses the correct name)

## Key Implementation Details

### Tool Handler Security Model

Per NFR-02d, the agent does NOT generate raw MongoDB queries. Each tool accepts structured parameters and the server builds the query:

```typescript
// Tool handler for query_buyers
async function handleQueryBuyers(input: {
  query?: string;
  sector?: string;
  region?: string;
  orgType?: string;
  minEnrichmentScore?: number;
  limit?: number;
}, userId: string) {
  const filters: BuyerFilters = {
    q: input.query,
    sector: input.sector,
    region: input.region,
    orgType: input.orgType,
    pageSize: Math.min(input.limit ?? 10, 20), // Hard cap at 20
  };
  const { buyers, filteredCount } = await fetchBuyers(filters);
  return {
    summary: `Found ${filteredCount} buyers matching your criteria`,
    data: { buyers: buyers.slice(0, 20), totalMatches: filteredCount },
  };
}
```

### Conversation History Token Management

To avoid context window exhaustion:
1. Only include the last 10 messages in the API call to Claude
2. Tool results in conversation history should be summarized (not raw data)
3. The full conversation is saved to MongoDB but only a sliding window is sent to the API
4. System prompt + context should be kept under ~2000 tokens

### Write Tool State Sync

For the 3 write tools that modify scanner state:

1. **`create_scanner`**: Creates a new scanner via `POST /api/scanners`. Returns the scanner ID. Client-side can navigate to the new scanner page.
2. **`apply_scanner_filter`**: Updates scanner filters via `PATCH /api/scanners/[id]`. Client-side needs to trigger `loadData()` on the scanner page.
3. **`add_scanner_column`**: Adds an AI column via `POST /api/scanners/[id]/columns`. Client-side needs to rebuild columns and optionally trigger scoring.

The state sync challenge: the agent panel is a global component, but scanner state is managed locally in `page.tsx` + zustand store. Options:
- **Option A (recommended):** Emit custom events via `window.dispatchEvent(new CustomEvent("agent-action", { detail: action }))` and listen in scanner page
- **Option B:** Use zustand store to hold pending actions; scanner page polls/subscribes
- **Option C:** Return an instruction to the user ("I've created the scanner. Refresh the page to see it.") - simplest for MVP

### System Prompt Structure

```
You are a procurement research assistant for TendHunt...

## Your Data Access
[List of available tools and what they query]

## Current Context
Page: {context.page}
{context-specific details: scanner name/query/filters, buyer name/sector, contract title/value, etc.}

## Company Profile
Company: {profile.companyName}
Sectors: {profile.sectors.join(", ")}
Capabilities: {profile.capabilities.join(", ")}
Regions: {profile.regions.join(", ")}

## Guidelines
- Always use tools to get real data. Never guess or hallucinate.
- When searching, use relevant filters to narrow results.
- Format currency as GBP, dates in UK format (DD MMM YYYY).
- After gathering data, synthesize findings into a clear, actionable response.
- Maximum 5 tool calls per response.
```

## Open Questions

1. **Streaming the final text response token-by-token**
   - What we know: The tool loop uses non-streaming `messages.create()` for each iteration. The final text response could be streamed using `messages.stream()`.
   - What's unclear: Whether to use streaming for ALL iterations (complex, need to handle partial tool_use JSON) or only the final one (simpler, but need to detect which is "final" before making the call).
   - Recommendation: Use non-streaming for all iterations, then if `stop_reason === "end_turn"`, send the full text as a single `text_delta` event. This is simpler and the text is typically short enough that token-by-token streaming isn't critical. Can upgrade to streaming final response later.

2. **Write tool state sync mechanism**
   - What we know: The agent panel is global, scanner state is local to `page.tsx`. CustomEvent is the simplest cross-component communication.
   - What's unclear: Whether the scanner page can reliably listen for these events, especially during navigation.
   - Recommendation: Start with Option C (user-friendly message) for MVP. Can upgrade to CustomEvent-based sync in a follow-up.

3. **Panel width and mobile behavior**
   - What we know: Spec says 480px desktop, 100vw mobile. The existing Sheet component defaults to `sm:max-w-sm` (384px).
   - What's unclear: Whether 480px will feel too wide on smaller desktop screens.
   - Recommendation: Use `sm:max-w-md` (448px) or a custom `w-[480px]` class. Override the Sheet's default max-width.

4. **Conversation title generation**
   - What we know: Conversations persist with a title field.
   - What's unclear: How to auto-generate the title.
   - Recommendation: Use the first user message (truncated to 50 chars) as the default title. Can add Claude-based title generation later.

## Sources

### Primary (HIGH confidence)
- Context7: `/anthropics/anthropic-sdk-typescript` - Tool use, streaming, manual tool loop pattern
- Codebase: `apps/web/src/app/api/scanners/[id]/score-column/route.ts` - SSE streaming pattern
- Codebase: `apps/web/src/app/(dashboard)/scanners/[id]/page.tsx` - SSE client reader, state management
- Codebase: `apps/web/src/components/layout/breadcrumb-context.tsx` - React context provider pattern
- Codebase: `apps/web/src/components/ui/sheet.tsx` - Radix Dialog-based Sheet component
- Codebase: `apps/web/src/models/*.ts` - All MongoDB model schemas
- Codebase: `apps/web/src/lib/buyers.ts`, `apps/web/src/lib/contracts.ts` - Existing query functions
- Codebase: `apps/web/src/stores/scanner-store.ts` - Zustand store pattern
- Codebase: `apps/web/src/lib/scoring-engine.ts` - Anthropic API call pattern with retry logic
- Codebase: `apps/web/src/lib/anthropic.ts` - Anthropic client singleton

### Secondary (MEDIUM confidence)
- Requirements doc: `.planning/output.md` - Full confirmed requirements with UI specs and tool definitions

### Tertiary (LOW confidence)
- None - all findings verified against codebase or Context7

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and used in the codebase
- Architecture: HIGH - Patterns directly adapted from existing codebase (SSE streaming, Sheet, Context provider)
- Pitfalls: HIGH - Identified from real patterns in the codebase (token management, sheet conflicts, tool loops)
- Tool handlers: HIGH - Built on existing query functions (fetchBuyers, fetchContracts, etc.)
- Write tool state sync: MEDIUM - Cross-component communication mechanism needs validation during implementation

**Research date:** 2026-02-12
**Valid until:** 2026-03-12 (stable - all dependencies are already locked in the project)
