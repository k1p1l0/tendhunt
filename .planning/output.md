# Requirements: Procurement Research Agent Chat Panel

**Feature Owner:** Kirill Kozak (Founder)
**Date:** 2026-02-12
**Status:** CONFIRMED

---

## 1. Executive Summary

The Procurement Research Agent is a slide-out chat panel accessible from anywhere in the TendHunt app. It provides a conversational AI interface that can query all of TendHunt's internal data (Buyers, Contracts, Signals, Board Documents, Key Personnel, Spend Transactions, Scanners) and perform live web research when internal data is insufficient.

**Architecture:** Tool-use agent approach -- Claude receives tools to query MongoDB directly (building aggregation pipelines), with the system prompt containing full schema knowledge. No vector embeddings for MVP; board minutes content search can be added later.

**Reference UI:** Clay "Sculptor" pattern -- right-side slide panel with chat, suggested actions based on context, chat input at bottom.

---

## 2. Confirmed Decisions

All questions confirmed by the product owner on 2026-02-12.

| # | Decision | Choice |
|---|----------|--------|
| Q1 | Context passing | Pass context for all pages + **selected row** from scanner grid |
| Q2 | Tool set | **Read + Write** — include action tools (create scanner, apply filters, add columns) from day 1 |
| Q3 | Conversation history | **Persist to MongoDB** — `ChatConversation` collection, resumable across sessions |
| Q4 | Credit/cost model | **All free** for hackathon — no credit cost for any agent queries including web search |
| Q5 | Tool call UX | **Show tool indicators** — "Searching 2,384 buyers..." → "Found 47 matches" |
| Q6 | Model | **Sonnet** (`claude-sonnet-4-5-20250929`) |
| Q7 | Panel behavior | **Overlay with backdrop** — matches existing Sheet pattern |

### Full Tool Set (All MVP)

| Tool | Description | Type |
|---|---|---|
| `query_buyers` | Search/filter buyers by name, sector, region, orgType. Returns top N matches. | Read |
| `query_contracts` | Search/filter contracts by keyword, sector, region, value range, status, date range. | Read |
| `query_signals` | Search/filter buying signals by org name, signal type, date range. | Read |
| `get_buyer_detail` | Full buyer profile: contacts, key personnel, enrichment data, LinkedIn, spend summary. | Read |
| `get_contract_detail` | Full contract details by ID. | Read |
| `query_key_personnel` | Find decision-makers by buyer ID or role type. | Read |
| `query_spend_data` | Buyer spending analytics: top vendors, categories, monthly totals, total spend. | Read |
| `query_board_documents` | Find board documents by buyer, committee, date range. | Read |
| `web_search` | Live web research for information not in internal data. | Read (external) |
| `create_scanner` | Create a new scanner with type, search query, filters. | Write |
| `apply_scanner_filter` | Modify active scanner filters programmatically. | Write |
| `add_scanner_column` | Add an AI column to the current scanner. | Write |

---

## 3. Functional Requirements

### FR-01: Panel Trigger and Open/Close

| ID | Requirement | Priority |
|---|---|---|
| FR-01a | A persistent trigger button (sparkle/chat icon) appears in the global header, visible on all dashboard pages | P0 |
| FR-01b | Clicking the trigger opens the research agent panel as a right-side slide-out sheet | P0 |
| FR-01c | The panel can be closed via the X button, clicking the backdrop, or pressing Escape | P0 |
| FR-01d | Keyboard shortcut `Cmd+K` (macOS) / `Ctrl+K` (Windows) toggles the panel open/closed | P1 |
| FR-01e | The panel open/close transition animates smoothly (slide-in-from-right, 300ms ease-out) | P0 |
| FR-01f | Conversation state persists when panel is closed and reopened (within same session) | P0 |
| FR-01g | A "New conversation" button clears conversation history and resets context | P0 |

### FR-02: Context Awareness

