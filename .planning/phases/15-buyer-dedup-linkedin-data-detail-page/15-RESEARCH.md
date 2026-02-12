# Phase 15: Contract-Buyer Entity Linking, Region Humanization & Contract Page Enhancement - Research

**Researched:** 2026-02-12
**Domain:** MongoDB entity references, NUTS/ITL regional codes, Next.js server component data flow
**Confidence:** HIGH

## Summary

This phase addresses three interconnected problems: (1) contracts reference buyers only by `buyerName` string, not by `buyerId` ObjectId, making joins fragile and requiring string-match lookups; (2) region codes stored on contracts are raw NUTS/ITL codes (UKC, UKD3, UKM82, etc.) that are meaningless to users; (3) the contract detail page shows buyer name as plain text with no link to the buyer profile and no buyer intelligence data.

The codebase already has partial infrastructure for all three: `ContractCard` already accepts an optional `buyerId` prop and renders a link when present; `contract-filters.tsx` has a NUTS Level 1 mapping (12 codes); and the buyer detail page already fetches contracts via `buyerName` string match. The work is primarily about completing and connecting existing pieces.

**Primary recommendation:** Add `buyerId` as an indexed ObjectId field on the Contract schema, populate it at insert time in `autoExtractBuyers` (data-sync worker), backfill existing 59K contracts via a one-time script, create a comprehensive static NUTS code mapping (~230 entries covering levels 0-3), and enhance the contract detail page to fetch and display buyer intelligence with a link to the buyer profile.

<user_constraints>
## User Constraints (from verbal description)

### Locked Decisions
1. Contracts must link to buyers via ObjectId reference -- not just string matching
2. Region codes (NUTS codes like UKE41, UKM82) must be humanized to readable names (e.g., "Bradford", "Edinburgh")
3. Contract detail page must show buyer info and link to buyer profile
4. No duplicate buyers -- dedup must work across data-sync and enrichment workers
5. The two workers (data-sync and enrichment) must coordinate: when data-sync finds a new buyer from a contract, enrichment should eventually process them

### Claude's Discretion
- How to implement the buyerId reference (migration strategy vs. on-write)
- NUTS code to human name mapping approach (static JSON vs. API)
- Contract page UI layout for buyer info section
- Whether to add buyerId at contract creation time or as a backfill
</user_constraints>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Mongoose | 8.x | Schema definition, ObjectId refs, index creation | Already used throughout project |
| MongoDB Node.js Driver | 6.x | bulkWrite in Cloudflare Workers (native driver, not Mongoose) | Already used in data-sync and enrichment workers |
| Next.js | 16.1 | Server components for contract detail page | Project framework |
| shadcn/ui | latest | Card, Badge, Button, Avatar components | Project UI library |

### Supporting (no new dependencies needed)
| Library | Purpose | When to Use |
|---------|---------|-------------|
| `lucide-react` | Icons (Building2, MapPin, Users, ExternalLink) | Already in contract detail page |
| `@/components/ui/*` | shadcn Card, Badge, Avatar, Separator | Already in buyer and contract components |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Static JSON NUTS map | Eurostat API | API adds latency and external dependency for ~230 static codes that change once every 5+ years |
| ObjectId reference | $lookup aggregation | $lookup works but is slow at scale; indexed ObjectId is O(1) per contract |
| Backfill script | On-read lazy resolution | Lazy resolution adds latency to every contract read; one-time backfill is cleaner |

**Installation:**
```bash
# No new packages needed -- all dependencies already in the project
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    nuts-regions.ts           # Static NUTS code -> human name mapping + resolver function
  models/
    contract.ts               # Add buyerId field
  lib/
    contracts.ts              # Update fetchContractById to include buyer data
  app/(dashboard)/contracts/
    [id]/page.tsx             # Enhanced contract detail with buyer section
scripts/
  backfill-buyer-ids.ts       # One-time backfill script
workers/data-sync/src/
  db/buyers.ts                # Return buyer IDs from autoExtractBuyers
  db/contracts.ts             # Accept and store buyerId on upsert
```

### Pattern 1: Forward-Write + Backfill for buyerId
**What:** When data-sync creates/updates contracts, it simultaneously resolves the buyer ObjectId and stores it on the contract. For the 59K existing contracts, a one-time backfill script sets `buyerId` by matching `buyerName` -> `nameLower`.
**When to use:** When adding a reference field to an existing collection with data.
**Why this pattern:**
- Forward-write ensures all new contracts have `buyerId` from creation
- Backfill handles existing data without blocking operations
- The `nameLower` unique index on buyers guarantees deterministic matching

