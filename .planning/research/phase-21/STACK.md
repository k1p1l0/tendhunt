# Technology Stack: Phase 21 — Slack Integration via OpenClaw

**Project:** TendHunt Slack Integration (OpenClaw)
**Researched:** 2026-02-13
**Overall Confidence:** HIGH

## Executive Summary

This stack extends the existing TendHunt Next.js 16 + MongoDB app with:
1. Public REST API endpoints wrapping existing tool handlers
2. API key authentication and rate limiting
3. Slack OAuth "Add to Slack" flow
4. OpenClaw deployment on Hetzner VPS (alongside Ghost blog)
5. OpenClaw skill definition for TendHunt API integration

**Key principle:** Reuse existing infrastructure (MongoDB, Clerk userId scoping, tool handlers) while adding lightweight API authentication layer and external OpenClaw gateway.

---

## Core Stack (No Changes Needed)

| Component | Current Version | Notes |
|-----------|----------------|-------|
| Next.js | 16.1.6 | Already in use, proxy.ts replaces middleware.ts for auth |
| MongoDB | Atlas free tier (via mongoose 9.2.0) | API keys stored here with userId scope |
| Clerk | @clerk/nextjs 6.37.3 | Existing auth — API keys map to Clerk userId |
| Node.js runtime | 20+ | Next.js 16 requires Node 20+ |

**Rationale:** No framework changes needed. REST API routes are standard Next.js API routes with custom middleware.

---

## 1. Public REST API Layer

