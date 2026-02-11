# Phase 12: Settings & Company Profile Management - Context

**Gathered:** 2026-02-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the Settings placeholder page with a full company profile editor and restructure the sidebar to show the user's company identity at the top with TendHunt branding at the bottom. The CompanyProfile model and onboarding flow already exist (Phase 3 + Phase 9) — this phase surfaces that data for viewing and editing.

</domain>

<decisions>
## Implementation Decisions

### Profile editor layout
- Single scrollable page with visual section dividers (not tabs)
- Sections: Company Info (name, website, address, LinkedIn), AI Profile (summary, sectors, capabilities, keywords, certifications, ideal contract, company size, regions), Documents
- Array fields (sectors, capabilities, keywords, certifications, regions) use tag-style pill inputs — same pattern as onboarding wizard
- Summary and ideal contract description are plain textarea fields — no AI regeneration button
- Documents section is fully manageable: show uploaded docs with delete buttons + "Upload more" dropzone (reuse R2 presigned URL upload from onboarding)

### Sidebar restructure
- **Header (top):** User's company logo (rounded square, ~32px, Slack-style) + company name
- **Clicking company header** navigates to Settings page
- **Footer:** CreditBalance component first, then TendHunt branding below (small Crosshair icon + "TendHunt" wordmark, muted)
- **Fallback (no profile yet):** Show Clerk user's name + initials avatar circle at sidebar top

### Logo & branding display
- Settings page: Large logo (~80px) as header avatar at top of page with company name beside it. Upload overlay on hover.
- Logo upload supported: click to upload new logo (R2 presigned URL) + "Re-extract from website" button to re-run auto-extraction
- Sidebar: Rounded square ~32px logo, matching Slack workspace icon style
- TendHunt footer branding: Small Crosshair icon + "TendHunt" text, muted color, subtle

### Save & sync behavior
- Auto-save on blur (each field saves when user clicks out, like Notion)
- Toast notification on successful save ("Profile updated" at bottom-right)
- No Vibe Scanner re-score notification when profile changes — silent, user can manually re-score
- Document upload/removal does NOT trigger AI profile regeneration — documents are just stored

### Claude's Discretion
- Exact section divider styling and spacing
- Field ordering within sections
- Toast notification duration and styling
- Upload dropzone design for documents section
- Error handling for failed saves
- Mobile responsive behavior of the settings form

</decisions>

<specifics>
## Specific Ideas

- Figma reference: https://www.figma.com/design/kDDQ2XHvkVuyADp2jOsJBj/Getmany-Product?node-id=29230-50297 — shows the settings page concept with company logo and sidebar layout
- Sidebar header should feel like Slack's workspace switcher — logo + name, clickable
- Logo shape: rounded square (not circle) matching Slack workspace icons
- The current Settings page at `src/app/(dashboard)/settings/page.tsx` has a placeholder that says "Coming in Phase 3" — this needs to be completely replaced
- Reuse existing components: tag-style inputs from onboarding, R2 presigned URL upload, toast notifications from shadcn/ui

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-settings-profile*
*Context gathered: 2026-02-11*
