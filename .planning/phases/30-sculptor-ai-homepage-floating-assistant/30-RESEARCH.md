# Phase 30: Sculptor AI Homepage & Floating Assistant - Research

**Researched:** 2026-02-13
**Domain:** AI-first dashboard homepage, floating assistant bubble, Motion animations
**Confidence:** HIGH

## Summary

Phase 30 transforms the dashboard homepage from a traditional widget layout into an AI-first experience centered around "Sculptor" (the AI assistant). The homepage becomes a Gemini/AI-Studio-style interface with a hero chat input, animated starburst icon, and recent conversations. On all other pages, Sculptor appears as a floating bubble in the bottom-right corner that opens the existing AgentPanel Sheet.

The existing codebase already has all the core infrastructure: `AgentPanel` (Sheet-based, 480px right panel), `useAgent` hook (SSE streaming), `agent-store.ts` (Zustand with conversations), `ChatConversation` MongoDB model, and `AgentProvider` context. The work is primarily **frontend layout transformation and animation**, not new backend capability.

**Primary recommendation:** Restructure the dashboard page into a client component with hero input area, reuse the existing `useAgent` hook and `AgentInput`/`AgentMessageList` components, add a `<FloatingBubble>` component that is pathname-aware (hidden on `/dashboard`), and animate the starburst icon with Motion's `useTime` + `useTransform` for continuous rotation.

<user_constraints>

## User Constraints (from phase context)

### Locked Decisions
- AI assistant is called "Sculptor"
- Use the provided starburst icon (`apps/web/public/sculptor.png`)
- Homepage: AI-first with hero chat input, like Gemini/AI Studio reference images
- Other pages: floating bubble (bottom-right) that opens the existing Sheet panel
- Sheet panel = existing AgentPanel from Phase 19

### Claude's Discretion
- Animation implementation details (CSS vs Motion)
- Exact layout proportions
- "Jump back in" card design
- Bubble-to-panel transition animation approach

### Deferred Ideas (OUT OF SCOPE)
- None explicitly stated

</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Motion (Framer Motion) | ^12.34.0 | All component-level animations (hero, bubble, icon rotation, transitions) | Already installed and used across 10+ files in the project |
| next-themes | (installed) | Dark mode support for starburst icon | Already wraps the entire app via ThemeProvider |
| Zustand | (installed) | Agent store (`panelOpen`, conversations) | Already manages agent panel state |
| next/image | (built-in) | Optimized rendering of sculptor.png | Standard for Next.js image handling |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| radix-ui Sheet | (installed) | Side panel overlay for AgentPanel | Already used by `agent-panel.tsx` |
| lucide-react | (installed) | Icons for suggestion cards, UI chrome | Already used project-wide |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Motion `useTime`+`useTransform` for icon rotation | CSS `@keyframes` animation | CSS is simpler and already used for `.agent-trigger-orb` spin; Motion is more controllable (pause on hover, speed changes). **Recommendation: Use CSS keyframes** for the continuous starburst rotation since it is simpler, GPU-accelerated, and consistent with the existing orb animation pattern |
| next/image for sculptor.png | Inline SVG | SVG would allow CSS color changes natively for dark mode. But we have a PNG, so use `dark:invert` CSS filter instead |
| Separate floating bubble component | Modify existing header trigger | Separate component is cleaner; header trigger serves different UX purpose (persistent, always visible). Keep both |

**Installation:** No new packages needed. Everything required is already installed.

## Architecture Patterns

