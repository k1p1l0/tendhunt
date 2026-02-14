# Phase 33 Research: DPS/Framework Status Intelligence

## Problem Statement

UK government procurement uses three main contract mechanisms:
1. **Standard tenders** — open once, close, award (linear lifecycle)
2. **Dynamic Purchasing Systems (DPS)** — run for multi-year periods with reopening windows
3. **Framework Agreements** — pre-qualified supplier lists with periodic call-offs

TendHunt currently treats all contracts as having a simple OPEN/CLOSED binary status. This creates misleading UI when:
- A DPS shows "Closed" but the overall system is still active (just between application windows)
- A Framework shows "Closed" but will have future call-offs
- Sculptor AI gives incorrect advice about whether contracts are still actionable

## Data Analysis

### Procurement Method Distribution (from live DB)

| Method | Count | Notes |
|--------|-------|-------|
| Open procedure | 40,805 | Standard tender |
| Restricted procedure | 7,464 | Standard tender |
| **Call-off from a framework agreement** | **2,438** | Framework |
| Negotiated with prior competition | 1,920 | Standard |
| Award without prior publication | 1,784 | Direct award |
| Competitive with negotiation | 1,666 | Standard |
| **Call-off from a dynamic purchasing system** | **542** | DPS |

**~2,980 contracts** are DPS/Framework call-offs (identified via `procurementMethodDetails`).

### Title-Based Detection

**4,454 contracts** contain "DPS", "Dynamic Purchasing", "Framework Agreement", or "Framework" in the title. This is a broader set that includes the parent DPS/Framework notices themselves (not just call-offs).

### The Contradiction Pattern

Contracts that are CLOSED but have future deadlines:
- DPS call-offs with future deadline: 11
- Framework call-offs with future deadline: 9
- DPS/Framework CLOSED with future `contractEndDate`: **105**

This means 105+ contracts appear "dead" in the UI but their parent DPS/Framework is still active.

### Detection Signals Available

1. **`procurementMethodDetails`** — "Call-off from a dynamic purchasing system" or "Call-off from a framework agreement"
2. **Title patterns** — contains "DPS", "Dynamic Purchasing System", "Framework Agreement", "Framework"
3. **Future `contractEndDate`** with CLOSED status — the DPS/Framework itself runs beyond the individual notice window
4. **`procurementMethod: "selective"`** — common for DPS (but not exclusive)

## What Needs to Change

### 1. Data Model — New `contractMechanism` Field

Add a derived field to Contract schema:
```
contractMechanism: "standard" | "dps" | "framework" | "call_off_dps" | "call_off_framework"
```

Derived from `procurementMethodDetails` + title pattern matching during sync.

### 2. Status Intelligence

Current status model: `OPEN | CLOSED | AWARDED | CANCELLED`

**Don't change the status enum** — it reflects the OCDS source data accurately. Instead, add a **computed display layer** that shows:
- Standard: OPEN / CLOSED / AWARDED / CANCELLED (as-is)
- DPS/Framework parent: Show "DPS Active" or "Framework Active" when contractEndDate is in the future, even if status is CLOSED
- Call-off: Show the call-off status + link to parent DPS/Framework info

### 3. UI Changes Needed

**Contract List Page:**
- Status badge should show "DPS" or "Framework" mechanism badge alongside status
- Contracts that are CLOSED but part of active DPS/Framework should show an amber "Window Closed" instead of red "CLOSED"
- Add filter for contract mechanism type

**Contract Detail Page:**
- Add "Procurement Mechanism" section explaining DPS/Framework
- Timeline should show reopening windows context
- "Apply for this tender" CTA should adapt:
  - Standard OPEN: "Apply for this tender"
  - DPS window open: "Apply to join this DPS"
  - DPS window closed: "Monitor for next reopening window"
  - Framework call-off: "Available to framework members"

**Sculptor AI:**
- System prompt needs DPS/Framework awareness
- Should explain the reopening window concept
- Should recommend monitoring the buyer for next window when CLOSED

### 4. Data Sync Changes

The OCDS mapper already extracts `procurementMethodDetails`. We need to:
1. Add classification logic in the mapper
2. Backfill existing contracts

## Key Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/models/contract.ts` | Add `contractMechanism` field |
| `apps/workers/data-sync/src/mappers/ocds-mapper.ts` | Add mechanism classification |
| `apps/web/src/components/contracts/contract-detail-view.tsx` | DPS/Framework-aware status, timeline, CTA |
| `apps/web/src/components/contracts/contracts-table.tsx` | Mechanism badge, amber status for DPS |
| `apps/web/src/lib/agent/system-prompt.ts` | DPS/Framework awareness for Sculptor |
