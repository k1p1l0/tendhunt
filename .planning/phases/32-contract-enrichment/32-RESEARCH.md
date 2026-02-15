# Research: Contract Enrichment (Phase 32)

## Context
User wants to extract detailed contract metadata from OCDS rawData AND scrape Contracts Finder pages for missing fields. All visible fields from the CF contract detail page should be stored. Both backfill existing contracts + enrich new ones. Extend the data-sync worker.

## Key Findings

### Fields Already Extracted
- noticeId, ocid, sourceUrl, title, description
- status (OPEN/CLOSED/AWARDED/CANCELLED), stage (PLANNING/TENDER/AWARD)
- buyerName, buyerOrg, buyerRegion, buyerContact
- cpvCodes[], sector (from CPV first 2 digits)
- publishedDate, deadlineDate, contractStartDate, contractEndDate
- valueMin, valueMax, currency
- procurementMethod, procurementMethodDetails, submissionMethod[], submissionPortalUrl
- lots[] (full detail with renewal, options, award criteria)
- documents[]

### Fields in rawData But Not Extracted
| Field | rawData Path | Target Schema Field |
|-------|-------------|-------------------|
| Contract type | `tender.mainProcurementCategory` | `contractType` (goods/services/works) |
| SME suitability | `tender.eligibilityCriteria` text | `suitableForSme` boolean |
| VCO suitability | `tender.eligibilityCriteria` text | `suitableForVco` boolean |
| EU funding | tender description text | `hasEuFunding` boolean |
| Award details | `awards[].suppliers[], awards[].date, awards[].value` | `awardedSuppliers[], awardDate, awardValue` |
| Renewal info | Already in lots: `hasRenewal, renewalDescription` | Need top-level `canRenew` boolean |
| Geographic scope | `tender.scope` | `location` or `geographicScope` |

### Fields Requiring CF Page Scraping
The OCDS API doesn't include these human-friendly fields visible on CF pages:
- "Contract can renew: No" (simplified yes/no)
- "Contract suitable for SME: Yes" (structured boolean, not text)
- "Contract suitable for VCO: Yes" (structured boolean, not text)
- "Contract has EU funding: No" (structured boolean)

However, CF pages just display derived versions of the OCDS data. The OCDS `eligibilityCriteria` text can be parsed to extract SME/VCO booleans.

### Architecture Decision: Extend data-sync worker
- Add new fields to OCDS mapper (extract from rawData)
- Add backfill endpoint to re-process existing contracts
- No new worker needed — extend existing pipeline
- For text-based fields (SME, VCO, EU funding): use keyword matching first, LLM fallback for ambiguous cases

### Data Source Quality
- Contracts Finder: Variable OCDS compliance (1.0-1.1), ~37% missing region codes
- Find a Tender: Strict OCDS 1.1.5, better data quality
- Both store full rawData — backfill can reprocess without re-fetching

## Recommended Approach
1. Extend OCDS mapper to extract new fields from rawData
2. Update Contract Mongoose schema with new fields
3. Add backfill endpoint to data-sync worker
4. Update contract detail page UI to show new fields
5. Keyword-based extraction for SME/VCO/EU funding from eligibilityCriteria text