| ID | Requirement | Priority |
|---|---|---|
| FR-02a | When opened from a scanner page, the agent knows: scanner ID, name, type, search query, active filters | P0 |
| FR-02b | When opened from a buyer detail page, the agent knows: buyer ID, name, sector, region, orgType, enrichment score | P0 |
| FR-02c | When opened from a contract detail page, the agent knows: contract ID, title, buyer name, sector, value range, status | P0 |
| FR-02d | When opened from the dashboard or list pages, the agent operates without specific entity context | P0 |
| FR-02e | Context is passed to the system prompt and used to generate suggested actions | P0 |
| FR-02f | When context changes (user navigates to different page), the agent notifies the user and offers to start a new conversation or continue | P1 |

### FR-03: Chat Interface

| ID | Requirement | Priority |
|---|---|---|
| FR-03a | The panel has a scrollable message area displaying the conversation history | P0 |
| FR-03b | User messages appear right-aligned with distinct styling (e.g., primary color background) | P0 |
| FR-03c | Agent messages appear left-aligned with markdown rendering support (bold, lists, tables, links) | P0 |
| FR-03d | Agent responses stream token-by-token with a typing indicator | P0 |
| FR-03e | A text input field at the bottom of the panel with a send button | P0 |
| FR-03f | Input supports Enter to send, Shift+Enter for newline | P0 |
| FR-03g | Input is disabled while the agent is processing a response | P0 |
| FR-03h | A stop button appears during streaming to cancel the response | P1 |

### FR-04: Suggested Actions

| ID | Requirement | Priority |
|---|---|---|
| FR-04a | When the conversation is empty, the panel shows 3-4 suggested prompts based on current context | P0 |
| FR-04b | Clicking a suggested prompt fills and sends it as a user message | P0 |
| FR-04c | Suggested prompts update when context changes (different page/entity) | P0 |

**Suggested prompt examples by context:**

| Context | Suggested Prompts |
|---|---|
| Scanner (RFPs) | "Which contracts here have the highest value?", "Find buyers in [active sector filter] with upcoming deadlines", "Summarize the top 5 contracts" |
| Scanner (Buyers) | "Which buyers have the most procurement signals?", "Find NHS trusts with recent board meetings", "Compare spending patterns across these buyers" |
| Buyer Detail | "What are the recent buying signals for [buyer name]?", "Who are the key decision-makers?", "What has [buyer] spent most on recently?", "Find similar buyers in the same region" |
| Contract Detail | "Tell me about the buyer [buyer name]", "Are there similar contracts from this buyer?", "What signals suggest this buyer is actively procuring?" |
| Dashboard (no context) | "Find buyers in the NHS sector with high enrichment scores", "What are the latest procurement signals?", "Show me contracts expiring this month", "Which buyers have the highest annual budgets?" |

### FR-05: Agent Tool Execution and Display

| ID | Requirement | Priority |
|---|---|---|
| FR-05a | When the agent invokes a tool, a collapsible "tool call" indicator appears in the chat (e.g., "Searching buyers..." with a spinner) | P0 |
| FR-05b | When the tool completes, the indicator updates to show the result summary (e.g., "Found 47 buyers matching your criteria") | P0 |
| FR-05c | Tool results are collapsible -- the user can expand to see raw data if desired | P1 |
| FR-05d | Multiple tool calls in a single response are displayed sequentially | P0 |
| FR-05e | The agent synthesizes tool results into a natural language response after tool calls complete | P0 |

### FR-06: Error Handling

| ID | Requirement | Priority |
|---|---|---|
| FR-06a | If the AI API call fails, display a user-friendly error message with a retry button | P0 |
| FR-06b | If a tool call fails (e.g., MongoDB error), the agent should inform the user and suggest rephrasing | P0 |
| FR-06c | Network errors show a "Connection lost" banner with automatic retry | P1 |
| FR-06d | Rate limiting is handled gracefully (e.g., "Please wait a moment before your next question") | P1 |

---

## 4. Non-Functional Requirements

### NFR-01: Performance

