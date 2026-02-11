# Phase 5: Vibe Scanner - Research

**Researched:** 2026-02-11
**Domain:** AI batch scoring with Claude Haiku, real-time progress streaming, interactive threshold controls
**Confidence:** HIGH

## Summary

Phase 5 is the core differentiator of TendHunt: an AI-powered scoring engine that uses Claude Haiku 4.5 to evaluate every contract and buyer organization against the user's company profile. The user creates a "Vibe Scanner" from their existing company profile (built in Phase 3), views/edits the generated scoring prompt, then triggers batch scoring. Each contract receives a score (1-10) with reasoning text. A threshold slider lets users filter contracts by minimum score.

The technical challenge has three dimensions: (1) generating a good scoring prompt from the company profile data already in MongoDB, (2) batch-scoring hundreds of contracts through the Claude Haiku API with visible progress feedback, and (3) interactive client-side threshold controls that dynamically filter already-scored contracts. The existing codebase already has `vibeScore` and `vibeReasoning` placeholder fields on both the Contract and Buyer models, the Anthropic SDK client configured at `src/lib/anthropic.ts`, structured output via `output_config` (used in profile generation), and a contract data access layer at `src/lib/contracts.ts`.

**Primary recommendation:** Use sequential (not Batch API) Claude Haiku calls with prompt caching, streamed to the client via Server-Sent Events (SSE) from a Next.js Route Handler. Score contracts in batches of 5 concurrent requests with p-limit, caching the system prompt + scoring rubric to cut costs by 90%. Store scores per-user in a new `VibeScanner` model rather than on the shared Contract documents.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | ^0.74.0 | Claude Haiku API calls | Already installed; supports streaming, structured output, prompt caching |
| `mongoose` | ^9.2.0 | MongoDB ODM for VibeScanner + score storage | Already installed; bulkWrite for batch score persistence |
| `next` | 16.1.6 | Route Handlers for SSE streaming endpoint | Already installed; native Web API Response + ReadableStream |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `p-limit` | ^6.2.0 | Concurrency limiter for parallel API calls | Batch scoring -- limit to 5 concurrent Haiku calls to stay within rate limits |
| shadcn/ui `Slider` | (radix-ui) | Score threshold slider with 0.1 step | Threshold control UI -- add via `npx shadcn@latest add slider` |
| shadcn/ui `Progress` | (radix-ui) | Scoring progress bar | Progress display -- add via `npx shadcn@latest add progress` |
| shadcn/ui `Switch` | (radix-ui) | Toggle hide/reduce-opacity for below-threshold | Toggle control -- add via `npx shadcn@latest add switch` |
| `zustand` | ^5.0.11 | Client-side state for threshold, scores, progress | Already installed; shared state across Vibe Scanner components |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sequential API calls + SSE | Anthropic Batch API | Batch API is async (poll for results, can take minutes). Not suitable for real-time progress bar. 50% cheaper but worse UX. |
| p-limit | Promise.allSettled with chunks | p-limit is cleaner, handles backpressure automatically |
| zustand | URL params (like contracts page) | Threshold/scores are transient UI state, not shareable -- zustand is better fit |
| Per-user score storage (VibeScanner model) | Write scores directly to Contract docs | Per-user scores avoid conflicts between users; Contract.vibeScore field remains for a "default" or "last" score display |

**Installation:**
```bash
npm install p-limit
npx shadcn@latest add slider progress switch
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── models/
│   └── vibe-scanner.ts          # VibeScanner + VibeScore models
├── lib/
│   ├── vibe-scanner.ts          # Prompt generation, scoring logic, DB operations
│   └── anthropic.ts             # Already exists -- Anthropic client
├── app/
│   ├── api/
│   │   └── vibe-scanner/
│   │       ├── create/route.ts   # POST: Create scanner, generate prompt
│   │       ├── score/route.ts    # POST: Trigger batch scoring (SSE stream)
│   │       └── route.ts          # GET: Fetch user's scanner + scores
│   └── (dashboard)/
│       └── vibe-scanner/
│           └── page.tsx          # Vibe Scanner page (prompt editor + scored feed)
├── components/
│   └── vibe-scanner/
│       ├── prompt-editor.tsx     # Textarea with scoring prompt
│       ├── score-progress.tsx    # Progress bar during scoring
│       ├── threshold-controls.tsx # Slider + hide/opacity toggle
│       └── scored-contract-feed.tsx # Contract cards with scores + divider
```

