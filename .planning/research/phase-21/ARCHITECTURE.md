# OpenClaw Slack Integration — Architecture

**Research Date:** 2026-02-13
**Milestone Type:** Subsequent (adding to existing Next.js 16 + MongoDB Atlas app)
**Phase:** 21 — Slack Integration via OpenClaw

---

## Executive Summary

This architecture enables TendHunt users to query procurement data from Slack using natural language. The integration uses **OpenClaw** as a bridge between Slack and TendHunt's REST API. OpenClaw runs as a Node.js daemon on a Hetzner VPS (alongside Ghost), connects to Slack via Socket Mode, and calls TendHunt's public API endpoints (protected by user-scoped API keys) using bash + curl skills defined in SKILL.md files.

**Key Architectural Decision:** The integration is **agent-first** — OpenClaw's AI agent interprets Slack messages, determines which TendHunt API to call, formats the curl request, parses the JSON response, and replies in Slack. No custom backend logic is written; skills teach the agent how to use the API through natural language instructions.

---

## Component Boundaries

### 1. TendHunt Web App (Next.js 16 on Cloudflare Pages)

**Location:** `apps/web/`
**Deployment:** Cloudflare Pages (app.tendhunt.com)
**Responsibilities:**
- Exposes public REST API endpoints at `/api/public/*`
- Validates API key from `Authorization: Bearer <key>` header
- Scopes all queries to the authenticated user (using API key → userId mapping)
- Returns JSON responses wrapping existing tool handlers
- Manages API key CRUD operations via authenticated UI routes

**New Components:**
- **API Key Model** (`apps/web/src/models/api-key.ts`) — MongoDB schema
  - `key: string` (hashed with bcrypt, indexed unique)
  - `userId: string` (links to Clerk user)
  - `name: string` (user-provided label, e.g. "Slack Bot Key")
  - `lastUsedAt: Date`
  - `createdAt: Date`
  - `revokedAt?: Date`
- **API Key Middleware** (`apps/web/src/middleware/api-key-auth.ts`) — Bearer token validation
  - Extracts token from `Authorization` header
  - Hashes and looks up in MongoDB
  - Sets `userId` in request context
  - Returns 401/403 on invalid/revoked key
  - Logs usage timestamp (debounced to 1 update/minute)
- **Public API Routes** (`apps/web/src/app/api/public/*/route.ts`) — 7 endpoints
  - `POST /api/public/buyers/query` → wraps `handleQueryBuyers`
  - `GET /api/public/buyers/:id` → wraps `handleGetBuyerDetail`
  - `POST /api/public/contracts/query` → wraps `handleQueryContracts`
  - `GET /api/public/contracts/:id` → wraps `handleGetContractDetail`
  - `POST /api/public/signals/query` → wraps `handleQuerySignals`
  - `POST /api/public/personnel/query` → wraps `handleQueryKeyPersonnel`
  - `POST /api/public/spend/query` → wraps `handleQuerySpendData`
  - `POST /api/public/board-docs/query` → wraps `handleQueryBoardDocuments`
- **API Key Management UI** (`apps/web/src/app/(dashboard)/settings/api-keys/page.tsx`)
  - List all keys for current user (shows name, created, last used, truncated key preview)
  - "Create Key" button → generates random key (via `nanoid(32)`), hashes with bcrypt, shows plaintext ONCE in modal (copy to clipboard), saves to MongoDB
  - "Revoke Key" button → sets `revokedAt` timestamp
  - "Add to Slack" OAuth button (Phase 21 Part 2)

**Security Constraints:**
- API key raw value is shown ONLY on creation (stored hashed in DB)
- Middleware enforces rate limiting: 100 requests/minute per key (using in-memory sliding window or Cloudflare KV)
- All tool handler data is scoped to `userId` extracted from API key (no cross-user data leaks)
- API keys are stored as environment variable secrets in Cloudflare Pages settings (for OpenClaw skill template)

**Reused Code:**
- All 14 tool handlers in `apps/web/src/lib/agent/tool-handlers.ts` are reused — public API routes are thin wrappers that:
  1. Extract `userId` from middleware-validated API key
  2. Parse request body
  3. Call existing handler function
  4. Return JSON response

---

### 2. OpenClaw Gateway (Node.js 22+ daemon on Hetzner VPS)

