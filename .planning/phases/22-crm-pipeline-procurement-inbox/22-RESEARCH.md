# Phase 22: CRM Pipeline (Procurement Inbox) - Research

**Researched:** 2026-02-13
**Domain:** Kanban board drag-and-drop, multi-entity CRM cards, MongoDB state management
**Confidence:** HIGH

## Summary

Phase 22 adds a top-level "Inbox" sidebar section with a Kanban board for managing procurement deal flow. Cards represent any entity type (contracts, signals, buyers, scanner results) and flow through 5 procurement-specific stages: New, Qualified, Preparing Bid, Submitted, Won/Lost. Users add cards manually via "Send to CRM" buttons on entity pages or automatically via scanner AI column threshold rules.

The Getmany platform's Master Inbox provides a proven reference implementation using `@dnd-kit/core` + `@dnd-kit/sortable` with MongoDB state tracking, stage/priority management, position ordering, change logging, and archive/delete support. TendHunt's implementation will follow the same architectural patterns but adapted from tRPC to Next.js API routes and from agency-scoped to user-scoped (Clerk `userId`).

**Primary recommendation:** Use `@dnd-kit/core@^6.3.1` + `@dnd-kit/sortable@^10.0.0` (same versions as Getmany platform, proven stable). Do NOT use the new `@dnd-kit/react` package (v0.2.x, pre-1.0, only 27 npm dependents). Create a `PipelineCard` Mongoose model with polymorphic entity references and a `PipelineCardState` model for board position/stage tracking, mirroring the `ChatRoomState` pattern from Getmany.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@dnd-kit/core` | `^6.3.1` | Drag-and-drop context, sensors, collision detection | Same version as Getmany platform; 2146+ npm dependents; proven Kanban pattern |
| `@dnd-kit/sortable` | `^10.0.0` | Sortable lists within columns, `SortableContext`, `arrayMove` | Required for within-column reordering + cross-column moves |
| `@dnd-kit/utilities` | `^3.2.2` | CSS transform utilities for sortable items | CSS.Transform.toString() for smooth drag animations |
| `mongoose` | `^9.2.0` | MongoDB ODM for card/state models | Already in use across all TendHunt models |
| `zustand` | `^5.0.11` | Client-side Kanban board state | Already used for scanner-store, vibe-store, agent-store |
| `motion` (Framer Motion) | `^12.34.0` | Card enter/exit animations, stage transitions | Already installed; required by CLAUDE.md animation guidelines |
| `sonner` | `^2.0.7` | Toast notifications for "Send to CRM" actions | Already installed and used in settings/uploads |
| `nanoid` | `^5.1.6` | Unique card IDs | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | `^0.563.0` | Icons for stages, priority, card actions | Already installed; use `Inbox`, `KanbanSquare`, `Send`, `StickyNote` icons |
| `use-debounce` | `^10.1.0` | Debounce notes/comments auto-save | Already installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@dnd-kit/core` + `@dnd-kit/sortable` | `@dnd-kit/react` (new API) | New API is simpler (DragDropProvider + move helper) BUT v0.2.x is pre-1.0, only 27 npm users, breaking changes likely. Use proven stack. |
| `@dnd-kit/core` | `react-beautiful-dnd` | Unmaintained since 2022, no React 19 support. Not an option. |
| `@dnd-kit/core` | `@hello-pangea/dnd` | Fork of react-beautiful-dnd. Less flexible than dnd-kit for custom collision detection. |

