# Feature Landscape: Slack Bot + Public API Integration

**Domain:** Enterprise Slack Integration + Public REST API for Procurement Intelligence
**Project:** TendHunt Phase 21 — OpenClaw Slack Bot + API Key Management
**Researched:** 2026-02-13
**Overall Confidence:** HIGH (grounded in Slack official docs, 2026 API management trends, competitive analysis)

---

## Executive Summary

This document defines features for TendHunt's Slack bot integration and public REST API (Phase 21). The integration exposes TendHunt's 14 existing tool handlers (query_buyers, query_contracts, query_signals, etc.) as authenticated REST endpoints, with a Slack bot (OpenClaw) wrapping those APIs via natural language.

**Key User Story:** Procurement professionals ask questions in Slack (`"Show contracts in healthcare sector over £500K"`) → OpenClaw bot calls TendHunt API → Returns formatted results in Slack thread.

**Scope:**
1. Public REST API with API key authentication
2. API key management dashboard (create, revoke, view usage)
3. Slack OAuth flow ("Add to Slack" button)
4. Slack bot UX (slash commands, ephemeral messages, interactive components)
5. Rate limiting, usage analytics, and developer documentation

---

## Table Stakes

Features users expect from **any** enterprise Slack bot or public API product. Missing these = users perceive the integration as incomplete or unprofessional.

