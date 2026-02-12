# Scraping & Enrichment Strategies for UK Public Sector Organizations

**Target: ~2,384 buyer organizations | Infrastructure: Cloudflare + Apify + MongoDB**

---

## 1. Scraping Approaches: Technical Comparison

### 1.1 Cloudflare Workers (Distributed Scraping)

| Metric | Value | Source |
|--------|-------|--------|
| V8 isolate cold start | < 5ms | Cloudflare docs |
| Memory per isolate | ~1/10th of Node.js process | Cloudflare blog |
| CPU time limit (paid) | Up to 300,000ms (5 min) per invocation | Cloudflare changelog (March 2025) |
| Subrequests per invocation (paid) | 1,000 | Cloudflare Workers limits |
| Subrequests per invocation (free) | 50 | Cloudflare Workers limits |
| Rate limit (outbound) | ~2,000 subrequests/min per colo/zone/IP | Cloudflare community |
| Base cost (paid plan) | $5/month minimum | Cloudflare pricing |
| CPU time pricing | Billed only for CPU time, not I/O wait | Cloudflare blog |
| Egress/bandwidth charges | $0 (none) | Cloudflare pricing |
| Typical request CPU usage | 1-2ms | Cloudflare docs |

**Estimate for 2,384 orgs:**
- At 1 req/sec politeness rate for gov.uk: ~40 min for initial fetch
- At 3 concurrent workers with 1s delay: ~13 min
- Cost: Negligible on paid plan (well within $5/month base)
- If each org requires ~5 pages avg (home, about, board, procurement, contacts): ~11,920 requests total
- At 3 concurrent, 1s delay: ~66 min total scraping time

### 1.2 Apify Actors (Managed Scraping)

| Metric | Value | Source |
|--------|-------|--------|
| Free plan credits | $5 | Apify pricing |
| Starter plan | $39/month | Apify pricing |
| Scale plan | $199/month, $0.25/CU | Apify pricing |
| Business plan | $999/month, $0.25/CU | Apify pricing |
| Free plan CU rate | $0.40/CU overage | Apify pricing |
| 1 Compute Unit | ~1 GHz-hour CPU + 1 GB-hour memory | Apify docs |
| Creator plan | $1/month, $500 credits for 6 months | Apify pricing |

**Relevant Apify Actors Available:**
- **UK Government Contracts Scraper** (louisdeconinck/contracts-finder-uk-government) - Extracts contract data from Contracts Finder
- **Companies House UK Scraper** (lexis-solutions/companies-house-uk-scraper) - Company registration, SIC codes, officers, URLs
- **LinkedIn Companies & Profiles Bulk Scraper** (bebity/linkedin-premium-actor) - $4/1,000 short profiles, $8/1,000 full profiles
- **Website Content Crawler** (apify/website-content-crawler) - Deep crawl for LLM-ready content
- **AI Web Scraper** (eloquent_mountain/ai-web-scraper-extract-data-with-ease) - Structured JSON output
- **Google Search Scraper** (apify/google-search-scraper) - $0.25-$0.50/1,000 SERP results

**Estimate for 2,384 orgs:**
- Companies House lookup: ~$1-2 in CUs (lightweight API calls)
- Website Content Crawler (~5 pages/org): ~$15-25 in CUs
- LinkedIn company profiles: 2,384 * $0.008 = ~$19 for full profiles
- Google SERP for finding org websites: 2,384 queries * $0.0005 = ~$1.20
- **Total Apify cost estimate: $37-48 per full enrichment run**

### 1.3 Playwright (JavaScript-Heavy Sites)

| Metric | Value | Source |
|--------|-------|--------|
| Element click speed | ~290ms avg (vs Selenium ~536ms) | Browserless benchmark 2025 |
| Page load speed advantage | 12% faster than Selenium | Playwright 1.25 benchmark |
| Memory usage advantage | 15% lower than Selenium | Playwright 1.25 benchmark |
| Adoption growth | 67% growth since 2024 | Browserless report |
| Browser support | Chrome, Firefox, Safari | Playwright docs |

**When to use:** Council websites with dynamic content, JS-rendered meeting minutes, interactive procurement portals.