**Implementation approach:**
```typescript
// In autoExtractBuyers (workers/data-sync/src/db/buyers.ts):
// After bulkWrite upsert, query back the buyer _ids for each nameLower
// Return a Map<string, ObjectId> of nameLower -> buyerId
// The sync engine then passes these to upsertContracts

// In upsertContracts (workers/data-sync/src/db/contracts.ts):
// Accept optional buyerIdMap, set buyerId on each contract doc before upsert
```

### Pattern 2: Static NUTS Code Resolution
**What:** A TypeScript module exporting a `Record<string, string>` mapping ~230 NUTS codes to human-readable names, plus a `resolveRegionName(code: string): string` function that tries exact match, then falls back to parent levels.
**When to use:** Anywhere region codes need display (contract detail, contract cards, contract filters, buyer list).
**Why this pattern:**
- NUTS codes are hierarchical: UKE41 (Bradford) is under UKE4 (West Yorkshire) under UKE (Yorkshire and the Humber)
- The `resolveRegionName` function should try exact match first, then progressively truncate the code to find a parent match
- Static data -- these codes were last updated 2021 and the next update is 2027
- Zero latency, zero API calls, works in all environments (browser, server, worker)

**Example:**
```typescript
// src/lib/nuts-regions.ts
export const NUTS_REGIONS: Record<string, string> = {
  UK: "United Kingdom",
  UKC: "North East England",
  UKC1: "Tees Valley and Durham",
  UKC11: "Hartlepool and Stockton-on-Tees",
  // ... ~230 entries total
  UKE4: "West Yorkshire",
  UKE41: "Bradford",
  UKE42: "Leeds",
  UKM8: "West Central Scotland",
  UKM82: "Glasgow City",
  // ...
};

/**
 * Resolve a NUTS code to a human-readable region name.
 * Tries exact match, then progressively truncates to find parent.
 * Returns the code itself as fallback.
 */
export function resolveRegionName(code: string | null | undefined): string {
  if (!code) return "Not specified";

  // Try exact match
  if (NUTS_REGIONS[code]) return NUTS_REGIONS[code];

  // Try progressively shorter codes (UKE41 -> UKE4 -> UKE -> UK)
  let truncated = code;
  while (truncated.length > 2) {
    truncated = truncated.slice(0, -1);
    if (NUTS_REGIONS[truncated]) {
      return NUTS_REGIONS[truncated];
    }
  }

  // Fallback: return raw code
  return code;
}
```

### Pattern 3: Server Component Data Joining
**What:** In the contract detail page (server component), fetch contract first, then if `buyerId` exists, fetch buyer data in parallel. If no `buyerId`, fall back to `nameLower` lookup.
**When to use:** For the enhanced contract detail page.
**Why this pattern:**
- Server components can do async data fetching directly
- Avoids client-side data fetching complexity
- Parallel fetching keeps latency low
- Graceful fallback handles contracts not yet backfilled

**Example:**
```typescript
// src/lib/contracts.ts - enhanced fetchContractById
export async function fetchContractById(id: string) {
  await dbConnect();
  if (!mongoose.isValidObjectId(id)) return null;

  const contract = await Contract.findById(id).select("-rawData").lean();
  if (!contract) return null;

  // Resolve buyer - prefer buyerId reference, fall back to name match
  let buyer = null;
  if (contract.buyerId) {
    buyer = await Buyer.findById(contract.buyerId)
      .select("name sector region orgType website logoUrl enrichmentScore linkedinUrl contractCount")
      .lean();
  }
  if (!buyer && contract.buyerName) {
    buyer = await Buyer.findOne({ nameLower: contract.buyerName.toLowerCase().trim() })
      .select("name sector region orgType website logoUrl enrichmentScore linkedinUrl contractCount")
      .lean();
  }

  return { ...contract, buyer };
}
```