**Location:** Hetzner VPS (same server as Ghost blog, `tendhunt.com`)
**Deployment:** systemd service (`/etc/systemd/system/openclaw.service`)
**Port:** WebSocket gateway on `ws://127.0.0.1:18789` (default, not publicly exposed)
**Responsibilities:**
- Maintains persistent WebSocket connection to Slack (Socket Mode)
- Receives Slack messages via WebSocket events
- Dispatches messages to AI agent runtime (Claude Sonnet 4.5 via Anthropic API)
- Agent reads skills from `~/.openclaw/workspace/skills/tendhunt/SKILL.md`
- Agent executes bash commands (curl to TendHunt API) as instructed by SKILL.md
- Parses JSON responses and formats human-readable Slack replies
- Posts replies back to Slack channel via WebSocket

**State Management:**
- Configuration: `~/.openclaw/openclaw.json` (Anthropic API key, Slack tokens, allowed bash commands)
- Skills directory: `~/.openclaw/workspace/skills/` (contains `tendhunt/SKILL.md`)
- Logs: systemd journal (`journalctl -u openclaw -f`)

**Security Configuration:**
- Sandbox allowlist: `bash, process, read, write, edit, sessions_*` (default)
- TendHunt API key stored in `~/.openclaw/openclaw.json` as environment variable (loaded via skill YAML frontmatter)
- No network access restrictions (curl allowed for external API calls)

**Systemd Service Definition:**
```ini
[Unit]
Description=OpenClaw AI Assistant Gateway
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=openclaw
WorkingDirectory=/home/openclaw
ExecStart=/usr/bin/node /home/openclaw/.openclaw/bin/gateway.js
Restart=always
RestartSec=10
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
```

**Installation Commands:**
```bash
# On Hetzner VPS (Ubuntu/Debian)
curl -fsSL https://openclaw.ai/install.sh | bash
npx openclaw --install-daemon
npx openclaw config set anthropic.apiKey sk-ant-...
```

---

### 3. Slack Workspace (Socket Mode)

**Integration Type:** Slack App with Socket Mode enabled
**Required Scopes:**
- `chat:write` — Post messages to channels
- `channels:history` — Read channel messages
- `app_mentions:read` — Receive @mentions
- `im:history` — Read direct messages
- `im:write` — Send direct messages

**Token Types:**
1. **App-Level Token** (`xapp-...`) — Authenticates WebSocket connection
   - Scope: `connections:write`
   - Set in OpenClaw config: `npx openclaw config set slack.appToken xapp-...`
2. **Bot Token** (`xoxb-...`) — Authenticates API calls (send messages, read history)
   - Scopes: listed above
   - Set in OpenClaw config: `npx openclaw config set slack.botToken xoxb-...`

**Connection Flow:**
1. OpenClaw gateway calls Slack API `apps.connections.open` with app token
2. Slack returns WebSocket URL (`wss://wss-primary.slack.com/link/?ticket=...`)
3. OpenClaw opens WebSocket connection (keeps alive with ping/pong)
4. Slack sends events over WebSocket: `message`, `app_mention`, `slash_command`
5. OpenClaw processes events → sends to agent → replies via WebSocket

**Socket Mode Benefits:**
- No public HTTPS endpoint needed (OpenClaw can run on localhost behind firewall)
- No webhook signature verification (tokens authenticate WebSocket)
- Ideal for single-workspace bot on VPS

**OAuth Flow (Phase 21 Part 2):**
- User clicks "Add to Slack" button in TendHunt settings
- Redirects to `https://slack.com/oauth/v2/authorize?client_id=...&scope=...&redirect_uri=https://app.tendhunt.com/api/slack/oauth/callback`
- User authorizes workspace
- Slack redirects to callback with code
- TendHunt exchanges code for `bot_token` via `oauth.v2.access`
- TendHunt stores `{ workspaceId, botToken, userId }` in MongoDB `SlackInstallation` collection
- TendHunt injects bot token into OpenClaw config (or uses multi-workspace routing)

**Deployment Note:** For Phase 21 Part 1 (hackathon MVP), we skip OAuth and hardcode a single workspace token in OpenClaw config. Phase 21 Part 2 adds multi-workspace support.

---

### 4. TendHunt Skill (SKILL.md)

**Location:** `~/.openclaw/workspace/skills/tendhunt/SKILL.md` (on Hetzner VPS)
**Format:** Markdown with YAML frontmatter + natural language instructions
**Responsibilities:**
- Teaches the AI agent how to use TendHunt API endpoints
- Lists required environment variables (API key)
- Provides curl examples for each endpoint
- Explains expected parameters and response structure
- Guides the agent on parsing JSON and formatting Slack replies

**Example Structure:**

