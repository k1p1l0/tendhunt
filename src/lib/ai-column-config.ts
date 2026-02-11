/**
 * Central configuration for AI column use cases, models, and prompt templates.
 *
 * Imported by UI components, API routes, and the scoring engine.
 * Single source of truth — avoids duplicating enums/templates across files.
 */

// ---------------------------------------------------------------------------
// Use Cases
// ---------------------------------------------------------------------------

export const AI_USE_CASES = [
  { value: "score", label: "Score / Evaluate" },
  { value: "research", label: "Web Research" },
  { value: "decision-makers", label: "Find Decision Makers" },
  { value: "bid-recommendation", label: "Bid Recommendation" },
  { value: "find-contacts", label: "Find Contacts" },
] as const;

export type AIUseCase = (typeof AI_USE_CASES)[number]["value"];

export const VALID_USE_CASES = new Set<string>(
  AI_USE_CASES.map((u) => u.value)
);

/** Use cases that produce free-text analysis (no numeric score). */
const TEXT_USE_CASES = new Set<string>([
  "research",
  "decision-makers",
  "bid-recommendation",
  "find-contacts",
]);

/** Returns true if the use case produces text output (no numeric score). */
export function isTextUseCase(useCase?: string): boolean {
  return !!useCase && TEXT_USE_CASES.has(useCase);
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

export const AI_MODELS = [
  {
    value: "haiku",
    label: "Haiku",
    description: "Fast & affordable",
    modelId: "claude-haiku-4-5-20251001",
    maxTokens: 1024,
  },
  {
    value: "sonnet",
    label: "Sonnet",
    description: "Balanced quality & speed",
    modelId: "claude-sonnet-4-5-20250929",
    maxTokens: 1024,
  },
  {
    value: "opus",
    label: "Opus",
    description: "Highest quality",
    modelId: "claude-opus-4-6",
    maxTokens: 1024,
  },
] as const;

export type AIModel = (typeof AI_MODELS)[number]["value"];

export const VALID_MODELS = new Set<string>(AI_MODELS.map((m) => m.value));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function resolveModelId(model: AIModel): string {
  const found = AI_MODELS.find((m) => m.value === model);
  return found ? found.modelId : AI_MODELS[0].modelId;
}

export function resolveMaxTokens(model: AIModel): number {
  const found = AI_MODELS.find((m) => m.value === model);
  return found ? found.maxTokens : AI_MODELS[0].maxTokens;
}

// ---------------------------------------------------------------------------
// Prompt Templates (UK procurement / B2B context)
// ---------------------------------------------------------------------------

export const PROMPT_TEMPLATES: Record<AIUseCase, string> = {
  score: `Score this entity from 1-10 based on how well it aligns with our company profile.

Consider:
- Sector relevance and overlap with our capabilities
- Geographic proximity and regional fit
- Contract value relative to our typical project size
- Required certifications and accreditations we hold
- Strategic fit with our current pipeline and growth objectives

Provide a numeric score and concise explanation of key alignment factors.`,

  research: `Research this entity and provide a brief intelligence summary.

Focus on:
- Recent news, announcements, or press releases
- Known spending patterns and procurement history
- Upcoming projects or framework renewals
- Key strategic priorities and transformation initiatives
- Financial health indicators and budget signals

Summarise the most actionable insights for business development.`,

  "decision-makers": `Identify the likely procurement decision-makers for this entity.

Provide:
- Typical job titles involved in procurement decisions (e.g., Head of Procurement, Commercial Director)
- The governance structure (single authority vs. committee)
- Likely approval thresholds and escalation paths
- Recommended roles to engage at each stage of the bid cycle

Focus on UK public sector / B2B procurement conventions.`,

  "bid-recommendation": `Provide a bid / no-bid recommendation for this opportunity.

Analyse:
- Strategic fit with our capabilities and growth areas
- Win probability based on sector experience and track record
- Resource requirements vs. current capacity
- Competitive landscape and incumbent advantage
- Risk factors (timeline, scope, payment terms)

Give a clear Bid or No-Bid recommendation with supporting rationale.`,

  "find-contacts": `Suggest how to find and engage contacts for this entity.

Include:
- Recommended contact roles to target (procurement, technical, executive)
- Likely channels to find contacts (LinkedIn, organisation website, industry events)
- Suggested engagement approach and messaging angle
- Relevant industry networks or frameworks they may participate in
- Timing considerations based on procurement cycles

Provide practical, actionable guidance for initial outreach.`,
};