| # | Feature | Why Expected | Complexity | Phase 21? | Sources |
|---|---------|--------------|------------|-----------|---------|
| **API Authentication & Security** |
| TS-1 | **API Key Authentication** | Standard for public APIs. Every API management platform (Stripe, Twilio, GitHub) uses API keys for auth. | Low | YES | [Microsoft Azure API Management](https://learn.microsoft.com/en-us/azure/api-management/developer-portal-overview), [API Management Tools 2026](https://www.digitalapi.ai/blogs/api-management-tools-and-platforms) |
| TS-2 | **API Key Scoping to User Account** | Each API key must be scoped to the authenticated user's data. User A's key cannot access User B's scanners/searches. | Medium | YES | [API Key Management Best Practices](https://multitaskai.com/blog/api-key-management-best-practices/), [API Security 2026](https://www.securityweek.com/cyber-insights-2026-api-security/) |
| TS-3 | **HTTPS/TLS Encryption** | All API traffic must be encrypted. HTTP-only APIs are unacceptable in 2026. | Low | YES | [API Security Best Practices](https://www.legitsecurity.com/aspm-knowledge-base/api-key-security-best-practices) |
| TS-4 | **API Key Rotation Support** | Users can generate new keys and revoke old ones. Industry standard: 90-day rotation. | Low | YES | [API Key Rotation Best Practices](https://blog.gitguardian.com/api-key-rotation-best-practices/), [API Key Security](https://www.techtarget.com/searchsecurity/tip/API-keys-Weaknesses-and-security-best-practices) |
| **API Management Dashboard** |
| TS-5 | **Create API Key** | User clicks "Generate API Key" → system returns key once (copy to clipboard, never shown again). | Low | YES | [API Developer Portal Guide](https://devspheretechnologies.com/api-developer-portal-guide/), [Internal Developer Portals](https://www.digitalapi.ai/blogs/best-internal-api-developer-portals) |
| TS-6 | **Revoke API Key** | User can delete/revoke a key immediately. Revoked keys fail authentication within seconds. | Low | YES | [API Key Management](https://infisical.com/blog/api-key-management) |
| TS-7 | **List Active API Keys** | Dashboard shows all active keys with: creation date, last used timestamp, masked key (show last 4 chars). | Low | YES | [API Management Platforms 2026](https://techstory.in/top-15-api-management-platforms-in-2026/) |
| TS-8 | **Key Usage Metadata** | Each key shows "last used" timestamp and total request count. | Medium | YES | [API Analytics and Monitoring](https://www.cloudzero.com/blog/api-metrics/) |
| **Rate Limiting** |
| TS-9 | **Rate Limiting by API Key** | Standard: 100 requests/minute per key (adjustable). Returns HTTP 429 with `Retry-After` header when exceeded. | Medium | YES | [Rate Limiting Best Practices](https://developers.cloudflare.com/waf/rate-limiting-rules/best-practices/), [API Rate Limiting 2026](https://gcore.com/learning/api-rate-limiting) |
| TS-10 | **Rate Limit Headers in Response** | Every API response includes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers. | Low | YES | [Rate Limits Slack](https://api.slack.com/docs/rate-limits) |
| **API Documentation** |
| TS-11 | **Interactive API Documentation** | OpenAPI/Swagger docs with "Try It" playground. Users can test endpoints directly in browser. | Medium | YES | [Interactive API Documentation](https://docs.gitlab.com/api/openapi/openapi_interactive/), [Swagger UI](https://swagger.io/tools/swagger-ui/), [OpenAPI Tools 2026](https://treblle.com/blog/best-openapi-documentation-tools) |
| TS-12 | **Authentication Guide** | Clear docs on how to include API key in request headers (`Authorization: Bearer YOUR_KEY`). | Low | YES | [API Developer Portal](https://www.moesif.com/blog/api-strategy/api-development/What-is-an-API-Developer-Portal-The-Ultimate-Guide/) |
| TS-13 | **Endpoint Reference Docs** | Each endpoint documented with: description, parameters (required/optional), example request/response, error codes. | Medium | YES | [API Documentation Best Practices](https://document360.com/blog/api-developer-portal-examples/) |
| TS-14 | **Error Response Format** | Consistent JSON error format: `{"error": "message", "code": "ERROR_CODE", "details": {...}}`. | Low | YES | [Common API Mistakes](https://zuplo.com/learning-center/common-pitfalls-in-restful-api-design) |
| **Slack Bot Basics** |
| TS-15 | **Slash Command Support** | User types `/tendhunt [query]` → bot responds. Standard Slack bot pattern. | Low | YES | [Implementing Slash Commands](https://api.slack.com/interactivity/slash-commands), [Slack Bot UX](https://api.slack.com/interactivity) |
| TS-16 | **Ephemeral Messages (Private Responses)** | Bot replies visible only to the user who invoked the command (default). Option to post public responses with flag. | Low | YES | [Ephemeral Messages](https://docs.slack.dev/reference/methods/chat.postEphemeral/), [Slack Interactive Messages](https://api.slack.com/interactive-messages) |
| TS-17 | **Error Handling with User-Friendly Messages** | When API fails, bot says "Sorry, I couldn't find that data. Please try again." NOT raw error JSON. | Low | YES | [Error Handling Slack Bots](https://vercel.com/academy/slack-agents/error-handling-and-resilience) |
| TS-18 | **Loading Indicators** | For slow queries, bot posts "Searching contracts..." message, then updates with results. | Low | YES | [Slack Bot UX Patterns](https://medium.com/@maelezzabdi/designing-a-chatbot-for-slack-lessons-learned-25edfe2c3a59) |
| **Slack OAuth Flow** |
| TS-19 | **"Add to Slack" Button** | User clicks button in TendHunt settings → Slack OAuth flow → bot installed in their workspace. | Medium | YES | [Installing with OAuth](https://docs.slack.dev/authentication/installing-with-oauth/), [Slack OAuth](https://slack.dev/node-slack-sdk/oauth/) |
| TS-20 | **OAuth Scope Configuration** | Bot requests minimum scopes: `chat:write`, `commands`, `users:read`. No excessive permissions. | Low | YES | [Understanding OAuth Scopes](https://docs.slack.dev/tools/python-slack-sdk/tutorial/understanding-oauth-scopes/) |
| TS-21 | **Bot Token Storage** | After OAuth, store bot token and team ID securely (encrypted in database). | Medium | YES | [OAuth Best Practices](https://api.slack.com/legacy/oauth) |

---

## Differentiators

Features that set TendHunt's Slack/API integration apart from generic Slack bots or procurement tool APIs. These create competitive advantage.

| # | Feature | Value Proposition | Complexity | Phase 21? | Sources |
|---|---------|-------------------|------------|-----------|---------|
| **Context-Aware Slack Bot** |
| D-1 | **Natural Language Query Understanding** | User asks "Show healthcare contracts over £500K" → bot parses intent → calls `query_contracts` API with `sector=healthcare&minValue=500000`. No rigid syntax required. | HIGH | YES (OpenClaw handles this) | [Context-Aware Slack Bots](https://slack.com/blog/news/slackbot-context-aware-ai-agent-for-work), [Multi-Turn AI Conversations](https://www.eesel.ai/blog/multi-turn-ai-conversations) |
| D-2 | **Multi-Turn Conversation Memory** | User: "Show NHS contracts" → Bot: "Found 47 contracts." → User: "Filter to London only" → Bot remembers previous query context. | HIGH | PARTIAL (OpenClaw capability, needs state management) | [Conversation Context Memory](https://medium.com/@enriquecano12/how-i-built-a-context-aware-slack-bot-with-llm-powers-meet-hal-66048bc4133b) |
| D-3 | **Inline Actionable Buttons** | Bot response includes buttons: "View in TendHunt", "Save to Scanner", "Reveal Contact". User clicks → action executes. | Medium | YES | [Interactive Components Slack](https://api.slack.com/interactivity/handling), [Message Buttons](https://api.slack.com/legacy/interactive-messages) |
| D-4 | **Threaded Results for Long Lists** | When query returns 50+ results, bot posts summary message + thread with paginated results. Keeps channel clean. | Medium | YES | [Slack Bot Best Practices](https://api.slack.com/bot-users) |
| D-5 | **Proactive Buying Signal Alerts** | Bot posts daily/weekly summary of new buying signals matching user's saved searches. "3 new PROCUREMENT signals in your sectors." | Medium | PARTIAL (requires cron job + Slack API integration) | [Slack Post Message API](https://slack.com/help/articles/202026038-An-introduction-to-Slackbot) |
| **Advanced API Features** |
| D-6 | **Webhook Notifications for New Data** | User registers webhook URL → TendHunt sends POST when new contracts/signals match their criteria. Real-time integration for power users. | HIGH | NO (post-MVP) | [Webhooks for Custom Integrations 2026](https://notigrid.com/blog/webhooks-for-custom-integrations), [API Webhooks](https://www.bannerbear.com/blog/webhook-vs-api-explained-when-to-use-each-for-third-party-integration/) |
| D-7 | **GraphQL API Endpoint** | Alternative to REST. Single query fetches contracts + buyer details + signals in one request. Reduces round-trips for advanced users. | HIGH | NO (post-MVP) | [API Multiprotocol Agility 2026](https://www.digitalapi.ai/blogs/what-are-the-leading-api-management-features-for-scalable-b2b-connectivity) |
| D-8 | **SDK/Client Libraries** | Official Node.js and Python SDKs for easier integration. `npm install @tendhunt/api-client`. | HIGH | NO (post-MVP) | [API Developer Portal Features](https://www.gravitee.io/platform/api-developer-portal) |
| D-9 | **Sandbox/Test Environment** | Separate API endpoint with test data. Developers can experiment without affecting production queries or credits. | Medium | NO (post-MVP) | [API Sandbox Testing 2026](https://www.gravitee.io/blog/api-sandbox-explained), [API Playgrounds](https://hygraph.com/glossary/api-playground) |
| D-10 | **API Versioning with Deprecation Notices** | `/v1/contracts`, `/v2/contracts`. When v1 deprecated, return `X-API-Deprecation` header with sunset date. | Medium | NO (post-MVP, start with v1 only) | [API Versioning 2026](https://developer.payments.jpmorgan.com/api/versioning), [Deprecation Policies](https://medium.com/@erwindev/api-versioning-strategies-from-url-paths-to-headers-and-why-we-chose-deprecation-384b809fa712) |
| **Usage Analytics & Monitoring** |
| D-11 | **Per-Endpoint Usage Breakdown** | Dashboard shows: 45% calls to `query_contracts`, 30% to `query_buyers`, etc. Helps user understand API usage patterns. | Medium | PARTIAL (log requests, simple analytics) | [API Usage Analytics](https://www.cloudzero.com/blog/api-metrics/), [Usage-Based Billing 2026](https://www.techradar.com/pro/will-xs-usage-based-api-pricing-succeed-in-winning-over-developers) |
| D-12 | **Real-Time Request Logs** | User sees live log of API requests: timestamp, endpoint, status code, response time. Like Stripe's request log. | Medium | NO (post-MVP) | [API Monitoring Best Practices](https://www.digitalapi.ai/blogs/api-management-tools-and-platforms) |
| D-13 | **Usage Quota Alerts** | Email when user hits 80% of rate limit: "You've used 8,000 of 10,000 monthly requests. Upgrade to increase limit." | Low | NO (post-MVP, nice-to-have) | [API Usage Quotas 2026](https://developers.google.com/analytics/devguides/reporting/data/v1/quotas) |
| **Slack-Specific UX Enhancements** |
| D-14 | **Rich Formatting for Contract Cards** | Contracts displayed as Slack Block Kit cards with logo, title, value, deadline. NOT plain text. | Medium | YES | [Slack Block Kit](https://api.slack.com/block-kit) |
| D-15 | **Channel-Specific Bot Permissions** | Workspace admin can restrict bot to specific channels (#procurement, #sales). | Low | NO (use Slack's native channel permissions) | [Slack Workspace Admin](https://slack.com/help/categories/200122103-Workspace-administration) |
| D-16 | **Help Command Documentation** | `/tendhunt help` posts guide with example queries and available commands. | Low | YES | [Slack Bot Help Patterns](https://api.slack.com/docs) |
| D-17 | **Slack App Home Tab** | User clicks TendHunt app → custom Home tab shows: API key status, recent queries, quick links to TendHunt dashboard. | Medium | NO (post-MVP) | [App Home Slack](https://medium.com/slack-developer-blog/unlock-better-ux-for-your-slack-bot-with-app-home-opened-30810619845) |

---

## Anti-Features

Features to explicitly NOT build for Phase 21. These would waste time, add complexity, or compete in areas where TendHunt has no competitive advantage.

| # | Anti-Feature | Why Avoid | What to Do Instead | Sources |
|---|--------------|-----------|-------------------|---------|
| **Over-Engineered API Features** |
| AF-1 | **Custom API Gateway with Full Service Mesh** | Overkill for MVP. Tools like Kong, Apigee, AWS API Gateway are enterprise-scale. TendHunt needs simple REST endpoints with API key auth, not microservices orchestration. | Use Next.js API routes with middleware for auth + rate limiting. Cloudflare Workers for public API if needed. | [API Management Cost Breakdown](https://www.digitalapi.com/blogs/api-management-cost) |
| AF-2 | **OAuth 2.0 for API (Instead of API Keys)** | OAuth is for user-facing apps (Slack bot uses OAuth). For server-to-server API access, API keys are simpler and sufficient. OAuth adds token refresh, scope management, etc. | Stick with API keys for public REST API. OAuth only for Slack app installation. | [API Authentication Patterns](https://www.legitsecurity.com/aspm-knowledge-base/api-key-security-best-practices) |
| AF-3 | **Public API Marketplace Listing** | Listing on RapidAPI, Postman API Network, etc. requires approval process, revenue sharing, and ongoing maintenance. Premature for Phase 21. | Direct API access via TendHunt settings. Marketplace is V2 growth strategy. | [API Marketplace Dynamics](https://api7.ai/blog/api-management-trends-you-cannot-ignore) |
| AF-4 | **GraphQL Federation** | GraphQL is already a stretch goal (D-7). Federation (combining multiple GraphQL services) is way beyond MVP scope. | Single REST API for now. GraphQL V2 if REST proves limiting. | [API Multiprotocol](https://www.digitalapi.ai/blogs/what-are-the-leading-api-management-features-for-scalable-b2b-connectivity) |
| AF-5 | **API Monetization via Usage-Based Billing** | Charging per API call (e.g., $0.01/request) requires complex billing, invoice generation, and payment processing. TendHunt's credit system is simpler. | API access included in subscription tiers. Credits gate premium actions (contact reveal), not API calls. | [API Pricing Strategies](https://www.digitalapi.ai/blogs/api-pricing-strategies-for-monetization-everything-you-need-to-know) |
| **Slack Bot Over-Engineering** |
| AF-6 | **Conversational AI with Unlimited Context** | Building GPT-4-level conversational memory ("User: 'Remember when I asked about NHS contracts last week?'") requires vector DB, embeddings, and complex prompt engineering. OpenClaw provides basic context. | Support 2-3 turn conversations (immediate follow-ups). Long-term memory is V2. | [Multi-Turn Conversations](https://medium.com/@enriquecano12/how-i-built-a-context-aware-slack-bot-with-llm-powers-meet-hal-66048bc4133b) |
| AF-7 | **Slack Workflow Builder Integration** | Slack's native workflow builder is powerful but requires custom function manifests and app submission. Not needed for MVP. | Use slash commands + interactive buttons. Workflows are advanced V2 feature. | [Slack Workflows](https://api.slack.com/workflows) |
| AF-8 | **Voice/Video Call Integration** | Slack supports audio/video via Calls API. Irrelevant for procurement data queries. | Text-based bot only. |  |
| AF-9 | **Multi-Workspace Bot (Public Slack App Directory)** | Publishing to Slack App Directory requires review, compliance docs, and support for any workspace. TendHunt bot is for users' own workspaces only (private distribution). | OAuth flow installs bot in user's workspace. No public listing. | [Slack App Directory](https://slack.com/apps) |
| AF-10 | **Real-Time Collaborative Editing in Slack** | Notion-style collaborative docs inside Slack messages. Way out of scope for a data query bot. | Show data, link to TendHunt dashboard for editing. |  |
| **Documentation Over-Engineering** |
| AF-11 | **Video Tutorials for Every API Endpoint** | High production cost for marginal value. Written docs + interactive playground are sufficient. | Written guides + Swagger UI "Try It" buttons. Videos for high-level onboarding only. | [API Documentation Tools](https://clickhelp.com/clickhelp-technical-writing-blog/12-best-api-documentation-software-and-tools/) |
| AF-12 | **Localized API Docs (Multi-Language)** | TendHunt targets UK market. English docs are sufficient. Translation adds ongoing maintenance burden. | English only for MVP. | [API Developer Portal](https://document360.com/blog/api-developer-portal-examples/) |
| AF-13 | **Auto-Generated SDK from OpenAPI** | Tools like OpenAPI Generator can create SDKs, but output quality varies. Manual SDK (if built) is better controlled. | OpenAPI spec for docs. Manual SDK (Node.js/Python) if demand warrants (post-MVP). | [OpenAPI Documentation 2026](https://treblle.com/blog/best-openapi-documentation-tools) |
| **Security Theater** |
| AF-14 | **IP Whitelisting for API Keys** | Enterprise feature. Most users don't have static IPs. Adds complexity to key management UI. | API key + HTTPS is sufficient. IP whitelisting is V2 enterprise tier feature. | [API Security Best Practices](https://www.techtarget.com/searchsecurity/tip/API-keys-Weaknesses-and-security-best-practices) |
| AF-15 | **Two-Factor Auth for API Key Generation** | 2FA should protect TendHunt account login (Clerk handles this). Requiring 2FA for every API key generation is excessive. | 2FA on account login. API key generation requires active session. | [API Key Management](https://infisical.com/blog/api-key-management) |
| AF-16 | **Client-Side API Key Encryption** | Encrypt keys in browser before sending to server. Adds complexity for minimal security gain (HTTPS already encrypts in transit). | Store keys hashed in database. Return plaintext once on generation (user copies). | [API Key Storage Best Practices](https://blog.gitguardian.com/api-key-rotation-best-practices/) |
| **Slack Bot UX Anti-Patterns** |
| AF-17 | **Auto-Responding to Every Message Mentioning "Contract"** | Users hate bots that spam channels. Only respond to direct invocations (`/tendhunt`, `@TendHunt`). | Explicit invocation only. No keyword triggers in ambient conversation. | [Slack Bot UX Mistakes](https://www.cloverpop.com/blog/six-ux-challenges-when-building-slack-apps-and-how-we-fixed-them) |
| AF-18 | **Sending Same Message Repeatedly** | Bot sends welcome message every time App Home is opened, overwhelming users. | Check state before sending messages. Welcome once per user, not per session. | [Slack App Home UX](https://medium.com/slack-developer-blog/unlock-better-ux-for-your-slack-bot-with-app-home-opened-30810619845) |
| AF-19 | **Public Channel Responses by Default** | Posting procurement queries (potentially sensitive) to public channels by default. | Ephemeral messages (user-only) by default. User must opt-in to post publicly. | [Ephemeral Messages](https://docs.slack.dev/reference/methods/chat.postEphemeral/) |
| AF-20 | **Complex Slash Command Syntax** | `/tendhunt query type=contracts sector=healthcare min_value=500000` — users hate this. | Natural language via OpenClaw: `/tendhunt healthcare contracts over £500K`. | [Slack Slash Command UX](https://medium.com/@maelezzabdi/designing-a-chatbot-for-slack-lessons-learned-25edfe2c3a59) |

---

## Feature Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                  API Key Management (TS-5, TS-6, TS-7)         │
│                         (Create, Revoke, List)                  │
└───────────────────────┬─────────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        v                               v
┌───────────────────┐          ┌────────────────────┐
│   API Key Auth    │          │  Slack OAuth Flow  │
│   Middleware      │          │   (TS-19, TS-20)   │
│   (TS-1, TS-2)    │          │  "Add to Slack"    │
└────────┬──────────┘          └─────────┬──────────┘
         │                               │
         v                               v
┌────────────────────┐          ┌────────────────────┐
│  REST API Endpoints│          │   Slack Bot Token  │
│  (All 14 Tools)    │<─────────│   Storage (TS-21)  │
│  - query_buyers    │  Calls   └────────────────────┘
│  - query_contracts │             │
│  - query_signals   │             │
│  - get_buyer_detail│             v
│  - create_scanner  │    ┌───────────────────────┐
│  - etc.            │    │  Slack Bot Handlers   │
└────────┬───────────┘    │  - Slash Cmds (TS-15) │
         │                │  - Ephemeral (TS-16)  │
         │                │  - Errors (TS-17)     │
         v                │  - Loading (TS-18)    │
┌────────────────────┐    └───────────┬───────────┘
│  Rate Limiting     │                │
│  (TS-9, TS-10)     │                │
│  100 req/min/key   │<───────────────┘
└────────┬───────────┘      Uses API key
         │                  from OAuth user
         v
┌────────────────────┐
│  Usage Analytics   │
│  (TS-8, D-11)      │
│  Log requests,     │
│  track per-endpoint│
└────────┬───────────┘
         │
         v
┌────────────────────┐
│  API Documentation │
│  (TS-11, TS-12, TS-13)│
│  OpenAPI/Swagger   │
│  Interactive Docs  │
└────────────────────┘
```

**Critical Dependencies:**
1. **API Key System** must be built first — both API endpoints and Slack bot need it for authentication.
2. **Slack OAuth** stores bot token → Slack bot uses token to post messages → Bot calls TendHunt API using **user's API key** (retrieved via OAuth workspace mapping).
3. **Rate Limiting** sits in front of all API calls (REST + Slack bot API calls count toward same limit).
4. **OpenAPI Spec** generated from endpoint code → Powers Swagger UI docs.

---

## Implementation Complexity Tiers

### Tier 1: Core Table Stakes (1-2 weeks)
- API key CRUD (TS-5, TS-6, TS-7)
- API key authentication middleware (TS-1, TS-2)
- REST endpoints wrapping existing 14 tool handlers
- Basic rate limiting (TS-9)
- OpenAPI spec + Swagger UI (TS-11)
- Error response format (TS-14)

### Tier 2: Slack Integration (1 week)
- Slack OAuth flow (TS-19, TS-20, TS-21)
- Slash command handler (TS-15)
- Ephemeral message responses (TS-16)
- Error handling + loading indicators (TS-17, TS-18)
- Help command (D-16)

### Tier 3: UX Polish (3-5 days)
- API key usage metadata (TS-8, last used timestamp)
- Rate limit headers (TS-10)
- Rich Slack formatting with Block Kit (D-14)
- Inline actionable buttons (D-3)
- Threaded results (D-4)

### Tier 4: Advanced Features (Post-MVP)
- Multi-turn conversation memory (D-2)
- Proactive alerts in Slack (D-5)
- Webhooks (D-6)
- GraphQL endpoint (D-7)
- SDK client libraries (D-8)
- API sandbox/test env (D-9)
- API versioning (D-10)
- Real-time request logs (D-12)
- Slack App Home tab (D-17)

---

## Common Pitfalls & Mistakes to Avoid

Based on 2026 industry research, these are the most common mistakes teams make when building Slack bots and public APIs:

### API Design Mistakes
1. **Using POST for everything** — GET for reads, POST for writes. RESTful conventions matter. ([Source](https://specmatic.io/appearance/how-to-identify-avoid-api-design-anti-patterns/))
2. **Inconsistent naming** — `get_buyer` vs `getBuyer` vs `buyer-detail`. Pick one convention (snake_case or camelCase) and stick to it. ([Source](https://zuplo.com/learning-center/common-pitfalls-in-restful-api-design))
3. **Breaking changes without versioning** — Adding required parameters or changing response structure breaks existing integrations. Use API versioning from day 1. ([Source](https://developer.payments.jpmorgan.com/api/versioning))
4. **Vague error messages** — "Error 500" tells users nothing. Return actionable errors: `{"error": "Invalid sector code. Valid values: healthcare, education, ..."}`. ([Source](https://blog.devjunction.in/5-common-restful-api-anti-patterns-and-how-to-avoid-them))
5. **Missing rate limit headers** — Users don't know they're approaching limits until they hit 429. Always return `X-RateLimit-Remaining`. ([Source](https://developers.cloudflare.com/waf/rate-limiting-rules/best-practices/))

### API Security Mistakes
6. **Hardcoded API keys in client code** — Keys exposed in GitHub, mobile apps, browser dev tools. Never ship keys client-side. ([Source](https://www.securityweek.com/cyber-insights-2026-api-security/))
7. **No key rotation policy** — Compromised keys remain valid indefinitely. Enforce 90-day rotation or provide rotation tools. ([Source](https://blog.gitguardian.com/api-key-rotation-best-practices/))
8. **Excessive API key permissions** — Key has access to all endpoints when it only needs `query_contracts`. Implement scoped keys in V2. ([Source](https://www.appsecure.security/blog/state-of-api-security-common-misconfigurations))

### Slack Bot UX Mistakes
9. **Over-reliant on slash commands** — Users forget syntax. Natural language (via OpenClaw) is more intuitive. ([Source](https://www.cloverpop.com/blog/six-ux-challenges-when-building-slack-apps-and-how-we-fixed-them))
10. **Posting to public channels by default** — Procurement queries may be sensitive. Default to ephemeral (user-only) messages. ([Source](https://medium.com/@maelezzabdi/designing-a-chatbot-for-slack-lessons-learned-25edfe2c3a59))
11. **No status communication** — User invokes bot → silence for 10 seconds → results appear. Post "Searching..." message immediately. ([Source](https://vercel.com/academy/slack-agents/error-handling-and-resilience))
12. **Repeating the same message** — Bot sends welcome message every time App Home opens. Track state to avoid spam. ([Source](https://medium.com/slack-developer-blog/unlock-better-ux-for-your-slack-bot-with-app-home-opened-30810619845))
13. **Unclear conversation workflows** — User doesn't know if bot is waiting for input or done. Use buttons ("Continue", "Cancel") to clarify state. ([Source](https://medium.com/@maelezzabdi/designing-a-chatbot-for-slack-lessons-learned-25edfe2c3a59))

### Documentation Mistakes
14. **No interactive "Try It" playground** — Users have to set up Postman/cURL to test. Embed Swagger UI for instant testing. ([Source](https://docs.gitlab.com/api/openapi/openapi_interactive/))
15. **Outdated docs** — Code changes, docs don't. Generate OpenAPI spec from code (e.g., via route annotations) to auto-sync. ([Source](https://treblle.com/blog/best-openapi-documentation-tools))
16. **No example requests/responses** — Users guess at request format. Show working examples for every endpoint. ([Source](https://document360.com/blog/api-developer-portal-examples/))

### Rate Limiting Mistakes
17. **Fixed rate limits for all users** — Free tier and enterprise tier have same limits. Implement tiered limits based on subscription. ([Source](https://konghq.com/blog/engineering/token-rate-limiting-and-tiered-access-for-ai-usage))
18. **No Retry-After header** — User hits 429, doesn't know when to retry. Return `Retry-After: 60` (seconds). ([Source](https://api.slack.com/docs/rate-limits))
19. **Rate limiting blocks health checks** — Monitoring tools hit rate limit, alerting breaks. Exempt `/health` and `/status` endpoints. ([Source](https://gcore.com/learning/api-rate-limiting))

---

## Quality Gates for Phase 21

Before marking Phase 21 complete, verify:

### API Functionality
- [ ] All 14 existing tool handlers exposed as REST endpoints
- [ ] API key auth middleware rejects requests with invalid/missing keys
- [ ] Rate limiting returns HTTP 429 with correct headers when exceeded
- [ ] OpenAPI spec is accurate (all endpoints, params, responses documented)
- [ ] Swagger UI "Try It" successfully calls real endpoints
- [ ] Error responses follow consistent JSON format

### API Key Management
- [ ] User can generate new API key from settings page
- [ ] Generated key shown once (copy-to-clipboard, then masked)
- [ ] User can revoke key, revoked keys fail auth within 5 seconds
- [ ] Dashboard shows: key creation date, last used timestamp, request count
- [ ] Keys are scoped to user — User A's key cannot query User B's scanners

### Slack Integration
- [ ] "Add to Slack" OAuth button in TendHunt settings works
- [ ] OAuth flow stores bot token + team ID securely
- [ ] User can invoke bot with `/tendhunt [query]`
- [ ] Bot responds with ephemeral message (user-only by default)
- [ ] Bot posts "Searching..." loading message for slow queries
- [ ] Bot handles errors gracefully (user-friendly messages, not raw JSON)
- [ ] `/tendhunt help` returns guide with example queries
- [ ] Rich formatting: contract cards use Slack Block Kit, not plain text

### Rate Limiting & Analytics
- [ ] 100 requests/minute enforced per API key
- [ ] Rate limit headers in every API response
- [ ] Request logs capture: timestamp, endpoint, key ID, status code
- [ ] Dashboard shows per-endpoint usage breakdown (if D-11 implemented)

### Documentation
- [ ] API docs accessible at `/api/docs` or similar
- [ ] Authentication guide explains header format (`Authorization: Bearer KEY`)
- [ ] Each endpoint has: description, parameters, example request/response, error codes
- [ ] Interactive playground (Swagger UI) allows testing without Postman

### Security
- [ ] All API traffic over HTTPS/TLS
- [ ] API keys hashed in database (bcrypt or similar)
- [ ] Revoked keys immediately invalidated (cache invalidation if using Redis)
- [ ] No API keys exposed in client-side code or logs

---

## Sources

### Slack Bot Features & UX
- [AI in Slack: Work Faster and Smarter, Right Where You Are](https://slack.com/blog/productivity/agentic-productivity-with-slack)
- [Introducing Slackbot, Your Context-Aware AI Agent for Work](https://slack.com/blog/news/slackbot-context-aware-ai-agent-for-work)
- [Implementing slash commands | Slack Developer Docs](https://api.slack.com/interactivity/slash-commands)
- [Handling user interaction in your Slack apps](https://api.slack.com/interactivity/handling)
- [Installing with OAuth | Slack Developer Docs](https://docs.slack.dev/authentication/installing-with-oauth/)
- [Understanding OAuth scopes for bots](https://docs.slack.dev/tools/python-slack-sdk/tutorial/understanding-oauth-scopes/)
- [Ephemeral Messages | Slack Developer Docs](https://docs.slack.dev/reference/methods/chat.postEphemeral/)
- [Error Handling and Resilience | Vercel Academy](https://vercel.com/academy/slack-agents/error-handling-and-resilience)
- [Rate limits | Slack Developer Docs](https://docs.slack.dev/apis/web-api/rate-limits/)
- [Six UX Challenges Building Slack Apps And How We Fixed Them](https://www.cloverpop.com/blog/six-ux-challenges-when-building-slack-apps-and-how-we-fixed-them)
- [Unlock better UX for your Slack Bot with App Home Opened](https://medium.com/slack-developer-blog/unlock-better-ux-for-your-slack-bot-with-app-home-opened-30810619845)
- [Designing a chatbot for Slack — Lessons learned](https://medium.com/@maelezzabdi/designing-a-chatbot-for-slack-lessons-learned-25edfe2c3a59)

### API Key Management & Security
- [11 Best API Key Management Tools in 2026](https://www.digitalapi.ai/blogs/top-api-key-management-tools)
- [How to Become Great at API Key Rotation: Best Practices and Tips](https://blog.gitguardian.com/api-key-rotation-best-practices/)
- [8 API Key Management Best Practices for 2025](https://multitaskai.com/blog/api-key-management-best-practices/)
- [API Key Security Best Practices: Secure Sensitive Data](https://www.legitsecurity.com/aspm-knowledge-base/api-key-security-best-practices)
- [API Key Management | Definition and Best Practices](https://infisical.com/blog/api-key-management)
- [Cyber Insights 2026: API Security](https://www.securityweek.com/cyber-insights-2026-api-security/)
- [The State of API Security in 2026: Common Misconfigurations](https://www.appsecure.security/blog/state-of-api-security-common-misconfigurations)

### API Developer Portals & Documentation
- [Top 7 Internal API Developer Portals to Use in 2026](https://www.digitalapi.ai/blogs/best-internal-api-developer-portals)
- [API Developer Portal: Ultimate Success Guide 2026](https://devspheretechnologies.com/api-developer-portal-guide/)
- [What is an API Developer Portal? The Ultimate Guide](https://www.moesif.com/blog/api-strategy/api-development/What-is-an-API-Developer-Portal-The-Ultimate-Guide/)
- [Interactive API documentation | GitLab Docs](https://docs.gitlab.com/api/openapi/openapi_interactive/)
- [REST API Documentation Tool | Swagger UI](https://swagger.io/tools/swagger-ui/)
- [13 Best OpenAPI Documentation Tools for 2026](https://treblle.com/blog/best-openapi-documentation-tools)
- [API Developer Portal](https://document360.com/blog/api-developer-portal-examples/)

### API Rate Limiting
- [Rate limiting best practices · Cloudflare](https://developers.cloudflare.com/waf/rate-limiting-rules/best-practices/)
- [What Is API Rate Limiting? Benefits, Methods, and Best Practices](https://gcore.com/learning/api-rate-limiting)
- [Streamline AI Usage with Token Rate-Limiting & Tiered Access](https://konghq.com/blog/engineering/token-rate-limiting-and-tiered-access-for-ai-usage)
- [API rate limiting explained: From basics to best practices](https://tyk.io/learning-center/api-rate-limiting-explained-from-basics-to-best-practices/)

### API Anti-Patterns & Best Practices
- [API Design Anti-patterns: How to identify & avoid them](https://specmatic.io/appearance/how-to-identify-avoid-api-design-anti-patterns/)
- [Common Mistakes in RESTful API Design](https://zuplo.com/learning-center/common-pitfalls-in-restful-api-design)
- [5 Common Restful API Anti-Patterns and How to Avoid Them](https://blog.devjunction.in/5-common-restful-api-anti-patterns-and-how-to-avoid-them)
- [Advanced API Development Best Practices 2026](https://stellarcode.io/blog/advanced-api-development-best-practices-2026/)

### API Versioning & Deprecation
- [API Versioning | J.P. Morgan Developer Portal](https://developer.payments.jpmorgan.com/api/versioning)
- [What is API Deprecation & Its Guidelines](https://document360.com/blog/api-deprecation/)
- [API Versioning Strategies: From URL Paths to Headers and Why We Chose Deprecation](https://medium.com/@erwindev/api-versioning-strategies-from-url-paths-to-headers-and-why-we-chose-deprecation-384b809fa712)
- [How to Handle API Deprecation](https://oneuptime.com/blog/post/2026-02-02-api-deprecation/view)

### API Analytics & Usage
- [The API Metrics Every SaaS Team Must Track In 2026](https://www.cloudzero.com/blog/api-metrics/)
- [Data API limits and quotas | Google Analytics](https://developers.google.com/analytics/devguides/reporting/data/v1/quotas)
- [API pricing strategies for monetization](https://www.digitalapi.ai/blogs/api-pricing-strategies-for-monetization-everything-you-need-to-know)
- [Using API Usage Data to Build Flexible Pricing Tiers](https://zuplo.com/learning-center/using-api-usage-data-for-flexible-pricing-tiers)

### Webhooks & Advanced Features
- [Webhooks for Custom Integrations: Complete Guide 2026](https://notigrid.com/blog/webhooks-for-custom-integrations)
- [Webhook vs. API Explained: When to Use Each](https://www.bannerbear.com/blog/webhook-vs-api-explained-when-to-use-each-for-third-party-integration/)
- [What are the leading API management features for scalable B2B connectivity?](https://www.digitalapi.ai/blogs/what-are-the-leading-api-management-features-for-scalable-b2b-connectivity)

### Conversational AI & Context
- [How I Built a Context-Aware Slack Bot with LLM Powers](https://medium.com/@enriquecano12/how-i-built-a-context-aware-slack-bot-with-llm-powers-meet-hal-66048bc4133b)
- [A practical guide to multi-turn AI conversations](https://www.eesel.ai/blog/multi-turn-ai-conversations)
- [What Are Conversational Agents? A Simple Guide](https://slack.com/blog/productivity/conversational-agents)

### API Sandbox & Testing
- [API Sandbox Architecture: Isolated Testing for Secure Integration](https://www.gravitee.io/blog/api-sandbox-explained)
- [API Playground | Hygraph](https://hygraph.com/glossary/api-playground)
- [What is API Sandbox? Definition, Examples, Key Components](https://katalon.com/resources-center/blog/what-is-api-sandbox)
- [Virtualization, Sandboxes, and Playgrounds for a Wholesome API](https://nordicapis.com/virtualization-sandboxes-playgrounds-wholesome-api/)