```markdown
---
name: tendhunt
description: Query UK procurement data from TendHunt
version: 1.0.0
env:
  TENDHUNT_API_KEY: "Your TendHunt API key from app.tendhunt.com/settings/api-keys"
binaries:
  - curl
  - jq
---

# TendHunt Procurement Intelligence

You can query buyers, contracts, signals, personnel, spending, and board documents from TendHunt's database.

## Authentication

All requests require an API key in the Authorization header:

```bash
curl -H "Authorization: Bearer $TENDHUNT_API_KEY" \
     https://app.tendhunt.com/api/public/buyers/query
```

## Search Buyers

Find buyer organizations by keyword, sector, region, or type.

**Endpoint:** `POST /api/public/buyers/query`

**Parameters:**
- `query` (string, optional) — Keyword search (buyer name)
- `sector` (string, optional) — E.g. "Education", "Health", "Construction"
- `region` (string, optional) — E.g. "London", "South East"
- `orgType` (string, optional) — E.g. "Local Authority", "NHS Trust"
- `minEnrichmentScore` (number, optional) — 0-100, filters by data quality
- `limit` (number, optional) — Max 20, default 10

**Example:**

```bash
curl -X POST -H "Content-Type: application/json" \
     -H "Authorization: Bearer $TENDHUNT_API_KEY" \
     -d '{"query":"Manchester","sector":"Education","limit":5}' \
     https://app.tendhunt.com/api/public/buyers/query | jq .
```

**Response:**

```json
{
  "summary": "Found 12 buyers matching criteria (showing 5)",
  "data": [
    {
      "_id": "65f8a...",
      "name": "Manchester City Council",
      "sector": "Education",
      "region": "North West",
      "orgType": "Local Authority",
      "enrichmentScore": 85,
      "contractCount": 142
    }
  ]
}
```

When a user asks "show me education buyers in Manchester", you should:
1. Call this endpoint with appropriate filters
2. Parse the JSON response
3. Format a concise Slack message with the top results
4. Include a link to view more: `https://app.tendhunt.com/buyers?q=Manchester&sector=Education`

## Search Contracts

[Similar pattern for contracts endpoint...]

## Get Buyer Details

[Similar pattern for buyer detail endpoint...]

[Continue for all 8 endpoints...]

## Tips