**Installation:**
```bash
cd apps/web && bun add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/
├── models/
│   ├── pipeline-card.ts              # PipelineCard Mongoose model
│   └── pipeline-card-note.ts         # PipelineCardNote Mongoose model
├── app/
│   ├── (dashboard)/
│   │   └── inbox/
│   │       ├── page.tsx              # Server component: auth + initial data fetch
│   │       ├── breadcrumb.tsx        # Breadcrumb for "Inbox" in header
│   │       └── [cardId]/
│   │           └── page.tsx          # Card detail page (optional, or use sheet)
│   └── api/
│       └── inbox/
│           ├── route.ts              # GET (list cards), POST (create card)
│           ├── [id]/
│           │   └── route.ts          # GET/PATCH/DELETE single card
│           ├── reorder/
│           │   └── route.ts          # PATCH (bulk position update on drag-end)
│           ├── notes/
│           │   └── route.ts          # GET/POST notes for a card
│           └── auto-rules/
│               └── route.ts          # GET/POST auto-send rules
├── components/
│   └── inbox/
│       ├── kanban-board.tsx           # DndContext + DragOverlay + columns
│       ├── kanban-column.tsx          # useDroppable + SortableContext
│       ├── kanban-card.tsx            # useSortable wrapper
│       ├── kanban-card-content.tsx    # Card display (entity summary)
│       ├── kanban-card-preview.tsx    # DragOverlay preview
│       ├── column-header.tsx          # Stage name + count + color
│       ├── card-detail-sheet.tsx      # Sheet with full card details + notes
│       ├── send-to-inbox-button.tsx   # Reusable "Send to Inbox" button
│       ├── auto-rules-dialog.tsx      # Configure auto-send rules
│       └── stage-config.ts            # Stage enum, labels, colors, icons
├── stores/
│   └── inbox-store.ts                # Zustand store for board state
├── lib/
│   └── constants/
│       └── pipeline-stages.ts        # Stage enum + config (shared between FE/BE)
└── types/
    └── inbox.ts                      # TypeScript types for pipeline entities
```

### Pattern 1: Polymorphic Entity Reference (PipelineCard Model)
**What:** Single model that references any entity type via discriminated union
**When to use:** When cards can represent contracts, buyers, signals, or scanner results
**Example:**
```typescript
// Source: Adapted from Getmany ChatRoomState + TendHunt entity patterns
const pipelineCardSchema = new Schema({
  userId: { type: String, required: true, index: true },

  // Polymorphic entity reference
  entityType: {
    type: String,
    enum: ["contract", "buyer", "signal", "scanner_result"],
    required: true,
  },
  entityId: { type: Schema.Types.ObjectId, required: true },

  // Denormalized display fields (snapshot at time of card creation)
  title: { type: String, required: true },
  subtitle: { type: String },
  value: { type: Number },
  currency: { type: String, default: "GBP" },
  deadlineDate: { type: Date },
  sector: { type: String },
  buyerName: { type: String },
  logoUrl: { type: String },

  // Board state
  stage: {
    type: String,
    enum: ["NEW", "QUALIFIED", "PREPARING_BID", "SUBMITTED", "WON", "LOST"],
    default: "NEW",
    index: true,
  },
  position: { type: Number, default: 0 },
  priority: {
    type: String,
    enum: ["LOW", "MEDIUM", "HIGH"],
    default: "LOW",
  },

  // Source tracking
  addedBy: {
    type: String,
    enum: ["manual", "auto_rule"],
    default: "manual",
  },
  autoRuleId: { type: String },

  // Stage change tracking
  stageChangedAt: { type: Date },

  // Archive/delete
  isArchived: { type: Boolean, default: false, index: true },
  archivedAt: { type: Date },
}, { timestamps: true });

// Compound indexes
pipelineCardSchema.index({ userId: 1, stage: 1, position: 1 });
pipelineCardSchema.index({ userId: 1, entityType: 1, entityId: 1 }, { unique: true });
pipelineCardSchema.index({ userId: 1, isArchived: 1 });
```