### Anti-Patterns to Avoid
- **String-match joins at read time:** Current `fetchBuyerById` uses `Contract.find({ buyerName: buyer.name })` which is fragile (case sensitivity, name changes). Use `buyerId` ObjectId index instead.
- **Populating buyer data via Mongoose `.populate()`:** The contract and buyer schemas are in the same database but the contract schema doesn't use `ref: 'Buyer'` in the field definition. Adding it retroactively to 59K docs with `populate()` is unnecessary when a simple `findById` in the server component works fine.
- **Storing humanized region name on the contract document:** This duplicates data and creates a migration burden when NUTS codes change. Keep the raw code in MongoDB, resolve to human name at display time.
- **Using `$lookup` aggregation for contract-buyer joins at query time:** This is expensive for list views. The `buyerId` indexed field allows direct lookups.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| NUTS code resolution | API calls to Eurostat/ONS | Static `Record<string, string>` in TypeScript | Codes change every 5+ years; ~230 entries total; zero latency |
| Buyer name matching | Custom fuzzy matching for contract-buyer linking | Exact `nameLower` index match | Already proven in `autoExtractBuyers`; deterministic; no false matches |
| Bulk backfill | Individual `updateOne` calls per contract | MongoDB `bulkWrite` with batching (500-1000 per batch) | 59K contracts would take minutes individually, seconds with bulkWrite |
| Region display in filters | Dynamically computed from NUTS codes at query time | Import from shared `nuts-regions.ts` module | Single source of truth for code->name mapping |

**Key insight:** The NUTS code mapping and the buyerId backfill are both one-time data problems with stable solutions. The static mapping handles region humanization forever (until 2027+ when codes next update), and the buyerId forward-write means no backfill will ever be needed again.

## Common Pitfalls

### Pitfall 1: Backfill Script Skipping Unmatched Contracts
**What goes wrong:** Some contracts have `buyerName` values that don't match any buyer's `nameLower` (e.g., trailing whitespace, encoding differences, or buyers that were deleted during dedup).
**Why it happens:** The data-sync worker normalizes names via `.toLowerCase().trim()` but original contract `buyerName` values may have subtle differences.
**How to avoid:** The backfill script must normalize `buyerName` identically to how `autoExtractBuyers` creates `nameLower`: `contract.buyerName.toLowerCase().trim()`. Log all unmatched contracts for manual review.
**Warning signs:** More than 5-10% of contracts have null `buyerId` after backfill.

### Pitfall 2: Mixed NUTS Versions in Contract Data
**What goes wrong:** Find a Tender uses NUTS 2021 codes (e.g., UKM82 for Glasgow City), but older resources list NUTS 2016 codes (e.g., UKM34 for Glasgow City). Using the wrong mapping version returns wrong names.
**Why it happens:** The UK transitioned from NUTS to ITL in January 2021, and Scotland specifically was reorganized (UKM2/UKM3 became UKM7/UKM8/UKM9 at level 2).
**How to avoid:** The static mapping must include BOTH the 2016 and 2021 NUTS codes. The `resolveRegionName` function should check both. Since the mapping is code->name, overlapping codes from different versions can coexist as long as names are accurate.
**Warning signs:** Scottish region codes (UKM5/M6/M7/M8/M9) resolving to "Unknown" or falling through to parent.

### Pitfall 3: autoExtractBuyers Not Returning Buyer IDs
**What goes wrong:** The current `autoExtractBuyers` function does a `bulkWrite` with upserts but doesn't return the resulting `_id` values for the buyers. The sync engine needs these IDs to set `buyerId` on contracts.
**Why it happens:** The MongoDB `bulkWrite` result contains `upsertedIds` (for new inserts) but NOT the matched/existing document IDs. For existing buyers that just got `$inc: { contractCount }`, the IDs are not in the result.
**How to avoid:** After the `bulkWrite`, do a second query: `collection.find({ nameLower: { $in: [...uniqueNames] } }, { projection: { _id: 1, nameLower: 1 } })` to get the full name->ID map. This is one indexed query that returns only `_id` and `nameLower`, so it's fast even for large batches.
**Warning signs:** New contracts getting `buyerId = null` despite matching buyer existing.

### Pitfall 4: Contract Schema buyerId Index Missing
**What goes wrong:** Adding `buyerId` to the schema without an index means queries like `Contract.find({ buyerId: buyerObjectId })` will do a collection scan on 59K+ documents.
**Why it happens:** Mongoose doesn't auto-create indexes unless `autoIndex` is enabled (and it shouldn't be in production).
**How to avoid:** Add `{ type: Schema.Types.ObjectId, ref: 'Buyer', index: true }` to the contract schema AND explicitly create the index in the backfill script.
**Warning signs:** Slow buyer detail page when fetching contracts for a buyer.