- Always include the API key in the Authorization header
- Parse responses with `jq` to extract relevant fields
- Keep Slack replies concise (3-5 results max, offer "show more" link)
- If a query returns 0 results, suggest broadening filters
- Link to the web UI for detailed views: `https://app.tendhunt.com/buyers/:id`
```

**Skill Loading:**
- On agent startup, OpenClaw reads all SKILL.md files in `~/.openclaw/workspace/skills/`
- Skills are injected into the system prompt as tool definitions
- The agent decides which skill to use based on user message
- Changes to SKILL.md take effect on next agent turn (no restart needed)

---

## Data Flow Diagram

### Full Request Flow: Slack Message → TendHunt API → Slack Reply

```
┌─────────────────────────────────────────────────────────────────────┐
│ USER TYPES IN SLACK                                                 │
│ "Show me education contracts in London worth over £100k"            │
└───────────────┬─────────────────────────────────────────────────────┘
                │
                ├─ 1. Slack sends event via WebSocket (Socket Mode)
                ├─ { type: "message", text: "...", channel: "C123..." }
                │
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ OPENCLAW GATEWAY (Hetzner VPS)                                      │
│ ws://127.0.0.1:18789                                                │
├─────────────────────────────────────────────────────────────────────┤
│ 2. Gateway receives WebSocket event from Slack                      │
│ 3. Extracts message text and user context                           │
│ 4. Dispatches to Agent Runtime                                      │
└───────────────┬─────────────────────────────────────────────────────┘
                │
                ├─ 5. Agent reads SKILL.md for tendhunt skill
                ├─ System prompt includes skill instructions + curl examples
                │
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ CLAUDE SONNET 4.5 (Anthropic API)                                   │
├─────────────────────────────────────────────────────────────────────┤
│ 6. Agent analyzes message and decides to use tendhunt skill         │
│ 7. Agent determines endpoint: POST /api/public/contracts/query      │
│ 8. Agent constructs curl command:                                   │
│    curl -X POST -H "Authorization: Bearer $TENDHUNT_API_KEY" \      │
│         -H "Content-Type: application/json" \                       │
│         -d '{"sector":"Education","region":"London","minValue":100000}' \  │
│         https://app.tendhunt.com/api/public/contracts/query         │
│ 9. Agent returns bash tool call to OpenClaw                         │
└───────────────┬─────────────────────────────────────────────────────┘
                │
                ├─ 10. OpenClaw executes bash command (curl)
                │
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ TENDHUNT WEB APP (Cloudflare Pages)                                 │
│ POST /api/public/contracts/query                                    │
├─────────────────────────────────────────────────────────────────────┤
│ 11. Request hits API route                                          │
│ 12. Middleware extracts Authorization header                        │
│ 13. Middleware hashes API key and looks up in MongoDB               │
│ 14. Middleware finds userId = "user_abc123"                         │
│ 15. Middleware injects userId into request context                  │
│ 16. Route handler parses JSON body                                  │
│ 17. Route calls executeToolHandler("query_contracts", {...}, userId)│
│ 18. Tool handler queries MongoDB with user scope + filters          │
│ 19. Returns JSON response:                                          │
│     {                                                                │
│       "summary": "Found 23 contracts (showing 10)",                 │
│       "data": [ {contract object}, ... ]                            │
│     }                                                                │
└───────────────┬─────────────────────────────────────────────────────┘
                │
                ├─ 20. Response flows back to OpenClaw via curl stdout
                │
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ OPENCLAW GATEWAY (Hetzner VPS)                                      │
├─────────────────────────────────────────────────────────────────────┤
│ 21. curl command completes, stdout = JSON response                  │
│ 22. Agent receives bash tool result                                 │
│ 23. Agent parses JSON with jq (or via AI reasoning)                 │
│ 24. Agent formats human-readable Slack message:                     │
│     "I found 23 education contracts in London over £100k:           │
│      1. Digital Learning Platform - £250k - closes Feb 20           │
│      2. School Building Maintenance - £180k - closes Mar 5          │
│      3. IT Infrastructure Upgrade - £150k - closes Mar 12           │
│      View all: https://app.tendhunt.com/contracts?sector=..."       │
│ 25. Agent returns text response to gateway                          │
│ 26. Gateway posts to Slack via WebSocket                            │
└───────────────┬─────────────────────────────────────────────────────┘
                │
                ├─ 27. Slack receives message via WebSocket
                │
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ SLACK CHANNEL                                                        │
│ Bot replies:                                                         │
│ "I found 23 education contracts in London over £100k:               │
│  1. Digital Learning Platform - £250k - closes Feb 20               │
│  2. School Building Maintenance - £180k - closes Mar 5              │
│  3. IT Infrastructure Upgrade - £150k - closes Mar 12               │
│  View all: https://app.tendhunt.com/contracts?sector=..."           │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Observations:**
- **Stateless API:** TendHunt API is RESTful, no session management needed
- **User Scoping:** API key → userId mapping ensures all queries respect user permissions/scanners
- **Agent Autonomy:** OpenClaw agent decides which endpoint to call, constructs curl, parses response
- **No Custom Backend:** No Slack-specific code in TendHunt — just generic public API + existing tool handlers
- **WebSocket Efficiency:** Slack Socket Mode eliminates webhook setup, SSL certs, public endpoints

---

## Build Order & Dependencies

### Phase 21 Part 1: Core Integration (Hackathon MVP)

**Goal:** Single-workspace Slack bot querying TendHunt API

**Sequence:**

1. **MongoDB Schema** (`apps/web/src/models/api-key.ts`)
   - Define `ApiKey` model with hashed key, userId, name, lastUsedAt, createdAt, revokedAt
   - Add index on `key` (unique), `userId` (non-unique)
   - **Dependency:** None (standalone)

2. **API Key Middleware** (`apps/web/src/middleware/api-key-auth.ts`)
   - Extract `Authorization: Bearer <token>` header
   - Hash token with bcrypt and query MongoDB
   - Return 401 if invalid/missing, 403 if revoked
   - Inject `userId` into request context
   - Update `lastUsedAt` timestamp (debounced, max 1 update/minute)
   - Add rate limiting (100 req/min per key) using in-memory sliding window
   - **Dependency:** ApiKey model (step 1)

3. **Public API Routes** (`apps/web/src/app/api/public/*/route.ts`)
   - Create 8 routes (buyers/query, buyers/:id, contracts/query, contracts/:id, signals/query, personnel/query, spend/query, board-docs/query)
   - Each route applies API key middleware, extracts userId, calls existing tool handler, returns JSON
   - **Dependency:** Middleware (step 2), tool handlers (existing)

