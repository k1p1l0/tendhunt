# Project Research Summary

**Project:** TendHunt Phase 21 — Slack Integration via OpenClaw
**Domain:** Enterprise Slack Bot + Public REST API for Procurement Intelligence
**Researched:** 2026-02-13
**Confidence:** MEDIUM-HIGH

## Executive Summary

Phase 21 adds a Slack bot integration to TendHunt, allowing procurement professionals to query buyer, contract, and signal data using natural language in Slack. The architecture is **agent-first**: OpenClaw (an AI gateway running on Hetzner VPS) connects to Slack via Socket Mode, interprets user messages, executes bash/curl commands against TendHunt's public REST API, and formats responses back to Slack. This requires exposing TendHunt's 14 existing tool handlers as authenticated REST endpoints with API key management, rate limiting, and OpenAPI documentation.

The recommended approach is **incremental and security-focused**: build the public API layer first (API keys, middleware, endpoints), then deploy OpenClaw to VPS, configure Slack integration, and write SKILL.md to teach the agent how to use the API. Critically, **avoid the curl pattern in SKILL.md** — research from Feb 2026 shows 7% of OpenClaw skills leak API keys via command logging. Instead, implement an MCP (Model Context Protocol) server or use OpenClaw's built-in secret management to prevent credential exposure.

Key risks include: Next.js CVE-2025-29927 (authentication bypass via `x-middleware-subrequest` header), exposed OpenClaw instances with RCE vulnerabilities (135K+ found internet-exposed), Slack's March 2026 rate limit changes (15 messages/minute for non-Marketplace apps), and MongoDB Atlas M0 connection exhaustion (500 concurrent limit). Mitigations are well-documented and achievable but require careful implementation — this is not a simple "wrap existing handlers and deploy" project.

## Key Findings

### Recommended Stack

The core TendHunt stack (Next.js 16.1, MongoDB Atlas, Clerk) requires no changes. Phase 21 adds a lightweight public API layer with authentication and rate limiting, plus an external OpenClaw gateway on the existing Hetzner VPS (where Ghost blog runs).

**Core technologies:**
- **crypto.randomBytes (Node.js built-in)**: API key generation (43-char base64url) — Cryptographically secure, zero dependencies, industry standard
- **Upstash Redis + @upstash/ratelimit**: Rate limiting (100 req/min per key) — HTTP-based (serverless-friendly), free tier, Next.js middleware integration
- **@slack/oauth + @slack/web-api**: Slack OAuth flow — Official SDK, handles PKCE/state verification, TypeScript support
- **OpenClaw (Docker Compose)**: AI gateway on Hetzner VPS — Open-source, 68K GitHub stars, Socket Mode support, Claude Opus 4.5+ required for reliability
- **SKILL.md**: Natural language API documentation — Teaches OpenClaw agent how to call TendHunt endpoints via bash/curl

**Critical version note:** Next.js must be ≥15.2.3 to avoid CVE-2025-29927 authentication bypass. OpenClaw requires Node.js 22+ and Claude Opus 4.5 or better (Haiku/Sonnet cause false positives and silent failures per Feb 2026 research).

### Expected Features

**Must have (table stakes):**
- API key authentication (Bearer token in header, scoped to userId)
- API key CRUD UI (create, revoke, list with usage metadata)
- Rate limiting (100 req/min per key, returns 429 with Retry-After header)
- OpenAPI/Swagger interactive documentation
- Slack OAuth "Add to Slack" button
- Slack bot slash commands (`/tendhunt [query]`)
- Ephemeral messages (user-only responses by default)
- Error handling with user-friendly messages (not raw JSON)
- Loading indicators for slow queries

**Should have (competitive):**
- Natural language query understanding (via OpenClaw + Claude)
- Inline actionable Slack buttons ("View in TendHunt", "Save to Scanner")
- Threaded results for long lists (keeps channels clean)
- Rich formatting with Slack Block Kit (contract cards, not plain text)

**Defer (v2+):**
- Multi-turn conversation memory (OpenClaw has basic context, advanced memory needs vector DB)
- Proactive buying signal alerts (requires cron + Slack API integration)
- Webhooks for new data notifications
- GraphQL endpoint (REST is sufficient for MVP)
- SDK client libraries (Node.js/Python)
- API sandbox/test environment
- Real-time request logs dashboard
- Slack App Home tab

