# Plan: Contract Enrichment — Extract & Display Rich Contract Metadata

## Goal
Extract all available contract detail fields from OCDS rawData (contract type, SME/VCO suitability, EU funding, renewal, awards, geographic scope) into the Contract schema, backfill existing contracts, and display the enriched data on the contract detail page.

## Tasks

### Task 1: Extend Contract Mongoose Schema
**File:** `apps/web/src/models/contract.ts`

Add new fields to the Contract schema:
```
contractType: String (goods | services | works | mixed)
canRenew: Boolean
suitableForSme: Boolean
suitableForVco: Boolean
hasEuFunding: Boolean
geographicScope: String
awardedSuppliers: [{ name: String, id: String }]
awardDate: Date
awardValue: Number
tenderPeriodStart: Date
enquiryPeriodEnd: Date
mainProcurementCategory: String
eligibilityCriteria: String
```

Index: `{ contractType: 1 }`, `{ suitableForSme: 1 }`, `{ suitableForVco: 1 }`

### Task 2: Extend OCDS Mapper
**File:** `apps/workers/data-sync/src/mappers/ocds-mapper.ts`

Extract new fields from the OCDS release JSON:
- `mainProcurementCategory` → `contractType` (map: goods/services/works)
- `tender.eligibilityCriteria` → parse for SME/VCO keywords → `suitableForSme`, `suitableForVco`
- Tender description → keyword scan for EU funding indicators → `hasEuFunding`
- `awards[0].suppliers[]` → `awardedSuppliers`
- `awards[0].date` → `awardDate`
- `awards[0].value.amount` → `awardValue`
- `tender.tenderPeriod.startDate` → `tenderPeriodStart`
- `tender.enquiryPeriod.endDate` → `enquiryPeriodEnd`
- `lots[0].hasRenewal` OR `tender.renewal` → `canRenew`
- `tender.scope` or buyer region → `geographicScope`
- `tender.eligibilityCriteria` raw text → `eligibilityCriteria`

**SME/VCO keyword detection:**
```typescript
function detectSmeEligibility(eligibility?: string, description?: string): boolean | null {
  const text = `${eligibility ?? ''} ${description ?? ''}`.toLowerCase();
  if (/\bsme\b|small.*medium|small.*business/.test(text)) return true;
  if (/\bnot.*suitable.*sme\b|sme.*not.*eligible/.test(text)) return false;
  return null; // unknown
}
```

Similar pattern for VCO (voluntary, community, charity, social enterprise keywords).

**EU funding detection:**
```typescript
function detectEuFunding(description?: string): boolean {
  const text = (description ?? '').toLowerCase();
  return /\beu\s+fund|european\s+fund|horizon|erasmus|life\s+programme|esf\b/.test(text);
}
```

### Task 3: Backfill Endpoint
**File:** `apps/workers/data-sync/src/index.ts`

Add `GET /backfill-contracts` endpoint that:
1. Reads contracts from MongoDB where `contractType` is null (not yet enriched)
2. For each contract, reads `rawData` from the document
3. Re-runs the enrichment extraction on the rawData
4. Updates the contract with new fields using `$set`
5. Processes in batches of 100, returns progress

```
GET /backfill-contracts?limit=500&skip=0
→ { processed: 500, enriched: 487, skipped: 13 }
```

### Task 4: Update Contract Detail Page
**File:** `apps/web/src/components/contracts/contract-detail-client.tsx`

Add a "Contract Details" section (like the CF screenshot) showing:
- Contract status badge
- Value (formatted GBP)
- Can renew (Yes/No badge)
- Contract type (Services/Goods/Works badge)
- Sector (from existing cpvCodes/sector)
- Location (from existing buyerRegion or new geographicScope)
- EU funding (Yes/No)
- SME suitable (Yes/No)
- VCO suitable (Yes/No)
- Published date
- Tender deadline
- Contract start/end
- Awarded suppliers (if status=AWARDED)
- Award date and value

Use a clean table layout matching the CF style from the screenshot. Each row: label on left, value on right. Use colored badges for Yes/No fields.

### Task 5: Update Contract List Filters
**File:** `apps/web/src/app/(dashboard)/contracts/page.tsx` or relevant filter component

Add filter options for new fields:
- Contract type dropdown (All / Goods / Services / Works)
- SME suitable toggle
- VCO suitable toggle

### Task 6: Update MappedContract Type
**File:** `apps/workers/data-sync/src/mappers/ocds-mapper.ts`

Update the `MappedContract` TypeScript interface to include all new fields. Update `upsertContracts()` in `apps/workers/data-sync/src/db/contracts.ts` to write the new fields.

## Verification
- [ ] New fields appear on contract detail page for existing contracts (after backfill)
- [ ] New contracts from data-sync include enriched fields
- [ ] SME/VCO/EU funding detection works on sample contracts
- [ ] Backfill endpoint processes all existing contracts
- [ ] Contract type filter works on the contracts list
- [ ] No regression — existing contract data unchanged