### Pattern 1: Scoring Prompt Generation from Company Profile
**What:** Transform the CompanyProfile document into a scoring rubric prompt that Claude Haiku uses to evaluate contracts.
**When to use:** When creating a new Vibe Scanner or when the user edits their profile and wants to regenerate the prompt.
**Example:**
```typescript
// Source: Verified against existing profile generation in src/app/api/profile/generate/route.ts
function generateScoringPrompt(profile: ICompanyProfile): string {
  return `You are a UK government procurement scoring engine.

Score each contract on a scale of 1-10 based on how well it matches this company:

**Company:** ${profile.companyName}
**Summary:** ${profile.summary}
**Sectors:** ${profile.sectors.join(', ')}
**Capabilities:** ${profile.capabilities.join(', ')}
**Keywords:** ${profile.keywords.join(', ')}
**Certifications:** ${profile.certifications.join(', ')}
**Ideal Contract:** ${profile.idealContractDescription}
**Regions:** ${profile.regions.join(', ')}
**Company Size:** ${profile.companySize}

Scoring criteria:
- 9-10: Perfect match -- sector, capabilities, region, and value all align
- 7-8: Strong match -- most criteria align, minor gaps
- 5-6: Moderate match -- some alignment but significant gaps
- 3-4: Weak match -- limited relevance
- 1-2: No match -- different sector, capabilities, or region entirely

For each contract, provide:
1. A score (1-10, one decimal place)
2. A brief reasoning (1-2 sentences) explaining the score`;
}
```

### Pattern 2: SSE Streaming for Batch Scoring Progress
**What:** Use Server-Sent Events from a Next.js App Router Route Handler to stream scoring progress to the client in real-time.
**When to use:** When the user clicks "Apply & Score" and we need to score 200-500 contracts with a visible progress bar.
**Example:**
```typescript
// Source: Verified against Next.js 16 Route Handler docs (context7 /vercel/next.js/v16.1.5)
// and Anthropic SDK TypeScript docs (context7 /anthropics/anthropic-sdk-typescript)
export async function POST(request: Request) {
  // ... auth, validation ...

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const contracts = await Contract.find({}).select('title description buyerName sector valueMin valueMax buyerRegion cpvCodes').lean();
      const total = contracts.length;
      let scored = 0;

      // Score in batches of 5 concurrent
      const limit = pLimit(5);
      const batchSize = 5;

      for (let i = 0; i < contracts.length; i += batchSize) {
        const batch = contracts.slice(i, i + batchSize);
        await Promise.all(batch.map(contract => limit(async () => {
          const result = await scoreContract(contract, scoringPrompt);
          scored++;
          // Send SSE event
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'progress', scored, total, contractId: contract._id, score: result.score, reasoning: result.reasoning })}\n\n`
          ));
        })));
      }

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', scored })}\n\n`));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### Pattern 3: Prompt Caching for Cost Optimization
**What:** Cache the system prompt (scoring rubric) across all contract scoring calls so only the per-contract user message counts as new input tokens.
**When to use:** Every batch scoring run -- the scoring prompt is identical for all contracts in a batch.
**Example:**
```typescript
// Source: Verified against Anthropic prompt caching docs (platform.claude.com/docs/en/build-with-claude/prompt-caching)
const response = await anthropic.messages.create({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 256,
  system: [
    {
      type: "text",
      text: scoringPrompt, // The full scoring rubric -- cached after first call
      cache_control: { type: "ephemeral" } // 5-min TTL, refreshed on each use
    }
  ],
  messages: [
    {
      role: "user",
      content: `Score this contract:\n\nTitle: ${contract.title}\nBuyer: ${contract.buyerName}\nDescription: ${contract.description}\nSector: ${contract.sector}\nRegion: ${contract.buyerRegion}\nValue: ${contract.valueMin}-${contract.valueMax} GBP\nCPV Codes: ${contract.cpvCodes?.join(', ')}`
    }
  ],
  output_config: {
    format: {
      type: "json_schema" as const,
      schema: {
        type: "object" as const,
        properties: {
          score: { type: "number" as const },
          reasoning: { type: "string" as const }
        },
        required: ["score", "reasoning"],
        additionalProperties: false
      }
    }
  }
});
```