| ID | Requirement | Target |
|---|---|---|
| NFR-01a | Time to first token in agent response | < 2 seconds |
| NFR-01b | MongoDB tool call execution time | < 3 seconds for typical queries |
| NFR-01c | Panel open animation | 300ms |
| NFR-01d | Panel should not block main thread or cause layout shift | Zero layout shift |

### NFR-02: Security

| ID | Requirement |
|---|---|
| NFR-02a | All agent API calls are authenticated via Clerk (same as existing APIs) |
| NFR-02b | The agent can only access data the authenticated user has permission to see |
| NFR-02c | MongoDB queries generated by the agent are parameterized (no injection risk) |
| NFR-02d | Agent tools use pre-defined query shapes -- the AI does NOT generate raw MongoDB aggregation pipelines directly. Instead, tools accept structured parameters (e.g., `{ sector: "NHS", region: "London" }`) and the server builds the pipeline. |

### NFR-03: Scalability

| ID | Requirement |
|---|---|
| NFR-03a | Conversation state persists to MongoDB (`ChatConversation` collection) with lazy writes (debounced after each message) |
| NFR-03b | Agent API route is stateless -- each request includes full conversation history |
| NFR-03c | Tool calls use the same MongoDB indexes as existing API routes |

### NFR-04: Accessibility

| ID | Requirement |
|---|---|
| NFR-04a | Panel is keyboard navigable (Tab through elements, Enter to send, Escape to close) |
| NFR-04b | All interactive elements have proper ARIA labels |
| NFR-04c | Animations respect `prefers-reduced-motion` |
| NFR-04d | Minimum 44px tap targets on mobile |

---

## 5. User Stories and Scenarios

### US-01: Quick Buyer Research

> As a sales user viewing a buyer profile, I want to ask the agent "What has this buyer been spending on?" so I can quickly understand their procurement patterns without navigating to multiple tabs.

**Acceptance Criteria:**
1. User is on `/buyers/[id]` page for "NHS East Sussex"
2. Opens agent panel -- agent already knows the buyer context
3. Suggested prompt: "What has NHS East Sussex spent most on recently?"
4. Agent calls `query_spend_data` tool with the buyer ID
5. Response shows top spending categories, total spend, and notable vendors
6. Agent synthesizes: "NHS East Sussex has spent GBP 12.4M across 847 transactions. Their largest category is Medical Supplies (GBP 4.2M), followed by IT Services (GBP 2.8M)..."

### US-02: Cross-Entity Intelligence

> As a sales user viewing a contract, I want to ask "Who are the decision-makers for this buyer?" so I can prepare my bid approach.

**Acceptance Criteria:**
1. User is on a contract detail page for "IT Infrastructure Refresh" by "Birmingham City Council"
2. Opens agent panel
3. Asks: "Who should I contact about this opportunity?"
4. Agent calls `get_buyer_detail` and `query_key_personnel` for Birmingham City Council
5. Response lists key personnel with roles, confidence scores, and engagement recommendations

### US-03: Scanner Context Research

> As a user viewing an RFPs scanner, I want to ask "Which of these contracts are in sectors we serve?" so the agent can analyze my scanner data against my company profile.

**Acceptance Criteria:**
1. User is on a scanner page with 150 contracts loaded
2. Agent knows the scanner's search query and active filters
3. Agent queries the company profile to understand the user's capabilities
4. Agent cross-references scanner contracts with company sectors/capabilities
5. Response: "Based on your profile (IT consulting, cybersecurity), 23 of the 150 contracts align with your capabilities..."

### US-04: Exploratory Query (No Context)

> As a user on the dashboard, I want to ask "Show me NHS trusts in London with procurement signals in the last 30 days" to discover opportunities.

**Acceptance Criteria:**
1. Agent calls `query_buyers` with `{ orgType: "nhs_trust_*", region: "London" }`
2. Agent calls `query_signals` with `{ signalType: "PROCUREMENT", dateFrom: "30 days ago" }` for matched buyers
3. Synthesizes results into actionable list with buyer names, signal types, and key insights