### Pattern 2: Optimistic Kanban DnD (from Getmany Reference)
**What:** Optimistic local state update on drag-end, server sync, rollback on error
**When to use:** All drag-and-drop operations
**Example:**
```typescript
// Source: Getmany platform kanban-board.tsx — adapted for TendHunt API routes
const [localCards, setLocalCards] = useState(cards);
const isPending = useRef(false);

useEffect(() => {
  if (!isPending.current) setLocalCards(cards);
}, [cards]);

async function handleDragEnd(event: DragEndEvent) {
  // ... compute new positions ...

  isPending.current = true;
  setLocalCards(newCards); // optimistic update

  try {
    await fetch("/api/inbox/reorder", {
      method: "PATCH",
      body: JSON.stringify({
        stage: destStage,
        cardIds: newDestColumn.map(c => c._id),
        movedCard: sourceStage !== destStage
          ? { cardId: draggedId, fromStage: sourceStage }
          : undefined,
        sourceColumn: sourceStage !== destStage
          ? { stage: sourceStage, cardIds: newSourceColumn.map(c => c._id) }
          : undefined,
      }),
    });
  } catch {
    setLocalCards(cards); // rollback
  } finally {
    isPending.current = false;
  }
}
```

### Pattern 3: Bulk Position Update (from Getmany Reference)
**What:** Single bulkWrite to update all positions in affected columns
**When to use:** Drag-end handler server-side
**Example:**
```typescript
// Source: Getmany master-inbox.ts updateColumnPositions — adapted for TendHunt
const bulkOps = cardIds.map((cardId, index) => ({
  updateOne: {
    filter: { _id: cardId, userId },
    update: {
      $set: {
        stage,
        position: index,
        ...(movedCard?.cardId === cardId && {
          stageChangedAt: new Date(),
        }),
      },
    },
  },
}));

if (sourceColumn) {
  bulkOps.push(
    ...sourceColumn.cardIds.map((cardId, index) => ({
      updateOne: {
        filter: { _id: cardId, userId },
        update: { $set: { stage: sourceColumn.stage, position: index } },
      },
    }))
  );
}

await PipelineCard.bulkWrite(bulkOps);
```

### Pattern 4: "Send to Inbox" Button Component
**What:** Reusable button placed on entity detail pages + scanner entity sheet
**When to use:** Contract detail, buyer detail, signal pages, scanner entity detail sheet
**Example:**
```typescript
// Reusable component for all entity pages
interface SendToInboxButtonProps {
  entityType: "contract" | "buyer" | "signal" | "scanner_result";
  entityId: string;
  title: string;
  subtitle?: string;
  value?: number;
  deadlineDate?: string;
  sector?: string;
  buyerName?: string;
  logoUrl?: string;
}

export function SendToInboxButton(props: SendToInboxButtonProps) {
  const [isSending, setIsSending] = useState(false);
  const [isInInbox, setIsInInbox] = useState(false);

  async function handleSend() {
    setIsSending(true);
    const res = await fetch("/api/inbox", {
      method: "POST",
      body: JSON.stringify(props),
    });
    if (res.ok) {
      setIsInInbox(true);
      toast.success("Added to Inbox");
    }
    setIsSending(false);
  }

  return (
    <Button
      onClick={handleSend}
      disabled={isSending || isInInbox}
      size="sm"
    >
      {isInInbox ? <Check /> : <Inbox />}
      {isInInbox ? "In Inbox" : "Send to Inbox"}
    </Button>
  );
}
```

### Pattern 5: Scanner Auto-Send Rules
**What:** Rules that automatically create inbox cards when scanner AI scores exceed thresholds
**When to use:** CRM-05 requirement
**Example:**
```typescript
// Auto-rule schema (stored in scanner or separate collection)
const autoRuleSchema = new Schema({
  userId: { type: String, required: true, index: true },
  scannerId: { type: Schema.Types.ObjectId, ref: "Scanner", required: true },
  columnId: { type: String, required: true },
  threshold: { type: Number, required: true, min: 0, max: 10 },
  stage: {
    type: String,
    enum: ["NEW", "QUALIFIED"],
    default: "NEW",
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// In scoring endpoint: after scoring each entity, check auto-rules
async function checkAutoSendRules(
  userId: string,
  scannerId: string,
  entityId: string,
  columnId: string,
  score: number,
  entityData: Record<string, unknown>
) {
  const rules = await AutoRule.find({
    userId,
    scannerId,
    columnId,
    isActive: true,
    threshold: { $lte: score },
  });

  for (const rule of rules) {
    // Upsert to avoid duplicates
    await PipelineCard.findOneAndUpdate(
      { userId, entityType: "scanner_result", entityId },
      {
        $setOnInsert: {
          title: entityData.title,
          stage: rule.stage,
          addedBy: "auto_rule",
          autoRuleId: rule._id,
          position: await getNextPosition(userId, rule.stage),
        },
      },
      { upsert: true }
    );
  }
}
```