### Pattern 4: Client-Side Threshold Filtering with Zustand
**What:** Store scores, threshold value, and display mode (hide vs. reduce opacity) in a zustand store. Filter/style contracts client-side without re-fetching.
**When to use:** After scoring is complete, when user adjusts the threshold slider.
**Example:**
```typescript
// Source: zustand already in use (package.json ^5.0.11)
import { create } from 'zustand';

interface VibeStore {
  scores: Map<string, { score: number; reasoning: string }>;
  threshold: number;
  hideBelow: boolean; // true = hide, false = reduced opacity
  setThreshold: (t: number) => void;
  setHideBelow: (h: boolean) => void;
  setScore: (contractId: string, score: number, reasoning: string) => void;
  clearScores: () => void;
}

export const useVibeStore = create<VibeStore>((set) => ({
  scores: new Map(),
  threshold: 5.0,
  hideBelow: false,
  setThreshold: (threshold) => set({ threshold }),
  setHideBelow: (hideBelow) => set({ hideBelow }),
  setScore: (contractId, score, reasoning) => set((state) => {
    const scores = new Map(state.scores);
    scores.set(contractId, { score, reasoning });
    return { scores };
  }),
  clearScores: () => set({ scores: new Map() }),
}));
```

### Anti-Patterns to Avoid
- **Scoring all contracts in one API call:** The contract descriptions are too varied and too long. Each contract needs its own API call with focused context.
- **Using the Anthropic Batch API for real-time progress:** The Batch API is asynchronous and can take minutes. No SSE progress. Use it only if real-time feedback is not required.
- **Writing scores directly to the shared Contract collection:** Multiple users would overwrite each other's scores. Use per-user VibeScore documents.
- **Streaming Claude responses for each contract:** We need the full JSON response, not streaming text. Use non-streaming `messages.create()` with structured output.
- **Not caching the system prompt:** Without prompt caching, you pay full input token cost for the scoring rubric (~500-1000 tokens) on every single contract call. With caching, subsequent calls pay only 10% for cache reads.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Concurrency limiting | Manual chunking with Promise.all | `p-limit` | Handles backpressure, error propagation, and queue management |
| Slider with decimal steps | Custom range input | shadcn/ui `Slider` (Radix) | Accessible, supports `step={0.1}`, keyboard navigation |
| Progress bar | Custom div with width% | shadcn/ui `Progress` (Radix) | Animated, accessible, consistent with existing UI |
| SSE client | Manual fetch + TextDecoder | `EventSource` or fetch + ReadableStream reader | EventSource handles reconnection; ReadableStream reader handles custom formats |
| JSON response parsing from Claude | Regex extraction from text | `output_config` structured output | Guarantees valid JSON schema, no parsing errors |

**Key insight:** The Anthropic SDK already supports everything needed (structured output, prompt caching, concurrent calls). The main complexity is the SSE streaming architecture connecting the server-side scoring loop to the client-side progress bar.

## Common Pitfalls