**Estimate for 2,384 orgs:**
- Assuming ~30% of org sites need Playwright (~715 orgs)
- At ~3 pages/org, ~5s per page: ~715 * 3 * 5 = ~10,725s = ~3 hours
- Can parallelize to ~4 concurrent browsers: ~45 min
- Cost: Free (open source), compute cost only

### 1.4 Simple Fetch (Static Pages)

**When to use:** .gov.uk pages, static council websites, API endpoints.

**Estimate for 2,384 orgs:**
- ~70% of orgs (~1,669) have static-fetchable content
- At ~5 pages/org, 1s delay: ~1,669 * 5 = ~8,345 requests
- At 10 req/sec (GOV.UK allows up to 10/sec): ~14 min
- Cost: Near-zero (fetch API in Workers)

### 1.5 PDF Parsing

| Library | Best For | Bundle Size | Performance |
|---------|----------|-------------|-------------|
| pdf-parse | Simple text PDFs, serverless | Lightweight | Fast for text-only |
| PDF.js / pdf.js-extract | Complex PDFs, browser rendering | Large (full runtime) | Good for 80% of PDFs |
| pdf2json | Layout-aware extraction | Medium | Better for tables/forms |
| pdf-data-parser | Structured data tables | Medium | Good for tabular data |

**Estimate:**
- ~20% of orgs may have relevant PDFs (board minutes, annual reports): ~477 orgs
- Average 2-3 PDFs per org: ~1,200 PDFs
- Average PDF size ~500KB-2MB
- Storage: ~1.2-2.4 GB in R2
- Processing time: ~1-2 sec per PDF for text extraction
- Total: ~20-40 min for PDF processing

---

## 2. Existing Apify Actors (Detailed)

### UK Government & Public Sector

| Actor | ID | Data Points | Pricing Model |
|-------|----|-------------|---------------|
| UK Government Contracts Scraper | louisdeconinck/contracts-finder-uk-government | Contract data from Contracts Finder | CU-based |
| Companies House UK Scraper | lexis-solutions/companies-house-uk-scraper | Registration, SIC codes, officers, URLs | CU-based |
| UK MHRA Scraper | lexis-solutions/mhra-uk-scraper | Healthcare product regulatory data | CU-based |
| Government Tender Scraper | happitap/government-tender-scraper | Multi-country tender data | CU-based |
| UK Government Contracts | nocodeventure/uk-government-contracts | Contract notices, max concurrency: 3 | CU-based |

### LinkedIn & Company Data

| Actor | Pricing | Data Points |
|-------|---------|-------------|
| LinkedIn Companies Bulk Scraper | $4/1,000 (short), $8/1,000 (full) | Company size, industry, specialties, employees |
| LinkedIn Profile Scraper | $3/1,000 profiles | Individual profiles, titles, experience |
| LinkedIn Company Employees | CU-based | Employee lists per company |

### Website & Content Extraction

| Actor | Best For | Output |
|-------|----------|--------|
| Website Content Crawler | Deep crawl, LLM-ready text | Markdown, text, HTML |
| AI Web Scraper | Structured data from any page | JSON |
| HTML Scraper | Raw HTML extraction | HTML |
| AI Website Content Markdown Scraper | Markdown conversion | Markdown |

### Search & Discovery

| Actor | Cost | Use Case |
|-------|------|----------|
| Google Search Scraper (apify/google-search-scraper) | $0.25-0.50/1,000 results | Finding org websites |
| Google Search Scraper (igolaizola) | $0.15/1,000 results | Budget SERP scraping |
| Cheap Google Search Scraper | $0.30/1,000 results | Bulk URL discovery |

---

## 3. AI-Powered Enrichment

### Claude API Pricing (Current 2025-2026)

| Model | Input Cost | Output Cost | Batch Input | Batch Output |
|-------|-----------|-------------|-------------|--------------|
| Claude Haiku 4.5 | $1/M tokens | $5/M tokens | $0.50/M | $2.50/M |
| Claude Sonnet 4.5 | $3/M tokens | $15/M tokens | $1.50/M | $7.50/M |
| Prompt caching write | $1.25/M tokens | -- | -- | -- |
| Prompt caching read | $0.10/M tokens | -- | -- | -- |