---

## 6. Technical Architecture

### 6.1 API Route

```
POST /api/agent/chat
```

**Request body:**
```typescript
{
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  context: {
    page: "dashboard" | "scanner" | "buyer_detail" | "contract_detail" | "contracts" | "buyers";
    scannerId?: string;
    scannerType?: ScannerType;
    scannerName?: string;
    scannerQuery?: string;
    scannerFilters?: Record<string, unknown>;
    buyerId?: string;
    buyerName?: string;
    contractId?: string;
    contractTitle?: string;
    // ... additional context fields
  };
}
```

**Response:** SSE stream with events:
```typescript
{ type: "tool_call_start"; toolName: string; args: Record<string, unknown> }
{ type: "tool_call_result"; toolName: string; summary: string; data?: unknown }
{ type: "text_delta"; content: string }
{ type: "done" }
{ type: "error"; message: string }
```

### 6.2 Component Architecture

```
DashboardLayout (layout.tsx)
  |-- AgentProvider (React context -- holds conversation state, context, panel open/close)
  |     |-- AgentPanelTrigger (button in header)
  |     |-- AgentPanel (Sheet component)
  |           |-- AgentPanelHeader (title, new conversation button, close)
  |           |-- AgentMessageList (scrollable message area)
  |           |     |-- UserMessage
  |           |     |-- AgentMessage (with markdown rendering)
  |           |     |-- ToolCallIndicator (collapsible tool execution display)
  |           |     |-- SuggestedActions (empty state prompts)
  |           |-- AgentInput (textarea + send button)
```

### 6.3 Context Provider Pattern

A new `AgentContext` React context wraps the dashboard layout. Each page component calls `useAgentContext().setContext(...)` on mount to update the agent's awareness. This is analogous to the existing `useBreadcrumb()` pattern.

```typescript
// In buyer detail page:
const { setContext } = useAgentContext();
useEffect(() => {
  setContext({
    page: "buyer_detail",
    buyerId: buyer._id,
    buyerName: buyer.name,
    sector: buyer.sector,
    // ...
  });
}, [buyer]);
```

### 6.4 Agent System Prompt Structure

```
You are a procurement research assistant for TendHunt, a UK public sector sales intelligence platform.

## Your Data Access
You have tools to query:
- 2,384 UK public sector buyers (councils, NHS trusts, ICBs, fire/rescue, police, universities, etc.)
- Contracts from Find a Tender and Contracts Finder
- Buying signals from board minutes (PROCUREMENT, STAFFING, STRATEGY, FINANCIAL, PROJECTS, REGULATORY)
- Key personnel (decision-makers) extracted from governance pages
- Spending data (transparency CSV reports, vendor breakdowns, category analytics)
- Board documents (meeting minutes, agendas, reports)

## Current Context
[Injected dynamically based on page/entity]

## Company Profile
[User's company profile for personalized recommendations]

## Tool Usage Guidelines
- Always use tools to get real data -- never guess or hallucinate
- When searching, use relevant filters to narrow results
- Cross-reference multiple data sources for comprehensive answers
- Format currency as GBP, dates in UK format (DD MMM YYYY)
```

### 6.5 Tool Definitions (Anthropic Tool Use Format)

Each tool is a structured function with typed parameters. The server-side implementation uses the same MongoDB models/queries as existing API routes but wraps them as tool handlers.

```typescript
const tools = [
  {
    name: "query_buyers",
    description: "Search UK public sector buyers by name, sector, region, org type, or enrichment score range",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Text search across buyer names" },
        sector: { type: "string" },
        region: { type: "string" },
        orgType: { type: "string" },
        minEnrichmentScore: { type: "number" },
        limit: { type: "number", default: 10 },
      },
    },
  },
  // ... additional tools
];
```

### 6.6 File Structure (Proposed)