4. **API Key Management UI** (`apps/web/src/app/(dashboard)/settings/api-keys/page.tsx`)
   - List user's API keys (name, created, last used, truncated key preview)
   - "Create Key" button → generate nanoid(32), hash with bcrypt, save to MongoDB, show plaintext ONCE in modal (copy button)
   - "Revoke Key" button → set revokedAt timestamp
   - **Dependency:** ApiKey model (step 1)

5. **OpenClaw VPS Setup** (Hetzner server)
   - SSH into VPS: `ssh root@<hetzner-ip>`
   - Install OpenClaw: `curl -fsSL https://openclaw.ai/install.sh | bash`
   - Install as systemd service: `npx openclaw --install-daemon`
   - Set Anthropic API key: `npx openclaw config set anthropic.apiKey sk-ant-...`
   - **Dependency:** None (VPS access required)

6. **Slack App Configuration** (Slack API dashboard)
   - Create new Slack app at https://api.slack.com/apps
   - Enable Socket Mode (Settings > Socket Mode)
   - Create App-Level Token with `connections:write` scope (copy `xapp-...`)
   - Add bot scopes: `chat:write`, `channels:history`, `app_mentions:read`, `im:history`, `im:write`
   - Install app to workspace (copy Bot Token `xoxb-...`)
   - **Dependency:** None (Slack account required)

7. **OpenClaw Slack Integration** (VPS config)
   - Set Slack tokens: `npx openclaw config set slack.appToken xapp-...`
   - Set Slack bot token: `npx openclaw config set slack.botToken xoxb-...`
   - Enable Slack channel: `npx openclaw config set slack.enabled true`
   - Restart OpenClaw: `sudo systemctl restart openclaw`
   - **Dependency:** OpenClaw setup (step 5), Slack app (step 6)

8. **TendHunt Skill Creation** (VPS filesystem)
   - Create skill directory: `mkdir -p ~/.openclaw/workspace/skills/tendhunt`
   - Write `SKILL.md` with API documentation (see example above)
   - Set TendHunt API key env var: `npx openclaw config set env.TENDHUNT_API_KEY <key-from-ui>`
   - Test skill: Send Slack message "@OpenClaw show me buyers in London"
   - **Dependency:** API routes (step 3), OpenClaw Slack integration (step 7)

**Estimated Build Time:** 2-3 days (assuming VPS access and Slack app creation are straightforward)

**Critical Path:**
- MongoDB schema → Middleware → API routes → UI (can proceed in parallel with OpenClaw setup)
- OpenClaw VPS → Slack app → OpenClaw config → Skill creation (sequential)

---

### Phase 21 Part 2: OAuth Multi-Workspace (Post-Hackathon)

**Goal:** "Add to Slack" button allows any workspace to install bot

**Sequence:**

1. **Slack Installation Model** (`apps/web/src/models/slack-installation.ts`)
   - Schema: `{ workspaceId, teamName, botToken, userId, installedAt }`
   - Index on `workspaceId` (unique)

2. **Slack OAuth Routes**
   - `GET /api/slack/oauth/install` → Redirect to Slack authorize URL
   - `GET /api/slack/oauth/callback` → Exchange code for bot token, save to MongoDB, redirect to settings page

3. **OpenClaw Multi-Workspace Config**
   - Modify skill to accept workspace-specific API keys
   - Use Slack workspace ID to look up correct TendHunt user's API key from MongoDB
   - Inject API key dynamically per message context

4. **Settings UI Update**
   - Add "Add to Slack" button → links to `/api/slack/oauth/install`
   - Show connected workspace info (team name, install date)
   - "Disconnect" button → revoke bot token, delete from MongoDB

**Deferred Rationale:** OAuth adds complexity (callback routes, token storage, workspace routing). For hackathon MVP, hardcoding a single workspace token in OpenClaw config is sufficient to demonstrate the integration.

---

## Security Considerations

### API Key Security

**Generation:**
- Use cryptographically secure random generator: `nanoid(32)` (160-bit entropy)
- Hash with bcrypt (cost factor 10) before storing in MongoDB
- Show plaintext key ONLY once on creation (modal with copy button)

**Storage:**
- MongoDB stores **hashed** keys only (never plaintext)
- Cloudflare Pages environment variables store OpenClaw's API key as **secret** (encrypted, cannot be read back)

**Transmission:**
- API key travels in `Authorization: Bearer <key>` header (HTTPS only)
- OpenClaw stores key in `~/.openclaw/openclaw.json` (filesystem permissions: 600, owned by `openclaw` user)

