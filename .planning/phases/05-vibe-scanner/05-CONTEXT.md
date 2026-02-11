# Phase 5: Vibe Scanner - Context

**Gathered:** 2026-02-11
**Status:** Ready for replanning (architecture rethink)

<domain>
## Phase Boundary

Multi-type scanner system ("Scanners") where users create named scanners of different types (RFPs, Board Meetings, Buyers), each showing a Starbridge-style AI-powered table with data columns + AI columns (including custom user-defined AI columns). Each scanner has an AI-generated search query and type-specific filters. This replaces the original single-scanner architecture.

**Reference products:** Starbridge "Bridges" (table + AI columns), Getmany "Scan & Bid" (scanner list)

</domain>

<decisions>
## Implementation Decisions

### Architecture (CRITICAL RETHINK)
- **Multiple scanners per user** — not one auto-generated scanner, but a list of named scanners the user creates
- **Scanner types for MVP:** RFPs/Contracts, Board Meetings & Strategic Plans, Buyers/Job Changes
- Each scanner type determines the data source it queries and the default columns
- Main nav item: "Scanners"
- Inside a scanner: **table view** (NOT card feed) — like Starbridge's bridge detail

### Scanner List Page
- Layout like Getmany's Scan & Bid: list of scanner rows
- Each row shows: scanner name, last updated date, created date, status indicator, primary action button
- Scanners are always active once created (no pause/archive toggle for MVP)
- "+ Create Scanner" button opens type-selection modal → creation form

### Scanner Creation Flow
- Step 1: Pick scanner type — modal with type cards (icon, title, description) for RFPs, Board Meetings, Buyers
- Step 2: Creation form with fields:
  - **Scanner Name** — auto-generated, editable
  - **Description** — auto-generated, editable
  - **Search Query** — AI-generated from company profile as OR-joined conditions (like Starbridge), editable in textarea
  - **Type-specific filters:**
    - RFPs: sector, region, value range, deadline
    - Meetings: signal type, org sector, date range
    - Buyers: sector, region
- AI generates name + description + search query from CompanyProfile (sectors, capabilities, keywords)
- User can edit all fields before saving
- On Save: navigate directly into the scanner table view and auto-start scoring

### Scanner Inner View (Table)
- **Header:** Scanner name (h1), type badge, description text, then toolbar (Status dropdown, Filters, Sort, "Add Column" button, "Actions" menu)
- **Table layout — entity-style first column:**
  - RFP scanner: Col 1 = Buyer org name (entity), Col 2 = Contract description snippet, then value, deadline, sector. AI columns last.
  - Meetings scanner: Col 1 = Organization name, Col 2 = Signal summary, then signal type, date. AI columns last.
  - Buyers scanner: Col 1 = Organization name, Col 2 = Description/sector, then contact count, region. AI columns last.
- **Default AI columns per type (2-3 pre-built):**
  - RFP scanner: "Vibe Score" (relevance score) + "Bid Recommendation" (or similar)
  - Meetings scanner: "Relevance Score" + "Buying Intent" (or similar)
  - Buyers scanner: "Account Score" + "Key Contact" (or similar)
- **AI cell loading:** Progressive rows — rows appear one by one as they get scored, table grows top to bottom
- **Cell click → Side drawer:** Full Starbridge style — response data, reasoning section, source references, metadata (last run, column type)

### Custom AI Columns (IN MVP)
- Users can click "Add Column" → modal with Column Name + Prompt textarea
- Prompt can reference row data (like Starbridge's "Type @ to reference a column")
- Adding a new AI column immediately auto-scores all existing rows (shows per-cell loading)
- This is a core differentiator for the investor demo

### Scoring Behavior
- Search query does NOT filter rows — ALL items of that data type appear in the table
- AI uses the search query as context in the scoring prompt to evaluate relevance
- Sorting/threshold determine visibility: threshold slider above table dims/hides low-scoring rows
- **Auto-scoring on new data:** When new contracts/signals enter the DB, they get scored automatically (shows "Updated automatically" like Starbridge)
- **Re-scoring on edit:** When user changes search query/filters via Edit modal, auto re-scores
- **Threshold slider:** Kept from original plan — above table, 1-10 range, 0.1 increments, dims/hides rows below threshold

### Scanner Edit
- Three-dot menu on scanner list → "Edit Scanner" opens the same creation form pre-filled with current settings
- Also accessible from inside scanner view via Actions menu
- Changes to search query/filters trigger re-scoring

### Claude's Discretion
- Exact default AI column names and prompts per scanner type
- Table pagination vs infinite scroll
- Column resize/reorder behavior
- Exact drawer layout and sections
- How "Updated automatically" scheduling works (polling vs cron)

</decisions>

<specifics>
## Specific Ideas

- "Like Starbridge's Bridges" — table-based AI analysis with customizable AI columns
- "Like Getmany's Scan & Bid" — list of named scanners that users create
- Search query is OR-joined conditions generated by AI from company profile (e.g., "discussed intervention strategy OR raised concerns about EHCP support capacity OR...")
- AI columns can be clicked to show full response + reasoning in a side drawer
- Entity-first column design: the "who" (buyer org) comes first, then descriptive data, then AI columns
- "Add Column" with custom prompt is in MVP — it's a core demo feature

</specifics>

<deferred>
## Deferred Ideas

- Scanner status toggle (active/paused/archived) — future enhancement
- "Build / Consume / Share" tabs like Starbridge — future phase
- Scheduled/periodic re-scoring on a cron — can mock for MVP with "Updated automatically" text
- Team/member assignment to scanners (Getmany shows assigned users) — multi-user feature, future phase

</deferred>

---

*Phase: 05-vibe-scanner*
*Context gathered: 2026-02-11*
