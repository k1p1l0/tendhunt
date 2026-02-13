interface Fact {
  fact: string;
  name?: string;
  content?: string;
  valid_at?: string;
}

interface SearchResponse {
  facts?: Fact[];
  results?: Fact[];
}

function getGraphitiUrl(): string | null {
  return process.env.GRAPHITI_URL || null;
}

function userGroupId(userId: string): string {
  return `user_${userId}`;
}

export async function searchMemory(
  userId: string,
  query: string,
  maxFacts = 10
): Promise<Fact[]> {
  const graphitiUrl = getGraphitiUrl();
  if (!graphitiUrl) return [];

  try {
    const response = await fetch(`${graphitiUrl}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        group_ids: [userGroupId(userId)],
        max_facts: maxFacts,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return [];

    const data = (await response.json()) as SearchResponse | Fact[];

    if (Array.isArray(data)) return data;
    return data.facts ?? data.results ?? [];
  } catch {
    return [];
  }
}

export async function saveMemory(
  userId: string,
  role: string,
  content: string
): Promise<void> {
  const graphitiUrl = getGraphitiUrl();
  if (!graphitiUrl) return;

  try {
    await fetch(`${graphitiUrl}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        group_id: userGroupId(userId),
        messages: [
          {
            role_type: role === "user" ? "user" : "assistant",
            role,
            content,
            timestamp: new Date().toISOString(),
            source_description: "TendHunt web agent chat",
            name: role,
          },
        ],
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    // Fire and forget — don't block the response
  }
}

export async function getContext(
  userId: string,
  taskDescription: string
): Promise<string> {
  const [userFacts, topicFacts] = await Promise.all([
    searchMemory(userId, "user preferences interests sectors regions", 10),
    searchMemory(userId, taskDescription, 5),
  ]);

  const sections: string[] = [];

  if (userFacts.length > 0) {
    sections.push("### User Preferences & History");
    for (const f of userFacts) {
      const text = f.fact || f.name || f.content || "";
      if (text) {
        const suffix = f.valid_at ? ` (as of ${f.valid_at})` : "";
        sections.push(`- ${text}${suffix}`);
      }
    }
  }

  if (topicFacts.length > 0) {
    sections.push("### Related Knowledge");
    for (const f of topicFacts) {
      const text = f.fact || f.name || f.content || "";
      if (text) {
        sections.push(`- ${text}`);
      }
    }
  }

  if (sections.length === 0) return "";

  return `## User Memory\n\n${sections.join("\n")}`;
}
