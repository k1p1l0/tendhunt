# TendHunt Public API Reference

Base URL: `https://app.tendhunt.com`

All endpoints require authentication via API key header:
```
Authorization: Bearer th_live_xxxxxxxxxx
```

---

## Buyers

### Search Buyers

```
GET /api/public/v1/buyers
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Free-text search across buyer names |
| `sector` | string | Filter by sector (e.g. "NHS", "Education", "Local Government") |
| `region` | string | Filter by region (e.g. "London", "North West") |
| `orgType` | string | Filter by organization type |
| `minEnrichmentScore` | number | Minimum enrichment completeness score (0-100) |
| `limit` | number | Max results to return (default: 20, max: 100) |

```bash
curl -H "Authorization: Bearer th_live_xxx" \
  "https://app.tendhunt.com/api/public/v1/buyers?sector=NHS&region=London&limit=5"
```

Response:
```json
{
  "buyers": [
    {
      "id": "abc123",
      "name": "NHS England",
      "sector": "NHS",
      "region": "London",
      "orgType": "Executive Agency",
      "enrichmentScore": 85,
      "contractCount": 142
    }
  ],
  "total": 34,
  "limit": 5
}
```

### Get Buyer Details

```
GET /api/public/v1/buyers/:id
```

```bash
curl -H "Authorization: Bearer th_live_xxx" \
  "https://app.tendhunt.com/api/public/v1/buyers/abc123"
```

Response:
```json
{
  "id": "abc123",
  "name": "NHS England",
  "sector": "NHS",
  "region": "London",
  "orgType": "Executive Agency",
  "enrichmentScore": 85,
  "website": "https://www.england.nhs.uk",
  "address": "...",
  "contractCount": 142,
  "totalSpend": 5200000000,
  "personnel": [],
  "recentContracts": [],
  "signals": []
}
```

---

## Contracts

### Search Contracts

```
GET /api/public/v1/contracts
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Free-text search across contract titles and descriptions |
| `sector` | string | Filter by sector |
| `region` | string | Filter by region |
| `minValue` | number | Minimum contract value in GBP |
| `maxValue` | number | Maximum contract value in GBP |
| `limit` | number | Max results (default: 20, max: 100) |

```bash
curl -H "Authorization: Bearer th_live_xxx" \
  "https://app.tendhunt.com/api/public/v1/contracts?minValue=1000000&sector=Education&limit=10"
```

Response:
```json
{
  "contracts": [
    {
      "id": "def456",
      "title": "IT Managed Services",
      "buyerName": "University of Manchester",
      "value": 2500000,
      "currency": "GBP",
      "sector": "Education",
      "region": "North West",
      "status": "open",
      "deadline": "2026-03-15T12:00:00Z",
      "publishedDate": "2026-02-01T00:00:00Z"
    }
  ],
  "total": 87,
  "limit": 10
}
```

### Get Contract Details

```
GET /api/public/v1/contracts/:id
```

```bash
curl -H "Authorization: Bearer th_live_xxx" \
  "https://app.tendhunt.com/api/public/v1/contracts/def456"
```

Response:
```json
{
  "id": "def456",
  "title": "IT Managed Services",
  "description": "Provision of managed IT services including...",
  "buyerName": "University of Manchester",
  "buyerId": "abc789",
  "value": 2500000,
  "currency": "GBP",
  "sector": "Education",
  "region": "North West",
  "status": "open",
  "deadline": "2026-03-15T12:00:00Z",
  "publishedDate": "2026-02-01T00:00:00Z",
  "source": "Contracts Finder",
  "sourceUrl": "https://...",
  "cpvCodes": ["72000000"],
  "lots": []
}
```

---

## Signals

### Search Buying Signals

```
GET /api/public/v1/signals
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `organizationName` | string | Filter by organization name |
| `signalType` | string | Type: "board_decision", "budget_approval", "strategy_change", "leadership_change", "contract_expiry" |
| `sector` | string | Filter by sector |
| `dateFrom` | string | ISO date, signals after this date |
| `dateTo` | string | ISO date, signals before this date |
| `limit` | number | Max results (default: 20, max: 100) |

```bash
curl -H "Authorization: Bearer th_live_xxx" \
  "https://app.tendhunt.com/api/public/v1/signals?organizationName=Manchester%20City%20Council&limit=10"