### Recommended Component Structure
```
apps/web/src/
├── app/(dashboard)/dashboard/
│   └── page.tsx                    # Restructured: server component fetches data, renders SculptorHomepage
├── components/sculptor/
│   ├── sculptor-homepage.tsx       # Client component: hero input + recent conversations + suggestion cards
│   ├── sculptor-icon.tsx           # Animated starburst icon (reusable across homepage + bubble)
│   ├── sculptor-hero-input.tsx     # Large centered chat input (wraps AgentInput pattern)
│   ├── recent-conversations.tsx    # "Jump back in" cards (fetches from ChatConversation)
│   └── floating-bubble.tsx         # Bottom-right FAB, pathname-aware (hidden on /dashboard)
├── components/agent/
│   ├── agent-panel.tsx             # EXISTING — no changes needed
│   ├── agent-panel-header.tsx      # UPDATE — rename "Research Agent" to "Sculptor"
│   └── ...                         # Other existing agent files untouched
├── components/layout/
│   ├── header.tsx                  # UPDATE — rename "Chat with AI" to "Sculptor" in trigger
│   └── app-sidebar.tsx             # UPDATE — rename "Research" to "Sculptor" in sidebar
└── stores/
    └── agent-store.ts              # MINOR UPDATE — possibly add recentConversations loading
```

### Pattern 1: Homepage as AI-First Entry Point
**What:** Replace the current dashboard grid layout (AccountManagerCard, SavedScannersSection, FreshSignalsFeed) with a centered hero area. The hero contains the animated Sculptor icon, a greeting, a prominent chat input, and suggestion cards below. Below the hero, show "Jump back in" recent conversations and the existing scanner/signals content.

**When to use:** On `/dashboard` route only.

**Key design decisions:**
- The dashboard `page.tsx` remains a server component that fetches user data, scanners, top scores, AND recent conversations from `ChatConversation`
- It renders a `<SculptorHomepage>` client component that receives this data as props
- The hero chat input uses the same `useAgent` hook and `sendMessage` function
- When a message is sent from the hero input, the AgentPanel Sheet opens and the conversation continues there (transition from hero to panel)

**Example:**
```typescript
// apps/web/src/app/(dashboard)/dashboard/page.tsx
import { SculptorHomepage } from "@/components/sculptor/sculptor-homepage";
// ... server-side data fetching ...

export default async function DashboardPage() {
  const [user, scanners, topScores, recentConversations] = await Promise.all([
    currentUser(),
    getUserScanners(userId),
    getTopScores(userId),
    getRecentConversations(userId, 5), // NEW: fetch last 5 conversations
  ]);

  return (
    <SculptorHomepage
      userName={user?.firstName || "there"}
      scanners={scanners}
      topScores={topScores}
      recentConversations={recentConversations}
    />
  );
}
```

### Pattern 2: Floating Bubble on Non-Dashboard Pages
**What:** A fixed-position circular button (56px) in the bottom-right corner showing the sculptor starburst icon. Clicking it opens the existing AgentPanel Sheet. It is hidden on `/dashboard` because the homepage has the inline hero input.

**When to use:** All dashboard pages except `/dashboard`.

**Key design decisions:**
- Rendered in the dashboard layout (`apps/web/src/app/(dashboard)/layout.tsx`) alongside `<AgentPanel />`
- Uses `usePathname()` to conditionally hide on `/dashboard`
- Uses `AnimatePresence` for enter/exit animation (scale from 0 + fade)
- Clicking calls `useAgentStore.getState().setPanelOpen(true)` -- same as existing header trigger
- Position: `fixed bottom-6 right-6 z-40` (below the Sheet overlay z-50)
- Includes pulse/glow animation on first appearance, then settles

**Example:**
```typescript
// apps/web/src/components/sculptor/floating-bubble.tsx
"use client";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useAgentStore } from "@/stores/agent-store";
import { SculptorIcon } from "./sculptor-icon";

export function FloatingBubble() {
  const pathname = usePathname();
  const panelOpen = useAgentStore((s) => s.panelOpen);
  const prefersReducedMotion = useReducedMotion();
  const isHomepage = pathname === "/dashboard";
  const visible = !isHomepage && !panelOpen;

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ type: "spring", visualDuration: 0.3, bounce: 0.3 }}
          onClick={() => useAgentStore.getState().setPanelOpen(true)}
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full
                     bg-background border shadow-lg flex items-center justify-center
                     hover:shadow-xl hover:scale-105 transition-shadow
                     min-h-[44px] min-w-[44px]"
          aria-label="Open Sculptor assistant"
        >
          <SculptorIcon size={28} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
```