**Key Features:**
- Batch API: 50% discount, 24-hour processing window
- Prompt caching: Up to 90% cost savings on repeated prompts
- Structured outputs: 100% schema compliance (beta), 2-3% cost overhead
- System prompt overhead: 50-200 tokens depending on schema complexity

### Cost Estimates for 2,384 Org Enrichment

**Scenario: Extract structured data from scraped web pages using Claude Haiku 4.5 (batch)**

| Task | Input Tokens/Org | Output Tokens/Org | Orgs | Input Cost | Output Cost | Total |
|------|-----------------|-------------------|------|-----------|-------------|-------|
| Org profile extraction | ~2,000 | ~500 | 2,384 | $2.38 | $2.98 | $5.36 |
| Key personnel extraction | ~3,000 | ~800 | 2,384 | $3.58 | $4.77 | $8.35 |
| Procurement focus analysis | ~4,000 | ~1,000 | 2,384 | $4.77 | $5.96 | $10.73 |
| Board minutes summarization | ~5,000 | ~1,500 | 477 (20%) | $1.19 | $1.79 | $2.98 |
| Document classification | ~1,500 | ~300 | 2,384 | $1.79 | $1.79 | $3.58 |

**Total AI enrichment cost (batch Haiku): ~$31 per full pipeline run**

**With prompt caching (system prompt reused across all calls):**
- System prompt: ~500 tokens, cached after first call
- Cache read savings: ~$0.10/M * 500 * 2,383 = negligible savings on prompt
- Main savings from batch API: already at 50% discount
- **Estimated total with all optimizations: ~$25-30 per full run**

### AI Enrichment Use Cases

1. **Named Entity Recognition**: Extract key personnel (CEO, procurement director, CFO) from about pages and board minutes
2. **Document Classification**: Categorize scraped pages (annual report, board minutes, procurement policy, contact page, etc.)
3. **Relevance Scoring**: Score each org's procurement activity level on 1-10 scale
4. **Structured Data Extraction**: Pull org size, budget, sector, sub-sectors from unstructured text
5. **Procurement Focus Analysis**: Identify what categories each org typically procures

---

## 4. Data Storage & Schema Design

### Cloudflare R2 (File Storage)

| Metric | Value | Source |
|--------|-------|--------|
| Standard storage | $0.015/GB/month | Cloudflare R2 docs |
| Infrequent access storage | $0.01/GB/month | Cloudflare R2 docs |
| Class A operations (writes) | $4.50/million | Cloudflare R2 docs |
| Class B operations (reads) | $0.36/million | Cloudflare R2 docs |
| Egress bandwidth | $0 (free) | Cloudflare R2 docs |
| Free tier | 10 GB storage, 10M reads, 1M writes/month | Cloudflare R2 docs |

**Storage estimate for 2,384 orgs:**
- PDFs: ~1,200 files * 1MB avg = ~1.2 GB
- Scraped HTML/text cache: ~2,384 * 5 pages * 50KB = ~580 MB
- **Total R2 storage: ~1.8 GB = ~$0.027/month**
- **Operations: ~15,000 writes + reads = free tier**

### MongoDB Schema Extension

**Recommended Document Versioning Pattern:**
- Add `schemaVersion` field to buyer documents
- Store current enrichment in main collection
- Archive previous versions in `buyer_enrichment_history` collection
- Track freshness with `enrichedAt`, `enrichmentVersion`, `nextEnrichmentDue` fields

**Incremental Enrichment Pattern:**
- Use `$set` operations for field-level updates (not full document replacement)
- Track per-field freshness: `{ field: value, _meta: { updatedAt, source, confidence } }`
- Change detection via field-level timestamps prevents unnecessary re-processing

**Estimated MongoDB storage per org:**
- Base buyer document: ~2-5 KB
- Enriched data (personnel, procurement focus, scoring): ~10-20 KB
- Total for 2,384 orgs: ~24-48 MB (well within MongoDB Atlas free tier 512 MB)

