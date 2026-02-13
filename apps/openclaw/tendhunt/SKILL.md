---
name: tendhunt
description: TendHunt UK Procurement Intelligence - Search buyers, contracts, signals, personnel, spend data, and board documents from the UK public sector procurement ecosystem.
primaryEnv: TENDHUNT_API_KEY
---

# TendHunt Procurement Intelligence

You are connected to TendHunt, a UK public sector procurement intelligence platform.

## Available Endpoints

Base URL: `${TENDHUNT_BASE_URL}` (default: https://app.tendhunt.com)

### Buyers
- `GET /api/public/v1/buyers` -- Search buyers by sector, region, org type
  - Params: `query`, `sector`, `region`, `orgType`, `minEnrichmentScore`, `limit`
- `GET /api/public/v1/buyers/:id` -- Get full buyer details

### Contracts
- `GET /api/public/v1/contracts` -- Search contracts
  - Params: `query`, `sector`, `region`, `minValue`, `maxValue`, `limit`
- `GET /api/public/v1/contracts/:id` -- Get contract details

### Signals
- `GET /api/public/v1/signals` -- Search buying signals
  - Params: `organizationName`, `signalType`, `sector`, `dateFrom`, `dateTo`, `limit`

### Key Personnel
- `GET /api/public/v1/personnel` -- Search key personnel
  - Params: `buyerId`, `role`, `limit`

### Spend Data
- `GET /api/public/v1/spend/:buyerId` -- Get spending data for a buyer

### Board Documents
- `GET /api/public/v1/board-documents` -- Search board meeting documents
  - Params: `buyerId`, `committeeName`, `dateFrom`, `dateTo`, `limit`

### Scanners
- `GET /api/public/v1/scanners` -- List user's scanners
- `POST /api/public/v1/scanners` -- Create a new scanner
  - Body: `{ name, type: "rfps"|"meetings"|"buyers", searchQuery?, description? }`
- `POST /api/public/v1/scanners/:id/columns` -- Add AI column to scanner
  - Body: `{ name, prompt }`

### Scraping (Credit-gated)
- `POST /api/public/v1/scrape` -- Trigger web scraping
  - Body: `{ type: "linkedin", buyerId: "...", url: "https://linkedin.com/company/..." }`
  - Body: `{ type: "google", buyerId: "..." }`
  - Body: `{ type: "website", buyerId: "...", url?: "https://..." }`
  - Each scrape costs 1 credit
  - LinkedIn scraping is rate-limited to 30/hour
  - Returns scraped data and updates buyer record

## Authentication

All requests require an API key:
```
Authorization: Bearer th_live_xxxxxxxxxx
```

## Slack Formatting Guidelines

When returning results in Slack, use Block Kit format:
- Use `section` blocks with `mrkdwn` text
- Use `divider` between results
- Bold key fields: *Buyer:*, *Value:*, *Deadline:*
- Keep responses concise -- max 5 results per query
- Use emoji sparingly: :office: for buyers, :page_facing_up: for contracts, :chart_with_upwards_trend: for signals

## Example Queries

User: "Show me NHS buyers in London"
-> GET /api/public/v1/buyers?sector=NHS&region=London

User: "Find contracts worth over 1M"
-> GET /api/public/v1/contracts?minValue=1000000

User: "What signals are there for Manchester City Council?"
-> GET /api/public/v1/signals?organizationName=Manchester City Council

User: "Who are the key people at NHS England?"
-> First: GET /api/public/v1/buyers?query=NHS England (to get buyerId)
-> Then: GET /api/public/v1/personnel?buyerId=<id>