**Validation:**
- Middleware hashes incoming token and compares to MongoDB hash (constant-time comparison via bcrypt)
- Rejected requests return 401 with no details (avoid key enumeration)

**Revocation:**
- Soft delete: Set `revokedAt` timestamp instead of deleting row (audit trail)
- Middleware checks `revokedAt !== null` and returns 403

**Rate Limiting:**
- 100 requests/minute per API key (sliding window)
- Enforced in middleware using in-memory Map (key → [timestamps array])
- On each request: filter timestamps to last 60s, check count, append new timestamp
- Return 429 if exceeded, include `Retry-After` header

**Scoped Access:**
- Every API endpoint filters data by `userId` extracted from API key
- Buyers, contracts, signals, scanners — all queries include `{ userId }` filter
- No cross-user data leaks possible (even with stolen key, attacker only sees their own data)

**API Key Rotation:**
- User can create multiple keys (e.g. "Slack Bot", "Zapier Integration")
- Revoke old key, create new key, update OpenClaw config, test, then delete old key

---

### OpenClaw VPS Security

**Process Isolation:**
- OpenClaw runs as dedicated `openclaw` system user (not root)
- Home directory: `/home/openclaw`, permissions: 700
- Config file: `~/.openclaw/openclaw.json`, permissions: 600

**Sandbox Allowlist:**
- OpenClaw default sandbox allows: `bash, process, read, write, edit, sessions_*`
- TendHunt skill only needs `bash` (for curl) and `read` (for parsing)
- Disable unused tools in config: `npx openclaw config set sandbox.allowlist "bash,read"`

**Network Segmentation:**
- OpenClaw gateway binds to `127.0.0.1:18789` (localhost only, not publicly accessible)
- Slack connection is outbound WebSocket (no inbound firewall rules needed)
- TendHunt API calls are outbound HTTPS to app.tendhunt.com (Cloudflare Pages)

**Secret Management:**
- Anthropic API key: Stored in `~/.openclaw/openclaw.json` (filesystem permissions protect)
- Slack tokens: Stored in same file (app token + bot token)
- TendHunt API key: Stored as environment variable in OpenClaw config (loaded by skill YAML frontmatter)

**Systemd Hardening:**
- Add to service file:
  ```ini
  [Service]
  User=openclaw
  Group=openclaw
  NoNewPrivileges=true
  PrivateTmp=true
  ProtectSystem=strict
  ProtectHome=true
  ReadWritePaths=/home/openclaw/.openclaw
  ```

**Logging & Monitoring:**
- systemd journal captures all gateway logs: `journalctl -u openclaw -f`
- Monitor for repeated 401/429 errors from TendHunt API (indicates key compromise or rate limit abuse)
- Set up log alerts for skill execution failures

---

### Slack Security

**Token Protection:**
- App-Level Token (`xapp-...`) authenticates WebSocket connection → stored in OpenClaw config (filesystem permissions protect)
- Bot Token (`xoxb-...`) authenticates API calls → stored in OpenClaw config

**Scope Minimization:**
- Use least-privilege scopes: `chat:write`, `channels:history`, `app_mentions:read`, `im:history`, `im:write`
- Avoid `channels:read` (lists all channels), `users:read` (lists all users)

**Message Privacy:**
- Socket Mode messages are encrypted in transit (WSS)
- OpenClaw processes messages in memory (no persistent storage of Slack message history)
- TendHunt API logs requests but NOT Slack message content (only API parameters)

**OAuth Token Rotation (Phase 21 Part 2):**
- Slack bot tokens do not expire, but can be revoked manually
- If compromised, user clicks "Disconnect" in TendHunt settings → revokes token via Slack API `auth.revoke`

---

### Rate Limiting Placement

**Why Middleware (Not Worker):**
- TendHunt API runs on Cloudflare Pages (serverless, no global state)
- Cloudflare Workers KV has ~1s write latency (too slow for rate limiting)
- Middleware uses in-memory Map (fast, but resets on cold start)

**Hybrid Approach (Phase 21 Part 2):**
- Use Cloudflare Durable Objects for distributed rate limiting
- Durable Object maintains per-key counter, resets every minute
- API route calls DO for rate limit check before processing request

**Fallback for MVP:**
- In-memory Map in middleware (good enough for hackathon, single-region deployment)
- OpenClaw makes 1-2 API calls per Slack message (well under 100/min for normal usage)

---

## Suggested Build Order (Summary)

### Week 1: TendHunt API Foundation