---

## 5. Pipeline Architecture

### Queue-Based Processing with Cloudflare

**Cloudflare Queues Pricing:**

| Metric | Value | Source |
|--------|-------|--------|
| Cost per operation | $0.40/million operations | Cloudflare Queues docs |
| Operation size | 64 KB per operation | Cloudflare Queues docs |
| Operations per message | 3 (write + read + delete) | Cloudflare Queues docs |
| Egress charges | $0 | Cloudflare Queues docs |

**Durable Objects (Job Management):**

| Metric | Value | Source |
|--------|-------|--------|
| Storage per DO | Up to 10 GB | Cloudflare DO docs |
| Billing | Wall-clock time while active | Cloudflare DO docs |
| Hibernation | Not billed when hibernated | Cloudflare DO docs |
| Base cost | Included in $5/month Workers paid | Cloudflare pricing |
| SQLite storage billing | Starting January 2026 | Cloudflare docs |

**Pipeline Cost for 2,384 orgs:**
- Queue messages: 2,384 orgs * ~5 stages * 3 ops = ~35,760 operations = free (under 1M free tier)
- DO compute: ~2-4 hours active time for orchestration = minimal cost
- **Total pipeline infrastructure: ~$5/month (Workers paid plan base)**

### Recommended Pipeline Architecture

```
Stage 1: Discovery (Google SERP + Companies House API)
  - Find official website URL for each org
  - Get Companies House data (SIC codes, officers, status)
  - Time: ~15-20 min | Cost: ~$2-3

Stage 2: Web Scraping (Workers + Apify hybrid)
  - Static pages via Workers fetch (70% of orgs): ~15 min
  - Dynamic pages via Apify Website Content Crawler (30%): ~30 min
  - Time: ~45 min total | Cost: ~$15-20

Stage 3: PDF Collection (Workers + R2)
  - Download board minutes, annual reports
  - Store in R2 for processing
  - Time: ~20 min | Cost: ~$0.05

Stage 4: AI Enrichment (Claude Haiku Batch API)
  - Extract structured data from all scraped content
  - NER for key personnel
  - Procurement focus analysis
  - Document classification
  - Time: ~2-6 hours (batch API, 24h window) | Cost: ~$25-30

Stage 5: LinkedIn Enrichment (Apify)
  - Company profiles for org data
  - Key personnel verification
  - Time: ~30 min | Cost: ~$19

Stage 6: Store & Index (MongoDB)
  - Write enriched data to buyer collection
  - Update search indexes
  - Time: ~5 min | Cost: ~$0
```

**Total Pipeline Estimates:**

| Metric | Value |
|--------|-------|
| Total wall-clock time | ~4-8 hours (including batch API wait) |
| Active processing time | ~2-3 hours |
| Total cost per full run | ~$61-72 |
| Cost per organization | ~$0.026-0.030 |
| Monthly infrastructure cost | ~$5 (Cloudflare) + $39-199 (Apify) |

### Error Handling & Retry Strategy

- Cloudflare Queues: Built-in retry with exponential backoff
- Dead Letter Queue for failed enrichments
- Max 3 retries per stage before DLQ
- Expected success rate: ~85-90% on first pass, ~95-98% after retries
- Manual review queue for remaining 2-5%

### Rate Limiting Across Sources

| Source | Rate Limit | Our Target Rate |
|--------|-----------|-----------------|
| GOV.UK Content API | 10 req/sec max | 5 req/sec (polite) |
| Companies House API | 600 req/5 min (120/min) | 60 req/min (polite) |
| General .gov.uk sites | Rate-limited on excess | 1 req/sec per domain |
| Contracts Finder | maxConcurrency: 3, 1s delay | 3 concurrent, 1s delay |
| LinkedIn (via Apify) | Managed by Apify proxies | Apify-managed |

---

## 6. Legal & Ethical Considerations

### GOV.UK Content Reuse

| Aspect | Status | Source |
|--------|--------|--------|
| GOV.UK scraping allowed | Yes, with robots.txt compliance | GOV.UK help page |
| Rate limiting enforcement | Access restricted on excess | GOV.UK policy |
| Open Government License | Most Crown copyright content is OGL | GOV.UK |
| Commercial reuse | Permitted under OGL with attribution | National Archives |