### Anti-Patterns to Avoid
- **Storing board position in the entity model itself:** Don't add `stage` or `boardPosition` to the Contract/Buyer/Signal models. Use a separate PipelineCard model. Entities are shared data; board state is user-specific.
- **Using the new `@dnd-kit/react` package:** Pre-1.0, only 27 npm users, API may change. Stick with `@dnd-kit/core` + `@dnd-kit/sortable` which have 2146+ dependents.
- **Fetching full entity data on every board render:** Denormalize key display fields (title, value, deadline, buyerName) into the PipelineCard at creation time. Only fetch full entity data when opening card detail.
- **Missing `isPending` guard on server sync:** Without the optimistic update guard, server responses can overwrite local drag state mid-drag. Copy the Getmany `isPending.current` pattern exactly.
- **Using `CSS.Transform.toString(transform)` from `@dnd-kit/utilities`:** The Getmany implementation avoids this for cards (only uses it for sortable logic) and uses simple opacity for drag state. This is cleaner.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop | Custom mouse event handlers, HTML5 DnD API | `@dnd-kit/core` + `@dnd-kit/sortable` | Cross-browser, accessible, touch support, collision detection |
| Card position ordering | Custom sort algorithms | `arrayMove` from `@dnd-kit/sortable` | Handles edge cases in array reordering |
| Optimistic updates | Custom state diffing | Getmany `isPending` + `localCards` pattern | Race condition handling between server and local state |
| Toast notifications | Custom notification system | `sonner` (already installed) | Already configured with Toaster in root layout |
| Unique IDs for cards | UUID generation | `nanoid` (already installed) or MongoDB `_id` | Use MongoDB `_id` for persistence, nanoid for temporary IDs |
| Stage change logging | Inline updates | Separate `PipelineCardChangeLog` collection | Audit trail, activity timeline, analytics |

**Key insight:** The Getmany platform has already solved the hard problems (position tracking, cross-column moves, optimistic updates, bulk reordering). Port the patterns, don't reinvent them.

## Common Pitfalls

### Pitfall 1: Card Duplication on Multi-Add
**What goes wrong:** User sends same entity to inbox from multiple places (contract page, scanner page, signal page) and gets duplicate cards.
**Why it happens:** POST endpoint creates without checking existing.
**How to avoid:** Unique compound index on `{ userId, entityType, entityId }`. Use `findOneAndUpdate` with `upsert: true` and `$setOnInsert` instead of `create()`.
**Warning signs:** Multiple cards with same title in board.

