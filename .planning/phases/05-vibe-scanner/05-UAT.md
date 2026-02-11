---
status: skipped
phase: 05-vibe-scanner
source: 05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md, 05-05-SUMMARY.md, 05-06-SUMMARY.md
started: 2026-02-11T12:10:00Z
updated: 2026-02-11T12:10:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 1
name: Sidebar navigation shows "Scanners"
expected: |
  Sidebar shows "Scanners" link with Radar icon. Clicking navigates to /scanners.
  Old "Vibe Scanner" link no longer visible.
awaiting: user response

## Tests

### 1. Sidebar navigation shows "Scanners"
expected: Sidebar shows "Scanners" link with Radar icon. Clicking navigates to /scanners. Old "Vibe Scanner" link no longer visible.
result: [pending]

### 2. Scanners list page loads at /scanners
expected: Page shows "Scanners" title with subtitle. If no scanners exist, shows empty state with "No scanners yet" message and a "Create Scanner" button. If scanners exist, shows list with name, type badge, dates, and actions.
result: [pending]

### 3. Create Scanner modal - type selection
expected: Clicking "+ Create Scanner" opens a modal with "Create Scanner" title. Three type cards visible: "RFPs / Contracts" (FileText icon), "Board Meetings & Strategic Plans" (Landmark icon), "Buyers / Organizations" (Building2 icon). Each has a description.
result: [pending]

### 4. Create Scanner modal - AI query generation
expected: After selecting a scanner type, modal shows a creation form. Name, description, and search query fields are pre-filled by AI (skeleton loading while generating). All fields are editable. Type-specific filters available in a collapsible section.
result: [pending]

### 5. Scanner creation and navigation
expected: Clicking "Create & Open" saves the scanner and navigates to /scanners/[id]. The new scanner appears in the scanner list on return.
result: [pending]

### 6. Scanner detail page loads with header
expected: Scanner detail page at /scanners/[id] shows header with scanner name (h1), colored type badge (blue for RFPs, purple for Meetings, green for Buyers), description, and toolbar with "Score All", "Add Column", and "Edit Scanner" buttons.
result: [pending]

### 7. Scanner table shows entity-first columns
expected: Table shows type-appropriate data columns. For RFP: Buyer Name, Contract, Value (GBP), Deadline, Sector. For Meetings: Organization, Signal, Type, Date. For Buyers: Organization, Description, Contacts, Region, Sector. AI columns appear after data columns.
result: [pending]

### 8. Score All triggers batch scoring with progress
expected: Clicking "Score All" starts batch scoring. Progress bar appears showing "Scoring [column name]... X/Y". AI cells show loading skeletons, then populate with color-coded scores (green >= 7, yellow >= 4, red < 4) or text responses.
result: [pending]

### 9. Add custom AI column
expected: Clicking "Add Column" opens a modal with Column Name input and Prompt textarea. Submitting creates the column and immediately auto-scores all rows for it. New column appears in the table with loading skeletons then results.
result: [pending]

### 10. Threshold slider controls
expected: Below the header, a threshold slider (1-10, 0.1 steps) appears when scores exist. Adjusting the slider changes which rows are dimmed or hidden. A switch toggles between "Hide" and "Dim" modes. Stats show "X/Y above".
result: [pending]

### 11. Score divider in table
expected: When scores exist and threshold is active, a visual divider row separates above-threshold and below-threshold rows. Below-threshold rows are either dimmed (opacity-40) or hidden behind a collapsible summary depending on the toggle.
result: [pending]

### 12. AI cell side drawer
expected: Clicking any scored AI cell opens a side drawer (Sheet from right). Drawer shows: large color-coded score number, reasoning text, full response text, and metadata (column type, last scored date, scanner type).
result: [pending]

### 13. Legacy vibe-scanner redirect
expected: Navigating to /vibe-scanner redirects to /scanners.
result: [pending]

### 14. Scanner deletion
expected: From scanner list, clicking the three-dot menu on a scanner shows "Delete Scanner" option. Clicking it removes the scanner from the list.
result: [pending]

## Summary

total: 14
passed: 0
issues: 0
pending: 14
skipped: 0

## Gaps

[none yet]

## Enhancement Notes

- User requested replacing shadcn Table with Glide Data Grid (@glideapps/glide-data-grid) for canvas-based performance with millions of rows. To be addressed as a post-UAT enhancement.