### GDPR & Data Protection

| Consideration | Status | Requirement |
|--------------|--------|-------------|
| Scraping public sector org data (non-personal) | Legal | No special requirements |
| Scraping named individuals (procurement officers) | High-risk | Requires DPIA, lawful basis (Art. 6) |
| Processing personal data for legitimate interests | Available for private companies | Not available for public bodies as controllers |
| Data minimization | Required | Only collect necessary personnel data |
| Right to erasure | Applies | Must support deletion requests |
| UK DPA 2018 compliance | Required | Additional UK-specific provisions |

### Web Scraping Legal Status (UK)

| Factor | Legal Status | Notes |
|--------|-------------|-------|
| Public non-personal data | Generally legal | Must respect ToS and robots.txt |
| Data behind login/paywall | Potentially illegal | Computer Misuse Act 1990 applies |
| Defeating anti-bot measures | Risky | Could be "unauthorized access" |
| Copyright content reuse | Restricted | CDPA 1988 protections apply |
| UK TDM consultation (Dec 2024) | Proposed exception | Commercial AI training opt-out system |

### Recommended Legal Approach

1. **Stick to public, non-personal data** for automated scraping
2. **Use OGL-licensed data** from GOV.UK with proper attribution
3. **Conduct DPIA** before collecting any personal data (named personnel)
4. **Maintain robots.txt compliance** for all scraped domains
5. **Implement data retention policy** -- auto-delete raw scraped data after enrichment
6. **Log all scraping activity** for audit trail
7. **Respect rate limits** -- use polite crawl delays (1s between requests per domain)

---

## 7. Comprehensive Cost Summary

### One-Time Full Enrichment (2,384 Orgs)

| Component | Cost | Notes |
|-----------|------|-------|
| Cloudflare Workers (compute) | ~$0.50 | Well within $5/month base |
| Apify Website Content Crawler | ~$15-25 | ~5 pages per org |
| Apify Companies House Scraper | ~$2 | Lightweight API calls |
| Apify Google Search (URL discovery) | ~$1.20 | ~$0.50/1,000 results |
| Apify LinkedIn Company Profiles | ~$19 | ~$8/1,000 full profiles |
| Claude Haiku Batch API (enrichment) | ~$25-30 | All extraction tasks |
| Cloudflare R2 (PDF + cache storage) | ~$0.03 | ~1.8 GB |
| Cloudflare Queues | ~$0 | Under free tier |
| **Total per full run** | **~$63-78** | |
| **Cost per organization** | **~$0.026-0.033** | |

### Monthly Recurring (Incremental Updates)

| Component | Cost | Notes |
|-----------|------|-------|
| Cloudflare paid plan base | $5/month | Workers + DO + Queues |
| Apify subscription | $39-199/month | Depending on scale |
| Incremental re-enrichment (~20% of orgs/month) | ~$13-16 | ~477 orgs refreshed |
| MongoDB Atlas (free tier) | $0 | Well within 512 MB |
| R2 storage | ~$0.03/month | Minimal |
| **Total monthly** | **~$57-220/month** | Depending on Apify tier |

### Processing Time Summary

| Stage | Time | Parallelism |
|-------|------|-------------|
| URL Discovery (Google + Companies House) | 15-20 min | 3-5 concurrent |
| Web Scraping (static + dynamic) | 45-60 min | 3-10 concurrent |
| PDF Download & Parse | 20-30 min | 5 concurrent |
| AI Enrichment (Claude batch) | 2-6 hours | Batch API handles |
| LinkedIn Enrichment | 30 min | Apify-managed |
| MongoDB Write & Index | 5-10 min | Bulk operations |
| **Total end-to-end** | **~4-8 hours** | |

---

## 8. Technical Complexity Assessment

