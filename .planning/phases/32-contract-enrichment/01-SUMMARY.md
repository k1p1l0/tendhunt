# Summary: Contract Enrichment (Phase 32, Plan 01)

## What was built

Extracted 13 enrichment fields from OCDS rawData into the Contract schema, added keyword detection for SME/VCO/EU funding, built a backfill endpoint for existing contracts, and displayed enriched data on the contract detail page with new list filters.

## Key files

### Created
- `.planning/phases/32-contract-enrichment/32-RESEARCH.md`
- `.planning/phases/32-contract-enrichment/01-PLAN.md`

### Modified
- `apps/web/src/models/contract.ts` — 13 new fields + 3 indexes
- `apps/workers/data-sync/src/types.ts` — MappedContract + MappedAwardedSupplier + OcdsRelease extensions
- `apps/workers/data-sync/src/mappers/ocds-mapper.ts` — keyword detection, award extraction, mapper return
- `apps/workers/data-sync/src/index.ts` — `/backfill-contracts` endpoint
- `apps/web/src/lib/contracts.ts` — contractType, smeOnly, vcoOnly filter conditions
- `apps/web/src/components/contracts/contract-detail-view.tsx` — Contract Details section UI
- `apps/web/src/components/contracts/contracts-toolbar.tsx` — Type dropdown, SME/VCO toggles
- `apps/web/src/app/(dashboard)/contracts/page.tsx` — new filter params threaded through

## Decisions

- No `eligibilityCriteria` in UK OCDS feeds — SME/VCO detection scans description text
- `geographicScope` maps from buyer party address.region (same source as buyerRegion)
- Renewal derived from lots (any lot with hasRenewal=true)
- Backfill uses unordered bulk ops for performance, filters by `contractType: { $exists: false }`
- SME/VCO filters are toggle buttons (not dropdowns) since they're boolean

## Self-Check: PASSED

- [x] 13 new fields in Contract schema
- [x] Keyword detection for SME/VCO/EU
- [x] Award extraction from OCDS
- [x] Backfill endpoint processes existing contracts
- [x] Contract detail page shows enriched fields
- [x] Contract list has type/SME/VCO filters
- [x] TypeScript compiles cleanly
- [x] ESLint passes (0 errors)