### Pattern 3: Hero Input to Panel Handoff
**What:** When the user types a message in the homepage hero input and sends it, the AgentPanel Sheet opens and the conversation continues there. The hero input does NOT become an inline chat -- it hands off to the panel.

**When to use:** On message send from the homepage hero input.

**Why this approach:**
- Avoids duplicating the entire chat UI on the homepage
- The AgentPanel already handles message rendering, streaming, tool calls
- Clean separation: homepage = entry point, panel = conversation UI
- Matches the Gemini pattern where the input area transitions to a full chat view

**Implementation:**
```typescript
const handleHeroSend = (content: string) => {
  // Open the panel first
  useAgentStore.getState().setPanelOpen(true);
  // Then send the message (useAgent will handle conversation creation)
  sendMessage(content);
};
```

### Pattern 4: Animated Starburst Icon
**What:** The `sculptor.png` rendered as a reusable component with optional continuous rotation animation. Used at different sizes: large (64-80px) on homepage hero, medium (28px) in floating bubble, small (20px) in header/sidebar.

**Dark mode handling:** The sculptor.png is a black starburst on white/transparent background. In dark mode, apply `dark:invert` via Tailwind to make it white. This works because `next-themes` uses `attribute="class"` and the image is monochrome.

**Animation approach (CSS keyframes -- recommended):**
```css
@keyframes sculptor-rotate {
  to { transform: rotate(360deg); }
}

.sculptor-icon-animated {
  animation: sculptor-rotate 12s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .sculptor-icon-animated {
    animation: none;
  }
}
```

**Component:**
```typescript
// apps/web/src/components/sculptor/sculptor-icon.tsx
import Image from "next/image";

interface SculptorIconProps {
  size?: number;
  animate?: boolean;
  className?: string;
}

export function SculptorIcon({ size = 24, animate = false, className }: SculptorIconProps) {
  return (
    <Image
      src="/sculptor.png"
      alt=""
      width={size}
      height={size}
      className={cn(
        "dark:invert select-none",
        animate && "sculptor-icon-animated",
        className
      )}
      aria-hidden="true"
      priority={size > 40} // Priority load for hero-sized icons
    />
  );
}
```