### Pitfall 2: Position Gaps After Delete
**What goes wrong:** After archiving/deleting a card, positions have gaps (e.g., 0, 1, 3, 5) which causes inconsistent ordering.
**Why it happens:** Delete removes card but doesn't compact positions.
**How to avoid:** On archive/delete, recompute positions for remaining cards in that column. Or accept gaps and sort by position (gaps don't affect sorting, only aesthetics).
**Warning signs:** New cards appearing in wrong positions.

### Pitfall 3: DragOverlay z-index Conflicts
**What goes wrong:** Dragged card preview appears behind sidebar, header, or sheet overlays.
**Why it happens:** DragOverlay renders in-place within DndContext; other elements have higher z-index.
**How to avoid:** DragOverlay has built-in portal behavior (renders in `document.body`). Ensure no `overflow: hidden` on ancestor containers that clip the overlay. Getmany approach: let DragOverlay portal handle it.
**Warning signs:** Card disappears during drag, or appears behind other UI elements.

### Pitfall 4: Stale Denormalized Data
**What goes wrong:** Entity title/value changes in the source (contract gets new title, buyer region changes) but the inbox card still shows old data.
**Why it happens:** Denormalized fields snapshot at card creation time.
**How to avoid:** Accept some staleness for board performance. Optionally refresh denormalized fields when card detail sheet opens (fetch live entity data and display it, don't update the card model on every view). For title changes, consider a lightweight cron or on-demand refresh.
**Warning signs:** Card showing outdated contract titles or values.

### Pitfall 5: React Compiler Lint Rules
**What goes wrong:** CI lint fails on component patterns that look fine locally.
**Why it happens:** TendHunt's CI runs React compiler ESLint which is stricter than local dev.
**How to avoid:** Follow patterns from CLAUDE.md: no components inside render (use memo'd top-level components), no ref.current mutations during render, no Math.random in render, no `as any`. Use render functions (`const renderX = () => ...`) instead of inline component definitions.
**Warning signs:** Local build passes but CI lint fails.

### Pitfall 6: Drag Sensor Activation Distance
**What goes wrong:** Clicks on card buttons (actions menu, priority badge) trigger drag instead.
**Why it happens:** PointerSensor activates on any mouse down.
**How to avoid:** Set `activationConstraint: { distance: 8 }` on PointerSensor (Getmany uses this exact value). This requires 8px of mouse movement before drag activates, allowing normal clicks.
**Warning signs:** Card opens drag overlay when user tries to click a button.

## Code Examples

### Verified Pattern: Kanban Board with Getmany Architecture
```typescript
// Source: Getmany platform/apps/web/components/master-inbox/board/kanban-board.tsx
// Adapted key patterns for TendHunt

// 1. Sensors with activation distance
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
);

// 2. DndContext wrapping columns
<DndContext
  sensors={sensors}
  onDragStart={handleDragStart}
  onDragOver={handleDragOver}
  onDragEnd={handleDragEnd}
  onDragCancel={handleDragCancel}
>
  <div className="flex h-full min-w-max gap-2.5 px-4">
    {STAGE_ORDER.map((stage) => (
      <KanbanColumn
        key={stage}
        stage={stage}
        cards={cardsByStage[stage]}
        activeId={activeId}
        overId={overId}
      />
    ))}
  </div>
  <DragOverlay>
    {activeCard ? <KanbanCardPreview card={activeCard} /> : null}
  </DragOverlay>
</DndContext>

// 3. Column with useDroppable + SortableContext
const { setNodeRef } = useDroppable({ id: stage });
<div ref={setNodeRef}>
  <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
    {cards.map(card => <KanbanCard key={card._id} card={card} />)}
  </SortableContext>
</div>

// 4. Card with useSortable
const { attributes, listeners, setNodeRef } = useSortable({ id: card._id });
<div ref={setNodeRef} {...attributes} {...listeners}>
  <KanbanCardContent card={card} />
</div>
```

### Verified Pattern: API Route with Clerk Auth
```typescript
// Source: TendHunt apps/web/src/app/api/scanners/route.ts — existing pattern
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  await dbConnect();
  const cards = await PipelineCard.find({
    userId,
    isArchived: false,
  }).sort({ stage: 1, position: 1 }).lean();
  return Response.json({ cards });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const body = await request.json();
  await dbConnect();
  // Upsert to prevent duplicates
  const card = await PipelineCard.findOneAndUpdate(
    { userId, entityType: body.entityType, entityId: body.entityId },
    {
      $setOnInsert: {
        userId,
        ...body,
        stage: "NEW",
        position: await getNextPosition(userId, "NEW"),
      },
    },
    { upsert: true, new: true }
  );
  return Response.json({ card }, { status: 201 });
}
```

### Verified Pattern: Sidebar Navigation Item
```typescript
// Source: TendHunt apps/web/src/components/layout/app-sidebar.tsx — existing pattern
// Add to navItems array:
{
  title: "Inbox",
  href: "/inbox",
  icon: Inbox, // from lucide-react
}
```

### Verified Pattern: Breadcrumb for List Page
```typescript
// Source: TendHunt breadcrumb system in CLAUDE.md
"use client";
import { useEffect } from "react";
import { useBreadcrumb } from "@/components/layout/breadcrumb-context";

export function InboxBreadcrumb() {
  const { setBreadcrumb } = useBreadcrumb();
  useEffect(() => {
    setBreadcrumb(<span className="text-sm font-medium">Inbox</span>);
    return () => setBreadcrumb(null);
  }, [setBreadcrumb]);
  return null;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-beautiful-dnd` | `@dnd-kit/core` + `@dnd-kit/sortable` | 2022 (rbd unmaintained) | Must use dnd-kit; rbd has no React 19 support |
| `@dnd-kit/core` v5 | `@dnd-kit/core` v6.3.1 | 2023 | Stable; Getmany uses this version |
| Custom DnD with HTML5 API | `@dnd-kit` with PointerSensor | 2021+ | Better touch support, accessibility, custom collision |
| `@dnd-kit/react` (new unified API) | Still pre-1.0 (v0.2.4) | 2025-2026 | NOT ready for production; uses `DragDropProvider` + `move` helper — simpler API but unstable |

**Deprecated/outdated:**
- `react-beautiful-dnd`: Unmaintained since 2022. No React 18+ support, no React 19 support.
- `react-dnd`: Still maintained but heavier, less ergonomic for Kanban boards than dnd-kit.

## Open Questions

1. **Notes/Comments Storage**
   - What we know: CRM-07 requires notes/comments on cards. Getmany uses ChatStory for messages (Upwork-specific). TendHunt needs simpler notes.
   - What's unclear: Should notes be embedded in PipelineCard (simpler, but document size grows) or in a separate PipelineCardNote collection (more scalable)?
   - Recommendation: Separate `PipelineCardNote` collection. Notes are unbounded (user can add many), and embedding unbounded arrays in documents is a MongoDB anti-pattern. Simple schema: `{ cardId, userId, content, createdAt }`.

2. **Scanner Result Entity Type**
   - What we know: Scanner results are not stored as standalone entities. They are contracts/buyers/signals displayed in a scanner grid with AI scores.
   - What's unclear: When auto-send creates a card from a scanner result, should `entityType` be "contract" (or "buyer"/"signal") based on the scanner type? Or should there be a dedicated "scanner_result" type?
   - Recommendation: Use the underlying entity type ("contract" for RFP scanners, "buyer" for buyer scanners, "signal" for meeting scanners). The scanner context (which scanner, which AI column triggered it) can be stored as `addedBy: "auto_rule"` + `autoRuleId`. This avoids a phantom entity type and leverages the existing entity linking for "link back to source."

3. **Won/Lost as Terminal Stages**
   - What we know: Won and Lost are final stages in the pipeline. Cards here are "done."
   - What's unclear: Should Won/Lost cards auto-archive after N days? Should they be in separate columns or combined into one "Closed" column with a Won/Lost badge?
   - Recommendation: Keep as 2 separate columns (Won, Lost) for clarity. Don't auto-archive. Let users manually archive when ready. This matches sales CRM conventions.

4. **Real-Time Updates**
   - What we know: Getmany uses tRPC with query invalidation for real-time sync. TendHunt uses standard API routes.
   - What's unclear: Should the board poll for updates, use optimistic-only (no polling), or use server-sent events?
   - Recommendation: Optimistic-only for MVP. Single-user boards rarely need real-time sync (unlike Getmany's multi-user inbox). If needed later, add a simple polling interval (e.g., 30s) via `setInterval` + refetch.

## Getmany Reference Architecture Summary

Key files from the Getmany Master Inbox that directly inform TendHunt's implementation:

| Getmany File | TendHunt Equivalent | Key Patterns |
|---|---|---|
| `packages/db/models/chat-room-state.model.ts` | `models/pipeline-card.ts` | Stage enum, priority enum, position field, archive/delete flags, change tracking timestamps |
| `packages/db/models/chat-room-state-change-log.model.ts` | `models/pipeline-card-change-log.ts` (optional) | Stage change audit trail with user + timestamp |
| `apps/web/lib/static/chat-room-state-config.tsx` | `lib/constants/pipeline-stages.ts` | Stage config: label, bgColor, textColor, icon, iconStyles |
| `apps/web/components/master-inbox/board/kanban-board.tsx` | `components/inbox/kanban-board.tsx` | DndContext + sensors + optimistic state + DragOverlay |
| `apps/web/components/master-inbox/board/kanban-column.tsx` | `components/inbox/kanban-column.tsx` | useDroppable + SortableContext + verticalListSortingStrategy |
| `apps/web/components/master-inbox/board/kanban-card.tsx` | `components/inbox/kanban-card.tsx` | useSortable + click handler + drag opacity |
| `apps/web/components/master-inbox/board/kanban-card-content.tsx` | `components/inbox/kanban-card-content.tsx` | Memoized content display + badges + action menu |
| `apps/web/components/master-inbox/board/column-header.tsx` | `components/inbox/column-header.tsx` | Stage icon + label + count badge |
| `apps/web/trpc/routers/master-inbox.ts` (updateColumnPositions) | `app/api/inbox/reorder/route.ts` | bulkWrite for positions, stage change logging, source column handling |

## Entity Page Integration Points

Where "Send to Inbox" buttons need to be added:

| Page | File | Current Action Buttons | Add Button |
|------|------|----------------------|------------|
| Contract detail | `apps/web/src/app/(dashboard)/contracts/[id]/page.tsx` | Share, Track Opportunity | Replace "Track Opportunity" with "Send to Inbox" |
| Buyer detail | `apps/web/src/app/(dashboard)/buyers/[id]/page.tsx` | Share, Download | Add "Send to Inbox" |
| Scanner entity sheet | `apps/web/src/components/scanners/entity-detail-sheet.tsx` | None (view only) | Add "Send to Inbox" in sheet header |
| Scanner header menu | Future | N/A | "Auto-send rule" option per AI column |

## Sources

### Primary (HIGH confidence)
- Getmany platform source code (`/Users/kirillkozak/Projects/platform/`) — Master Inbox Kanban board, ChatRoomState model, tRPC router (1646 lines). Direct reference implementation.
- TendHunt codebase — existing models (Contract, Buyer, Signal, Scanner), API routes, stores, components, layout patterns.
- Context7 `/websites/dndkit` — @dnd-kit official documentation for DndContext, SortableContext, useSortable, DragOverlay patterns.
- Context7 `/websites/next_dndkit` — New @dnd-kit docs including multiple sortable lists pattern (DragDropProvider + move helper).

### Secondary (MEDIUM confidence)
- npm registry — @dnd-kit/core v6.3.1 (2146+ dependents), @dnd-kit/react v0.2.4 (27 dependents, pre-1.0).
- Getmany platform `package.json` — confirms @dnd-kit/core@^6.3.1 + @dnd-kit/sortable@^10.0.0 versions in production.

### Tertiary (LOW confidence)
- None. All findings verified against source code or official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Same libraries and versions as proven Getmany platform + already-installed TendHunt dependencies
- Architecture: HIGH - Direct port of Getmany Kanban patterns adapted to TendHunt's API route + Clerk auth pattern
- Pitfalls: HIGH - Based on real bugs encountered in Getmany implementation + TendHunt CI lint rules from CLAUDE.md
- Entity integration: HIGH - Based on reading actual source files for all entity detail pages

**Research date:** 2026-02-13
**Valid until:** 2026-03-15 (stable libraries, no fast-moving dependencies)
