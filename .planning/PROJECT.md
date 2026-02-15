# Ofsted Timeline Intelligence

## What This Is

A feature for TendHunt that lets tuition companies (like Tutors Green) discover schools recently downgraded by Ofsted and assess whether those schools need tuition services. It adds Ofsted grading timeline filters to TendHunt's scanner system, shows inspection history on school/buyer detail pages, and provides AI analysis of Ofsted reports to score "tuition relevance" -- turning Ofsted inspection data into actionable sales intelligence for education SMEs.

## Core Value

Suppliers can instantly find schools downgraded by Ofsted in the last N months and assess whether each school's inspection report suggests a need for their services -- so they target schools with fresh remediation funding, not ones that already spent it.

## Requirements

### Validated

- Ofsted school data ingested from GOV.UK monthly CSV (~22,000 schools) -- `apps/web/scripts/ingest-ofsted.ts`
- Schools matched to buyer organisations by MAT name and Local Authority
- Basic Ofsted tab on buyer detail pages showing school ratings -- `apps/web/src/components/buyers/ofsted-tab.tsx`
- Ofsted signals generated for below-Good schools -- `apps/web/scripts/generate-ofsted-signals.ts`
- OfstedSchool model with current + previous rating fields -- `apps/web/src/models/ofsted-school.ts`

### Active

- [ ] Full grading timeline per school (history of inspections, not just latest + previous)
- [ ] Scanner type "schools" with Ofsted-specific filters (downgrade recency, rating, region, school phase)
- [ ] "Downgraded in last N months" as the primary filter for the schools scanner
- [ ] Timeline visualization of inspection history (when downgrades happened)
- [ ] AI column in scanner grid for "Tuition Relevance" scoring from Ofsted report PDFs
- [ ] Ofsted history on buyer/school detail pages showing rating changes over time
- [ ] Automated ingestion of inspection history data (not just latest snapshot)

### Out of Scope

- FE colleges, children's homes, early years providers -- schools only for MVP, other Ofsted-inspected entities can follow
- Fully automated AI analysis during enrichment -- burns API credits for reports never viewed; on-demand via scanner AI column only
- Sculptor on-demand report analysis -- nice-to-have after scanner AI column ships
- Companies House integration for school/MAT financial data -- separate workstream
- Ofsted notification alerts (email/push when a school gets downgraded) -- post-MVP
- Real-time Ofsted data feed -- monthly CSV refresh is sufficient for sales intelligence use case

## Context

- **User:** Matt from Tutors Green, a tuition company. His workflow: find recently-downgraded schools -> pitch tuition services -> schools have earmarked funding to address Ofsted concerns
- **Key insight:** Schools downgraded recently (last 1-3 months) still have remediation funding. Schools downgraded 3 years ago have already spent it. Recency is the critical filter.
- **Existing data:** ~22,000 schools already ingested from GOV.UK monthly management information CSV. Schools linked to buyers by MAT/LA matching.
- **Existing model:** `OfstedSchool` has `overallEffectiveness`, `previousOverallEffectiveness`, `inspectionDate`, `previousInspectionDate`, `reportUrl` -- captures current and one-previous rating but not full history.
- **Ofsted reports:** Published as HTML/PDF at report URLs. Reports contain detailed narrative about what the school is doing well/poorly, specific to curriculum areas.
- **Scanner system:** TendHunt already has scanner types "rfps", "meetings", "buyers" with AI columns. Need to add "schools" scanner type.
- **Post-Sep-2024 change:** Ofsted removed single-word overall grades; now uses sub-judgements only. This affects how we display and filter ratings.

## Constraints

- **Tech stack**: Must use existing TendHunt stack (Next.js, MongoDB, Glide Data Grid scanners, Claude AI for scoring)
- **Data source**: GOV.UK Management Information CSV is the primary source. Ofsted Inspection Data Summary CSV provides historical data.
- **Scanner pattern**: New "schools" scanner type must follow existing scanner architecture (model, table-columns, grid rendering, AI column scoring)
- **API credits**: AI report analysis is on-demand only (scanner AI column), not bulk-processed during enrichment
- **No lint**: Do NOT run `bun run lint` -- memory exhaustion issue on this machine

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Schools only for MVP | Core market for tuition companies; FE/early years can follow | -- Pending |
| Full inspection history | Track all inspections, not just latest + previous, to show downgrade trajectory | -- Pending |
| Scanner AI column for report analysis | Matches existing TendHunt pattern; user triggers analysis per-school, not bulk | -- Pending |
| "Downgraded in last N months" as primary filter | This is THE insight: recent downgrades = fresh funding = best targets | -- Pending |
| On-demand report analysis only | Avoid burning API credits on ~22,000 reports that may never be viewed | -- Pending |

---
*Last updated: 2026-02-14 after initialization*