### Pitfall 5: Region Humanization Breaking Existing Filter Logic
**What goes wrong:** The contract filter uses NUTS level 1 codes (UKC, UKD, etc.) with `$regex: new RegExp("^" + filters.region, "i")` to match all sub-regions. If humanized names are stored instead of codes, this breaks.
**Why it happens:** Replacing raw codes with names on the document changes the filter semantics.
**How to avoid:** NEVER replace raw NUTS codes in MongoDB. Keep `buyerRegion` as the raw code. Humanize ONLY at display time via `resolveRegionName()`. The hierarchical regex filter (`^UKE` matches UKE, UKE4, UKE41, UKE42) continues to work perfectly.
**Warning signs:** Region filter on contracts page showing no results.

## Code Examples

Verified patterns from the existing codebase:

### Backfill Script Pattern (from scripts/backfill-buyer-websites.ts)
```typescript
// Pattern: Query matching records, build Map for fast lookup, bulkWrite in batch
const buyers = await Buyer.find({ nameLower: { $exists: true } })
  .select("_id nameLower")
  .lean();

const buyerMap = new Map<string, mongoose.Types.ObjectId>();
for (const b of buyers) {
  buyerMap.set(b.nameLower, b._id);
}

// Process contracts in batches
const BATCH_SIZE = 1000;
let skip = 0;
let totalUpdated = 0;

while (true) {
  const contracts = await Contract.find({ buyerId: { $exists: false } })
    .select("_id buyerName")
    .skip(skip)
    .limit(BATCH_SIZE)
    .lean();

  if (contracts.length === 0) break;

  const ops = [];
  for (const c of contracts) {
    const nameLower = c.buyerName?.toLowerCase().trim();
    if (!nameLower) continue;

    const buyerId = buyerMap.get(nameLower);
    if (buyerId) {
      ops.push({
        updateOne: {
          filter: { _id: c._id },
          update: { $set: { buyerId } },
        },
      });
    }
  }

  if (ops.length > 0) {
    const result = await Contract.bulkWrite(ops);
    totalUpdated += result.modifiedCount;
  }

  skip += BATCH_SIZE;
  console.log(`Processed ${skip} contracts, updated ${totalUpdated}`);
}
```

### Modified autoExtractBuyers Pattern (return buyer ID map)
```typescript
// After the existing bulkWrite upsert, add:
export async function autoExtractBuyers(
  db: Db,
  contracts: MappedContract[]
): Promise<{ created: number; buyerIdMap: Map<string, ObjectId> }> {
  // ... existing dedup and bulkWrite logic ...

  const result = await collection.bulkWrite(ops, { ordered: false });

  // Fetch IDs for all buyers we just upserted/matched
  const allNameKeys = Array.from(uniqueByName.keys());
  const buyerDocs = await collection
    .find(
      { nameLower: { $in: allNameKeys } },
      { projection: { _id: 1, nameLower: 1 } }
    )
    .toArray();

  const buyerIdMap = new Map<string, ObjectId>();
  for (const doc of buyerDocs) {
    buyerIdMap.set(doc.nameLower, doc._id);
  }

  return { created: result.upsertedCount, buyerIdMap };
}
```

