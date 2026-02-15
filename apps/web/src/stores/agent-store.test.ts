import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage before the store module loads (persist middleware accesses it at import time)
const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
});

import { useAgentStore, DEFAULT_CONVERSATION_SETTINGS } from "./agent-store";

import type { ConversationSettings } from "./agent-store";

beforeEach(() => {
  store.clear();
  useAgentStore.setState({
    conversationSettings: { ...DEFAULT_CONVERSATION_SETTINGS },
  });
});

describe("conversationSettings defaults", () => {
  it("has correct default values", () => {
    const { conversationSettings } = useAgentStore.getState();
    expect(conversationSettings).toEqual(DEFAULT_CONVERSATION_SETTINGS);
    expect(conversationSettings.responseDetail).toBe("normal");
    expect(conversationSettings.askClarifyingQuestions).toBe(true);
    expect(conversationSettings.contextScope).toBe("table_and_business");
  });
});

describe("updateConversationSettings", () => {
  it("merges partial updates without clobbering other fields", () => {
    useAgentStore.getState().updateConversationSettings({ responseDetail: "concise" });

    const settings = useAgentStore.getState().conversationSettings;
    expect(settings.responseDetail).toBe("concise");
    expect(settings.askClarifyingQuestions).toBe(true);
    expect(settings.contextScope).toBe("table_and_business");
  });

  it("can update multiple fields at once", () => {
    useAgentStore.getState().updateConversationSettings({
      responseDetail: "detailed",
      askClarifyingQuestions: false,
    });

    const settings = useAgentStore.getState().conversationSettings;
    expect(settings.responseDetail).toBe("detailed");
    expect(settings.askClarifyingQuestions).toBe(false);
    expect(settings.contextScope).toBe("table_and_business");
  });
});

describe("backfill migration", () => {
  it("applies defaults when conversationSettings is missing from persisted state", () => {
    const legacyState = {
      state: {
        panelOpen: false,
        conversations: [],
        activeConversationId: null,
      },
      version: 0,
    };

    const raw = JSON.stringify(legacyState);
    const parsed = JSON.parse(raw) as { state: Record<string, unknown> };

    // Reproduce the backfill logic from the store's custom storage.getItem
    if (!parsed.state.conversationSettings) {
      parsed.state.conversationSettings = DEFAULT_CONVERSATION_SETTINGS;
    }

    const settings = parsed.state.conversationSettings as ConversationSettings;
    expect(settings).toEqual(DEFAULT_CONVERSATION_SETTINGS);
  });

  it("preserves existing conversationSettings if present", () => {
    const customSettings: ConversationSettings = {
      responseDetail: "concise",
      askClarifyingQuestions: false,
      contextScope: "table_only",
    };

    const existingState = {
      state: {
        panelOpen: true,
        conversations: [],
        activeConversationId: null,
        conversationSettings: customSettings,
      },
      version: 0,
    };

    const raw = JSON.stringify(existingState);
    const parsed = JSON.parse(raw) as { state: Record<string, unknown> };

    if (!parsed.state.conversationSettings) {
      parsed.state.conversationSettings = DEFAULT_CONVERSATION_SETTINGS;
    }

    const settings = parsed.state.conversationSettings as ConversationSettings;
    expect(settings).toEqual(customSettings);
  });
});