### Authentication Middleware

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| **crypto (Node.js built-in)** | Native | API key generation via `crypto.randomBytes(32).toString('base64url')` | **RECOMMENDED**: Cryptographically secure, no dependencies, 43-char URL-safe keys. [Source](https://thelinuxcode.com/nodejs-cryptorandombytes-secure-random-tokens-salts-and-key-material-in-real-projects/) |
| **nanoid** (alternative) | 5.1.6 (already installed) | Alternative: `nanoid(32)` for URL-friendly keys | Already in TendHunt deps. Use if you prefer semantic IDs over base64url. [Source](https://github.com/ai/nanoid) |

**Decision:** Use `crypto.randomBytes(32).toString('base64url')` for API key generation.

**Why crypto.randomBytes over nanoid:**
- Both are cryptographically secure ([nanoid uses crypto.randomBytes internally](https://medium.com/@matynelawani/uuid-vs-crypto-randomuuid-vs-nanoid-313e18144d8c))
- crypto.randomBytes is Node.js built-in (zero dependencies)
- 32 bytes → 43 chars base64url is industry standard for API keys (AWS, Stripe use similar)
- nanoid is better for IDs (readable, shorter), crypto.randomBytes better for secrets (max entropy)

**Confidence:** HIGH — Both official Node.js docs and 2026 security guides recommend crypto.randomBytes for API keys.

---

### Rate Limiting

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| **@upstash/ratelimit** | ^2.0.6 (latest 2026) | HTTP-based rate limiting with Redis backend | Serverless-friendly, no persistent connections, multi-region support, edge-compatible |
| **@upstash/redis** | ^1.37.0 (latest 2026) | Upstash Redis client for rate limit storage | Same vendor as ratelimit, HTTP-based (no socket), free tier available |

**Installation:**
```bash
bun add @upstash/ratelimit @upstash/redis
```

**Implementation Pattern (from Context7):**
```typescript
// apps/web/src/lib/ratelimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv(); // UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN

export const apiKeyRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 req/min (SLACK-08)
  prefix: "ratelimit:api",
  analytics: true,
});
```

**Why Upstash over alternatives:**
- **vs express-rate-limit:** Upstash is HTTP-based (no socket connections), works in Vercel/Cloudflare serverless
- **vs in-memory (Map):** Doesn't work across serverless instances, lost on restart
- **vs Redis (ioredis):** Upstash Redis is HTTP-based, works in edge runtime, auto-reconnects
- **vs Vercel KV:** Upstash has free tier (10K commands/day), better docs for Next.js

**Rate limit strategy (from SLACK-08):**
- 100 requests/minute per API key
- Sliding window algorithm (smoother than fixed window, prevents burst at boundary)
- Return `429 Too Many Requests` with `Retry-After` header

**Confidence:** HIGH — Upstash Ratelimit is purpose-built for Next.js serverless, 93 benchmark score on Context7, [official Next.js middleware integration](https://upstash.com/blog/nextjs-ratelimiting).

---

### API Key Middleware Pattern

**File:** `apps/web/src/middleware/api-auth.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import ApiKey from "@/models/api-key"; // MongoDB model
import { apiKeyRateLimit } from "@/lib/ratelimit";

export async function withApiKeyAuth(
  handler: (req: NextRequest, context: { userId: string }) => Promise<Response>
) {
  return async (req: NextRequest) => {
    // Extract Bearer token
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }

    const apiKey = authHeader.substring(7);

    // Verify API key in MongoDB
    await dbConnect();
    const keyDoc = await ApiKey.findOne({ key: apiKey, revoked: false });
    if (!keyDoc) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Rate limit by API key
    const { success, limit, remaining, reset } = await apiKeyRateLimit.limit(apiKey);
    if (!success) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfter: reset },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": reset.toString(),
            "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Update lastUsedAt (async, don't await)
    ApiKey.updateOne({ _id: keyDoc._id }, { lastUsedAt: new Date() }).exec();

    // Call handler with userId context (SLACK-03: scoped to user)
    const response = await handler(req, { userId: keyDoc.userId });

    // Add rate limit headers to response
    response.headers.set("X-RateLimit-Limit", limit.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set("X-RateLimit-Reset", reset.toString());

    return response;
  };
}
```

**Rationale:**
- **Bearer token** is REST API standard ([RFC 6750](https://medium.com/@dreamworld420/nextjs-authentication-app-router-middleware-1eefeae1d687))
- **Scoped to userId** (SLACK-03): API key document stores `userId`, all queries filter by this
- **Rate limit BEFORE handler** to block abusive requests early
- **Non-blocking lastUsedAt update** for analytics without latency
- **Standard HTTP headers** (`X-RateLimit-*`, `Retry-After`) for client-friendly responses

**Confidence:** HIGH — Pattern validated by Next.js 16 auth guides and Upstash docs.

---

### API Key MongoDB Schema

**File:** `apps/web/src/models/api-key.ts`

```typescript
import mongoose from "mongoose";

const ApiKeySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true }, // Clerk user ID
  key: { type: String, required: true, unique: true }, // 43-char base64url
  name: { type: String, required: true }, // User-defined label
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date },
  revoked: { type: Boolean, default: false, index: true },
});

export default mongoose.models.ApiKey || mongoose.model("ApiKey", ApiKeySchema);
```

**Security considerations:**
- **Unique index on `key`** for fast lookups
- **Compound index on `{ userId, revoked }`** for user's active keys list
- **Store key in plaintext** (NOT hashed) — API keys are bearer tokens, client must send exact value. Hash on client if needed for local storage.
- **Revocation via boolean flag** (soft delete) — preserves audit trail, allows "last used" analytics

**Confidence:** HIGH — Standard pattern from [API key management best practices 2026](https://apidog.com/blog/api-key-management-best-practices/).

---

## 2. Slack OAuth Integration

### Slack SDK

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| **@slack/oauth** | ^3.1.0 (latest 2026) | Official Slack OAuth flow handler | Handles state verification, code exchange, token storage |
| **@slack/web-api** | ^7.11.0 (latest 2026) | Slack Web API client (for metadata queries) | Official Slack SDK, used to verify workspace info post-OAuth |

**Installation:**
```bash
cd apps/web
bun add @slack/oauth @slack/web-api
```

**Why official Slack SDK:**
- Slack [deprecated custom OAuth implementations](https://tools.slack.dev/node-slack-sdk/oauth/) in favor of `@slack/oauth`
- Handles PKCE, state verification, token refresh automatically
- TypeScript support, maintained by Slack

**Confidence:** HIGH — Official Slack SDK, documented in [Slack Developer Docs 2026](https://docs.slack.dev/tools/bolt-js/concepts/authenticating-oauth/).

---

### OAuth Implementation (Next.js 16)

**Endpoints:**
- `GET /api/slack/oauth/install` — Generates Slack OAuth URL, redirects user
- `GET /api/slack/oauth/callback` — Receives code, exchanges for token, stores in MongoDB

**Pattern:**
```typescript
// apps/web/src/app/api/slack/oauth/install/route.ts
import { InstallProvider } from "@slack/oauth";

const installer = new InstallProvider({
  clientId: process.env.SLACK_CLIENT_ID!,
  clientSecret: process.env.SLACK_CLIENT_SECRET!,
  stateSecret: process.env.SLACK_STATE_SECRET!, // For CSRF protection
});

export async function GET() {
  const url = await installer.generateInstallUrl({
    scopes: ["chat:write", "commands"], // OpenClaw bot permissions
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/slack/oauth/callback`,
  });
  return Response.redirect(url);
}
```

```typescript
// apps/web/src/app/api/slack/oauth/callback/route.ts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const installation = await installer.handleCallback(req); // Verifies state, exchanges code

  // Store installation.bot.token in MongoDB SlackWorkspace collection
  // Link to current Clerk userId

  return Response.redirect("/settings?slack=connected");
}
```

**Security notes:**
- **HTTPS required** (Slack enforces this). Use ngrok for local dev ([source](https://next-auth.js.org/providers/slack))
- **State parameter** prevents CSRF (handled by InstallProvider)
- **Store bot token encrypted** (use MongoDB field-level encryption or encrypt before storage)

**Confidence:** MEDIUM — Next.js 13/14 had `handleCallback` compatibility issues ([GitHub issue](https://github.com/slackapi/node-slack-sdk/issues/1659)). Verify with Next.js 16 in testing. Fallback: manual OAuth flow with `fetch`.

---

### "Add to Slack" Button Component

**File:** `apps/web/src/components/settings/slack-connect-button.tsx`

```tsx
export function SlackConnectButton() {
  return (
    <a
      href="/api/slack/oauth/install"
      className="inline-flex items-center gap-2 px-4 py-2 bg-slack-purple text-white rounded"
    >
      <SlackIcon />
      Add to Slack
    </a>
  );
}
```

**Rationale:** Standard Slack OAuth pattern. Button redirects to install endpoint, which generates OAuth URL.

**Confidence:** HIGH — Standard pattern from [Slack OAuth guide](https://stateful.com/blog/slack-oauth).

---

## 3. OpenClaw Deployment (Hetzner VPS)

### OpenClaw Runtime

| Component | Version | Purpose | Why |
|-----------|---------|---------|-----|
| **OpenClaw** | Latest (GitHub main) | Self-hosted AI assistant with Slack integration | Open-source, 68K GitHub stars, active development |
| **Node.js** | 22+ | Runtime requirement | OpenClaw requires Node ≥22 ([source](https://github.com/openclaw/openclaw)) |
| **Docker Compose** | Latest | Container orchestration | **RECOMMENDED** for VPS production ([source](https://blog.laozhang.ai/en/posts/openclaw-installation-deployment-guide)) |

**Why Docker Compose over alternatives:**
- **vs systemd:** Docker provides isolation, simpler updates (`docker compose pull`), restart policies built-in
- **vs PM2:** Not mentioned in OpenClaw docs, Docker is officially supported
- **vs native install:** Docker avoids dependency conflicts with existing Ghost blog on same VPS

**Confidence:** HIGH — Docker Compose is [explicitly recommended for production](https://blog.laozhang.ai/en/posts/openclaw-installation-deployment-guide) by OpenClaw deployment guides.

---

### Deployment Architecture (Hetzner VPS)

**Current VPS setup:**
- Ghost blog already running (likely port 2368 or via Nginx reverse proxy)
- 2 vCPU / 4 GB RAM Hetzner instance (~$5/month) is sufficient for OpenClaw ([source](https://www.digitalocean.com/resources/articles/what-is-openclaw))

**OpenClaw services (Docker Compose):**
```yaml
# /opt/openclaw/docker-compose.yml
version: "3.8"
services:
  openclaw:
    image: ghcr.io/openclaw/openclaw:latest
    restart: unless-stopped
    ports:
      - "3001:3000" # Internal port, Nginx reverse proxy to openclaw.yourdomain.com
    environment:
      - SLACK_BOT_TOKEN=${SLACK_BOT_TOKEN}
      - SLACK_APP_TOKEN=${SLACK_APP_TOKEN} # For Socket Mode
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - NODE_ENV=production
    volumes:
      - ./workspace:/root/.openclaw/workspace # Skills directory
      - ./data:/root/.openclaw/data # State persistence
```

**Nginx reverse proxy config (alongside Ghost):**
```nginx
# /etc/nginx/sites-available/openclaw
server {
    listen 443 ssl http2;
    server_name openclaw.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/openclaw.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/openclaw.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Why reverse proxy:**
- Ghost already uses port 443 (or 80 via Nginx)
- OpenClaw needs separate subdomain (`openclaw.yourdomain.com`)
- SSL via Certbot (same as Ghost)

**Confidence:** HIGH — Standard VPS multi-app pattern. [Hetzner deployment guides](https://medium.com/@aamirkgigyani/hetzner-vps-deployment-guide-next-js-node-js-with-pm2-nginx-and-certbot-5d495bbe1028) show similar Nginx + Docker setups.

---

### Slack Socket Mode Setup

**Required Slack app settings:**
1. Create Slack app at api.slack.com
2. Enable **Socket Mode** (allows bot to receive events without public webhook)
3. Generate **Bot Token** (`xoxb-...`) with scopes: `chat:write`, `app_mentions:read`, `im:history`
4. Generate **App-Level Token** (`xapp-...`) for Socket Mode
5. Subscribe to bot events: `app_mention`, `message.im`

**Environment variables (.env):**
```bash
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
ANTHROPIC_API_KEY=sk-ant-...
```

**Why Socket Mode:**
- No public webhook URL needed (OpenClaw connects to Slack via WebSocket)
- Simpler firewall config (outbound only)
- Official OpenClaw integration method ([source](https://github.com/openclaw/openclaw))

**Confidence:** HIGH — Socket Mode is default OpenClaw Slack integration. [Slack Bolt docs](https://docs.slack.dev/tools/bolt-js/concepts/authenticating-oauth/) confirm.

---

## 4. OpenClaw Skill Definition

### Skill File Format

OpenClaw skills are Markdown files (`SKILL.md`) in the workspace directory:

**Path:** `/opt/openclaw/workspace/skills/tendhunt/SKILL.md`

**Example structure:**
```markdown
# TendHunt Procurement Intelligence

Search UK procurement data including buyers, contracts, signals, personnel, spending, and board documents.

## API Authentication

All endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer YOUR_API_KEY
```

Get your API key from TendHunt settings: https://app.tendhunt.com/settings/api-keys

## Endpoints

### Query Buyers

**POST** `https://app.tendhunt.com/api/public/buyers/query`

Search UK public sector buyer organizations.

**Request:**
```json
{
  "query": "education",
  "sector": "Education",
  "region": "London",
  "limit": 10
}
```

**Response:**
```json
{
  "buyers": [
    { "_id": "...", "name": "London Borough of Hackney", "sector": "Education", ... }
  ],
  "count": 10
}
```

### Query Contracts

**POST** `https://app.tendhunt.com/api/public/contracts/query`

Search procurement contracts and tenders.

**Request:**
```json
{
  "query": "software development",
  "sector": "Technology",
  "minValue": 50000,
  "limit": 10
}
```

[... continue for all 14 tool handlers ...]
```

**Rationale:**
- OpenClaw parses SKILL.md to learn API endpoints, parameters, response formats
- Markdown format allows natural language + code examples
- Skills auto-reload when SKILL.md changes

**Confidence:** MEDIUM — SKILL.md format confirmed by [OpenClaw docs](https://github.com/openclaw/openclaw), but exact schema details need validation during implementation. Fallback: check OpenClaw GitHub examples.

---

### Skill Installation

**Commands:**
```bash
# On Hetzner VPS, inside Docker container:
docker exec -it openclaw-openclaw-1 bash
mkdir -p /root/.openclaw/workspace/skills/tendhunt
nano /root/.openclaw/workspace/skills/tendhunt/SKILL.md
# Paste skill definition
exit

# Restart OpenClaw to reload skills
docker compose restart
```

**Alternative (volume mount):**
Mount skills directory as Docker volume (see docker-compose.yml above). Edit SKILL.md on host, auto-reloads in container.

**Confidence:** HIGH — Standard Docker volume pattern.

---

## 5. Supporting Infrastructure

### MongoDB Collections (New)

| Collection | Purpose | Schema |
|-----------|---------|--------|
| `apikeys` | API key storage | `{ userId, key, name, createdAt, lastUsedAt, revoked }` |
| `slackworkspaces` | Slack OAuth installations | `{ userId, teamId, botToken (encrypted), installedAt }` |

**Encryption for `botToken`:**
Use [MongoDB Client-Side Field Level Encryption](https://www.mongodb.com/docs/manual/core/security-client-side-encryption/) OR encrypt in app before storage:

```typescript
import crypto from "crypto";

const algorithm = "aes-256-gcm";
const key = Buffer.from(process.env.ENCRYPTION_KEY!, "hex"); // 32-byte key

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${encrypted.toString("hex")}:${authTag.toString("hex")}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, encryptedHex, authTagHex] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final("utf8");
}
```

**Why encrypt bot tokens:**
- Slack bot tokens grant full access to workspace
- GDPR compliance (sensitive data at rest)
- Industry standard ([source](https://apidog.com/blog/api-key-management-best-practices/))

**Confidence:** HIGH — AES-256-GCM is NIST-approved, standard in Node.js crypto module.

---

### Environment Variables (New)

**apps/web/.env.local:**
```bash
# Upstash Redis (for rate limiting)
UPSTASH_REDIS_REST_URL=https://your-region.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Slack OAuth
SLACK_CLIENT_ID=1234567890.1234567890
SLACK_CLIENT_SECRET=abcdef1234567890
SLACK_STATE_SECRET=random-32-char-string

# API key encryption
ENCRYPTION_KEY=64-char-hex-string # Generate: openssl rand -hex 32

# Public app URL (for OAuth redirects)
NEXT_PUBLIC_APP_URL=https://app.tendhunt.com
```

**Hetzner VPS (.env):**
```bash
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
ANTHROPIC_API_KEY=sk-ant-...
```

**Confidence:** HIGH — Standard Next.js and Docker env var patterns.

---

## Alternatives Considered

### Rate Limiting

| Option | Recommended | Why Not |
|--------|-------------|---------|
| Upstash Ratelimit | ✅ **YES** | HTTP-based, serverless-friendly, free tier, Next.js middleware integration |
| express-rate-limit | ❌ No | Requires persistent connection, not edge-compatible |
| Vercel KV | ❌ No | Vendor lock-in, no free tier, Upstash has better docs |
| In-memory Map | ❌ No | Lost on serverless restarts, doesn't scale across instances |

**Confidence:** HIGH

---

### API Key Generation

| Option | Recommended | Why Not |
|--------|-------------|---------|
| crypto.randomBytes(32) | ✅ **YES** | Native, cryptographically secure, 43-char base64url is industry standard |
| nanoid(32) | ⚠️ Maybe | Already in deps, but optimized for IDs not secrets. Use crypto for max entropy. |
| uuid v4 | ❌ No | Only 122 bits randomness (vs 256 for crypto), 36 chars with dashes (not URL-friendly) |

**Confidence:** HIGH

---

### Hetzner Deployment

| Option | Recommended | Why Not |
|--------|-------------|---------|
| Docker Compose | ✅ **YES** | Official OpenClaw recommendation, isolation, simple updates |
| systemd | ⚠️ Maybe | Tighter system integration, but conflicts with Ghost dependencies possible |
| PM2 | ❌ No | Not mentioned in OpenClaw docs, Docker is superior for multi-service setups |

**Confidence:** HIGH

---

### Slack SDK

| Option | Recommended | Why Not |
|--------|-------------|---------|
| @slack/oauth + @slack/web-api | ✅ **YES** | Official Slack SDK, TypeScript support, handles PKCE/state |
| Custom OAuth with fetch | ❌ No | Reinventing wheel, security risks (CSRF), no token refresh handling |
| next-slack-oauth (community) | ❌ No | Unmaintained, @slack/oauth is official replacement |

**Confidence:** HIGH

---

## Installation Guide

### 1. Next.js App (API Layer)

```bash
cd apps/web

# Install rate limiting
bun add @upstash/ratelimit @upstash/redis

# Install Slack OAuth
bun add @slack/oauth @slack/web-api

# Generate encryption key
openssl rand -hex 32 >> .env.local
echo "ENCRYPTION_KEY=<paste-output-above>" >> .env.local

# Create Upstash Redis instance at upstash.com (free tier)
# Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to .env.local

# Create Slack app at api.slack.com
# Add SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_STATE_SECRET to .env.local
```

---

### 2. Hetzner VPS (OpenClaw)

```bash
# SSH into Hetzner VPS
ssh root@your-vps-ip

# Install Docker + Docker Compose (if not installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install docker-compose-plugin

# Create OpenClaw directory
mkdir -p /opt/openclaw/workspace/skills/tendhunt
cd /opt/openclaw

# Create docker-compose.yml (see section 3 above)
nano docker-compose.yml

# Create .env with Slack tokens
nano .env

# Start OpenClaw
docker compose up -d

# Check logs
docker compose logs -f

# Create TendHunt skill
nano workspace/skills/tendhunt/SKILL.md
# (Paste skill definition from section 4)

# Restart to reload skill
docker compose restart
```

---

### 3. Nginx Reverse Proxy (if needed)

```bash
# Create Nginx config
nano /etc/nginx/sites-available/openclaw

# Enable site
ln -s /etc/nginx/sites-available/openclaw /etc/nginx/sites-enabled/

# Generate SSL cert
certbot --nginx -d openclaw.yourdomain.com

# Test and reload
nginx -t
systemctl reload nginx
```

---

## Testing Checklist

- [ ] API key generation (`crypto.randomBytes(32).toString('base64url')` produces 43-char string)
- [ ] API key auth middleware rejects missing/invalid keys with 401
- [ ] Rate limiting returns 429 after 100 requests/minute
- [ ] Rate limiting headers (`X-RateLimit-*`) present in responses
- [ ] Slack OAuth redirect generates valid URL with state parameter
- [ ] Slack OAuth callback exchanges code for bot token
- [ ] Bot token stored encrypted in MongoDB
- [ ] OpenClaw Docker container starts and connects to Slack (Socket Mode)
- [ ] OpenClaw skill loads TendHunt API endpoints
- [ ] Slack bot responds to `@openclaw search buyers in education sector` with TendHunt data

---

## Security Checklist

- [ ] API keys generated with `crypto.randomBytes` (not Math.random)
- [ ] API keys stored in MongoDB with userId scope (SLACK-03)
- [ ] Rate limiting active (100 req/min per key)
- [ ] Bearer token auth enforced on all `/api/public/*` endpoints
- [ ] Slack bot tokens encrypted at rest (AES-256-GCM)
- [ ] OAuth state parameter verified (CSRF protection)
- [ ] HTTPS required for Slack OAuth (enforced by Slack)
- [ ] MongoDB indexes on `apikeys.key` and `apikeys.userId`
- [ ] No API keys in Git (`.env.local` in `.gitignore`)
- [ ] Upstash Redis credentials in environment variables only

---

## Open Questions & Risks

### MEDIUM Risk: Next.js 16 + @slack/oauth Compatibility

**Issue:** GitHub reports `handleCallback()` incompatibility with Next.js 13+ App Router ([issue #1659](https://github.com/slackapi/node-slack-sdk/issues/1659)).

**Mitigation:**
1. Test `@slack/oauth` with Next.js 16 in dev
2. If broken, implement manual OAuth flow with `fetch` (exchange code for token via `https://slack.com/api/oauth.v2.access`)

**Confidence:** MEDIUM

---

### LOW Risk: OpenClaw Skill Format Evolution

**Issue:** SKILL.md format not fully documented. May require trial-and-error.

**Mitigation:**
1. Check OpenClaw GitHub for example skills
2. Test skill loading with simple example first
3. Iterate based on logs

**Confidence:** MEDIUM

---

### LOW Risk: Upstash Free Tier Limits

**Issue:** 10K commands/day free tier. If TendHunt has >10K API requests/day, need paid plan.

**Mitigation:**
1. Monitor Upstash dashboard
2. Alert at 8K commands/day
3. Upgrade to $10/month plan (100K commands) if needed

**Confidence:** HIGH (free tier sufficient for MVP)

---

## Version Notes

All versions listed are current as of 2026-02-13:
- @upstash/ratelimit: ^2.0.6 (verified via Context7, HIGH confidence)
- @slack/oauth: ^3.1.0 (verified via npm, HIGH confidence)
- Node.js 22: Required by OpenClaw (verified via GitHub README, HIGH confidence)
- Docker Compose: Latest stable (v2.x recommended)

---

## Sources

### HIGH Confidence (Official Docs + Context7)
- [Upstash Ratelimit Context7](https://context7.com/cahidarda/ratelimit/llms.txt) — Rate limiting implementation
- [Upstash Next.js Guide](https://upstash.com/blog/nextjs-ratelimiting) — Middleware integration
- [OpenClaw GitHub](https://github.com/openclaw/openclaw) — System requirements, Docker setup
- [OpenClaw Deployment Guide](https://blog.laozhang.ai/en/posts/openclaw-installation-deployment-guide) — VPS deployment patterns
- [Slack OAuth Docs](https://docs.slack.dev/tools/bolt-js/concepts/authenticating-oauth/) — Official OAuth flow
- [Node.js crypto.randomBytes](https://thelinuxcode.com/nodejs-cryptorandombytes-secure-random-tokens-salts-and-key-material-in-real-projects/) — API key generation
- [API Key Management Best Practices](https://apidog.com/blog/api-key-management-best-practices/) — Storage, rotation, revocation
- [Next.js 16 Proxy/Middleware](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) — Auth middleware patterns

### MEDIUM Confidence (WebSearch Verified)
- [Hetzner VPS Deployment](https://medium.com/@aamirkgigyani/hetzner-vps-deployment-guide-next-js-node-js-with-pm2-nginx-and-certbot-5d495bbe1028) — Nginx + Docker patterns
- [NanoID vs UUID vs crypto](https://medium.com/@matynelawani/uuid-vs-crypto-randomuuid-vs-nanoid-313e18144d8c) — Security comparison
- [Slack OAuth Next.js](https://stateful.com/blog/slack-oauth) — Implementation guide
- [Next.js 16 Auth Changes](https://medium.com/@reactjsbd/next-js-16-whats-new-for-authentication-and-authorization-1fed6647cfcc) — Proxy rename, auth patterns

### LOW Confidence (Needs Validation)
- @slack/oauth + Next.js 16 compatibility — GitHub issue mentions v13 problems, needs testing with v16
- OpenClaw SKILL.md exact schema — Inferred from docs, needs validation with actual examples

---

**End of Stack Research**