### Pitfall 1: Rate Limiting on Tier 1
**What goes wrong:** With 200-500 contracts to score, hitting 50 RPM limit means the entire scoring run takes 4-10 minutes at Tier 1.
**Why it happens:** Claude Haiku Tier 1 allows only 50 RPM and 50,000 ITPM.
**How to avoid:** (a) Use p-limit with concurrency of 5 and add small delays between batches. (b) Use prompt caching to reduce ITPM (scoring prompt cached, only contract text counts). (c) Keep max_tokens low (256 is enough for score + reasoning). (d) Consider upgrading to Tier 2 ($40 deposit) for 1,000 RPM.
**Warning signs:** 429 responses from the API; progress bar stalling.

### Pitfall 2: Prompt Caching Minimum Token Threshold
**What goes wrong:** If the scoring prompt is under 4,096 tokens, it won't be cached by Claude Haiku 4.5.
**Why it happens:** Claude Haiku 4.5 has a minimum cacheable prompt length of 4,096 tokens.
**How to avoid:** Pad the scoring prompt with additional context: include the full company summary, all document extracts, sector descriptions, and detailed scoring criteria to ensure it exceeds 4,096 tokens. If the company profile is small, add default UK procurement context.
**Warning signs:** `cache_read_input_tokens` always 0 in API responses; cost higher than expected.

### Pitfall 3: SSE Connection Timeout on Cloudflare
**What goes wrong:** Cloudflare Workers/Pages have a 30-second subrequest timeout. Long scoring runs can be killed.
**Why it happens:** Scoring 500 contracts at even 10/sec takes 50 seconds minimum.
**How to avoid:** (a) Score in smaller sessions (e.g., first 100 contracts visible on screen). (b) Use chunked scoring: client requests scoring for page N, scores accumulate across page loads. (c) For the hackathon demo, limit to ~50-100 contracts to keep under 30 seconds.
**Warning signs:** SSE connection drops mid-scoring; client receives no "complete" event.

### Pitfall 4: Stale Scores After Prompt Edit
**What goes wrong:** User edits the prompt and clicks "Apply & Score" but only some contracts get re-scored, leaving a mix of old and new scores.
**Why it happens:** Partial re-scoring if the process is interrupted or if scores are not cleared before re-scoring.
**How to avoid:** Always clear all scores for this user's scanner before starting a re-score run. Track scoring version/timestamp on the scanner model.
**Warning signs:** Score distribution looks bimodal; some contracts have old reasoning text.

### Pitfall 5: EventSource Does Not Support POST
**What goes wrong:** Using the browser's native `EventSource` API which only supports GET requests, but the scoring endpoint needs POST data (scanner ID, prompt).
**Why it happens:** EventSource is GET-only by spec.
**How to avoid:** Use `fetch()` with a ReadableStream reader instead of EventSource. Parse SSE format manually (split on `\n\n`, extract `data:` prefix).
**Warning signs:** "Method Not Allowed" errors; inability to send request body.

### Pitfall 6: Map Serialization in Zustand
**What goes wrong:** JavaScript `Map` objects don't serialize to JSON properly for persistence or debugging.
**Why it happens:** `JSON.stringify(new Map())` returns `{}`.
**How to avoid:** Use a plain `Record<string, { score: number; reasoning: string }>` instead of `Map` in the zustand store. This is simpler and works with devtools.
**Warning signs:** Empty scores after page refresh (if persisting); devtools show empty object.

## Code Examples

