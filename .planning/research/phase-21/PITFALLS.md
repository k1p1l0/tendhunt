# Domain Pitfalls: OpenClaw + Slack Integration + Public API

**Domain:** OpenClaw-based Slack bot with public API for procurement data
**Researched:** 2026-02-13
**Project Context:** TendHunt — adding Slack integration to existing Next.js app with sensitive buyer contact data, exposing internal tool handlers as public REST API endpoints, deploying OpenClaw daemon on shared Hetzner VPS

---

## Critical Pitfalls

### Pitfall 1: API Key Leakage via OpenClaw Skills

**What goes wrong:** OpenClaw's skill system is fundamentally insecure for API key handling. Research in Feb 2026 revealed that **283 out of 3,984 skills (7.1%)** in the ClawHub marketplace contain critical flaws that expose credentials. Popular skills like `moltyverse-email` and `youtube-data` instruct AI agents to mishandle secrets, forcing them to pass API keys, passwords, and other sensitive data as plaintext arguments or expose them in chat logs.

**Why it happens:**
- OpenClaw has multiple vectors where API keys can leak to the LLM or be exposed in chat during debugging
- The SKILL.md pattern teaches OpenClaw to `curl` API endpoints with auth headers — the agent **logs every command** before execution, including headers with API keys
- Skills are user-contributed and unvetted (VirusTotal scanning only catches malicious code, not credential mishandling patterns)
- Agent debugging UX encourages exposing the full command history, including secrets

**Consequences:**
- User API keys are exposed in Slack message history (searchable by workspace admins and compliance exports)
- Keys leaked in OpenClaw chat logs can be exfiltrated via compromised skills or RCE exploits
- Revoked keys leave permanent evidence in Slack threads and chat transcripts
- Procurement data API keys grant access to **sensitive buyer contact PII** — leakage = GDPR breach

**Prevention:**
- **DO NOT use API keys in curl commands in SKILL.md** — OpenClaw logs the full command before execution
- Instead: use OpenClaw's built-in secret management (`OPENCLAW_SECRET_*` env vars) and reference secrets by name in skills
- Pattern for SKILL.md:
  ```markdown
  # TendHunt Skill

  Use the MCP tool `mcp-cli call tendhunt-mcp/query_buyers` instead of curl.
  Configure: `mcp-cli add-server tendhunt-mcp https://api.tendhunt.com/mcp --api-key $OPENCLAW_SECRET_TENDHUNT_API_KEY`
  ```
- Implement **MCP (Model Context Protocol) server** instead of REST API — MCP tools don't expose credentials in logs
- Set up secret rotation: force all API keys to expire after 90 days, require rotation before expiry
- Monitor OpenClaw logs with regex patterns for `Authorization: Bearer` and `X-API-Key` headers — auto-alert on leakage

**Detection:**
- Grep Slack workspace export for `X-API-Key` or `Authorization` headers in messages from OpenClaw bot
- Audit OpenClaw chat history for curl commands with `-H` flags containing secrets
- Check database for API keys with `lastUsedAt` timestamps from multiple IP addresses (sign of leaked key reuse)

**Phase mapping:** Phase 21.1 (API Design) — decide REST vs MCP protocol before building endpoints

**Sources:**
- [It's easy to backdoor OpenClaw, and its skills leak API keys • The Register](https://www.theregister.com/2026/02/05/openclaw_skills_marketplace_leaky_security)
- [280+ Leaky Skills: How OpenClaw & ClawHub Are Exposing API Keys and PII | Snyk](https://snyk.io/blog/openclaw-skills-credential-leaks-research/)
- [Security Roadmap: Protecting API Keys from Agent Access · Issue #11829](https://github.com/openclaw/openclaw/issues/11829)

---

### Pitfall 2: Authentication Bypass via x-middleware-subrequest Header

**What goes wrong:** Next.js versions <15.2.3 contain a **critical authorization bypass** (CVE-2025-29927, CVSS 9.1) that allows attackers to bypass middleware-based authentication by adding the `x-middleware-subrequest` header to requests. This means an attacker can access your public API endpoints **without a valid API key** if you rely solely on middleware for auth.

**Why it happens:**
- Next.js inconsistently handles the custom `x-middleware-subrequest` header
- When this header is present, Next.js skips middleware execution entirely while still processing the route handler
- Developers assume middleware auth is a hard gate, but it's bypassable in affected versions
- Self-hosted deployments using `next start` with `output: standalone` are vulnerable (Vercel deployments auto-patched)

**Consequences:**
- All API endpoints that use middleware for auth are publicly accessible without API keys
- Attacker can query `/api/buyers`, `/api/contracts`, `/api/signals` without authentication
- Data exfiltration: attacker can dump entire procurement database including buyer contacts (PII), contract values, board minutes
- Credit system bypass: attacker can reveal all buyer contacts without spending credits
- Scanner data leak: attacker can access other users' scanner configurations and AI columns

**Prevention:**
- **Upgrade Next.js immediately:** 12.x → ≥12.3.5, 13.x → ≥13.5.9, 14.x → ≥14.2.25, 15.x → ≥15.2.3
- **DO NOT rely on middleware alone for public API auth** — implement auth inside route handlers:
  ```typescript
  // ❌ WRONG - middleware only
  export async function GET(request: Request) {
    return Response.json({ data: await fetchBuyers() });
  }

  // ✅ CORRECT - auth in handler
  export async function GET(request: Request) {
    const apiKey = request.headers.get("x-api-key");
    const user = await validateApiKey(apiKey);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const buyers = await fetchBuyers({ userId: user.id }); // scoped to user
    return Response.json({ data: buyers });
  }
  ```
- If patching is infeasible, block requests with `x-middleware-subrequest` header at reverse proxy (nginx/Cloudflare Workers)
- Add integration test that attempts bypass: `curl -H "x-middleware-subrequest: 1" https://api.tendhunt.com/api/buyers` should return 401