```
apps/web/src/
  app/api/agent/
    chat/route.ts           -- POST handler, SSE streaming, tool execution
    tools.ts                -- Tool definitions and handlers
    system-prompt.ts        -- System prompt builder with context injection
  components/agent/
    agent-provider.tsx      -- React context for panel state + conversation
    agent-panel.tsx         -- Sheet-based slide-out panel
    agent-panel-header.tsx  -- Header with title, new chat, close
    agent-message-list.tsx  -- Scrollable message area
    agent-message.tsx       -- Single message (user or assistant)
    agent-input.tsx         -- Text input + send button
    tool-call-indicator.tsx -- Tool execution display
    suggested-actions.tsx   -- Context-based suggested prompts
  hooks/
    use-agent-context.ts    -- Hook to access agent context
```

---

## 7. UI/UX Specifications

### 7.1 Panel Dimensions

| Property | Value |
|---|---|
| Width | 480px (desktop), 100vw (mobile < 640px) |
| Height | Full viewport height |
| Position | Fixed, right side |
| Z-index | 50 (matches existing Sheet z-index) |
| Background | `bg-background` (matches app theme) |
| Border | Left border (`border-l`) |

### 7.2 Panel Header

- Title: "Research Agent" with a sparkle icon (Sparkles from lucide-react)
- Right side: "New Chat" button (RefreshCw icon) + Close button (X icon)
- Context pill: Shows current context (e.g., "Viewing: Birmingham City Council") as a small badge below the title

### 7.3 Message Styling

| Element | Styling |
|---|---|
| User message | Right-aligned, `bg-primary text-primary-foreground`, rounded-2xl, max-width 85% |
| Agent message | Left-aligned, `bg-muted`, rounded-2xl, max-width 85%, markdown rendered |
| Tool call | Inline card with icon, tool name, status indicator (spinner -> checkmark), collapsible result |
| Suggested action | Ghost button with border, full-width, left-aligned text |

### 7.4 Input Area

- Textarea (auto-grows to max 4 lines)
- Send button (ArrowUp icon in a circle, primary color when input is non-empty, disabled when empty)
- Placeholder text: context-dependent (e.g., "Ask about Birmingham City Council..." or "Research UK public sector buyers...")

### 7.5 Animation Requirements

| Transition | Animation |
|---|---|
| Panel open | `slide-in-from-right`, 300ms ease-out, backdrop `fade-in` 200ms |
| Panel close | `slide-out-to-right`, 200ms ease-in, backdrop `fade-out` 150ms |
| New message appear | `fade-in` + subtle `slide-up` (translateY 8px to 0), 200ms |
| Tool call expand/collapse | Height animation with `overflow-hidden`, 200ms |
| Typing indicator | Three dots with staggered pulse animation |
| Suggested actions | Stagger-in on mount (50ms delay between each) |
| Send button | Scale pulse on click (1 -> 0.95 -> 1), 100ms |

---

## 8. Suggested Prompt Engine

The suggested prompts are generated based on the current page context. They are static templates with dynamic entity names injected.

```typescript
function getSuggestedPrompts(context: AgentContext): string[] {
  switch (context.page) {
    case "buyer_detail":
      return [
        `What are the recent buying signals for ${context.buyerName}?`,
        `Who are the key decision-makers at ${context.buyerName}?`,
        `What has ${context.buyerName} been spending on recently?`,
        `Find similar buyers in ${context.region}`,
      ];
    case "scanner":
      if (context.scannerType === "rfps") {
        return [
          "Which contracts have the highest value?",
          "Find contracts with upcoming deadlines this month",
          "Summarize the top opportunities for my company",
        ];
      }
      // ...
  }
}
```

---

## 9. Integration with Existing Scanner System

The agent does NOT directly modify scanner state in MVP. However:

1. **Agent can READ scanner data** -- it knows the scanner's search query, type, and filters from context
2. **Agent can reference scanner results** -- "Based on your RFPs scanner, I see 150 contracts matching 'IT infrastructure'..."
3. **Future (post-MVP):** Agent can CREATE scanners, ADD columns, and APPLY filters via action tools