### VibeScanner MongoDB Model
```typescript
// src/models/vibe-scanner.ts
import mongoose, { Schema, type InferSchemaType } from "mongoose";

const vibeScoreSchema = new Schema({
  contractId: { type: Schema.Types.ObjectId, ref: "Contract", required: true },
  score: { type: Number, min: 0, max: 10, required: true },
  reasoning: { type: String, required: true },
}, { _id: false });

const buyerScoreSchema = new Schema({
  buyerId: { type: Schema.Types.ObjectId, ref: "Buyer", required: true },
  score: { type: Number, min: 0, max: 10, required: true },
  reasoning: { type: String, required: true },
}, { _id: false });

const vibeScannerSchema = new Schema({
  userId: { type: String, required: true, unique: true, index: true }, // Clerk user ID
  companyProfileId: { type: Schema.Types.ObjectId, ref: "CompanyProfile" },
  scoringPrompt: { type: String, required: true },
  isDefault: { type: Boolean, default: true }, // system-generated prompt
  lastScoredAt: { type: Date },
  contractScores: [vibeScoreSchema],
  buyerScores: [buyerScoreSchema],
  threshold: { type: Number, default: 5.0, min: 0, max: 10 },
}, { timestamps: true });

// Compound index for fast score lookups
vibeScannerSchema.index({ userId: 1, "contractScores.contractId": 1 });
vibeScannerSchema.index({ userId: 1, "contractScores.score": -1 });

export type IVibeScanner = InferSchemaType<typeof vibeScannerSchema>;

const VibeScanner =
  mongoose.models.VibeScanner || mongoose.model("VibeScanner", vibeScannerSchema);

export default VibeScanner;
```

### SSE Client-Side Consumer
```typescript
// Consuming SSE from fetch (not EventSource, since we need POST)
async function startScoring(scannerId: string) {
  const response = await fetch('/api/vibe-scanner/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scannerId }),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.type === 'progress') {
          // Update progress bar and individual score
          setProgress(data.scored / data.total);
          setScore(data.contractId, data.score, data.reasoning);
        } else if (data.type === 'complete') {
          setIsScoring(false);
        }
      }
    }
  }
}
```