### Contract Detail Buyer Section (UI pattern from existing buyer-header.tsx)
```tsx
// Pattern: Card with buyer info, matching existing design language
<Card>
  <CardHeader className="flex flex-row items-center gap-4">
    {buyer.logoUrl ? (
      <img src={buyer.logoUrl} alt="" className="h-10 w-10 rounded-full" />
    ) : (
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
        <Building2 className="h-5 w-5 text-muted-foreground" />
      </div>
    )}
    <div className="flex-1">
      <Link href={`/buyers/${buyer._id}`} className="text-lg font-semibold hover:underline">
        {buyer.name}
      </Link>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {buyer.orgType && <Badge variant="outline">{buyer.orgType}</Badge>}
        {resolveRegionName(contract.buyerRegion)}
      </div>
    </div>
    {buyer.enrichmentScore != null && (
      <Badge className="text-sm">{buyer.enrichmentScore}/100</Badge>
    )}
  </CardHeader>
  <CardContent className="flex flex-wrap gap-4 text-sm">
    {buyer.website && (
      <a href={buyer.website} target="_blank" className="text-primary hover:underline">
        {new URL(buyer.website).hostname}
      </a>
    )}
    {buyer.contractCount != null && (
      <span>{buyer.contractCount} contracts</span>
    )}
    <Link href={`/buyers/${buyer._id}`} className="text-primary hover:underline ml-auto">
      View full profile
    </Link>
  </CardContent>
</Card>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NUTS classification (EU) | ITL classification (UK) | January 2021 | Same codes with "UK" prefix; no practical difference for mapping |
| NUTS 2016 Scotland codes (UKM1-M4) | NUTS 2021 Scotland codes (UKM5-M9) | January 2021 | Find a Tender uses 2021 codes; mapping must include both versions |
| String-match buyer-contract join | ObjectId reference | This phase | Eliminates name mismatch issues, enables indexed joins |

**Deprecated/outdated:**
- The eurotender.de NUTS list shows 2016 codes for Scotland (UKM1-M4). Find a Tender data uses 2021 codes (UKM5-M9). The mapping must include BOTH sets.
- The `REGIONS` constant in `contract-filters.tsx` (12 NUTS level 1 codes) is a good start but insufficient for level 2/3 codes like UKD3 or UKM82.

## NUTS Code Data Analysis

### Codes Present in Contract Data (from phase description)
Top codes by frequency: `UK` (12,059), `null` (5,355), `UKI` (2,039), `UKM` (1,634), `UKM82` (1,074), `UKD3` (729), plus ~50 distinct values total.

### NUTS Code Levels in Use
- **Level 0:** `UK` (United Kingdom) -- 12K contracts
- **Level 1:** `UKC`, `UKD`, `UKE`, `UKF`, `UKG`, `UKH`, `UKI`, `UKJ`, `UKK`, `UKL`, `UKM`, `UKN` -- standard 12 regions
- **Level 2:** `UKD3` (Greater Manchester), `UKM8` (West Central Scotland), etc. -- ~30 codes
- **Level 3:** `UKM82` (Glasgow City), `UKE41` (Bradford), etc. -- ~130 codes

### Mapping Size Estimate
- Level 0: 1 code
- Level 1: 12 codes
- Level 2: ~41 codes (2021 version)
- Level 3: ~179 codes (2021 version)
- **Total: ~233 entries**

Including NUTS 2016 Scotland codes (UKM1-M4 and sub-codes ~20 entries): **~253 entries**

This fits comfortably in a static TypeScript module (~6-8KB unminified).

### Key Scotland Mapping (NUTS 2021 - used by Find a Tender)
| Code | Name |
|------|------|
| UKM5 | North Eastern Scotland |
| UKM6 | Highlands and Islands |
| UKM7 | Eastern Scotland |
| UKM8 | West Central Scotland |
| UKM9 | Southern Scotland |
| UKM50 | Aberdeen City and Aberdeenshire |
| UKM61 | Caithness and Sutherland and Ross and Cromarty |
| UKM62 | Inverness and Nairn and Moray, Badenoch and Strathspey |
| UKM63 | Lochaber, Skye and Lochalsh, Argyll and the Islands |
| UKM64 | Eilean Siar (Western Isles) |
| UKM65 | Orkney Islands |
| UKM66 | Shetland Islands |
| UKM71 | Angus and Dundee City |
| UKM72 | Clackmannanshire and Fife |
| UKM73 | East Lothian and Midlothian |
| UKM74 | Scottish Borders |
| UKM75 | Edinburgh, City of |
| UKM76 | Falkirk |
| UKM77 | Perth and Kinross and Stirling |
| UKM78 | West Lothian |
| UKM81 | East Dunbartonshire, West Dunbartonshire and Helensburgh |
| UKM82 | Glasgow City |
| UKM83 | Inverclyde, East Renfrewshire and Renfrewshire |
| UKM84 | North Lanarkshire |
| UKM91 | Dumfries and Galloway |
| UKM92 | East and North Ayrshire |
| UKM93 | South Ayrshire |
| UKM94 | South Lanarkshire |

### Key London Mapping (NUTS 2021)
| Code | Name |
|------|------|
| UKI3 | Inner London - West |
| UKI4 | Inner London - East |
| UKI5 | Outer London - East and North East |
| UKI6 | Outer London - South |
| UKI7 | Outer London - West and North West |

Note: London was restructured in 2021 from UKI1/UKI2 (2016) to UKI3-UKI7 (2021).

## Data Flow Diagram

```
CONTRACT CREATION (data-sync worker):
  OCDS API -> mapOcdsToContract() -> MappedContract{buyerName, buyerRegion}
       |
       v
  autoExtractBuyers() -> upsert Buyer{nameLower} -> returns Map<nameLower, ObjectId>
       |
       v
  upsertContracts() -> stores Contract{buyerName, buyerRegion, buyerId: ObjectId}