```

Response:
```json
{
  "signals": [
    {
      "id": "sig001",
      "type": "budget_approval",
      "title": "Digital Transformation Budget Approved",
      "organizationName": "Manchester City Council",
      "description": "Council approved 3.2M for digital services...",
      "date": "2026-01-20T00:00:00Z",
      "source": "Board Minutes",
      "relevanceScore": 0.85
    }
  ],
  "total": 12,
  "limit": 10
}
```

---

## Key Personnel

### Search Personnel

```
GET /api/public/v1/personnel
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `buyerId` | string | Filter by buyer ID (required) |
| `role` | string | Filter by role keyword |
| `limit` | number | Max results (default: 20, max: 50) |

```bash
curl -H "Authorization: Bearer th_live_xxx" \
  "https://app.tendhunt.com/api/public/v1/personnel?buyerId=abc123&limit=5"
```

Response:
```json
{
  "personnel": [
    {
      "id": "per001",
      "name": "Jane Smith",
      "role": "Chief Procurement Officer",
      "organization": "NHS England",
      "linkedinUrl": "https://linkedin.com/in/...",
      "source": "enrichment"
    }
  ],
  "total": 8,
  "limit": 5
}
```

---

## Spend Data

### Get Buyer Spend

```
GET /api/public/v1/spend/:buyerId
```

```bash
curl -H "Authorization: Bearer th_live_xxx" \
  "https://app.tendhunt.com/api/public/v1/spend/abc123"
```

Response:
```json
{
  "buyerId": "abc123",
  "buyerName": "NHS England",
  "totalSpend": 5200000000,
  "spendByCategory": [
    { "category": "IT Services", "amount": 820000000 },
    { "category": "Facilities", "amount": 450000000 }
  ],
  "topSuppliers": [
    { "name": "Accenture", "amount": 120000000 }
  ]
}
```

---

## Board Documents

### Search Board Documents

```
GET /api/public/v1/board-documents
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `buyerId` | string | Filter by buyer ID |
| `committeeName` | string | Filter by committee name |
| `dateFrom` | string | ISO date |
| `dateTo` | string | ISO date |
| `limit` | number | Max results (default: 20, max: 50) |

```bash
curl -H "Authorization: Bearer th_live_xxx" \
  "https://app.tendhunt.com/api/public/v1/board-documents?buyerId=abc123&limit=5"
```

Response:
```json
{
  "documents": [
    {
      "id": "doc001",
      "title": "Finance Committee Minutes - January 2026",
      "buyerId": "abc123",
      "buyerName": "NHS England",
      "committeeName": "Finance Committee",
      "date": "2026-01-15T00:00:00Z",
      "documentUrl": "https://...",
      "summary": "Discussed Q3 budget allocation..."
    }
  ],
  "total": 24,
  "limit": 5
}
```

---

## Scanners

### List Scanners

```
GET /api/public/v1/scanners
```

```bash
curl -H "Authorization: Bearer th_live_xxx" \
  "https://app.tendhunt.com/api/public/v1/scanners"
```

### Create Scanner

```
POST /api/public/v1/scanners
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Scanner name |
| `type` | string | Yes | "rfps", "meetings", or "buyers" |
| `searchQuery` | string | No | Default search query |
| `description` | string | No | Scanner description |

```bash
curl -X POST -H "Authorization: Bearer th_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"name":"NHS IT Contracts","type":"rfps","searchQuery":"IT services NHS"}' \
  "https://app.tendhunt.com/api/public/v1/scanners"
```

### Add AI Column

```
POST /api/public/v1/scanners/:id/columns
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Column display name |
| `prompt` | string | Yes | AI scoring/analysis prompt |

```bash
curl -X POST -H "Authorization: Bearer th_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"name":"Bid Recommendation","prompt":"Rate 1-10 how well this contract fits an IT consultancy"}' \
  "https://app.tendhunt.com/api/public/v1/scanners/scan123/columns"
```

---

## Scraping (Credit-gated)

### Trigger Scrape

```
POST /api/public/v1/scrape
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | "linkedin", "google", or "website" |
| `buyerId` | string | Yes | Target buyer ID |
| `url` | string | No | Specific URL to scrape (optional for google type) |

```bash
curl -X POST -H "Authorization: Bearer th_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"type":"website","buyerId":"abc123","url":"https://www.england.nhs.uk/about/"}' \
  "https://app.tendhunt.com/api/public/v1/scrape"
```

---

## Error Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Bad request -- missing or invalid parameters |
| 401 | Unauthorized -- invalid or missing API key |
| 403 | Forbidden -- insufficient credits for credit-gated endpoints |
| 404 | Not found -- resource does not exist |
| 429 | Rate limited -- too many requests (max 60/min) |
| 500 | Server error |

Error response format:
```json
{
  "error": "Description of what went wrong",
  "code": "INVALID_PARAM"
}
```