### Threshold Slider with Score Divider
```typescript
// Threshold slider using shadcn/ui Slider component
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

function ThresholdControls() {
  const { threshold, setThreshold, hideBelow, setHideBelow } = useVibeStore();

  return (
    <div className="space-y-4">
      <div>
        <Label>Minimum Score Threshold: {threshold.toFixed(1)}</Label>
        <Slider
          value={[threshold]}
          onValueChange={([v]) => setThreshold(v)}
          min={1}
          max={10}
          step={0.1}
          className="mt-2"
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={hideBelow} onCheckedChange={setHideBelow} />
        <Label>{hideBelow ? "Hide below threshold" : "Dim below threshold"}</Label>
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `output_format` with beta header | `output_config.format.type: "json_schema"` | Nov 2025 (GA) | Already in use in codebase profile generation -- no beta header needed |
| No prompt caching | Prompt caching with `cache_control: { type: "ephemeral" }` | GA mid-2025 | 90% cost reduction on cached reads; no beta header needed |
| Anthropic Batch API for large jobs | Sequential + prompt caching for real-time UX | Current best practice | Batch API is for offline jobs; sequential with caching gives real-time progress |
| WebSocket for real-time updates | SSE via ReadableStream in Route Handlers | Next.js App Router convention | Simpler, unidirectional, no connection upgrade needed |

**Deprecated/outdated:**
- `client.beta.promptCaching.messages.create()` -- prompt caching is now GA, use `client.messages.create()` directly
- `anthropic-beta: prompt-caching-2024-07-31` header -- no longer needed
- `anthropic-beta: structured-outputs-2025-11-13` header -- structured output is GA, use `output_config` directly

## Open Questions

1. **Score storage: embedded array vs. separate collection?**
   - What we know: Embedding scores as an array on the VibeScanner document is simpler, but with 500 contracts, the document grows to ~100KB per user
   - What's unclear: Will MongoDB 16MB document limit or performance degrade with 500+ embedded scores?
   - Recommendation: Start with embedded array (simpler, single read). If performance degrades, migrate to a separate `VibeScore` collection. For the hackathon with 200-500 contracts, embedded is fine.

2. **Cloudflare execution time limits**
   - What we know: Cloudflare Pages functions have a 30-second timeout. Workers have configurable limits.
   - What's unclear: Whether the scoring SSE endpoint will be deployed to Cloudflare Pages (30s limit) or can be a Worker (configurable)
   - Recommendation: For hackathon, run on `next dev` or Vercel preview. Limit scoring to visible contracts (paginated, ~50 at a time). Long-term: use Cloudflare Workers with Durable Objects or queue.

3. **Handling contract description length**
   - What we know: Some contracts have very long descriptions (5000+ chars). Sending full text wastes tokens.
   - What's unclear: Optimal truncation length for scoring accuracy
   - Recommendation: Truncate contract descriptions to 2000 characters for scoring. Title + buyer + sector + region are more important than full description text.

4. **Buyer organization scoring (VIBE-11)**
   - What we know: Buyers have fewer fields than contracts (name, sector, region, description, contractCount)
   - What's unclear: Whether buyer scoring should happen in the same SSE stream or as a separate pass
   - Recommendation: Score buyers in a second pass after contracts complete. Same SSE stream, different event type. Buyers are fewer (~75 seeded) so it's fast.

## Cost Estimation

### Per scoring run (200 contracts)
With prompt caching:
- System prompt (scoring rubric): ~800 tokens cached, costs $0.10/MTok (cache read) = negligible
- Per contract input: ~200 tokens (title + buyer + description excerpt + metadata)
- Per contract output: ~100 tokens (score + reasoning)
- Total input: 200 * 200 = 40,000 tokens = $0.04 at $1/MTok
- Total output: 200 * 100 = 20,000 tokens = $0.10 at $5/MTok
- **Total per scoring run: ~$0.14**

Without prompt caching:
- Per contract input: 200 + 800 (rubric) = 1,000 tokens
- Total input: 200 * 1,000 = 200,000 tokens = $0.20
- Total output: same $0.10
- **Total per scoring run: ~$0.30**

### Hackathon budget impact
At ~$0.14/run, 50 demo scoring runs = ~$7.00. Well within Tier 1 $100 monthly limit.

## Sources

### Primary (HIGH confidence)
- Context7 `/anthropics/anthropic-sdk-typescript` -- Message Batches API, streaming, structured output
- Context7 `/vercel/next.js/v16.1.5` -- Route Handler SSE streaming with ReadableStream
- Context7 `/automattic/mongoose/9.0.1` -- bulkWrite operations
- [Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing) -- Claude Haiku 4.5: $1/MTok input, $5/MTok output, 50% batch discount
- [Anthropic Rate Limits](https://platform.claude.com/docs/en/api/rate-limits) -- Tier 1: 50 RPM, 50K ITPM, 10K OTPM for Haiku 4.5
- [Anthropic Prompt Caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) -- 5-min TTL, cache_control ephemeral, min 4096 tokens for Haiku 4.5

### Secondary (MEDIUM confidence)
- [shadcn/ui Slider](https://ui.shadcn.com/docs/components/radix/slider) -- Radix-based slider with step prop, verified via web search
- [Next.js SSE patterns](https://www.pedroalonso.net/blog/sse-nextjs-real-time-notifications/) -- SSE best practices, verified against Next.js docs

### Tertiary (LOW confidence)
- Cloudflare execution time limits -- needs verification against specific deployment config (Pages vs Workers)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All core libraries already in use; Anthropic SDK features verified via Context7 and official docs
- Architecture: HIGH - SSE streaming pattern verified in Next.js 16 docs; prompt caching verified in Anthropic docs; existing codebase patterns (profile generation) establish the pattern
- Pitfalls: HIGH - Rate limits and pricing verified from official Anthropic docs; Cloudflare limits are MEDIUM (deployment-dependent)
- Cost estimation: HIGH - Based on official pricing page, verified Feb 2026

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days -- stable domain, pricing may change)