**Anti-features (don't build):**
- OAuth 2.0 for API authentication (use API keys for server-to-server, OAuth only for Slack bot install)
- Public API marketplace listing (RapidAPI, Postman — premature, requires revenue sharing)
- Custom API gateway (Kong, Apigee — overkill, use Next.js routes + middleware)
- Conversational AI with unlimited context (GPT-4-level memory — complex, V2 feature)
- Public Slack App Directory listing (requires review, compliance docs — private distribution only for Phase 21)

### Architecture Approach

The integration is **agent-first** with clear component boundaries: TendHunt exposes a public REST API protected by API keys (scoped to userId), OpenClaw maintains a persistent WebSocket connection to Slack and calls TendHunt endpoints via bash/curl based on SKILL.md instructions, and the AI agent (Claude) interprets Slack messages, constructs curl commands, parses JSON responses, and formats replies. This eliminates custom Slack-specific backend code — the API is generic REST, and OpenClaw handles all conversational UX.

**Major components:**
1. **TendHunt Web App (Next.js on Cloudflare Pages)** — Exposes `/api/public/*` endpoints wrapping 14 existing tool handlers. New: API Key model (MongoDB), API key middleware (Bearer token validation + userId injection), public API routes (thin wrappers), API key management UI (settings page).
2. **OpenClaw Gateway (Node.js daemon on Hetzner VPS)** — Connects to Slack via WebSocket (Socket Mode), dispatches messages to Claude Sonnet 4.5, executes bash commands (curl), posts replies to Slack. Runs as systemd service, binds to 127.0.0.1:18789 (localhost only for security).
3. **Slack Workspace (Socket Mode)** — Provides WebSocket connection (no public endpoint needed), sends message events, receives bot replies. Requires app token (xapp-...) + bot token (xoxb-...) with scopes: chat:write, channels:history, app_mentions:read, im:history.
4. **TendHunt Skill (SKILL.md on VPS)** — Markdown file teaching the agent how to call each API endpoint. Contains curl examples, parameter docs, response formats, natural language instructions.

**Security architecture:** API keys are hashed with bcrypt in MongoDB, transmitted via Authorization header (HTTPS only), scoped to userId (all queries filter by userId to prevent cross-user data leaks). OpenClaw stores API key in filesystem config (600 permissions), runs as dedicated user (not root), uses systemd hardening (NoNewPrivileges, PrivateTmp, ProtectSystem). Rate limiting enforced in Next.js middleware (in-memory sliding window for MVP, Upstash Redis for production).

**Reuse win:** All 14 existing tool handlers (query_buyers, query_contracts, etc.) are reused without modification. Public API routes are 10-20 line wrappers that apply auth middleware, parse request body, call existing handler, return JSON. Zero business logic duplication.

### Critical Pitfalls

1. **API Key Leakage via OpenClaw Skill Logging** — OpenClaw logs every bash command before execution, including curl headers with API keys. Feb 2026 research found 7.1% of ClawHub skills (283 out of 3,984) leak credentials this way. **Mitigation:** Use OpenClaw's secret management (`OPENCLAW_SECRET_*` env vars) or implement MCP server instead of direct curl. Monitor logs for "Authorization: Bearer" patterns, auto-alert on leakage.

2. **Next.js Authentication Bypass (CVE-2025-29927)** — Versions <15.2.3 allow bypassing middleware auth by adding `x-middleware-subrequest` header. **Mitigation:** Upgrade to ≥15.2.3 immediately, implement auth inside route handlers (not just middleware), add integration test that attempts bypass. Block suspicious headers at reverse proxy if patching infeasible.

3. **Exposed OpenClaw Instances with RCE** — Default config binds to 0.0.0.0:18789 (all interfaces). 135K+ instances found internet-exposed in early 2026, 50K+ vulnerable to remote code execution. **Mitigation:** Bind to 127.0.0.1 only, firewall port 18789 (`sudo ufw deny 18789/tcp`), run in Docker with explicit localhost port mapping, monitor Shodan for your IP.

4. **Slack Rate Limits (March 2026 Changes)** — Non-Marketplace apps limited to 1 request/minute for conversations.history, max 15 messages per call. OpenClaw needs >15 messages for context on long threads. **Mitigation:** Apply for Marketplace approval (security review required), cache Slack messages in MongoDB (use Slack as write-through cache), warn users when queries exceed limits. Alternative: Slack Events API (real-time message storage).

5. **OAuth Token Orphaning** — Slack uninstalls don't auto-revoke tokens. If `app_uninstalled` webhook not implemented, tokens remain valid indefinitely. **Mitigation:** Subscribe to `app_uninstalled` event, immediately call auth.revoke and delete from database. Track token lifecycle (installedAt, lastUsedAt), flag unused >90 days.

**Moderate pitfalls:** MongoDB Atlas M0 connection exhaustion (500 limit, set maxPoolSize=5 in Mongoose), OpenClaw unreliable with weak models (requires Opus 4.5+, budget $225/month for 100 queries/day), VPS resource contention (OpenClaw peaks at 2GB RAM, Ghost needs 512MB, size VPS to 8GB minimum or separate instances).

## Implications for Roadmap

Based on research, Phase 21 should be split into **6 sub-phases** with clear dependencies and security checkpoints:

### Phase 21.1: API Foundation (2-3 days)
**Rationale:** Public API layer must be secure before exposing to OpenClaw. Authentication bypass (CVE-2025-29927) is critical — implement route-level auth, not just middleware.
**Delivers:** MongoDB ApiKey model, API key middleware (Bearer auth + rate limiting), 8 public API routes (buyers/contracts/signals/personnel/spend/board-docs), OpenAPI spec + Swagger UI.
**Addresses:** Table stakes: API key auth (TS-1, TS-2), rate limiting (TS-9), API docs (TS-11, TS-13).
**Avoids:** Pitfall #2 (auth bypass) — upgrade Next.js to ≥15.2.3, implement auth in route handlers. Pitfall #9 (query param keys) — enforce header-only auth.
**Research flag:** LOW — Next.js API routes are well-documented, pattern is standard REST auth.

### Phase 21.2: API Key Management UI (1-2 days)
**Rationale:** Users need to generate keys before Slack bot can call API. UI must show keys only once (security best practice).
**Delivers:** Settings page (list keys, create/revoke, usage metadata), copy-to-clipboard modal for new keys, key rotation warnings.
**Addresses:** Table stakes: Create key (TS-5), revoke key (TS-6), list keys (TS-7), usage metadata (TS-8).
**Avoids:** Pitfall #13 (no rotation) — implement 90-day expiration warnings, revocation blacklist.
**Research flag:** LOW — Standard CRUD UI, no unusual patterns.

### Phase 21.3: Security Hardening (1 day)
**Rationale:** Before deploying OpenClaw, validate API layer security. Integration tests catch auth bypasses and rate limit violations.
**Delivers:** Integration test suite (Postman/Insomnia collection), auth bypass tests (x-middleware-subrequest header), rate limit tests (101st request returns 429), MongoDB connection pool config (maxPoolSize=5).
**Addresses:** Pitfall #2 (auth bypass), Pitfall #6 (MongoDB connections), Pitfall #12 (rate limiting per user).
**Avoids:** GDPR violations — API keys scoped to userId tested thoroughly, no cross-user data leaks.
**Research flag:** LOW — Security testing patterns well-known.

### Phase 21.4: OpenClaw VPS Setup (2 days)
**Rationale:** Deploy OpenClaw before Slack integration to test agent independently. VPS hardening prevents RCE exploits.
**Delivers:** OpenClaw installed on Hetzner VPS (Docker Compose), systemd service with hardening (MemoryMax=2G, bind to 127.0.0.1), Anthropic API key configured (Claude Opus 4.5), firewall rules (block port 18789), resource monitoring (Grafana + node_exporter).
**Addresses:** Pitfall #3 (exposed instance), Pitfall #7 (weak models), Pitfall #8 (resource contention).
**Avoids:** RCE exploitation — localhost-only binding, firewall, systemd sandbox. OOM kills — memory limits, swap space.
**Research flag:** MEDIUM — OpenClaw deployment guides exist but VPS-specific hardening requires system admin knowledge. May need `/gsd:research-phase` if team lacks Docker/systemd experience.

### Phase 21.5: Slack OAuth & Bot Config (2 days)
**Rationale:** Slack integration is the user-facing deliverable. OAuth flow must handle token revocation and scope management correctly.
**Delivers:** Slack app created (Socket Mode enabled), app token + bot token generated, OpenClaw config updated (slack.appToken, slack.botToken), "Add to Slack" OAuth button in TendHunt settings, SlackInstallation MongoDB model, OAuth callback route, `app_uninstalled` webhook handler.
**Addresses:** Table stakes: "Add to Slack" (TS-19), OAuth scopes (TS-20), bot token storage (TS-21). Pitfall #5 (token orphaning), Pitfall #4 (rate limits).
**Avoids:** Stale tokens — webhook revokes on uninstall. Excessive scopes — minimal permissions (chat:write, app_mentions:read only).
**Research flag:** MEDIUM — Slack OAuth SDK compatibility with Next.js 16 needs validation (GitHub issue #1659 reported problems with 13+, unknown for 16). Fallback: manual OAuth with fetch.

### Phase 21.6: SKILL.md Creation & Testing (2-3 days)
**Rationale:** SKILL.md quality determines agent reliability. Incorrect examples cause hallucinations, missing edge cases cause silent failures.
**Delivers:** SKILL.md with 8 endpoint docs (curl examples, parameter descriptions, response formats, natural language instructions), TendHunt API key stored in OpenClaw env vars (via secret management, NOT plaintext in SKILL.md), end-to-end test: Slack message → OpenClaw → TendHunt API → Slack reply, iteration on skill instructions (improve response formatting, add error handling).
**Addresses:** Differentiators: Natural language queries (D-1), inline buttons (D-3), rich formatting (D-14). Pitfall #1 (key leakage).
**Avoids:** Credential logging — use `$OPENCLAW_SECRET_TENDHUNT_API_KEY` in skill, not hardcoded keys. False positives — test with known queries, validate responses against ground truth.
**Research flag:** HIGH — SKILL.md format is documented but **security-conscious implementation is unclear**. OpenClaw's secret management is lightly documented (as of Feb 2026). May need `/gsd:research-phase` to determine: (1) best pattern for secret injection in SKILL.md, (2) MCP vs direct curl tradeoffs, (3) how to prevent key leakage in logs.

### Phase Ordering Rationale

- **API first, OpenClaw second** — Prevents deploying an agent that calls a broken/insecure API. API can be tested independently via Postman.
- **Security checkpoint after API** — Integration tests validate auth before external access. Catches CVE-2025-29927 bypass early.
- **VPS hardening before Slack** — Exposed OpenClaw = RCE risk. Harden before accepting WebSocket connections.
- **OAuth before SKILL.md** — Bot token needed for SKILL.md testing. Avoids "works locally but fails in Slack" surprises.
- **SKILL.md last** — Requires working API + Slack connection. Iterative refinement phase (agent responses improve with prompt tuning).

**Critical path:** API Foundation → Security Hardening → SKILL.md (blocks demo). OAuth can proceed in parallel with VPS setup (no dependency).

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 21.4 (OpenClaw VPS Setup):** VPS-specific hardening (systemd, Docker networking, firewall) requires sysadmin expertise. If team lacks this, `/gsd:research-phase` for production deployment patterns.
- **Phase 21.5 (Slack OAuth):** Slack SDK + Next.js 16 compatibility unknown (GitHub issue reported Next.js 13+ problems). Test in dev first, fallback to manual OAuth if SDK breaks.
- **Phase 21.6 (SKILL.md):** **HIGHEST PRIORITY** — Secret management pattern to prevent API key leakage is under-documented. OpenClaw's env var system and MCP server integration need validation. Recommend `/gsd:research-phase` specifically for "secure SKILL.md patterns" before writing curl examples.

Phases with standard patterns (skip research-phase):
- **Phase 21.1 (API Foundation):** Next.js API routes + Bearer auth is well-trodden. STACK.md provides all patterns.
- **Phase 21.2 (API Key Management UI):** Standard CRUD, similar to existing TendHunt settings pages.
- **Phase 21.3 (Security Hardening):** Integration testing is standard practice, tools and patterns well-known.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies verified via official docs (Upstash, Slack SDK, OpenClaw GitHub). Versions confirmed as of 2026-02-13. Caveat: @slack/oauth + Next.js 16 compatibility unknown (GitHub issue for v13), needs testing. |
| Features | HIGH | Table stakes grounded in API management best practices (Stripe, Twilio patterns). Differentiators validated against 2026 Slack bot UX guides. Anti-features clearly scoped (GraphQL, webhooks deferred). |
| Architecture | MEDIUM-HIGH | Component boundaries and data flow well-defined. Reuse of existing tool handlers is low-risk. **Gap:** SKILL.md security patterns under-documented (secret management unclear). MCP server alternative mentioned but not fully researched. |
| Pitfalls | HIGH | Critical pitfalls verified with CVEs (CVE-2025-29927), security research (Snyk's 280+ leaky skills study), official announcements (Slack March 2026 rate limit changes). Phase-specific warnings mapped to build order. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

**Gap 1: SKILL.md Secret Management**
- **Issue:** OpenClaw's documentation on secure secret injection is sparse as of Feb 2026. STACK.md mentions `OPENCLAW_SECRET_*` env vars but doesn't explain how skills reference them without leaking to logs.
- **Impact:** High risk of API key leakage if curl pattern is used naively. 7.1% of existing skills leak credentials.
- **How to handle:** Run `/gsd:research-phase` during Phase 21.6 planning with query: "How do OpenClaw skills securely reference API keys without exposing them in bash command logs?" Alternatively, prototype MCP server (Model Context Protocol) which doesn't expose credentials in tool call logs.

**Gap 2: Slack SDK + Next.js 16 Compatibility**
- **Issue:** GitHub issue #1659 reported `@slack/oauth` handleCallback() incompatibility with Next.js 13 App Router. Unknown if fixed for Next.js 16.
- **Impact:** OAuth callback may fail, requiring manual fetch-based OAuth.
- **How to handle:** Test @slack/oauth in dev environment during Phase 21.5. If broken, fallback to manual flow: `fetch('https://slack.com/api/oauth.v2.access')` with code exchange. Add 1 day to Phase 21.5 estimate for fallback implementation.

**Gap 3: MongoDB Connection Pooling in Cloudflare Workers**
- **Issue:** PITFALLS.md warns of M0 connection exhaustion (500 limit). TendHunt uses Cloudflare Workers for data-sync. Workers connection reuse pattern not fully validated.
- **Impact:** Moderate — hitting 500 connections locks out new API requests.
- **How to handle:** During Phase 21.3 (Security Hardening), load test with 100 concurrent API requests. Monitor MongoDB Atlas connection count. If exceeds 400, implement Cloudflare Durable Objects for connection pooling or upgrade to M2 tier ($9/month, 1500 connections).

**Gap 4: Upstash Free Tier Viability**
- **Issue:** Upstash Redis free tier = 10K commands/day. If TendHunt has >100 users × 100 API calls/day = 10K/day, free tier insufficient.
- **Impact:** Low for MVP (single workspace, <10 users). High if Phase 21 launches to all users.
- **How to handle:** Monitor Upstash dashboard during beta. Set alert at 8K commands/day. Budget $10/month for paid tier (100K commands) if usage exceeds free tier.

## Sources

### Primary (HIGH confidence)
- [Upstash Ratelimit Context7](https://context7.com/cahidarda/ratelimit/llms.txt) — Rate limiting implementation, 93 benchmark score
- [OpenClaw GitHub README](https://github.com/openclaw/openclaw) — System requirements, Docker setup, Socket Mode
- [Slack API Rate Limits](https://docs.slack.dev/apis/web-api/rate-limits/) — March 2026 changes, 15 msg/min limit for non-Marketplace apps
- [Next.js CVE-2025-29927 Advisory](https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw) — Auth bypass via x-middleware-subrequest header
- [Snyk: 280+ Leaky Skills Research](https://snyk.io/blog/openclaw-skills-credential-leaks-research/) — 7.1% of ClawHub skills leak credentials
- [MongoDB Atlas M0 Limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/) — 500 concurrent connections

### Secondary (MEDIUM confidence)
- [OpenClaw Deployment Guide](https://blog.laozhang.ai/en/posts/openclaw-installation-deployment-guide) — VPS deployment, Docker Compose patterns
- [OpenClaw Custom API Integration Guide](https://lumadock.com/tutorials/openclaw-custom-api-integration-guide) — SKILL.md examples (not security-focused)
- [Slack OAuth Installation Docs](https://docs.slack.dev/authentication/installing-with-oauth/) — OAuth flow, scope management
- [API Key Management Best Practices](https://apidog.com/blog/api-key-management-best-practices/) — Storage, rotation, revocation patterns

### Tertiary (LOW confidence, needs validation)
- @slack/oauth + Next.js 16 compatibility — GitHub issue #1659 mentions v13 problems, unknown for v16. Requires testing.
- OpenClaw MCP server integration — Mentioned in SKILL.md as alternative to curl, not fully documented. May need community forums research.

---
*Research completed: 2026-02-13*
*Ready for roadmap: Yes (with Phase 21.6 research flag)*
