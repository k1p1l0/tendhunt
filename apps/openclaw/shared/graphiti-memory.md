# User-Scoped Memory (Graphiti)

Sculptor uses a temporal knowledge graph powered by Graphiti for persistent memory across conversations.

## How It Works

- **Graphiti** stores facts as a knowledge graph with temporal validity
- **Memory is user-scoped**: each user gets their own Graphiti group (`user_{SLACK_USER_ID}`)
- User A's preferences and history are invisible to User B
- Facts auto-expire when superseded by newer information
- Memory persists across Slack sessions, restarts, and context resets
- Shared/global knowledge uses the `tendhunt` group

## Memory Groups

| Group Pattern | Purpose | Example |
|---------------|---------|---------|
| `user_{SLACK_USER_ID}` | Per-user preferences, history, context | `user_U05ABC123` |
| `tendhunt` | Shared knowledge, global trends | Procurement market insights |

The shell scripts automatically use `user_{SLACK_USER_ID}` when `SLACK_USER_ID` is set.

## When to Search Memory

**Before every response**, search for relevant user context:

```bash
# Search user's personal memory (auto-scoped via SLACK_USER_ID)
shared/bin/graphiti-search.sh "user preferences sectors regions"

# Full context for a task (auto-scoped)
shared/bin/graphiti-context.sh "find NHS contracts in London"

# Search for specific topic in user's memory
shared/bin/graphiti-search.sh "NHS digital transformation"

# Search shared/global knowledge explicitly
shared/bin/graphiti-search.sh "UK procurement trends" "tendhunt"
```

**Always search when:**
- A user sends their first message in a conversation
- User asks about their preferences or past interactions
- You need to personalize a response based on history

## When to Write to Memory

Log **significant facts** the user reveals:

```bash
# Log a user preference (auto-scoped to user's group)
shared/bin/graphiti-log.sh user "SlackUser" "User interested in NHS and Education contracts in London, targeting £500K+"

# Log something you discovered for the user (auto-scoped)
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
5. **Never cross user boundaries** — only search/write to the current user's group unless explicitly accessing shared knowledge
