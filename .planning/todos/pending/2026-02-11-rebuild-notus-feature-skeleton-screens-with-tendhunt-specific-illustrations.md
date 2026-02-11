---
created: 2026-02-11T04:35:49.439Z
title: Rebuild Notus feature skeleton screens with TendHunt-specific illustrations
area: ui
files:
  - landing/components/agentic-intelligence/skeletons.tsx
  - landing/components/how-it-works/skeletons.tsx
---

## Problem

The Notus template's AgenticIntelligence and HowItWorks sections use skeleton/illustration components that still show generic AI agent content (LLM Model Selector with Claude/ChatGPT/Llama badges, chat conversation UI for "Text to Workflow Builder", and Meeting Summarizer/Code Reviewer/Customer Support for "Native Tools Integration"). These need to be rebuilt to show TendHunt-specific feature illustrations:

- **Contract Discovery** skeleton: Should show a contract search/filter UI (e.g. contract cards with value, sector, deadline)
- **Vibe Scanner AI** skeleton: Should show an AI scoring interface (e.g. company profile matched against contract, score badge 1-10)
- **Buyer Intelligence** skeleton: Should show a contact reveal card (e.g. name, email, LinkedIn, organization, decision-maker role)

The bottom 3 feature cards (Buying Signals, Smart Alerts, Export & Reporting) are text-only and don't have skeletons — those are fine as-is.

## Solution

Replace the skeleton components in `agentic-intelligence/skeletons.tsx` with TendHunt-specific animated illustrations:

1. `LLMModelSelectorSkeleton` → `ContractSearchSkeleton` — Mock contract cards with filters sidebar
2. `TextToWorkflowBuilderSkeleton` → `VibeScannerSkeleton` — AI scoring animation with match percentage
3. `NativeToolsIntegrationSkeleton` → `BuyerIntelSkeleton` — Contact reveal card with redacted → revealed animation

Similarly update `how-it-works/skeletons.tsx` for the 3-step flow (Sign Up, Search & Filter, Reveal & Win).

Keep the same animation patterns (motion/framer-motion) and component structure from the template.