**Days 1-2: Schema + Middleware**
- [ ] Create `ApiKey` model with bcrypt hashing
- [ ] Write API key middleware (Bearer token validation, userId injection, rate limiting)
- [ ] Unit tests for middleware (valid key, invalid key, revoked key, rate limit)

**Days 3-4: Public API Routes**
- [ ] Create 8 public API routes wrapping tool handlers
- [ ] Integration tests for each endpoint (Postman/Insomnia collection)
- [ ] Document API in OpenAPI spec (for SKILL.md reference)

**Day 5: API Key Management UI**
- [ ] Build settings page (list keys, create key modal, revoke button)
- [ ] Test create/revoke flow end-to-end

---

### Week 2: OpenClaw Integration

**Days 6-7: VPS Setup**
- [ ] Install OpenClaw on Hetzner VPS (systemd service)
- [ ] Configure Anthropic API key
- [ ] Test basic agent functionality (CLI chat)

**Day 8: Slack App Setup**
- [ ] Create Slack app, enable Socket Mode
- [ ] Generate app token + bot token
- [ ] Configure OpenClaw with Slack tokens
- [ ] Test basic Slack message → agent reply

**Days 9-10: TendHunt Skill**
- [ ] Write SKILL.md with all 8 API endpoints (curl examples, parameter docs)
- [ ] Set TendHunt API key in OpenClaw env vars
- [ ] Test skill: Slack message → curl → TendHunt API → JSON → Slack reply
- [ ] Iterate on skill instructions (improve agent's response formatting)

---

## Key Architectural Questions Answered

### 1. How does data flow from Slack message → OpenClaw → TendHunt API → response back to Slack?

**Answer:** See data flow diagram above (27-step sequence). Key insight: OpenClaw is a **message router + bash executor**, not an API server. It receives Slack events via WebSocket, sends message text to Claude API with skill context, Claude decides to execute curl command, OpenClaw runs bash, curl hits TendHunt API, JSON response flows back to Claude, Claude formats Slack reply, OpenClaw posts reply to Slack.

---

### 2. What are the major component boundaries?

**Answer:**
- **TendHunt Web App** (Next.js on Cloudflare Pages) — Exposes REST API, validates API keys, returns JSON
- **OpenClaw Gateway** (Node.js daemon on Hetzner VPS) — Routes Slack ↔ Agent, executes bash/curl
- **Claude Agent** (Anthropic API) — Reads SKILL.md, decides which curl to run, formats responses
- **Slack Workspace** (Socket Mode WebSocket) — Sends events, receives replies
- **TendHunt Skill** (SKILL.md file on VPS) — Natural language API documentation + curl examples

---

### 3. Where does API key authentication happen?

**Answer:** In **Next.js middleware** (`apps/web/src/middleware/api-key-auth.ts`), applied to all `/api/public/*` routes. Middleware extracts `Authorization: Bearer <key>` header, hashes token, queries MongoDB, validates, injects `userId` into request context. Tool handlers then use `userId` to scope all database queries.

---

### 4. How is the TendHunt API key stored securely?

**Answer:**
- **In MongoDB:** Hashed with bcrypt (plaintext never stored)
- **In OpenClaw config:** Plaintext in `~/.openclaw/openclaw.json`, protected by filesystem permissions (600, owned by `openclaw` user)
- **In transit:** HTTPS only (Cloudflare Pages enforces TLS)
- **At rest (Cloudflare):** Not stored in Cloudflare Pages (API key management is TendHunt-side only)

---

### 5. Why Socket Mode instead of HTTP Events API?

**Answer:**
- **No public endpoint needed:** OpenClaw runs on localhost, no firewall rules or SSL certs
- **Simpler deployment:** No webhook signature verification, no ngrok/Cloudflare Tunnel for local dev
- **Perfect for single-workspace bot:** Socket Mode maintains one persistent WebSocket per app (ideal for Hetzner VPS)
- **OAuth still possible:** Phase 21 Part 2 adds OAuth → stores per-workspace bot tokens → OpenClaw uses workspace ID to select token

---

### 6. How does OpenClaw know which TendHunt API endpoint to call?

**Answer:** The **SKILL.md file** teaches the agent. It contains natural language instructions like:

> "When a user asks for buyers in a location, call `POST /api/public/buyers/query` with `region` parameter. Example:
> ```bash
> curl -X POST -H "Authorization: Bearer $TENDHUNT_API_KEY" \
>      -d '{"region":"London"}' \
>      https://app.tendhunt.com/api/public/buyers/query
> ```"

Claude reads this instruction, recognizes the user's message matches the pattern, constructs the curl command, and returns it as a bash tool call. OpenClaw executes it.

---

### 7. What happens if the API key is rate-limited?

**Answer:**
- TendHunt middleware returns `429 Too Many Requests` with `Retry-After: 60` header
- curl receives 429 response, stdout includes JSON error: `{"error":"Rate limit exceeded"}`
- Claude agent reads the error, understands rate limit, replies to Slack: "I'm hitting rate limits on the TendHunt API. Please try again in 1 minute."

---

### 8. How do we test the integration end-to-end?

**Answer:**
1. **Unit tests:** API middleware (valid/invalid keys, rate limits)
2. **Integration tests:** Postman collection hitting `/api/public/*` with test API key
3. **E2E test:** Slack → OpenClaw → TendHunt → Slack
   - Send test message in Slack: "@OpenClaw show me education buyers in London"
   - Check systemd logs: `journalctl -u openclaw -f` (see curl execution)
   - Check TendHunt logs: Cloudflare Pages real-time logs (see API request)
   - Verify Slack reply contains buyer data
4. **Security test:** Revoke API key, send Slack message, expect 403 error

---

## References & Sources

### OpenClaw Architecture
- [OpenClaw System Architecture Overview](https://ppaolo.substack.com/p/openclaw-system-architecture-overview) — Hub-and-spoke gateway design
- [Gateway Architecture - OpenClaw Docs](https://openclawcn.com/en/docs/concepts/architecture/) — WebSocket protocol details
- [OpenClaw Security](https://docs.openclaw.ai/gateway/security) — Sandbox, API authentication
- [OpenClaw GitHub README](https://github.com/openclaw/openclaw/blob/main/README.md) — Installation, skills system

### OpenClaw Skills & API Integration
- [OpenClaw Custom API Integration Guide](https://lumadock.com/tutorials/openclaw-custom-api-integration-guide) — Step-by-step skill creation
- [OpenClaw Skills Platform](https://github.com/VoltAgent/awesome-openclaw-skills) — Community-built skill examples
- [280+ Leaky Skills Research](https://snyk.io/blog/openclaw-skills-credential-leaks-research/) — Security considerations for skill development

### OpenClaw Deployment
- [Deploy OpenClaw on Hetzner](https://www.pulumi.com/blog/deploy-openclaw-aws-hetzner/) — Systemd service setup
- [VPS Deployment Guide](https://deepwiki.com/openclaw/openclaw/13.2-vps-deployment) — Production configuration
- [OpenClaw Installation Guide](https://blog.laozhang.ai/en/posts/openclaw-installation-deployment-guide) — macOS, Linux, VPS

### Slack Integration
- [Slack Socket Mode Docs](https://api.slack.com/apis/socket-mode) — WebSocket connection flow
- [Using Socket Mode with Bolt.js](https://docs.slack.dev/tools/bolt-js/concepts/socket-mode/) — Node.js SDK examples
- [Slack OAuth Installation](https://docs.slack.dev/authentication/installing-with-oauth/) — "Add to Slack" button flow
- [Slack Tokens Guide](https://docs.slack.dev/authentication/tokens/) — App token vs Bot token
- [OpenClaw Slack Bot Troubleshooting](https://www.aifreeapi.com/en/posts/openclaw-slack-bot-not-responding) — Common issues

### Next.js & Cloudflare Pages
- [Next.js Bearer Authentication](https://nesin.io/blog/nextjs-api-bearer-authentication) — Middleware pattern
- [Cloudflare Environment Variables](https://developers.cloudflare.com/workers/configuration/environment-variables/) — Secrets management
- [Next.js on Cloudflare Pages](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) — Deployment guide

---

## Conclusion

This architecture enables TendHunt users to query procurement data from Slack using an AI agent (OpenClaw) that acts as a bridge between Slack's conversational interface and TendHunt's REST API. The design is **agent-first** (skills teach the AI how to use the API, no custom integration code) and **security-focused** (API key scoping, rate limiting, minimal VPS attack surface).

**Build order prioritizes dependencies:** MongoDB schema → middleware → API routes → UI (TendHunt-side), then OpenClaw VPS → Slack app → config → skill (VPS-side). The two tracks can proceed in parallel with final integration in week 2.

**Key architectural win:** Reusing all 14 existing tool handlers means no business logic duplication. Public API routes are thin wrappers (10-20 lines each) that apply auth middleware and call existing handlers. This minimizes maintenance burden and ensures Slack queries return identical data to web UI queries.