---

## 10. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Agent generates incorrect MongoDB queries | Wrong data shown to user | Use pre-defined tool shapes (not raw pipelines). Agent picks tool + params, server builds query. |
| Claude API latency for complex queries | Poor UX, long waits | Stream responses. Show tool call progress. Use Sonnet (faster than Opus). |
| Context token usage is too high | Expensive API calls | Limit conversation history to last 10 messages. Summarize long tool results. |
| Conversation history grows unbounded | Performance degradation | Cap at 20 messages per session. Offer "New conversation" button. |
| User asks about data that does not exist | Hallucination risk | System prompt instructs agent to always use tools and never guess. "I don't have that information" response. |
| Panel conflicts with existing sheets/drawers | Z-index wars, multiple overlays | Close agent panel when EntityDetailSheet or AiCellDrawer opens (or vice versa). |

---

## 11. MVP Scope Summary

### In Scope (MVP)

- Right-side slide-out panel accessible from all dashboard pages
- Context-aware system prompt based on current page/entity + selected row
- 9 read-only data tools (buyers, contracts, signals, personnel, spend, board docs, buyer detail, contract detail, web search)
- 3 write/action tools (create scanner, apply filters, add columns) with bidirectional state sync
- Streaming responses with tool call indicators ("Searching..." → "Found N matches")
- Suggested prompts based on context
- Persistent conversation history in MongoDB (`ChatConversation` collection)
- Sonnet model for reasoning quality
- Markdown rendering in responses
- All queries free (no credit cost)
- Animations per project guidelines

### Out of Scope (Post-MVP)

- Multi-turn autonomous tool chains beyond what Anthropic's tool use supports natively
- Voice input
- File/image sharing in chat
- Agent-generated charts or visualizations
- Credit-based pricing for agent usage

---

## 12. Implementation Phases (Proposed)

| Phase | Scope |
|---|---|
| **Phase A: Data Model + API Infrastructure** | `ChatConversation` MongoDB model, `POST /api/agent/chat` route, SSE streaming, system prompt builder, core read tool definitions (query_buyers, query_contracts, query_signals) + handlers |
| **Phase B: Panel UI** | AgentProvider (React context), AgentPanel (Sheet), AgentInput, AgentMessageList, message components (user/assistant/tool-call), animations, conversation persistence hooks |
| **Phase C: Context + Suggestions** | AgentContext provider, page-level context setting (scanner + selected row, buyer detail, contract detail, dashboard), suggested prompts engine |
| **Phase D: Full Read Tool Set** | Remaining read tools (get_buyer_detail, get_contract_detail, query_key_personnel, query_spend_data, query_board_documents, web_search), tool call indicator UX, markdown rendering |
| **Phase E: Write Tools + State Sync** | Action tools (create_scanner, apply_scanner_filter, add_scanner_column), bidirectional state sync between panel and scanner page, confirmation UX before writes |
| **Phase F: Polish** | Error handling, keyboard shortcuts (Cmd+K), stop button, conversation history list/resume, mobile responsiveness, edge cases |

**Total: 6 phases**

---

## 13. Dependencies

| Dependency | Status | Notes |
|---|---|---|
| `@anthropic-ai/sdk` v0.74+ | Already installed | Supports tool use and streaming |
| `motion` (Framer Motion) | Already installed | For panel/message animations |
| `marked` | Already installed | For markdown rendering in agent messages |
| Anthropic API key | Already configured | `ANTHROPIC_API_KEY` in env |
| Clerk auth | Already configured | For API route authentication |
| All MongoDB models | Already exist | Buyer, Contract, Signal, KeyPersonnel, SpendSummary, SpendTransaction, BoardDocument, Scanner |

---

**NEXT STEP:** Please review this document and confirm or adjust the open questions (Q1-Q7 in Section 2). Once confirmed, I can proceed with implementation planning.
