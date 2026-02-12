# Multi-Agent AI Coding Workflows with Git Worktrees — Research Notes

## Key Statistics

- 82% of developers report using AI tools weekly as of Q1 2025 (index.dev)
- 59% of developers run 3 or more AI tools in parallel (index.dev)
- 84% of developers use AI tools in 2026, with AI now writing 41% of all code (getpanto.ai)
- Developers report 10-30% productivity increase with AI coding tools (index.dev)
- Developers save 30-60% of their time using AI tools (secondtalent.com)
- MIT-backed study: seasoned developers took ~19% longer with AI assistance due to prompt/verification overhead (METR)
- Median PR size increased 33% (from 57 to 76 lines) from March to November 2025 (faros.ai)
- Lines of code per developer grew from 4,450 to 7,839 with AI tools (faros.ai)
- Google DORA 2025: 90% AI adoption increase correlates with 9% climb in bug rates, 91% increase in code review time, and 154% increase in PR size (greptile.com)
- Only ~30% of AI-suggested code gets accepted by developers (GitHub Copilot data)
- Anthropic documents running 5-10 parallel Claude sessions: 5 local on a MacBook, 5-10 on the website (Anthropic docs)
- incident.io routinely runs 4-5 parallel Claude Code agents simultaneously (incident.io blog)
- incident.io achieved 18% performance improvement in build tooling using parallel agents for $8 in Claude credits (incident.io blog)
- In a 20-minute session with a ~2GB codebase, automatic worktree creation used 9.82 GB of disk space (Nx blog)
- ccswarm reports 93% token reduction through conversation history management (GitHub nwiizo/ccswarm)
- GSD framework: context quality at 0-30% is peak; at 50%+ model starts rushing; at 70%+ hallucinations and forgotten requirements occur (GSD docs)

---

## 1. Git Worktrees — How They Work

### What Are Git Worktrees?

Git worktrees allow you to check out multiple branches of the same repository into **separate directories simultaneously**. Unlike cloning a repository multiple times, worktrees share a single `.git` directory, making them lightweight and keeping all branches in sync.

### Core Commands

| Command | Description | Example |
|---------|-------------|---------|
| `git worktree add <path> -b <branch>` | Create new worktree with new branch | `git worktree add ../project-feature-a -b feature-a` |
| `git worktree add <path> <branch>` | Create worktree from existing branch | `git worktree add ../project-bugfix bugfix-123` |
| `git worktree list` | List all worktrees | Shows main + linked worktrees |
| `git worktree remove <path>` | Remove a worktree | Only clean trees (use `--force` for dirty) |
| `git worktree prune` | Clean up stale worktree metadata | Removes references to deleted directories |
| `git worktree lock <path>` | Prevent auto-pruning | For portable/network worktrees |
| `git worktree move <old> <new>` | Relocate a worktree | Moves working directory |

### How Worktrees Enable Parallel Agent Work

1. **File-level isolation**: Each worktree has its own working directory and staging area — changes in one do NOT affect others
2. **Shared git history**: All worktrees share the same `.git` object database and remote connections
3. **Lightweight**: Only working files are duplicated (not the full `.git` directory), so disk usage is far less than full clones
4. **Branch locking**: Git prevents two worktrees from checking out the same branch, enforcing isolation
5. **No stash/checkout dance**: Unlike regular branches, you never need `git stash` to switch contexts

### Disk Space Comparison

| Approach | Disk Usage | Git Object Sharing |
|----------|-----------|-------------------|
| Multiple full clones | Full repo size x N | None — each clone has own `.git` |
| Git worktrees | Working files x N + 1 shared `.git` | Full sharing of objects |
| Single branch | 1x working files | N/A |

**Caveat**: For a ~2GB codebase, a 20-minute session with automatic worktree creation used **9.82 GB** total. Build artifacts (Bazel, Pants, Nx caches) multiply per worktree.

---

## 2. Claude Code Multi-Agent Patterns

### Official Anthropic-Documented Patterns