### Anti-Patterns to Avoid
- **Duplicating chat UI on homepage:** Do NOT build a full message list on the homepage. The homepage hero input is an entry point that hands off to the panel.
- **Creating a new agent hook:** Reuse `useAgent()` from `apps/web/src/hooks/use-agent.ts`. Do not create a separate hook for the homepage.
- **Animating the PNG with Motion's `animate` prop on every render:** Use CSS keyframes for continuous rotation. Motion's `animate` is for state-driven transitions, not perpetual animation (unless using `useTime`).
- **Breaking the existing Cmd+K shortcut:** The keyboard shortcut must continue to work. It currently lives in `agent-panel.tsx` and toggles `panelOpen`.
- **Using `z-index: 9999`:** The bubble should use `z-40` (below the Sheet's `z-50`). Follow the project's z-index convention.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Side panel chat UI | New chat panel component | Existing `AgentPanel` + `Sheet` | Already built with streaming, tool calls, error handling, persistence |
| SSE streaming | New streaming implementation | Existing `useAgent` hook | Handles all SSE events, abort, retry, conversation creation |
| Conversation persistence | New API routes | Existing `/api/agent/chat` route | Already creates/updates `ChatConversation` in MongoDB |
| Dark mode toggle | Custom theme detection | `next-themes` + Tailwind `dark:` prefix | Already configured app-wide |
| Accessibility for motion | Custom media query listener | `useReducedMotion` from `motion/react` | Already used in `suggested-actions.tsx` and `agent-message-list.tsx` |

**Key insight:** 90% of the backend and agent infrastructure is already built from Phase 19. This phase is almost entirely a frontend layout/animation effort that reuses existing hooks, stores, and API routes.

## Common Pitfalls

### Pitfall 1: Sculptor Icon Invisible in Dark Mode
**What goes wrong:** The sculptor.png is black on transparent. In dark mode with a dark background, it becomes invisible.
**Why it happens:** PNG images don't respond to CSS color properties.
**How to avoid:** Apply `dark:invert` class to the `<Image>` component. This works because the image is monochrome (pure black). `invert` flips it to white.
**Warning signs:** Icon disappears when switching to dark mode in dev tools.

### Pitfall 2: Hero Input and Panel Input Fight for Focus
**What goes wrong:** If both the homepage hero input and the AgentPanel Sheet input try to auto-focus simultaneously, focus behavior becomes unpredictable.
**Why it happens:** The hero input is visible on mount, and the AgentPanel has a `setTimeout(() => textareaRef.current?.focus(), 300)` on open.
**How to avoid:** When the hero sends a message and opens the panel, delay focus to the panel input. The existing 300ms timeout in `agent-panel.tsx` already handles this. Do NOT add auto-focus to the hero input on mount -- let the user click to focus.
**Warning signs:** Focus jumps between inputs, or the keyboard shortcut opens the panel but focus stays on the hero.

### Pitfall 3: Conversations Loaded Client-Side Cause Waterfall
**What goes wrong:** If recent conversations are fetched client-side via `useEffect`, there's a visible loading state on every page load (flash of empty state before cards appear).
**Why it happens:** Client-side fetch happens after hydration, creating a waterfall.
**How to avoid:** Fetch recent conversations **server-side** in `page.tsx` using `ChatConversation.find({ userId }).sort({ lastMessageAt: -1 }).limit(5).lean()` and pass as props. This is the same pattern used for scanners and top scores.
**Warning signs:** "Jump back in" section flickers or shows skeleton loaders.

### Pitfall 4: Floating Bubble Overlaps Sheet Overlay
**What goes wrong:** The floating bubble stays visible when the AgentPanel Sheet opens, appearing on top of the overlay.
**Why it happens:** Both use fixed positioning with high z-indexes.
**How to avoid:** Hide the bubble when `panelOpen` is true (already shown in the Pattern 2 code above: `const visible = !isHomepage && !panelOpen`). Use `AnimatePresence` for a smooth exit animation.
**Warning signs:** Bubble visible behind the semi-transparent overlay.

### Pitfall 5: React Compiler Lint -- Component Inside Render
**What goes wrong:** CI fails with `react-hooks/static-components` error.
**Why it happens:** Defining a component function inside another component's render body (e.g., defining `SuggestionCard` inside `SculptorHomepage`).
**How to avoid:** Extract all sub-components to module-level functions or separate files. Use render functions (`const renderCard = (...)`) for inline cases. This is documented in CLAUDE.md CI Lint Rules.
**Warning signs:** Local dev works but CI lint fails.

### Pitfall 6: Missing `prefers-reduced-motion` for Starburst Animation
**What goes wrong:** The continuously rotating starburst icon causes motion sickness for users with vestibular disorders.
**Why it happens:** CSS animation runs regardless of user preferences.
**How to avoid:** Add `@media (prefers-reduced-motion: reduce)` rule that sets `animation: none`. The existing `.agent-trigger-orb` CSS already follows this pattern (see `globals.css` lines 223-233). Follow the same pattern.
**Warning signs:** Accessibility audit flags continuous animation without reduced-motion check.

### Pitfall 7: Server Component vs Client Component Boundary
**What goes wrong:** Trying to use `useAgent()` or `useAgentStore()` in the server component `page.tsx`.
**Why it happens:** The dashboard page is currently a server component.
**How to avoid:** Keep `page.tsx` as a server component for data fetching. Create `SculptorHomepage` as a `"use client"` component that receives data as props and uses hooks internally. This matches the existing `AgentContextSetter` pattern used by other server component pages.
**Warning signs:** "Cannot use hooks in server component" error.

## Code Examples

### Recent Conversations Query (Server-Side)
```typescript
// apps/web/src/lib/dashboard.ts — add this function
import ChatConversation from "@/models/chat-conversation";

export interface RecentConversation {
  _id: string;
  title: string;
  lastMessageAt: Date;
  messageCount: number;
  context?: { page: string };
}

export async function getRecentConversations(
  userId: string,
  limit = 5
): Promise<RecentConversation[]> {
  await dbConnect();
  const conversations = await ChatConversation.find({ userId })
    .sort({ lastMessageAt: -1 })
    .limit(limit)
    .select("title lastMessageAt messages context")
    .lean();

  return conversations.map((c) => ({
    _id: String(c._id),
    title: c.title || "New conversation",
    lastMessageAt: c.lastMessageAt,
    messageCount: c.messages?.length ?? 0,
    context: c.context as { page: string } | undefined,
  }));
}
```

### SculptorHomepage Layout Structure
```typescript
// Conceptual layout (not final code)
<div className="flex flex-col items-center min-h-[calc(100vh-3.5rem)]">
  {/* Hero Section -- vertically centered when no conversations */}
  <div className="flex-1 flex flex-col items-center justify-center max-w-2xl w-full px-4">
    {/* Animated starburst */}
    <SculptorIcon size={64} animate />

    {/* Greeting */}
    <h1 className="text-3xl font-bold mt-6">
      Welcome back, {userName}
    </h1>
    <p className="text-muted-foreground mt-2">
      What would you like to explore?
    </p>

    {/* Hero chat input */}
    <div className="w-full mt-8">
      <SculptorHeroInput onSend={handleHeroSend} />
    </div>

    {/* Suggestion chips */}
    <div className="flex flex-wrap gap-2 mt-4 justify-center">
      {suggestions.map(s => <SuggestionChip key={s} ... />)}
    </div>
  </div>

  {/* Below-the-fold content */}
  <div className="w-full max-w-4xl px-4 pb-8 space-y-8">
    {recentConversations.length > 0 && (
      <RecentConversations conversations={recentConversations} />
    )}
    <SavedScannersSection scanners={scanners} />
    <FreshSignalsFeed signals={topScores} />
  </div>
</div>
```

### FloatingBubble Integration in Layout
```typescript
// apps/web/src/app/(dashboard)/layout.tsx
import { FloatingBubble } from "@/components/sculptor/floating-bubble";

// Inside the JSX, alongside AgentPanel:
<AgentProvider>
  <Header />
  <main className="flex-1 p-6">{children}</main>
  <AgentPanel />
  <FloatingBubble />
</AgentProvider>
```

### Renaming Touchpoints
The "Research Agent" / "Chat with AI" branding needs updating to "Sculptor" in these files:
1. `apps/web/src/components/agent/agent-panel-header.tsx` line 51: `"Research Agent"` -> `"Sculptor"`
2. `apps/web/src/components/layout/header.tsx` line 29: `"Chat with AI"` -> `"Sculptor"`
3. `apps/web/src/components/layout/app-sidebar.tsx` line 102: `"Research"` -> `"Sculptor"`
4. `apps/web/src/components/agent/agent-panel.tsx` line 49: `SheetTitle "Research Agent"` -> `"Sculptor"`
5. `apps/web/src/components/agent/suggested-actions.tsx` line 76: `"How can I help?"` -- keep or change to `"How can Sculptor help?"`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Traditional dashboard with widgets | AI-first homepage with hero prompt (Gemini, AI Studio, ChatGPT) | 2024-2025 | Users expect AI-first entry points in AI-powered products |
| Chatbot as sidebar-only | Floating action button + contextual panel | 2023-present | Standard in Intercom, Zendesk, GitHub Copilot |
| Framer Motion (package) | Motion (rebranded, same API) | 2024 (v11+) | Import from `motion/react` not `framer-motion` |
| `AnimateSharedLayout` wrapper | Direct `layoutId` prop | Motion 5+ | No wrapper needed for shared element animations |
| `useTime` for perpetual animation | CSS keyframes preferred for simple cases | Always | CSS keyframes are GPU-accelerated and don't cause React re-renders |

## Open Questions

1. **What happens to AccountManagerCard?**
   - What we know: Currently prominent on dashboard. The AI-first redesign pushes it below the fold.
   - What's unclear: Should it be removed entirely, moved to settings, or kept below the fold?
   - Recommendation: Keep below the fold, after recent conversations. It provides value (Calendly booking) and removing it is a separate product decision.

2. **Should "Jump back in" cards load the conversation in the panel?**
   - What we know: ChatConversation has `_id` and `messages` in MongoDB. The current `useAgent` hook creates new conversations client-side with nanoid.
   - What's unclear: There's no API to load a past conversation into the panel. The Zustand store holds conversations in memory only.
   - Recommendation: For v1, clicking a "Jump back in" card opens the panel and starts a **new** conversation (possibly with the same context). Loading historical conversations requires a new API route (`GET /api/agent/conversations/[id]`) and store changes. This can be a fast-follow.

3. **Should the hero input have a different visual style than the panel input?**
   - What we know: The Gemini reference shows a large, prominent search-bar-style input. The existing `AgentInput` is a compact textarea.
   - What's unclear: Should we build a new `SculptorHeroInput` or style the existing `AgentInput` differently?
   - Recommendation: Build a `SculptorHeroInput` that is visually distinct (larger, centered, with rounded-2xl border, no send button -- Enter to send). It calls the same `sendMessage` under the hood. The panel continues using the existing `AgentInput`.

4. **Should the floating bubble show unread indicator?**
   - What we know: No notification system exists for the agent currently.
   - What's unclear: Would a notification dot add value or just be noise?
   - Recommendation: Skip for v1. The bubble is a launcher, not a notification center.

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** -- All existing files read and analyzed:
  - `apps/web/src/app/(dashboard)/dashboard/page.tsx` -- Current dashboard structure
  - `apps/web/src/components/agent/agent-panel.tsx` -- Sheet-based panel (480px, right side)
  - `apps/web/src/stores/agent-store.ts` -- Zustand store (panelOpen, conversations)
  - `apps/web/src/hooks/use-agent.ts` -- SSE streaming hook
  - `apps/web/src/models/chat-conversation.ts` -- MongoDB conversation schema
  - `apps/web/src/app/api/agent/chat/route.ts` -- Chat API with SSE + persistence
  - `apps/web/src/components/agent/suggested-actions.tsx` -- Existing suggestion cards with Motion
  - `apps/web/src/components/layout/header.tsx` -- Header with agent trigger button
  - `apps/web/src/components/layout/app-sidebar.tsx` -- Sidebar with "Research" item
  - `apps/web/src/app/(dashboard)/layout.tsx` -- Dashboard layout with providers
  - `apps/web/src/app/globals.css` -- Agent trigger CSS + reduced motion media queries
  - `apps/web/src/app/layout.tsx` -- ThemeProvider with next-themes (class-based dark mode)
  - `apps/web/public/sculptor.png` -- Black monochrome starburst icon (38KB)

- **Context7: Motion for React** (`/websites/motion_dev_react`)
  - `layoutId` for shared element animations between hero and panel
  - `AnimatePresence` for enter/exit animations
  - `useReducedMotion` hook for accessibility
  - `useTime` + `useTransform` for perpetual rotation (alternative to CSS)
  - Spring transitions with `visualDuration` and `bounce`

### Secondary (MEDIUM confidence)
- **Motion official docs** -- Spring animation `visualDuration` property confirmed via Context7
- **next-themes** -- `attribute="class"` confirmed from `layout.tsx`, enabling Tailwind `dark:` prefix

### Tertiary (LOW confidence)
- None. All findings verified from codebase or Context7.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** -- All libraries already installed and in use. No new dependencies.
- Architecture: **HIGH** -- Patterns directly follow existing codebase conventions (server component page + client component, AgentContextSetter pattern, useAgentStore).
- Pitfalls: **HIGH** -- All pitfalls identified from actual codebase patterns (dark mode, CI lint rules, server/client boundary, z-index).

**Research date:** 2026-02-13
**Valid until:** 2026-03-15 (stable -- no external dependency changes expected)
