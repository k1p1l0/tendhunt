import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "./system-prompt";

import type { AgentPageContext } from "./system-prompt";
import type { ConversationSettings } from "@/stores/agent-store";

const BASE_CONTEXT: AgentPageContext = { page: "dashboard" };

const COMPANY_PROFILE = {
  companyName: "Acme Ltd",
  sectors: ["IT"],
  capabilities: ["Cloud"],
  regions: ["London"],
};

describe("responseDetail setting", () => {
  it("concise → contains 'Extremely concise'", () => {
    const settings: ConversationSettings = {
      responseDetail: "concise",
      askClarifyingQuestions: true,
      contextScope: "table_and_business",
    };
    const prompt = buildSystemPrompt(BASE_CONTEXT, null, settings);
    expect(prompt).toContain("Extremely concise");
  });

  it("detailed → contains 'Thorough analysis'", () => {
    const settings: ConversationSettings = {
      responseDetail: "detailed",
      askClarifyingQuestions: true,
      contextScope: "table_and_business",
    };
    const prompt = buildSystemPrompt(BASE_CONTEXT, null, settings);
    expect(prompt).toContain("Thorough analysis");
  });

  it("normal (default) → contains 'Short by default'", () => {
    const settings: ConversationSettings = {
      responseDetail: "normal",
      askClarifyingQuestions: true,
      contextScope: "table_and_business",
    };
    const prompt = buildSystemPrompt(BASE_CONTEXT, null, settings);
    expect(prompt).toContain("Short by default");
  });

  it("no settings → falls back to 'Short by default'", () => {
    const prompt = buildSystemPrompt(BASE_CONTEXT);
    expect(prompt).toContain("Short by default");
  });
});

describe("askClarifyingQuestions setting", () => {
  it("off → contains 'Never ask clarifying questions'", () => {
    const settings: ConversationSettings = {
      responseDetail: "normal",
      askClarifyingQuestions: false,
      contextScope: "table_and_business",
    };
    const prompt = buildSystemPrompt(BASE_CONTEXT, null, settings);
    expect(prompt).toContain("Never ask clarifying questions");
  });

  it("on → contains [[option: syntax instruction", () => {
    const settings: ConversationSettings = {
      responseDetail: "normal",
      askClarifyingQuestions: true,
      contextScope: "table_and_business",
    };
    const prompt = buildSystemPrompt(BASE_CONTEXT, null, settings);
    expect(prompt).toContain("[[option:");
  });
});

describe("contextScope setting", () => {
  it("table_only → does NOT include company profile section", () => {
    const settings: ConversationSettings = {
      responseDetail: "normal",
      askClarifyingQuestions: true,
      contextScope: "table_only",
    };
    const prompt = buildSystemPrompt(BASE_CONTEXT, COMPANY_PROFILE, settings);
    expect(prompt).not.toContain("User's Company Profile");
    expect(prompt).not.toContain("Acme Ltd");
  });

  it("table_and_business → includes company profile when provided", () => {
    const settings: ConversationSettings = {
      responseDetail: "normal",
      askClarifyingQuestions: true,
      contextScope: "table_and_business",
    };
    const prompt = buildSystemPrompt(BASE_CONTEXT, COMPANY_PROFILE, settings);
    expect(prompt).toContain("User's Company Profile");
    expect(prompt).toContain("Acme Ltd");
  });

  it("table_and_business without profile → no profile section", () => {
    const settings: ConversationSettings = {
      responseDetail: "normal",
      askClarifyingQuestions: true,
      contextScope: "table_and_business",
    };
    const prompt = buildSystemPrompt(BASE_CONTEXT, null, settings);
    expect(prompt).not.toContain("User's Company Profile");
  });
});

describe("page context", () => {
  it("includes scanner context fields", () => {
    const ctx: AgentPageContext = {
      page: "scanner",
      scannerName: "NHS IT Contracts",
      scannerType: "rfps",
      scannerQuery: "digital transformation",
    };
    const prompt = buildSystemPrompt(ctx);
    expect(prompt).toContain("NHS IT Contracts");
    expect(prompt).toContain("digital transformation");
  });

  it("includes buyer detail context fields", () => {
    const ctx: AgentPageContext = {
      page: "buyer_detail",
      buyerName: "London Borough of Hackney",
      buyerSector: "Local Government",
      buyerRegion: "London",
    };
    const prompt = buildSystemPrompt(ctx);
    expect(prompt).toContain("London Borough of Hackney");
    expect(prompt).toContain("Local Government");
  });
});
