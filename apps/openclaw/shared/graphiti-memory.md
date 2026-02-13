# Shared Memory (Graphiti)

Sculptor uses a temporal knowledge graph powered by Graphiti for persistent memory across conversations.

## How It Works

- **Graphiti** stores facts as a knowledge graph with temporal validity
- All facts are stored in the `tendhunt` group
- Facts auto-expire when superseded by newer information
- Memory persists across Slack sessions, restarts, and context resets

## When to Search Memory

**Before every response**, search for relevant user context:

```bash
# Search for user-specific facts
shared/bin/graphiti-search.sh "user preferences sectors regions"

# Full context for a task
shared/bin/graphiti-context.sh "find NHS contracts in London"

# Search for specific topic
shared/bin/graphiti-search.sh "NHS digital transformation"
```

**Always search when:**
- A user sends their first message in a conversation
- User asks about their preferences or past interactions
- You need to personalize a response based on history

## When to Write to Memory

Log **significant facts** the user reveals:

```bash
# Log a user preference
shared/bin/graphiti-log.sh user "SlackUser" "User interested in NHS and Education contracts in London, targeting £500K+"

# Log something you discovered for the user
shared/bin/graphiti-log.sh assistant "Sculptor" "Found 14 NHS trusts in London with active IT contracts"
```

**Write when:**
- User states sector/region/value preferences
- User mentions specific organizations they track
- User reveals company context or procurement strategy
- You complete a significant research task with notable results

**Don't write:**
- Every query (too noisy)
- Raw API results (summarize instead)
- Temporary state

## Rules

1. **Search BEFORE every response** — check if you know this user
2. **Save preferences immediately** — when a user says "I'm interested in X", log it
3. **Be concise** — log facts, not full conversations
4. **React with :brain:** when saving to memory so the user knows
