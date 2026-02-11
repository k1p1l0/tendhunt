---
created: 2026-02-11T14:03:27.699Z
title: Add custom data columns with field references and data types to scanner grid
area: ui
files:
  - src/models/scanner.ts
  - src/components/scanners/table-columns.ts
  - src/components/scanners/add-column-modal.tsx
  - src/app/api/scanners/[id]/columns/route.ts
  - src/components/scanners/grid/cell-content.ts
  - src/components/scanners/grid/custom-renderers.ts
  - src/components/scanners/grid/scanner-data-grid.tsx
  - src/components/scanners/grid/header-menu.tsx
  - src/components/scanners/grid/glide-columns.ts
  - src/app/(dashboard)/scanners/[id]/page.tsx
---

## Problem

Currently scanners only support two column types: **core columns** (fixed per scanner type — Buyer, Contract, Sector, etc.) and **AI columns** (scored by Claude). Users want to add custom data columns that reference entity fields directly — e.g., adding a "Status" column that pulls from the contract's `status` field, or a "Region" column from `buyerRegion`. Users need to pick which entity fields to display as separate columns, with proper data types (Text, Number, Date, Badge, Currency, URL, Email, Checkbox, Paragraph).

User's exact request: "When we add a column, we can make a parent column and choose what statuses or what from this column we want to use. We can reference data from other columns as static text. And we should have a data type for each column. Specific columns like buyer lead to another module, but other columns could be customized on standard types."

## Solution

A detailed plan exists at `.claude/plans/wild-crafting-flurry.md`. Key changes:

1. **Scanner model**: Add `customColumns` schema (columnId, name, accessor, dataType) parallel to `aiColumns`
2. **Entity fields map**: Export available fields per scanner type (from Contract/Signal/Buyer models) with suggested data types
3. **Column merge**: core → custom data → AI order in `getColumnsForType()`
4. **Add Column modal**: Redesign with tabs — "Data Column" (field dropdown + type picker) and "AI Column" (existing prompt form)
5. **API**: Extend columns CRUD to handle both AI and custom columns (differentiate by request body fields)
6. **Cell rendering**: Add URL (`GridCellKind.Uri`), email, checkbox (`GridCellKind.Boolean`), paragraph types
7. **Header icons**: Chain link (url), @ (email), checkbox square, paragraph lines icons in `drawTypeIcon()`
8. **Header menu**: Edit/delete support for custom columns (like AI columns)

User decisions already captured:
- Full set of column types (Text, Number, Date, Currency, Badge, URL, Email, Checkbox, Paragraph)
- Field reference only (dropdown, no formulas)
- Core columns stay fixed (immutable per scanner type)