**A. Git Worktrees (Manual Parallel Sessions)**

Anthropic's official documentation (`code.claude.com/docs/en/common-workflows`) describes:

```bash
# Create a new worktree with a new branch
git worktree add ../project-feature-a -b feature-a

# Navigate to worktree and run Claude Code
cd ../project-feature-a
claude

# In another terminal, do the same for another task
cd ../project-bugfix
claude
```

Key points from official docs:
- Each worktree has its own independent file state
- Changes made in one worktree do not affect others
- All worktrees share the same Git history and remote connections
- Must initialize dev environment in each worktree (npm install, etc.)
- Use descriptive directory names to identify tasks

**B. Agent Teams (Experimental — TeammateTool/Swarm Mode)**

Released January 2026 alongside Claude Sonnet 5. Disabled by default.

**Enable**: Add `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` to settings.json or environment:
```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

**Architecture**:

| Component | Role |
|-----------|------|
| Team Lead | Main Claude session — creates team, spawns teammates, coordinates |
| Teammates | Separate Claude instances — each works on assigned tasks |
| Task List | Shared list of work items that teammates claim and complete |
| Mailbox | Messaging system for inter-agent communication |

**TeammateTool** provides 13 distinct operations for managing agents. Team metadata stored at `~/.claude/teams/{team-name}/`.

**Display modes**:
- **In-process**: All teammates in main terminal. Shift+Up/Down to select.
- **Split panes**: Each teammate gets own pane (requires tmux or iTerm2).

**Key limitations** (current):
- No session resumption for in-process teammates (`/resume` and `/rewind` do not restore)
- Task status can lag — teammates sometimes forget to mark tasks complete
- Shutdown can be slow (waits for current tool call)
- One team per session
- No nested teams
- Lead is fixed (cannot promote teammate)
- Split panes not supported in VS Code terminal, Windows Terminal, or Ghostty

**C. Subagents (Task Tool)**

The Task tool spawns parallel sub-agents running up to **7 agents simultaneously** within a single session. Key difference from Agent Teams:

| Aspect | Subagents | Agent Teams |
|--------|-----------|-------------|
| Context | Own window; results return to caller | Own window; fully independent |
| Communication | Report back to main agent only | Teammates message each other directly |
| Coordination | Main agent manages all work | Shared task list with self-coordination |
| Best for | Focused tasks where only result matters | Complex work requiring discussion |
| Token cost | Lower (results summarized) | Higher (each is separate Claude instance) |

Task tool currently executes **synchronously** — blocks orchestrator until agents complete. There is an active feature request (Issue #9905) for background async execution.

**D. Headless Mode**

```bash
claude -p "your prompt here"
claude --permission-mode plan -p "analyze and suggest improvements"
```

Enables non-interactive execution for CI/CD pipelines, pre-commit hooks, and data processing scripts.

---

## 3. Orchestrator + Worker Agent Patterns

### Pattern Overview

An orchestrator agent receives user input and transforms it into a multiset of subtasks routed to corresponding worker agents. Each worker returns a local result. The orchestrator aggregates results.

### Key Implementation Approaches

**A. Manual Worktree Orchestration (Shell Script)**

Common community pattern using a shell function:

```bash
function wt() {
  git worktree add ../worktrees/$1 main
  cd ../worktrees/$1 && git checkout -b $1
}
```

Then launch separate Claude sessions per worktree:
```bash
# Terminal 1
wt feature-auth && claude

# Terminal 2
wt feature-dashboard && claude

