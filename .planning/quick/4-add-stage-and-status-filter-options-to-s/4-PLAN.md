---
phase: quick
plan: 4
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/src/models/scanner.ts
  - apps/web/src/lib/contracts.ts
  - apps/web/src/app/api/contracts/route.ts
  - apps/web/src/components/scanners/edit-scanner-dialog.tsx
  - apps/web/src/app/(dashboard)/scanners/[id]/page.tsx
autonomous: true
must_haves:
  truths:
    - "RFP scanner edit dialog shows Stage and Status dropdowns with correct values"
    - "Setting stage/status filters persists to MongoDB scanner document"
    - "Contracts API applies stage/status filters to query results"
    - "Scanner page passes stage/status from saved filters to contracts API"
  artifacts:
    - path: "apps/web/src/models/scanner.ts"
      provides: "stage and status fields in filters subdocument"
      contains: "stage:"
    - path: "apps/web/src/lib/contracts.ts"
      provides: "stage and status in ContractFilters + MongoDB query conditions"
      contains: "filters.stage"
    - path: "apps/web/src/components/scanners/edit-scanner-dialog.tsx"
      provides: "Stage and Status Select dropdowns in RfpFilters"
      contains: "Stage"
  key_links:
    - from: "apps/web/src/components/scanners/edit-scanner-dialog.tsx"
      to: "apps/web/src/app/api/scanners/[id]/route.ts"
      via: "PATCH request with filters.stage and filters.status"
      pattern: "filters\\.stage|filters\\.status"
    - from: "apps/web/src/app/(dashboard)/scanners/[id]/page.tsx"
      to: "apps/web/src/app/api/contracts/route.ts"
      via: "query params stage= and status="
      pattern: "params\\.set.*stage|params\\.set.*status"
    - from: "apps/web/src/app/api/contracts/route.ts"
      to: "apps/web/src/lib/contracts.ts"
      via: "ContractFilters.stage and .status passed to fetchContracts"
      pattern: "stage.*searchParams|status.*searchParams"
---

<objective>
Add stage and status filter options to the scanner grid for RFP scanners.

Purpose: Contracts in MongoDB have `stage` (TENDER/AWARD/PLANNING) and `status` (OPEN/CLOSED/CANCELLED) fields, but the scanner filter system has no way to filter by these. Users need to narrow down contract results by these key procurement lifecycle fields.

Output: Stage and Status dropdowns in the edit scanner dialog's RFP filters section, with the full data pipeline wired end-to-end (model -> UI -> API -> query).
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/src/models/scanner.ts
@apps/web/src/lib/contracts.ts
@apps/web/src/app/api/contracts/route.ts
@apps/web/src/components/scanners/edit-scanner-dialog.tsx
@apps/web/src/app/(dashboard)/scanners/[id]/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add stage/status to Scanner model and contracts query pipeline</name>
  <files>
    apps/web/src/models/scanner.ts
    apps/web/src/lib/contracts.ts
    apps/web/src/app/api/contracts/route.ts
  </files>
  <action>
    1. In `apps/web/src/models/scanner.ts`, add two new fields to the `filters` subdocument in the scanner schema (after `dateTo`):
       - `stage: { type: String }` — values: "TENDER", "AWARD", "PLANNING"
       - `status: { type: String }` — values: "OPEN", "CLOSED", "CANCELLED"

    2. In `apps/web/src/lib/contracts.ts`:
       - Add `stage?: string` and `status?: string` to the `ContractFilters` interface
       - In `fetchContracts`, add two new condition blocks after the `maxValue` block:
         - If `filters.stage` is set, push `{ stage: filters.stage }` to conditions
         - If `filters.status` is set, push `{ status: filters.status }` to conditions

    3. In `apps/web/src/app/api/contracts/route.ts`:
       - Read `stage` and `status` from `searchParams` and add them to the `filters` object:
         - `stage: searchParams.get("stage") ?? undefined`
         - `status: searchParams.get("status") ?? undefined`
  </action>
  <verify>Run `pnpm typecheck` — no new type errors. The Scanner model, ContractFilters interface, and API route all recognize stage/status.</verify>
  <done>Scanner schema stores stage/status, contracts API reads them from query params, and fetchContracts applies them as MongoDB query conditions.</done>
</task>

<task type="auto">
  <name>Task 2: Add stage/status dropdowns to edit scanner dialog and wire scanner page</name>
  <files>
    apps/web/src/components/scanners/edit-scanner-dialog.tsx
    apps/web/src/app/(dashboard)/scanners/[id]/page.tsx
  </files>
  <action>
    1. In `apps/web/src/components/scanners/edit-scanner-dialog.tsx`:
       - Add `stage?: string` and `status?: string` to the `Filters` interface
       - Add constants for the dropdown options:
         ```
         const STAGES = [
           { value: "TENDER", label: "Tender" },
           { value: "AWARD", label: "Award" },
           { value: "PLANNING", label: "Planning" },
         ] as const;
         const STATUSES = [
           { value: "OPEN", label: "Open" },
           { value: "CLOSED", label: "Closed" },
           { value: "CANCELLED", label: "Cancelled" },
         ] as const;
         ```
       - In the `useEffect` that syncs form state, add:
         - `stage: (scanner.filters?.stage as string) || undefined`
         - `status: (scanner.filters?.status as string) || undefined`
       - In `handleSave`'s clean filters block, add:
         - `if (filters.stage) cleanFilters.stage = filters.stage;`
         - `if (filters.status) cleanFilters.status = filters.status;`
       - In the `RfpFilters` component, add a new row (grid with 2 columns) BEFORE the existing sector/region row containing:
         - Stage Select dropdown: value from `filters.stage || "all"`, options from STAGES array, onChange calls `onChange("stage", v)`
         - Status Select dropdown: value from `filters.status || "all"`, options from STATUSES array, onChange calls `onChange("status", v)`
       - Use the same styling pattern as existing dropdowns (h-8 text-xs SelectTrigger, etc.)

    2. In `apps/web/src/app/(dashboard)/scanners/[id]/page.tsx`:
       - In the `loadData` function, inside the `if (scannerData.filters)` block (around line 239-246), add after the existing filter param mappings:
         - `if (f.stage) params.set("stage", String(f.stage));`
         - `if (f.status) params.set("status", String(f.status));`
  </action>
  <verify>Run `pnpm typecheck` — no type errors. Open a scanner in the browser, click Edit, expand the RFP Filters section — Stage and Status dropdowns appear. Set a filter value, save, verify the scanner reloads with filtered results.</verify>
  <done>Stage and Status Select dropdowns render in RfpFilters with TENDER/AWARD/PLANNING and OPEN/CLOSED/CANCELLED options. Selecting a value persists it via PATCH, and the scanner page passes it as a query param to the contracts API which filters results accordingly.</done>
</task>

</tasks>

<verification>
- `pnpm typecheck` passes with no errors
- Scanner model schema includes `stage` and `status` in filters subdocument
- ContractFilters interface includes `stage` and `status`
- fetchContracts applies stage/status as MongoDB query conditions
- Contracts API route reads stage/status from searchParams
- Edit scanner dialog RfpFilters shows Stage and Status dropdowns
- Scanner detail page passes stage/status from saved filters to API query params
</verification>

<success_criteria>
- A user can edit an RFP scanner, set Stage to "TENDER" and Status to "OPEN", save, and see only open tender contracts in the grid
- Filters persist across page reloads (stored in scanner document)
- Typecheck passes cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/4-add-stage-and-status-filter-options-to-s/4-SUMMARY.md`
</output>