DISPLAY (Next.js server component):
  Contract.findById(id) -> contract{buyerId, buyerRegion}
       |
       v
  Buyer.findById(contract.buyerId) -> buyer{name, orgType, logoUrl, enrichmentScore...}
       |
       v
  resolveRegionName(contract.buyerRegion) -> "Glasgow City" / "Greater Manchester"
       |
       v
  Render: Buyer card + humanized region + link to /buyers/{buyerId}
```

## Open Questions

1. **How many contracts will remain unmatched after backfill?**
   - What we know: 59K contracts, 7K buyers, dedup already run. Most contracts should match.
   - What's unclear: Exact match rate depends on data quality. Some contracts may have buyer names not in the buyers collection (e.g., foreign buyers, obsolete names).
   - Recommendation: Run backfill in dry-run mode first, log unmatched contracts, report stats before committing.

2. **Should `buyerId` be set to the buyer ObjectId or kept as null for the ~5K contracts with null buyerRegion?**
   - What we know: Null buyerRegion doesn't mean no buyer. buyerName is required.
   - What's unclear: Whether all buyerName values correspond to a buyer in the collection.
   - Recommendation: Always try to resolve buyerId from buyerName regardless of buyerRegion value. The two fields are independent.

3. **Should the buyer region filter in `buyer-filters.tsx` also use humanized names?**
   - What we know: Buyer `region` field stores raw NUTS codes. The filter dropdown currently shows raw codes.
   - What's unclear: Whether buyer region codes are the same NUTS codes as contract buyerRegion (they come from different sources -- contracts from OCDS, buyers from autoExtractBuyers which copies from contract).
   - Recommendation: Yes, apply `resolveRegionName()` to buyer filter dropdown too for consistency. It uses the same code set.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/models/contract.ts`, `src/models/buyer.ts`, `src/lib/contracts.ts`, `src/lib/buyers.ts`
- Codebase analysis: `workers/data-sync/src/db/buyers.ts` (autoExtractBuyers), `workers/data-sync/src/db/contracts.ts` (upsertContracts)
- Codebase analysis: `workers/data-sync/src/sync-engine.ts` (processSyncJob data flow)
- Codebase analysis: `scripts/backfill-buyer-websites.ts`, `scripts/dedup-buyers.ts` (existing backfill patterns)
- Codebase analysis: `src/components/contracts/contract-filters.tsx` (existing REGIONS mapping, NUTS level 1)
- Codebase analysis: `src/components/contracts/contract-card.tsx` (existing buyerId prop support)
- [Eurotender NUTS codes UK](https://eurotender.de/php/nutcodes-engphp/nutscodeengUK.php) -- Complete NUTS 2016 code listing
- [Academic Encyclopedia - NUTS of UK](https://en-academic.com/dic.nsf/enwiki/11789109) -- Full hierarchical NUTS mapping all levels

### Secondary (MEDIUM confidence)
- [DataHerb NUTS 2021 dataset](https://dataherb.github.io/flora/eu_nuts/) -- CSV/JSON with NUTS 2021 codes including UK
- [ONS International Geographies](https://www.ons.gov.uk/methodology/geography/ukgeographies/eurostat) -- Official UK geographic classification
- [Scottish Government ITL consultation](https://www.gov.scot/publications/changing-international-territorial-level-geography-scotland-consultation-document/pages/3/) -- Scotland ITL restructuring 2021
- [tbed.org NUTS lookup](https://tbed.org/eudemo/index.php?tablename=nuts_vw&function=details&where_field=nuts_code&where_value=UKM82) -- Confirmed UKM82 = Glasgow City

### Tertiary (LOW confidence)
- Wikipedia International Territorial Level article -- Referenced but could not be fetched (403); cross-verified with other sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries already in the project; no new dependencies
- Architecture (buyerId reference): HIGH -- Pattern proven by existing BoardDocument/KeyPersonnel `buyerId` references
- Architecture (NUTS mapping): HIGH -- Static data approach verified against multiple sources; ~250 entries; codes confirmed
- Pitfalls: HIGH -- Identified from direct codebase analysis and data examination
- Backfill approach: HIGH -- Pattern established by existing `scripts/backfill-buyer-websites.ts` and `scripts/dedup-buyers.ts`

**Research date:** 2026-02-12
**Valid until:** 2026-06-12 (NUTS codes stable until 2027; codebase patterns stable)