| Component | Complexity | Effort | Risk |
|-----------|-----------|--------|------|
| Cloudflare Workers scraper | Medium | 2-3 days | Low -- well-documented |
| Apify actor integration | Low | 1-2 days | Low -- existing actors |
| Playwright for dynamic sites | Medium-High | 2-3 days | Medium -- browser management |
| PDF parsing pipeline | Medium | 2 days | Medium -- varied formats |
| Claude AI enrichment | Medium | 2-3 days | Low -- structured outputs |
| Queue/pipeline orchestration | High | 3-5 days | Medium -- distributed systems |
| MongoDB schema extension | Low | 1 day | Low -- additive changes |
| Legal compliance (DPIA, etc.) | Medium | 2-3 days | High -- regulatory |
| **Total estimated effort** | | **~15-22 days** | |

---

## 9. Recommended Architecture Decision

### Hybrid Approach (Best Cost/Performance Balance)

**Use Cloudflare Workers for:**
- Static page scraping (70% of orgs)
- Pipeline orchestration (Queues + Durable Objects)
- PDF download and R2 storage
- Rate limiting and request scheduling

**Use Apify for:**
- Companies House data (existing actor)
- LinkedIn company profiles (existing actor, manages proxy rotation)
- Dynamic/JS-heavy websites (Website Content Crawler)
- Google SERP for URL discovery

**Use Claude Haiku Batch API for:**
- All AI enrichment tasks (structured data extraction, NER, classification)
- 50% cost savings via batch processing
- 100% schema compliance via structured outputs

**Use MongoDB for:**
- Primary data store with document versioning
- Aggregation pipelines for data quality checks
- Incremental update tracking with field-level timestamps

**Use Cloudflare R2 for:**
- PDF and document storage
- Scraped content cache
- Zero egress costs for API access

---

## Sources

- Cloudflare Workers Limits: https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare Workers Pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare R2 Pricing: https://developers.cloudflare.com/r2/pricing/
- Cloudflare Queues Pricing: https://developers.cloudflare.com/queues/platform/pricing/
- Cloudflare Durable Objects Pricing: https://developers.cloudflare.com/durable-objects/platform/pricing/
- Apify Pricing: https://apify.com/pricing
- Apify UK Government Contracts Scraper: https://apify.com/louisdeconinck/contracts-finder-uk-government/api
- Apify Companies House UK Scraper: https://apify.com/lexis-solutions/companies-house-uk-scraper
- Apify LinkedIn Bulk Scraper: https://apify.com/bebity/linkedin-premium-actor
- Apify Google Search Scraper: https://apify.com/apify/google-search-scraper
- Apify Website Content Crawler: https://apify.com/apify/website-content-crawler
- Claude API Pricing: https://platform.claude.com/docs/en/about-claude/pricing
- Claude Structured Outputs: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- Claude Haiku 4.5: https://www.anthropic.com/claude/haiku
- GOV.UK Content Reuse: https://www.gov.uk/help/reuse-govuk-content
- GOV.UK Content API: https://content-api.publishing.service.gov.uk/
- UK Companies House API: https://developer.company-information.service.gov.uk/developer-guidelines
- Companies House Rate Limits: https://developer-specs.company-information.service.gov.uk/guides/rateLimiting
- UK Contracts Finder API: https://www.contractsfinder.service.gov.uk/apidocumentation
- UK Web Scraping Legality: https://sprintlaw.co.uk/articles/is-web-scraping-legal-in-the-uk/
- GDPR Web Scraping Guide: https://www.zyte.com/blog/web-scraping-gdpr-compliance-guide/
- MongoDB Document Versioning: https://www.mongodb.com/docs/manual/data-modeling/design-patterns/data-versioning/
- MongoDB Schema Versioning: https://www.mongodb.com/blog/post/building-with-patterns-the-schema-versioning-pattern
- Playwright vs Selenium Benchmarks: https://www.browserless.io/blog/playwright-vs-selenium-2025-browser-automation-comparison
- Firecrawl Pricing: https://www.eesel.ai/blog/firecrawl-pricing
- ScrapeGraphAI vs Firecrawl: https://scrapegraphai.com/blog/scrapegraph-vs-firecrawl
- ScrapeGraphAI Pipeline: https://scrapegraphai.com/blog/zero-to-production-scraping-pipeline