# Terminal 3
wt feature-api && claude
```

**B. incident.io's Worktree Manager**

Custom command: `w myproject new-feature claude`
- Auto-completion for existing worktrees and repositories
- Automatic worktree creation with username prefixes
- Organization in `~/projects/worktrees/` directory structure
- Git operations executable from any directory context

**C. ccswarm (Open Source — Rust)**

GitHub: `nwiizo/ccswarm` — Multi-agent orchestration system.

Features:
- Git worktree isolation for parallel development
- Specialized agent pool: Frontend (React/Vue/UI), Backend (APIs/Database), DevOps (Docker/CI/CD), QA (Testing/Quality)
- Session persistence and intelligent task delegation
- Terminal UI for real-time monitoring
- 93% token reduction through conversation history management
- Type-state pattern for compile-time state validation (zero runtime cost)
- Channel-based orchestration — message-passing without shared state or locks

**D. claude-flow (Open Source)**

GitHub: `ruvnet/claude-flow` — Agent orchestration platform for Claude.
- Distributed swarm intelligence
- RAG integration
- Native Claude Code support via MCP protocol

**E. ccpm (Open Source)**

GitHub: `automazeio/ccpm` — Project management for Claude Code using GitHub Issues and Git worktrees for parallel agent execution.

**F. Conductor Pattern**

Each agent gets its own isolated Git worktree. Dashboard shows all agents and what they are working on. Limitation: worktrees isolate code but NOT the runtime environment (shared ports, databases, services).

### Best Practices for Orchestrator-Worker

1. **File ownership boundaries**: Each worker owns distinct files/directories — prevents merge conflicts
2. **5-6 tasks per worker**: Too small = coordination overhead exceeds benefit; too large = no progress visibility
3. **Self-claiming tasks**: More efficient than lead assigning every task — eliminates round-trip delays
4. **Share API contracts early**: Backend worker should share contracts with frontend/tests workers ASAP
5. **Plan approval gates**: Require workers to plan before implementing for complex/risky tasks:
   ```
   Spawn an architect teammate to refactor the auth module.
   Require plan approval before they make any changes.
   ```
6. **Delegate mode**: Restrict lead to coordination-only tools (no code touching) via Shift+Tab

---

## 4. Real-World Examples (2025-2026)

### incident.io

- **Scale**: 4-5 parallel Claude Code agents routinely
- **Productivity**: 18% improvement in API generation build time
- **Cost**: $8 in Claude credits for the build tooling improvement
- **Speed**: 30 seconds of prompting + ~10 minutes processing vs. estimated 2-hour manual completion
- **CI pipeline**: Under 5 minutes execution time
- **Culture**: Leaderboard tracking Claude Code usage; CTO directive to maximize Claude spending
- **Timeline**: Went from zero Claude Code to parallel agent workflows within 4 months
- **Blog**: [How we're shipping faster with Claude Code and Git Worktrees](https://incident.io/blog/shipping-faster-with-claude-code-and-git-worktrees)

### GSD Framework Users

- 23-plan development projects completed using GSD + "Lean Orchestrator" pattern
- Multiple forked versions on GitHub (GSD 2.0, gsd-claude, etc.)
- Active community on Threads/X

### Open Source Tools

| Tool | GitHub | Focus |
|------|--------|-------|
| ccswarm | nwiizo/ccswarm | Git worktree isolation + specialized agents (Rust) |
| claude-flow | ruvnet/claude-flow | Distributed swarm intelligence + MCP |
| ccpm | automazeio/ccpm | GitHub Issues + worktrees for parallel execution |
| agents | wshobson/agents | Multi-agent orchestration for Claude Code |
| ccswitch | ksred/ccswitch | Managing multiple Claude Code sessions |
| Worktrunk | worktrunk.dev | Dedicated worktree management tool |
| wt | Hacker News item #46765489 | Lightweight Git worktree orchestrator for parallel coding agents |

---

## 5. GSD (Get Shit Done) Workflow

### What It Is

GSD is a production-grade meta-prompting and context engineering system for Claude Code. It enforces the pattern: **Idea -> Roadmap -> Phase Plan -> Atomic Execution**.

### How It Handles Parallelism

- **Wave-based execution**: Independent tasks run in parallel as "Waves." Dependent tasks wait.
  - Wave 1: 3 plans simultaneously
  - Wave 2: Waits for Wave 1, then runs its batch
- **Fresh agent instances**: Spawns fresh Claude instances per task — each gets clean 200k context window
- **Context isolation**: Main session stays clean while agents do heavy lifting
- **Per-task commits**: Each task gets its own commit — enables `git bisect` and selective revert

### Context Rot Prevention

| Context Usage | Quality Level |
|---------------|---------------|
| 0-30% | Peak quality |
| 50%+ | Model starts rushing, cutting corners |
| 70%+ | Hallucinations and forgotten requirements |

GSD prevents context rot by keeping each agent's work scoped and spawning fresh instances.

### Current Worktree Support

GSD does **not** natively use git worktrees for agent isolation. It relies on:
- Fresh agent instances per task (context isolation)
- Wave-based sequential/parallel execution
- Per-task commits for git-level isolation

Worktree integration would be a natural extension — running each wave's parallel tasks in separate worktrees. This is not yet built into GSD but has been discussed in the community.

### Key Repos

| Repo | Stars | Notes |
|------|-------|-------|
| glittercowboy/get-shit-done | Original | Core GSD framework |
| itsjwill/GSD-2.0 | Fork | Multi-model intelligence, adaptive context, rollback/recovery |
| b-r-a-n/gsd-claude | Fork | Phase-based planning, VCS abstraction, progress tracking |

---

## 6. Risks and Gotchas

### Merge Conflicts

| Risk | Severity | Mitigation |
|------|----------|------------|
| Two agents editing the same file | **Critical** | Enforce file-ownership boundaries per agent |
| Lock file conflicts (package-lock.json, yarn.lock) | **High** | Resolve by running `npm install --package-lock-only` after merge |
| Auto-generated files (migrations, types) | **Medium** | Assign one agent as owner of generated files |
| Parallel agents touching shared config files | **High** | Designate one agent for config; others read-only |

**Lock file resolution strategy**: After resolving `package.json` conflicts manually, run `npm install --package-lock-only` and npm will automatically merge the lock file. Do NOT try to resolve lock file conflicts by hand — it leads to unintended version bumps (e.g., 1.2.0 could silently become 1.5.8).

### Shared State Issues

| Shared Resource | Problem | Solution |
|----------------|---------|----------|
| Ports (3000, 5432, etc.) | Multiple worktrees try to use same ports | Use different port configs per worktree |
| Databases | Migrations from different agents conflict | Single agent owns migrations; others wait |
| Environment variables | `.env` files may reference shared services | Create per-worktree `.env` overrides |
| Build caches | Bazel/Nx/Pants caches multiply per worktree | Can consume gigabytes — monitor disk |
| Node modules | Each worktree needs its own `node_modules` | Run `npm install` in each worktree |

### Database Migration Conflicts

- **Critical rule**: Only ONE agent should own database migrations
- In Agent Teams pattern: Backend teammate owns `src/db/migrations/`
- Backend shares API contract with frontend/tests teammates as soon as it is defined
- Never have parallel agents creating numbered migration files simultaneously

### Agent Teams-Specific Gotchas

1. **No session resumption**: In-process teammates are NOT restored on `/resume` or `/rewind`. Lead may try to message non-existent teammates.
2. **Task status lag**: Teammates sometimes forget to mark tasks complete, blocking dependent work.
3. **Always use lead for cleanup**: Teammates should NOT run cleanup — team context may not resolve correctly, leaving resources inconsistent.
4. **Token cost explosion**: Each teammate is a separate Claude instance — costs scale with team size.
5. **No nested teams**: Teammates cannot spawn their own teams.

### Disk Space

- Each worktree duplicates working files
- Build artifacts (node_modules, .next, dist) multiply per worktree
- For a 2GB codebase: 20 minutes of worktree usage consumed 9.82 GB
- Monitor with `du -sh` and clean up aggressively

### No Conflict Detection

No current tool warns you when two agents might edit the same code. This must be handled through:
- Clear file-ownership boundaries in prompts
- Architect/lead agent planning task boundaries before workers begin
- Code review of merged branches

---

## 7. Git Worktrees vs. Git Branches — Why Worktrees Win for Parallel Agents

### The Core Problem with Branches Alone

Standard branching uses a **single working directory** where only one branch's changes can be checked out at a time. To switch between tasks:
1. Save current work (`git stash` or WIP commit)
2. `git checkout other-branch`
3. Wait for files to update
4. Do work
5. Reverse the process to switch back

This is **fundamentally incompatible** with running multiple AI agents in parallel, because all agents would be fighting over the same file system.

### Why Worktrees Are Superior

| Aspect | Branches Only | Worktrees |
|--------|--------------|-----------|
| Parallel file access | Impossible — one branch at a time | Each worktree has independent file state |
| Context switching | Requires stash/checkout/unstash cycle | Just `cd` to another directory |
| AI agent isolation | Agents would overwrite each other's work | Complete file-level isolation |
| Shared git state | N/A | Yes — shared `.git` objects, remotes, history |
| Disk overhead vs. clones | N/A | Much lower — no duplicate `.git` directories |
| Branch locking | N/A | Git prevents 2 worktrees on same branch |
| Setup time | Instant (same directory) | ~seconds (creates directory + checkout) |
| Cleanup | N/A | `git worktree remove` or delete dir + prune |

### The Key Insight

Worktrees solve the fundamental constraint that made parallel AI coding impossible with standard git workflows: **you cannot have two processes modifying files in the same directory without conflicts**. Worktrees give each agent its own directory while maintaining a unified git history.

### Practical Workflow Comparison

**Without worktrees (painful)**:
```
Agent 1 starts on feature-A... must wait
Agent 2 wants feature-B... cannot start until Agent 1 stashes/commits
Agent 3 wants bugfix... blocked
Serial execution only
```

**With worktrees (parallel)**:
```
Terminal 1: cd ../worktrees/feature-a && claude    # Agent 1
Terminal 2: cd ../worktrees/feature-b && claude    # Agent 2
Terminal 3: cd ../worktrees/bugfix && claude        # Agent 3
All 3 agents work simultaneously on isolated copies
```

---

## Summary: Recommended Stack for Multi-Agent Parallel Coding

### Tier 1: Production-Ready Now

| Component | Tool | Maturity |
|-----------|------|----------|
| Isolation | Git worktrees | Stable (core git feature) |
| Agent | Claude Code (interactive or headless) | Production |
| Coordination | Manual (shell scripts, terminal tabs) | Simple but effective |
| Merging | Standard git merge/rebase | Stable |

### Tier 2: Emerging (Experimental)

| Component | Tool | Maturity |
|-----------|------|----------|
| Coordination | Agent Teams (TeammateTool/Swarm) | Experimental (flag-gated) |
| Orchestration | ccswarm, claude-flow, ccpm | Community/early-stage |
| Workflow | GSD framework | Community, active development |
| Sub-agents | Task tool (7 parallel) | Built-in, synchronous only |

### Tier 3: Coming Soon

| Component | Status |
|-----------|--------|
| `--worktree` flag for Claude Code | Feature request (Issue #24850) |
| Background async Task tool | Feature request (Issue #9905) |
| Agent Teams stability (session resume, nested teams) | On roadmap |

---

## Sources

- [incident.io: How we're shipping faster with Claude Code and Git Worktrees](https://incident.io/blog/shipping-faster-with-claude-code-and-git-worktrees)
- [Anthropic: Common Workflows — Claude Code Docs](https://code.claude.com/docs/en/common-workflows)
- [Anthropic: Orchestrate Teams of Claude Code Sessions](https://code.claude.com/docs/en/agent-teams)
- [Anthropic: Create Custom Subagents](https://code.claude.com/docs/en/sub-agents)
- [Medium: Git Worktrees — Secret Weapon for Parallel AI Coding](https://medium.com/@mabd.dev/git-worktrees-the-secret-weapon-for-running-multiple-ai-coding-agents-in-parallel-e9046451eb96)
- [Nx Blog: How Git Worktrees Changed My AI Agent Workflow](https://nx.dev/blog/git-worktrees-ai-agents)
- [Nick Mitchinson: Using Git Worktrees for Multi-Feature Development with AI Agents](https://www.nrmitchi.com/2025/10/using-git-worktrees-for-multi-feature-development-with-ai-agents/)
- [Agent Interviews: Parallel AI Coding with Git Worktrees](https://docs.agentinterviews.com/blog/parallel-ai-coding-with-gitworktrees/)
- [Dennis Somerville: Parallel Workflows — Git Worktrees and Managing Multiple AI Agents](https://medium.com/@dennis.somerville/parallel-workflows-git-worktrees-and-the-art-of-managing-multiple-ai-agents-6fa3dc5eec1d)
- [Sergii Grytsaienko: Parallel AI Development with Git Worktrees](https://sgryt.com/posts/git-worktree-parallel-ai-development/)
- [Upsun Dev Center: Git Worktrees for Parallel AI Coding Agents](https://devcenter.upsun.com/posts/git-worktrees-for-parallel-ai-coding-agents/)
- [GitHub: ccswarm — Multi-Agent Orchestration](https://github.com/nwiizo/ccswarm)
- [GitHub: claude-flow — Agent Orchestration Platform](https://github.com/ruvnet/claude-flow)
- [GitHub: ccpm — Claude Code Project Management](https://github.com/automazeio/ccpm)
- [GitHub: GSD 2.0 — Get Shit Done](https://github.com/itsjwill/GSD-2.0-Get-Shit-Done-Cost-saver-)
- [GitHub: gsd-claude](https://github.com/b-r-a-n/gsd-claude)
- [GitHub: Feature Request — Parallel Multi-Agent Workflows (Issue #10599)](https://github.com/anthropics/claude-code/issues/10599)
- [GitHub: Feature Request — Offer to implement plans in git worktree (Issue #24850)](https://github.com/anthropics/claude-code/issues/24850)
- [GitHub: Feature Request — Background Agent Execution (Issue #9905)](https://github.com/anthropics/claude-code/issues/9905)
- [Paddo.dev: Claude Code's Hidden Multi-Agent System](https://paddo.dev/blog/claude-code-hidden-swarm/)
- [Addy Osmani: Claude Code Swarms](https://addyosmani.com/blog/claude-code-agent-teams/)
- [Aleksei Galanov: Efficient Claude Code — Context Parallelism and Sub-Agents](https://www.agalanov.com/notes/efficient-claude-code-context-parallelism-sub-agents/)
- [Simon Willison: Embracing the Parallel Coding Agent Lifestyle](https://simonwillison.net/2025/Oct/5/parallel-coding-agents/)
- [VentureBeat: Claude Code Tasks Update](https://venturebeat.com/orchestration/claude-codes-tasks-update-lets-agents-work-longer-and-coordinate-across)
- [Kieran Klaassen: Claude Code Swarm Orchestration Skill (Gist)](https://gist.github.com/kieranklaassen/4f2aba89594a4aea4ad64d753984b2ea)
- [Faros AI: The AI Productivity Paradox Research Report](https://www.faros.ai/blog/ai-software-engineering)
- [METR: Measuring Impact of Early-2025 AI on Developer Productivity](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)
- [GetPanto: AI Coding Productivity Statistics 2026](https://www.getpanto.ai/blog/ai-coding-productivity-statistics)
- [index.dev: Top 100 Developer Productivity Statistics with AI Tools 2026](https://www.index.dev/blog/developer-productivity-statistics-with-ai-tools)
- [Greptile: The State of AI Coding 2025](https://www.greptile.com/state-of-ai-coding-2025)
- [Git Documentation: git-worktree](https://git-scm.com/docs/git-worktree)
- [GSD Framework: CCForEveryone](https://ccforeveryone.com/gsd)
- [ainativedev.io: Parallelizing AI Coding Agents](https://ainativedev.io/news/how-to-parallelize-ai-coding-agents)
- [GitButler: Managing Multiple Claude Code Sessions Without Worktrees](https://blog.gitbutler.com/parallel-claude-code)
