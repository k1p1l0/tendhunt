# Phase 10: Live Data Pipeline - Context

**Gathered:** 2026-02-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Continuously sync all available UK procurement data from Find a Tender and Contracts Finder APIs into MongoDB Atlas via a Cloudflare Worker cron job. Includes full historical backfill (all data ever published), hourly delta sync for new contracts, auto-extraction of buyer organizations from contract data, and sync progress tracking. This phase replaces the one-time ingestion scripts from Phase 2 with a production-grade recurring pipeline.

</domain>

<decisions>
## Implementation Decisions

### Data Sources & Coverage
- Pull from both Find a Tender (FaT) OCDS API and Contracts Finder (CF) OCDS API
- Fetch ALL historical data available — not just a time window
- Keep both sources when contracts overlap (same contract in both APIs stored as separate records with source attribution)
- Also auto-extract buyer organizations from incoming contract data (board minutes signals remain as Phase 2 seed data — no live API source exists for signals)

### Backfill Strategy
- Single Cloudflare Worker handles both initial backfill AND ongoing hourly sync
- First runs detect "never synced" state and backfill in chunks across multiple invocations
- Each invocation progresses through history, saves cursor/position, picks up where it left off next run
- No separate local script — Worker is self-contained

### Rate Limiting & Throughput
- Target ~6 requests per minute to both APIs (max throughput within government rate limits)
- Exponential backoff on 429 responses with Retry-After header respect
- Government APIs have fixed rate limits — cannot be increased

### Buyer Auto-Extraction
- When a contract references an organization not in the buyers collection, automatically create a buyer record
- Extract org name, sector, location from contract OCDS data
- New buyers created as first-class records (not flagged/provisional)

### Sync Progress Tracking
- MongoDB `syncJobs` collection stores sync metadata per source
- Track: last run timestamp, records fetched, errors encountered, cursor/pagination position for resume
- Enables resumable backfill — Worker picks up where previous invocation stopped

### Runtime & Scheduling
- Cloudflare Worker with cron trigger (hourly)
- Both FaT and CF checked in the same Worker invocation on the same schedule

### Scanner Integration
- No auto-scoring of new contracts — users score manually via "Score All" or per-column
- New contracts simply appear in scanner tables on next load

### Claude's Discretion
- Worker code structure and module organization
- Exact chunk size per invocation (balance between Worker CPU limits and progress)
- OCDS field mapping refinements beyond existing mapper
- Error handling strategy for partial failures within a batch
- Whether to use Durable Objects for state or just MongoDB

</decisions>

<specifics>
## Specific Ideas

- "I want to have all of the data there available, and this data should pull all the time to our database"
- Max throughput within rate limits — go as fast as the APIs allow (~6 req/min)
- Existing Phase 2 scripts (now deleted) had working OCDS mappers and API clients — can reference git history for patterns

</specifics>

<deferred>
## Deferred Ideas

- Auto-scoring new contracts in active scanners — user wants to implement this themselves later
- Real-time push notifications when new high-scoring contracts arrive
- Signal extraction from newly fetched board minutes (currently signals are seeded, not live-extracted)

</deferred>

---

*Phase: 10-live-data-pipeline*
*Context gathered: 2026-02-11*
