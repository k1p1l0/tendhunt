# Plan: Sculptor On-Demand Buyer Enrichment

## Goal
Give Sculptor the ability to trigger the full enrichment pipeline for a specific buyer, with real-time stage-by-stage progress streaming in the chat.

## Context
- Enrichment worker already has `/run-buyer?id=X` (single-buyer, all 8 stages)
- Web app already has `POST /api/enrichment/trigger` proxy endpoint
- Spend-ingest worker has `/run-buyer?id=X` for spending data
- Full enrichment takes 2-5 minutes per buyer

## Tasks

### Task 1: Add `enrich_buyer` tool definition
**File:** `apps/web/src/lib/agent/tools.ts`

Add new tool:
```typescript
{
  name: "enrich_buyer",
  description: "Trigger full data enrichment for a buyer. Fetches org details, LinkedIn profile, logo, governance docs, board minutes, key personnel, and spending data. Takes 2-5 minutes. Use when a buyer has low enrichment score or missing data.",
  input_schema: {
    type: "object",
    properties: {
      buyerId: { type: "string", description: "MongoDB ObjectId of the buyer" },
      buyerName: { type: "string", description: "Buyer name for confirmation" },
    },
    required: ["buyerId"],
  },
}
```

### Task 2: Add `enrich_buyer` tool handler
**File:** `apps/web/src/lib/agent/tool-handlers.ts`

New handler that:
1. Validates buyerId (with name fallback like `get_buyer_detail`)
2. Checks buyer's current `lastEnrichedAt` — if enriched within 24h, return early with "Already enriched recently"
3. Calls `POST /api/enrichment/trigger` with `{ buyerId, pipeline: "both" }`
4. Returns action `{ type: "enrich_started", buyerId, buyerName }` so the SSE handler can initiate the streaming progress UI

### Task 3: Create SSE enrichment progress endpoint
**File:** `apps/web/src/app/api/enrichment/[id]/progress/route.ts` (new)

SSE endpoint that:
1. Fires the enrichment by calling the worker's `/run-buyer?id=X`
2. Polls the buyer document every 3 seconds for changes to `enrichmentSources`, `enrichmentScore`, `lastEnrichedAt`
3. Streams stage progress events: `{ stage: "classify", status: "complete" }`, `{ stage: "logo_linkedin", status: "active" }`
4. Detects enrichment completion when `lastEnrichedAt` updates
5. After enrichment completes, triggers spend-ingest and reports those stages too
6. Sends final `done` event with updated buyer summary

### Task 4: Handle `enrich_started` action in use-agent.ts
**File:** `apps/web/src/hooks/use-agent.ts`

When SSE handler receives `action.type === "enrich_started"`:
1. Store the enrichment state in the agent store (new field: `activeEnrichment: { buyerId, buyerName, stages: [] }`)
2. Connect to the progress SSE endpoint
3. As stages complete, update the store → triggers UI re-render

### Task 5: Enrichment progress component
**File:** `apps/web/src/components/agent/enrichment-progress.tsx` (new)

A special message component that renders inside the chat when enrichment is active:
- Animated header: "Sculptor is enriching [Buyer Name]..."
- Stage-by-stage progress list (8 enrichment + 4 spend stages):
  - Pending: gray dot
  - Active: spinning arc (like tool call spinner)
  - Complete: green check with spring pop
  - Failed: red X with error text
- Elapsed time counter
- Cancel button
- On completion: summary of what was found (contacts, docs, spend data)

### Task 6: Add enrichment to agent store
**File:** `apps/web/src/stores/agent-store.ts`

Add:
```typescript
activeEnrichment: {
  buyerId: string;
  buyerName: string;
  stages: Array<{
    name: string;
    label: string;
    status: "pending" | "active" | "complete" | "failed";
    detail?: string;
  }>;
  startedAt: Date;
  completedAt?: Date;
} | null;
setActiveEnrichment: (enrichment: ...) => void;
updateEnrichmentStage: (name: string, status: ..., detail?: string) => void;
clearEnrichment: () => void;
```

### Task 7: Wire enrichment into AgentMessage rendering
**File:** `apps/web/src/components/agent/agent-message.tsx`

After the tool call chain renders, if the message has an associated enrichment (via store), render the `EnrichmentProgress` component inline.

### Task 8: Update system prompt with enrichment tool guidance
**File:** `apps/web/src/lib/agent/system-prompt.ts`

Add to tool descriptions and guidelines:
- When to suggest enrichment (low enrichment score, missing data sections)
- How to present the results after enrichment completes
- Don't trigger enrichment without user confirmation

## Verification
1. On a buyer page with low enrichment score, ask "Can you enrich this buyer?"
2. Sculptor confirms, triggers enrichment
3. Chat shows animated stage-by-stage progress
4. After 2-5 minutes, all stages complete with summary
5. Buyer page refreshes to show new data
6. Re-asking to enrich shows "Already enriched recently"

## Dependencies
- Enrichment worker deployed and accessible
- `POST /api/enrichment/trigger` endpoint working
- Worker `/run-buyer` endpoint accessible from web app

## Estimated Scope
- 8 files modified/created
- ~400 lines of new code
- Medium complexity (SSE streaming + store state + animation)