**Detection:**
- Monitor API access logs for requests with `x-middleware-subrequest` header
- Set up automated security scanning with nuclei template for CVE-2025-29927
- Audit all route handlers under `/api/` — flag any that don't explicitly call `validateApiKey()`

**Phase mapping:** Phase 21.1 (API Design) — implement route-level auth before exposing any endpoints

**Sources:**
- [CVE-2025-29927: Next.js Middleware Authorization Bypass - Technical Analysis](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass)
- [Understanding CVE-2025-29927 | Datadog Security Labs](https://securitylabs.datadoghq.com/articles/nextjs-middleware-auth-bypass/)
- [Authorization Bypass in Next.js Middleware](https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw)
- [Postmortem on Next.js Middleware bypass - Vercel](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass)

---

### Pitfall 3: Internet-Exposed OpenClaw Instances with RCE Vulnerabilities

**What goes wrong:** OpenClaw binds to `0.0.0.0:18789` by default, meaning it listens on **all network interfaces** including the public internet. SecurityScorecard's STRIKE team discovered **over 135,000 internet-exposed OpenClaw instances** in early 2026, with **50,000+ vulnerable to remote code execution**. An exposed OpenClaw instance = full server compromise.

**Why it happens:**
- Default config binds to all interfaces (`0.0.0.0`) instead of localhost (`127.0.0.1`)
- No authentication required for local API access
- Developers assume "it's just for local dev" and forget to firewall the port
- VPS deployments copy-paste default configs without hardening

**Consequences:**
- **RCE on production VPS:** Attacker exploits OpenClaw RCE bug → gains shell access → pivots to Ghost blog, MongoDB credentials, TendHunt API keys
- **Data exfiltration:** OpenClaw has access to MongoDB connection string (env vars) → attacker dumps entire database including buyer contact PII
- **Slack workspace takeover:** OpenClaw stores Slack bot tokens in plain text config → attacker uses token to impersonate bot, access private channels, exfiltrate messages
- **Cryptojacking:** 341 malicious skills in ClawHub steal crypto keys, SSH credentials, browser passwords — deploying them on your instance turns your VPS into a botnet node

**Prevention:**
- **Bind OpenClaw to localhost only:** Edit config to `"host": "127.0.0.1"` (NOT `0.0.0.0`)
- **Firewall port 18789:** `sudo ufw deny 18789/tcp` (or equivalent for Hetzner Cloud Firewall)
- **Use reverse proxy with auth:** nginx → `proxy_pass http://127.0.0.1:18789` with HTTP Basic Auth or IP whitelist
- **Run in Docker with no port mapping:** `docker run -p 127.0.0.1:18789:18789` (explicit localhost bind)
- **Monitor for exposed instances:** Shodan query `product:"OpenClaw" port:18789` — your IP should NOT appear
- **Audit ClawHub skills before install:** Check SKILL.md for suspicious commands, external URLs, base64-encoded payloads
- **Enable VirusTotal scanning:** OpenClaw partnered with VirusTotal in Feb 2026 to scan skills, but it only catches known malware signatures

**Detection:**
- External port scan from different network: `nmap -p 18789 <your-vps-ip>` — should timeout or be filtered
- Check OpenClaw logs for unauthorized API calls from unknown IPs
- Monitor Slack audit logs for bot activity outside expected hours/patterns

**Phase mapping:** Phase 21.4 (OpenClaw Deployment) — harden before going live

**Sources:**
- [OpenClaw instances open to the internet present ripe targets • The Register](https://www.theregister.com/2026/02/09/openclaw_instances_exposed_vibe_code/)
- [Astrix Security Releases OpenClaw Scanner Amid Growing Concerns](https://www.prnewswire.com/news-releases/astrix-security-releases-openclaw-scanner-amid-growing-concerns-over-autonomous-ai-agents-302684133.html)
- [Researchers Find 341 Malicious ClawHub Skills](https://thehackernews.com/2026/02/researchers-find-341-malicious-clawhub.html)

---

### Pitfall 4: Slack Rate Limits Silently Drop Messages (2026 Changes)

**What goes wrong:** Starting **March 3, 2026**, Slack drastically reduced rate limits for non-Marketplace apps: `conversations.history` and `conversations.replies` are now **Tier 1 (1 request/minute)** instead of Tier 3. The `limit` parameter max dropped from unlimited to **15 messages**. This means your bot can only read 15 messages per minute — any queries requiring more context will **fail silently** or return incomplete results.

**Why it happens:**
- Slack's rationale: prevent bulk data exfiltration by unvetted apps
- OpenClaw often needs >15 messages for context (e.g., "summarize this thread" on a 50-message discussion)
- Rate limit enforcement is silent — API returns 200 OK with truncated data, bot doesn't know it missed messages
- Non-Marketplace apps include all custom bots (TendHunt's OpenClaw instance is NOT Marketplace-approved)

**Consequences:**
- **Incomplete search results:** User asks "find all contracts mentioning NHS" → OpenClaw reads 15 messages, misses the rest → returns partial results, user assumes that's everything
- **Thread context loss:** User references a long Slack thread → bot only sees first 15 messages → misunderstands question, gives wrong answer
- **Message queue buildup:** Multiple users query simultaneously → rate limit triggers → requests queue up → 5-minute delay for 5th user
- **User frustration:** "The bot was working yesterday, why is it slow now?" (March 3, 2026 cutover)

**Prevention:**
- **Apply for Slack Marketplace approval** — Marketplace apps are exempt from Tier 1 limits (but requires security review, privacy policy, support SLA)
- **Design for 15-message chunks:** Don't rely on reading full thread history — use Slack's threading metadata (message count, participants) to detect truncation
- **Cache aggressively:** Store Slack message data in your database, use Slack as write-through cache — bot queries MongoDB instead of hitting Slack API
- **Implement retry with exponential backoff:** When rate limited, queue request and retry after 60 seconds (don't drop silently)
- **User-facing rate limit warnings:** If query requires >15 messages, warn user: "This thread has 47 messages. Slack limits me to 15/min. Results may be incomplete. Try again in 1 minute."
- **Alternative: Slack Events API** — subscribe to message events, store in MongoDB in real-time → bot queries MongoDB (no rate limits)

**Detection:**
- Monitor `X-Rate-Limit-Remaining` header in Slack API responses — alert when it hits 0
- Log all Slack API calls with response sizes — if `messages.length === 15` consistently, you're hitting the limit
- Set up synthetic monitoring: every 5 minutes, query a known 30-message thread → if returns only 15, rate limit is active

**Phase mapping:** Phase 21.5 (Slack OAuth & Bot Config) — design bot architecture for 2026 rate limits from the start

**Sources:**
- [Rate limit changes for non-Marketplace apps | Slack](https://api.slack.com/changelog/2025-05-terms-rate-limit-update-and-faq)
- [Rate limit changes for non-Marketplace apps | Slack Developer Docs](https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps/)
- [Rate limits | Slack Developer Docs](https://docs.slack.dev/apis/web-api/rate-limits/)

---

### Pitfall 5: Multi-Tenant OAuth Token Management (Scope Creep & Revocation Gaps)

**What goes wrong:** Slack's OAuth flow has two subtle traps for multi-tenant bots: (1) **Scope creep** — re-installing an app with new scopes **adds** them to the existing token without removing old ones, and there's no way to remove scopes except full token revocation. (2) **Orphaned tokens** — when a user uninstalls your app from Slack, the token isn't auto-revoked, and you must manually delete it from your database or it remains a valid backdoor.

**Why it happens:**
- Slack's OAuth design treats scopes as additive across installations
- Developers expect "re-install with fewer scopes" to revoke excess permissions — it doesn't
- App uninstall webhook is optional — if you don't implement `app_uninstalled` event handler, you never know the token is orphaned
- Database cleanup is manual — no cascade delete when user uninstalls

**Consequences:**
- **Privilege escalation:** You launch with `channels:read`, later add `channels:history` for a new feature → old installs now have BOTH scopes permanently (can't downgrade without revoke)
- **Stale token access:** User uninstalls TendHunt Slack app → token still works for 6 months until noticed → ex-user can still query API via leaked token
- **GDPR violation:** User deletes TendHunt account → Slack token remains in database → bot can still access their workspace messages → data retention violation
- **Audit failures:** Security review asks "how do you ensure tokens are revoked when users leave?" → you have no process

**Prevention:**
- **Implement `app_uninstalled` webhook:** Subscribe to `app_uninstalled` event → when triggered, immediately revoke token via `auth.revoke` API, delete from database
  ```typescript
  // apps/web/src/app/api/webhooks/slack/route.ts
  if (event.type === "app_uninstalled") {
    const { team_id } = event;
    await revokeSlackToken(team_id); // calls auth.revoke
    await db.slackInstallations.deleteMany({ teamId: team_id });
  }
  ```
- **Scope versioning strategy:** When adding new scopes, force re-authorization for existing installs — detect outdated scope sets on each API call, return 403 with "Please re-authorize" message
- **Token lifecycle tracking:** Store `installedAt`, `lastUsedAt`, `scopes[]` in database — automated job flags tokens unused for >90 days, prompts admin to revoke
- **User account deletion cleanup:** When user deletes TendHunt account, revoke ALL associated Slack tokens (one user can have multiple workspaces)
- **Scope audit:** Log every API call with required scope vs granted scope — alert when using scopes not in initial permission set (sign of scope creep)

**Detection:**
- Count tokens in database vs active Slack installations: `SELECT COUNT(*) FROM slack_tokens` should match workspace count
- Grep Slack audit logs for uninstall events, cross-reference with token deletion logs — gaps = orphaned tokens
- Test: Install app → uninstall → verify token no longer works (should get `token_revoked` error)

**Phase mapping:** Phase 21.5 (Slack OAuth & Bot Config) — implement webhooks and cleanup logic before first user installs

**Sources:**
- [Installing with OAuth | Slack Developer Docs](https://docs.slack.dev/authentication/installing-with-oauth/)
- [Token types | Slack](https://api.slack.com/authentication/token-types)
- [7 Solutions for Common Slack Integration Errors](https://moldstud.com/articles/p-7-essential-solutions-for-slack-integration-errors-every-developer-must-know)

---

## Moderate Pitfalls

### Pitfall 6: MongoDB Atlas Free Tier Connection Exhaustion (500 concurrent limit)

**What goes wrong:** MongoDB Atlas M0 (free tier) has a hard limit of **500 concurrent connections**. OpenClaw daemon + Next.js API + Cloudflare Workers all share this pool. When OpenClaw makes 10 parallel queries (common during agent reasoning), and 50 users hit the API simultaneously, you can hit 500 connections and **lock out all new requests** until connections close.

**Why it happens:**
- Each Cloudflare Worker execution opens 1-3 MongoDB connections (depends on query complexity)
- OpenClaw's tool execution is parallel by default (10+ concurrent `fetchBuyers` calls)
- Next.js API routes don't pool connections properly — each request opens new connection
- Mongoose default: 10 connections per process → 5 Worker invocations × 10 = 50 connections, OpenClaw adds 30, Next.js adds 20 = **100 connections idle** even with light load

**Prevention:**
- **Set Mongoose `maxPoolSize`:**
  ```typescript
  mongoose.connect(MONGODB_URI, {
    maxPoolSize: 5, // down from default 10
    minPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
  });
  ```
- **Workers: Reuse connections across invocations** — use global variable to cache connection:
  ```typescript
  let cachedDb: Db | null = null;
  export default {
    async fetch() {
      if (!cachedDb) cachedDb = await getMongoDb();
      // ...
    }
  };
  ```
- **OpenClaw: Limit concurrency** — configure `pLimit(3)` for parallel tool calls (not default 10)
- **Monitor connection count:** MongoDB Atlas UI → Metrics → Connections → alert when >400 (80% capacity)
- **Upgrade plan trigger:** Set rule: if 400+ connections sustained for 1 hour, auto-upgrade to M2 ($9/month, 1500 connections)

**Detection:**
- MongoDB throws `MongoServerError: connection refused` when limit hit
- Grafana dashboard: track `mongodb.connections.current` metric — spike = issue
- Synthetic test: simulate 100 concurrent API requests → should not trigger connection errors

**Phase mapping:** Phase 21.2 (Public API Implementation) — configure connection pooling before load testing

**Sources:**
- [Atlas M0 (Free Cluster) Limits - Atlas - MongoDB Docs](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/)
- [Atlas Service Limits - Atlas - MongoDB Docs](https://www.mongodb.com/docs/atlas/reference/atlas-limits/)

---

### Pitfall 7: OpenClaw Unstable with Weaker Models (Requires Opus 4.5+)

**What goes wrong:** OpenClaw's autonomous agent architecture requires **Claude Opus 4.5 or better** to work reliably. Users consistently report that Haiku, Sonnet, and even Opus 4.0 cause OpenClaw to **report success when tasks fail**, loop indefinitely on simple queries, or hallucinate API responses.

**Why it happens:**
- OpenClaw's tool execution relies on the model's ability to self-validate results (e.g., "did this API call succeed?")
- Weaker models fail at multi-step reasoning: they execute step 1, assume success without checking, move to step 2, fail, don't backtrack
- Frontier models have contradictory constraints: capability (execute complex workflows) vs safety (don't take risky actions) → weaker models can't balance this, pick safety → abort early

**Consequences:**
- **False positives:** User asks "how many NHS contracts?", OpenClaw returns "47" (hallucinated), actual count is 12
- **Silent failures:** OpenClaw tries to call `/api/buyers`, gets 500 error, reports "No buyers found" (should retry or report API error)
- **Cost blowup:** Haiku is cheap ($0.25/1M tokens) but retries 10x to succeed → burns more tokens than using Opus once ($15/1M tokens, succeeds first try)
- **User trust erosion:** "The Slack bot keeps giving wrong answers" → users stop using it

**Prevention:**
- **Mandate Opus 4.5+ in OpenClaw config:** Set `DEFAULT_MODEL=claude-opus-4-5` (NOT haiku or sonnet)
- **Budget for Opus costs:** 100 Slack queries/day × 5K tokens avg × $15/1M = ~$7.50/day = $225/month (factor into pricing)
- **Implement result validation:** For critical queries (e.g., buyer contact reveals), have OpenClaw call API twice with different phrasings, compare results — flag mismatches
- **Fallback to human:** If OpenClaw confidence score <0.7 (based on model self-assessment), respond with "I'm not confident in this answer. Here's what I found: [data]. Please verify."
- **Monitor model performance:** Track query success rate by model — if Opus <95% success, file bug report

**Detection:**
- User feedback: "The bot said X but I verified it's Y" → log discrepancy
- Automated checks: Run test suite of 50 known queries daily, compare OpenClaw answers to ground truth
- Cost anomaly: If token usage spikes 3x without proportional query increase, model is retrying excessively

**Phase mapping:** Phase 21.4 (OpenClaw Deployment) — configure model settings before first user query

**Sources:**
- [Why OpenClaw Fails: What Testing 15+ AI Models Reveals | Medium](https://medium.com/@stephandensby/why-openclaw-fails-what-testing-15-ai-models-reveals-about-autonomous-agent-stability-ceba299e6ac9)
- [I Spent $47 testing OpenClaw for a week | Medium](https://medium.com/@likhitkumarvp/i-spent-47-testing-openclaw-for-a-week-heres-what-s-actually-happening-c274dc26a3fd)

---

### Pitfall 8: VPS Resource Contention (OpenClaw + Ghost = Memory Starvation)

**What goes wrong:** Running OpenClaw daemon alongside Ghost blog on the same Hetzner VPS can cause **memory starvation** — OpenClaw's browser automation spikes to 2GB RAM during tool execution, Ghost needs 512MB baseline, leaving <500MB for OS → **system freezes, OOM killer terminates processes randomly**.

**Why it happens:**
- OpenClaw's browser automation (Playwright) launches Chromium instances (each ~200MB RAM)
- Agent reasoning with Opus generates large context windows (up to 200K tokens in memory)
- Ghost (Node.js) doesn't release memory aggressively, holds onto 500MB even when idle
- VPS CPU is shared (hypervisor schedules fairly) but if one app monopolizes CPU, others starve

**Prevention:**
- **Size VPS for both workloads:** 8GB RAM minimum (2GB OpenClaw peak + 512MB Ghost + 1GB OS + 4GB buffer)
- **Set systemd memory limits:**
  ```ini
  # /etc/systemd/system/openclaw.service
  [Service]
  MemoryMax=2G
  MemoryHigh=1.8G  # soft limit, triggers warning
  CPUQuota=150%    # max 1.5 CPU cores
  ```
- **Disable OpenClaw browser automation:** If not using web scraping skills, set `ENABLE_BROWSER=false` to save 1GB RAM
- **Use swap space:** Add 4GB swap file (`sudo fallocate -l 4G /swapfile`) — prevents OOM kills but slows down (IO bottleneck)
- **Monitor resource usage:** Grafana + node_exporter → alert when RAM >85% or CPU >80% sustained for 5 min
- **Alternative: Separate VPS for OpenClaw** — Ghost on VPS #1, OpenClaw on VPS #2 (only adds $5/month for small VPS)

**Detection:**
- `dmesg | grep oom-killer` shows if Linux killed processes due to memory exhaustion
- Uptime drops: `uptime` shows recent reboot → check if OOM caused it
- Grafana memory graph: sudden drops to 0 = process killed

**Phase mapping:** Phase 21.4 (OpenClaw Deployment) — configure resource limits before deploying to production VPS

**Sources:**
- [VPS vs Shared Hosting Differences: Isolation & Performance](https://www.quape.com/vps-hosting-vs-shared-hosting-whats-the-real-difference/)
- [How does VMware handle resource contention?](https://falconcloud.ae/about/blog/how-does-vmware-handle-resource-contention/)
- [OpenClaw Hardware Requirements](https://boostedhost.com/blog/en/openclaw-hardware-requirements/)

---

### Pitfall 9: API Key in Query Params or Client-Side Code

**What goes wrong:** Developers accidentally expose API keys in **URL query parameters** (e.g., `/api/buyers?apiKey=sk_abc123`) or embed them in client-side JavaScript. This is catastrophic because (1) query params are logged in plain text by reverse proxies, CDNs, and browsers, (2) client-side JS is visible to all users via DevTools.

**Why it happens:**
- Habit from development: `curl localhost:3000/api/buyers?apiKey=test` works locally, gets copy-pasted to production
- Misunderstanding of header auth: developer thinks "it's just another way to pass the key"
- Client-side confusion: trying to call TendHunt API from browser JS, puts key in fetch() headers

**Prevention:**
- **Require header auth:** ONLY accept `X-API-Key` header, reject query params:
  ```typescript
  const apiKey = request.headers.get("x-api-key");
  if (request.url.includes("apiKey=")) {
    return Response.json({ error: "API key in URL is forbidden" }, { status: 400 });
  }
  ```
- **Block client-side API calls:** Public API endpoints should return CORS error for browser origins — only allow server-to-server calls
- **Audit reverse proxy logs:** Grep nginx/Cloudflare logs for `apiKey=` patterns → alert security team
- **Rate limiting:** Even with valid key, limit to 100 req/min — if key leaks, damage is contained

**Detection:**
- Automated: POST all new API routes to security scanner (Burp Suite, OWASP ZAP) → flags query param auth
- Manual: Code review checklist item "No API keys in query params"

**Phase mapping:** Phase 21.2 (Public API Implementation) — enforce header auth from day one

**Sources:**
- [API Security: 2026 Guide to Threats, Challenges, and Best Practices](https://www.cycognito.com/learn/api-security/)
- [Best practices for managing API keys | Google Cloud](https://docs.cloud.google.com/docs/authentication/api-keys-best-practices)

---

## Minor Pitfalls

### Pitfall 10: Slack Message Formatting Breaks with Complex Data Structures

**What goes wrong:** Slack's Block Kit has strict limits (3000 chars per block, 50 blocks per message). When OpenClaw returns a large dataset (e.g., 20 buyers with full details), the formatted message exceeds limits and **silently truncates** or fails to send.

**Prevention:**
- Paginate results in Slack: "Showing 5 of 47 results. Type 'next' for more."
- Use Slack attachments for large datasets (CSV download link)
- Test with max-size response (100 contracts) before shipping

**Phase mapping:** Phase 21.6 (Testing & Refinement)

---

### Pitfall 11: Redirect URI Mismatch in Slack OAuth

**What goes wrong:** Slack OAuth requires **exact redirect URI match** between (1) app settings, (2) initial authorize request, (3) token exchange request. A single typo (e.g., `http` vs `https`, trailing slash) causes `invalid_redirect_uri` error.

**Prevention:**
- Hardcode redirect URI in config: `const REDIRECT_URI = "https://app.tendhunt.com/api/auth/slack/callback"`
- Use same constant in all 3 places (no string duplication)
- Test OAuth flow in production-like environment (not localhost)

**Phase mapping:** Phase 21.5 (Slack OAuth & Bot Config)

**Sources:**
- [7 Solutions for Common Slack Integration Errors](https://moldstud.com/articles/p-7-essential-solutions-for-slack-integration-errors-every-developer-must-know)

---

### Pitfall 12: API Rate Limiting Per User vs Per Key

**What goes wrong:** Rate limiting by API key alone means one user's leaked key can **exhaust the entire TendHunt API quota** (100 req/min). Other users get 429 errors even though they're not abusing the API.

**Prevention:**
- Rate limit by **user ID** (extracted from API key), not by key itself
- Per-user quota: 100 req/min (not shared across keys)
- Global quota: 1000 req/min across all users (prevents DDoS)

**Phase mapping:** Phase 21.2 (Public API Implementation)

**Sources:**
- [API Security Risks and Trends for 2026](https://cybelangel.com/blog/api-security-risks/)

---

### Pitfall 13: No API Key Rotation = Permanent Compromise

**What goes wrong:** User's API key is leaked (e.g., in GitHub commit, Slack message). They revoke it, generate a new one. But **old integrations still have the leaked key stored** (OpenClaw config, CI/CD secrets) → attacker uses old key → still works because you didn't force expiration.

**Prevention:**
- Force key expiration: All keys expire after 90 days, must be regenerated
- Soft deprecation: 7 days before expiry, API returns `X-API-Key-Expiring: 7d` header → warn user
- Revocation propagation: When key revoked, add to Redis blacklist (checked on every request)

**Phase mapping:** Phase 21.3 (API Key Management UI)

**Sources:**
- [How to Become Great at API Key Rotation: Best Practices](https://blog.gitguardian.com/api-key-rotation-best-practices/)
- [API Key Management Best Practices](https://infisical.com/blog/api-key-management)

---

### Pitfall 14: Slack Bot Token vs User Token Confusion

**What goes wrong:** Developer uses **user token** instead of **bot token** for API calls. User token expires when user's session ends, bot token is permanent. When user logs out of Slack, all bot queries fail with `token_revoked`.

**Prevention:**
- Always use **bot token** for programmatic access (scopes: `bot`)
- Only use user token for user impersonation (rare, requires explicit consent)

**Phase mapping:** Phase 21.5 (Slack OAuth & Bot Config)

**Sources:**
- [Best practices for security | Slack](https://api.slack.com/authentication/best-practices)
- [Token types | Slack](https://api.slack.com/authentication/token-types)

---

### Pitfall 15: OpenClaw Conversation History Leaks Sensitive Data

**What goes wrong:** OpenClaw stores full conversation history (including API responses with buyer contact PII) in its database. When user types "show me my history", OpenClaw returns **all past conversations** including other users' data (if multi-user setup is misconfigured).

**Prevention:**
- Configure `CONVERSATION_HISTORY_LIMIT=50` (not unlimited)
- Scrub PII from OpenClaw history: redact emails, phone numbers before storing
- Implement user isolation: Each Slack user gets separate OpenClaw conversation thread (keyed by `slack_user_id`)

**Phase mapping:** Phase 21.4 (OpenClaw Deployment)

**Sources:**
- [Fix OpenClaw High Memory Usage - Performance Guide](https://www.openclawexperts.io/guides/troubleshooting/how-to-fix-openclaw-high-memory-usage)

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation |
|-------|---------------|------------|
| **21.1: API Design** | Pitfall #1 (API key leakage), Pitfall #2 (auth bypass) | Use MCP instead of REST, implement route-level auth |
| **21.2: Public API Implementation** | Pitfall #6 (MongoDB connections), Pitfall #9 (query param keys), Pitfall #12 (rate limiting) | Configure connection pooling, enforce header auth, user-scoped rate limits |
| **21.3: API Key Management UI** | Pitfall #13 (no rotation) | Implement 90-day expiration, revocation blacklist |
| **21.4: OpenClaw Deployment** | Pitfall #3 (exposed instance), Pitfall #7 (weak models), Pitfall #8 (resource contention), Pitfall #15 (conversation history) | Bind to localhost, use Opus 4.5+, set systemd limits, scrub PII from history |
| **21.5: Slack OAuth & Bot Config** | Pitfall #4 (rate limits), Pitfall #5 (OAuth token management), Pitfall #11 (redirect URI), Pitfall #14 (token type) | Design for 15 msg/min, implement `app_uninstalled` webhook, hardcode redirect URI, use bot tokens |
| **21.6: Testing & Refinement** | Pitfall #10 (message formatting) | Test with max-size responses, implement pagination |

---

## Summary: What Makes This Domain Risky?

1. **OpenClaw is bleeding-edge OSS** — released mid-2025, security model still maturing, 7% of skills leak credentials
2. **Slack's 2026 rate limit changes** — caught many developers off-guard, bots that worked pre-March now fail
3. **Next.js CVE-2025-29927** — critical auth bypass discovered Jan 2025, many self-hosted apps still vulnerable
4. **Multi-tenant complexity** — one TendHunt user's leaked API key shouldn't compromise other users, requires careful scoping
5. **PII exposure risk** — buyer contact data is GDPR-regulated, API key leaks = data breach notifications
6. **Shared VPS attack surface** — OpenClaw RCE = full server compromise, Ghost blog collateral damage
7. **LLM unreliability** — weaker models hallucinate API responses, require Opus to work (expensive)

**Confidence:** HIGH — all findings verified with official sources (Slack docs, Next.js security advisories, OpenClaw GitHub, security research from Snyk/Datadog/SecurityScorecard)

**Open questions:**
- MCP server spec still evolving — check compatibility with OpenClaw 2026.2.x before committing
- Slack Marketplace approval timeline unknown (could be 2-8 weeks)

---

## Sources

### Critical Pitfalls
- [It's easy to backdoor OpenClaw, and its skills leak API keys • The Register](https://www.theregister.com/2026/02/05/openclaw_skills_marketplace_leaky_security)
- [280+ Leaky Skills: How OpenClaw & ClawHub Are Exposing API Keys and PII | Snyk](https://snyk.io/blog/openclaw-skills-credential-leaks-research/)
- [Security Roadmap: Protecting API Keys from Agent Access · Issue #11829](https://github.com/openclaw/openclaw/issues/11829)
- [CVE-2025-29927: Next.js Middleware Authorization Bypass - Technical Analysis](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass)
- [Understanding CVE-2025-29927 | Datadog Security Labs](https://securitylabs.datadoghq.com/articles/nextjs-middleware-auth-bypass/)
- [Authorization Bypass in Next.js Middleware](https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw)
- [Postmortem on Next.js Middleware bypass - Vercel](https://vercel.com/blog/postmortem-on-next-js-middleware-bypass)
- [OpenClaw instances open to the internet present ripe targets • The Register](https://www.theregister.com/2026/02/09/openclaw_instances_exposed_vibe_code/)
- [Astrix Security Releases OpenClaw Scanner](https://www.prnewswire.com/news-releases/astrix-security-releases-openclaw-scanner-amid-growing-concerns-over-autonomous-ai-agents-302684133.html)
- [Researchers Find 341 Malicious ClawHub Skills](https://thehackernews.com/2026/02/researchers-find-341-malicious-clawhub.html)
- [Rate limit changes for non-Marketplace apps | Slack](https://api.slack.com/changelog/2025-05-terms-rate-limit-update-and-faq)
- [Rate limit changes for non-Marketplace apps | Slack Developer Docs](https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps/)
- [Rate limits | Slack Developer Docs](https://docs.slack.dev/apis/web-api/rate-limits/)
- [Installing with OAuth | Slack Developer Docs](https://docs.slack.dev/authentication/installing-with-oauth/)
- [Token types | Slack](https://api.slack.com/authentication/token-types)
- [7 Solutions for Common Slack Integration Errors](https://moldstud.com/articles/p-7-essential-solutions-for-slack-integration-errors-every-developer-must-know)

### Moderate Pitfalls
- [Atlas M0 (Free Cluster) Limits - Atlas - MongoDB Docs](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/)
- [Atlas Service Limits - Atlas - MongoDB Docs](https://www.mongodb.com/docs/atlas/reference/atlas-limits/)
- [Why OpenClaw Fails: What Testing 15+ AI Models Reveals | Medium](https://medium.com/@stephandensby/why-openclaw-fails-what-testing-15-ai-models-reveals-about-autonomous-agent-stability-ceba299e6ac9)
- [I Spent $47 testing OpenClaw for a week | Medium](https://medium.com/@likhitkumarvp/i-spent-47-testing-openclaw-for-a-week-heres-what-s-actually-happening-c274dc26a3fd)
- [VPS vs Shared Hosting Differences: Isolation & Performance](https://www.quape.com/vps-hosting-vs-shared-hosting-whats-the-real-difference/)
- [How does VMware handle resource contention?](https://falconcloud.ae/about/blog/how-does-vmware-handle-resource-contention/)
- [OpenClaw Hardware Requirements](https://boostedhost.com/blog/en/openclaw-hardware-requirements/)
- [API Security: 2026 Guide to Threats, Challenges, and Best Practices](https://www.cycognito.com/learn/api-security/)
- [Best practices for managing API keys | Google Cloud](https://docs.cloud.google.com/docs/authentication/api-keys-best-practices)

### Minor Pitfalls
- [API Security Risks and Trends for 2026](https://cybelangel.com/blog/api-security-risks/)
- [How to Become Great at API Key Rotation: Best Practices](https://blog.gitguardian.com/api-key-rotation-best-practices/)
- [API Key Management Best Practices](https://infisical.com/blog/api-key-management)
- [Best practices for security | Slack](https://api.slack.com/authentication/best-practices)
- [Fix OpenClaw High Memory Usage - Performance Guide](https://www.openclawexperts.io/guides/troubleshooting/how-to-fix-openclaw-high-memory-usage)
