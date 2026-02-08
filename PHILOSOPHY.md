# Hive Philosophy

> Living documentation tracking how Hive thinks about vibe coding problems.
> This evolves as we learn.

---

## Why "Hive"? The Inspiration

### Nature's Most Efficient System
Bees aren't just insects — they're the world's most efficient distributed workforce. A single hive coordinates thousands of workers without central micromanagement, produces consistent output, and leaves behind a perfect record of their work.
**The honeycomb is nature's most efficient structure.** Mathematicians proved it: hexagonal cells use the least material to create the most storage space. No wasted effort. No wasted space. Maximum output from minimum input.
This is exactly what we want from AI agents:
| Bee Colony | Agent Hive |
|------------|------------|
| Queen coordinates, doesn't micromanage | Planner orchestrates, workers execute autonomously |
| Each worker knows their role | Each task agent has clear spec.md instructions |
| Honeycomb stores everything efficiently | `.hive/` structure organizes all artifacts |
| Waggle dance communicates plans | Plan → Review → Approve workflow |
| Royal jelly nourishes development | Context files ground agents in reality |
| Honey is the valuable output | Documentation emerges naturally from work |
| Propolis seals and protects | TDD verification ensures quality |
### The Parallel is Intentional
A beehive solves the exact problems we face with AI agents:
- **Coordination without chaos** — Thousands of bees, zero conflicts
- **Distributed execution** — Workers operate independently but toward shared goals
- **Persistent memory** — The hive structure itself encodes knowledge
- **Quality assurance** — Bees inspect cells before sealing
- **Traceability** — Every cell, every drop of honey, accounted for
When we designed Agent Hive, we asked: *"What if AI agents could work like a bee colony?"*
The answer became this platform.
---
## Hive Terminology

| Term | Role | Description |
|------|------|-------------|
| **Beekeeper** | You | The human operator. Observes, steers, approves. Doesn't do the work — manages the hive. |
| **Hive** | Platform | The Agent Hive platform itself. The structured workspace where agents operate. |
| **Hive Bee** | Hybrid | Plans AND orchestrates. Phase-aware — detects whether to plan or execute. The default agent. |
| **Architect Bee** | Planner | Plans features, interviews you, writes plan.md. NEVER executes or delegates. |
| **Swarm Bee** | Orchestrator | Coordinates execution, delegates to workers, merges results. The Hive Queen. |
| **Scout Bee** | Researcher | Researches codebase and external docs in parallel. Uses MCP tools. |
| **Forager Bee** | Executor | Executes tasks in isolated worktrees. Does the actual coding. |
| **Hygienic Bee** | Reviewer | Reviews plan documentation quality. Returns OKAY/REJECT verdict. |
| **Nest** | Feature | A feature. Self-contained with its own plan, context, and tasks. (`.hive/features/<name>/`) |
| **Comb** | Task Structure | The organized grid of cells (tasks) within a nest. The work breakdown structure. |
| **Cells** | Tasks | Individual tasks within a comb. Each cell is isolated (worktree) and produces one unit of work. |
| **Royal Jelly** | Context | Context files that nourish workers — research, decisions, references. Without it, workers hallucinate. |
| **Honey** | Artifacts | The output — `plan.md`, `spec.md`, `report.md`, code. Persistent documentation that emerges from work. |
| **Propolis** | Verification | TDD subtasks that seal work as complete. Tests prove the cell is solid. |
| **Wax Seal** | Sandbox | Docker container that isolates worker execution. Tests run inside, results flow out. |
| **Waggle Dance** | Planning | The planning phase. Architect communicates, Beekeeper reviews, alignment before action. |
| **Swarming** | Parallelism | Batched parallel execution. Multiple Foragers dispatched simultaneously to their cells. |
| **Hiving** | Working | The act of using the Hive platform. *"Stop vibing. Start hiving."* |
---
## The Hive Mental Model
```
    BEEKEEPER (You)
         │
         ├── Observes the hive
         ├── Reviews the waggle dance (plan)
         ├── Approves when ready  
         └── Harvests the honey (ships)
         │
    ─────┴─────
         │
    ARCHITECT BEE (Planner)
         │
         ├── Interviews you (discovery)
         ├── Produces royal jelly (context)
         ├── Designs the comb (task breakdown)
         └── Writes plan.md (NEVER executes)
         │
    ─────┴─────
         │
    SWARM BEE (Orchestrator)
         │
         ├── Approves plan execution
         ├── Commands the swarm (parallel execution)
         ├── Handles blocked workers
         └── Merges results
         │
    ─────┼─────────────────┬─────────────────┐
         │                 │                 │
    FORAGER BEE       FORAGER BEE       FORAGER BEE
         │                 │                 │
    ⬡ Cell (worktree)  ⬡ Cell (worktree) ⬡ Cell (worktree)
         │                 │                 │
    Honey             Honey              Honey
    (spec + report)    (spec + report)   (spec + report)
         │                 │                 │
    Propolis          Propolis           Propolis
    (TDD verified)     (TDD verified)    (TDD verified)
```
### The Efficiency Promise
Just as a beehive achieves remarkable output through structure, not chaos:
> **Every worker, every cell, every drop of honey — tracked.**
The Hive platform doesn't slow agents down. It channels their energy into **hexagonal efficiency**: maximum output, minimum waste, perfect traceability.

---

## Built on Battle-Tested Principles

Hive's design is grounded in proven practices from the AI coding community, particularly [Boris Cherny's 13 Pro Tips for Claude Code](https://www.anthropic.com/research/claude-code-best-practices).

| Boris's Tip | Hive Implementation |
|-------------|---------------------|
| **Tip 4: Team CLAUDE.md** | Context persists per-feature in `.hive/context/` |
| **Tip 6: Start in Plan mode** | Plan → Approve → Execute workflow |
| **Tip 8: Leverage subagents** | Batched parallelism with worktree isolation |
| **Tip 13: Give feedback loops** | TDD subtasks — tests define done |

> *"Give Claude a way to verify its work. When Claude has a feedback loop, it will 2-3x the quality of the final result."* — Boris Cherny

---

## Why Hive Exists

Vibe coding is powerful but chaotic. We identified 6 pain points:

| # | Pain Point | What Happens |
|---|------------|--------------|
| 1 | **Lost context** | New session = start from scratch. "We discussed this yesterday" means nothing. |
| 2 | **Subagents go wild** | Parallel agents do their own thing. No coordination, duplicated work, conflicts. |
| 3 | **Scope creep** | "Add dark mode" becomes "rewrite the entire theme system." |
| 4 | **Messes to clean up** | Agent changes 47 files. Half are broken. Good luck reverting. |
| 5 | **Parallel steering impossible** | Can't guide multiple agents. They're all in their own world. |
| 6 | **No audit trail** | "What happened?" Nobody knows. Logs scattered, no unified view. |

**The ideal**: `Ticket → Hive → Iterate → Done → 3 months later → Context intact`

---

## The 7 Core Principles

### P1: Context Persists

Calibration survives between sessions. The "3 months later" problem solved.

Store grounded, project-specific knowledge:
- "We use Zustand, not Redux"
- "Auth is in `/lib/auth`, don't create new auth code"
- "We tried X, it was overkill for our scale"

**Don't store**: General knowledge the agent already has.

*Inspired by Boris's Tip 4: "Share a single CLAUDE.md file for your codebase... Whenever Claude does something incorrectly, add it so Claude learns not to repeat the mistake."*

### P2: Plan → Approve → Execute

Two phases with a clear gate between them.

| Phase | Mode | Human Role |
|-------|------|------------|
| **Planning** | Dialogue | Shape, question, refine |
| **Execution** | Trust | Agent runs, human monitors |

Planning is collaborative. Execution is autonomous. The approval gate is where trust is earned.

*Inspired by Boris's Tip 6: "Most sessions should start in Plan mode... A good plan makes all the difference."*

### P3: Human Shapes, Agent Builds

Human owns:
- The shape (what are we building?)
- The why (what problem does this solve?)
- The taste (what feels right?)

Agent owns:
- The details (how exactly to implement)
- The how (which patterns, which libraries)
- The execution (just do it)

Destination known. Path explored.

### P4: Good Enough Wins

Capture what's good enough FOR THIS CONTEXT. Reject over-engineering.

Valuable context examples:
- "We tried X, it was overkill for our 3-person team"
- "We chose Y because it was simpler, not because it's better"
- "Don't suggest Z, we explicitly rejected it"

This prevents future sessions from re-proposing rejected solutions.

### P5: Batched Parallelism

Parallel tasks grouped into batches. Sequential batches share context.

```
Batch 1 (parallel):     Batch 2 (parallel):
├── Task A              ├── Task D (uses A+B+C)
├── Task B              └── Task E (uses A+B+C)
└── Task C
        ↓
   Glue task synthesizes results
        ↓
   Context flows to Batch 2
```

This solves multi-agent coordination without complex orchestration. Each task gets a worktree. Glue tasks merge and synthesize.

*Inspired by Boris's Tip 8: "Use a few subagents regularly to automate common workflows."*

### P6: Tests Define Done

For implementation tasks, tests provide the feedback loop that dramatically improves quality.

**TDD Subtask Pattern:**
```
Task: Implement calculator
├── Subtask 1.1 [test]: Write failing tests
│   └── spec.md: Test requirements
│   └── report.md: Tests written, all failing ✓
├── Subtask 1.2 [implement]: Make tests pass
│   └── spec.md: Implementation approach
│   └── report.md: All tests passing ✓
└── Subtask 1.3 [verify]: Final verification
    └── report.md: 100% coverage, shipped ✓
```

Each subtask has its own `spec.md` (what to do) and `report.md` (what was done) — first-class audit trail.

*Inspired by Boris's Tip 13: "Give Claude a way to verify its work. When Claude has a feedback loop, it will 2-3x the quality of the final result."*

### P7: Iron Laws + Hard Gates

Soft guidance fails. Agents rationalize around it. Enforce with tools, not prompts.

**Iron Laws** (~15 lines in system prompt):
```
Never:
- Plan without asking questions first
- Code without failing test first
- Complete without running verification
- Assume when uncertain - ASK

Always:
- One question at a time (discovery)
- Test → Code → Verify (TDD)
- Stop and ask when blocked
```

**Hard Gates** (tools refuse without prerequisites):
| Tool | Gate | Error |
|------|------|-------|
| `hive_plan_write` | `## Discovery` section required | "BLOCKED: Discovery required" |
| `hive_worktree_commit` | Verification keywords in summary | "BLOCKED: No verification" |

**Phase Injection** (right context at right time):
| Phase | Injection |
|-------|-----------|
| Feature create | Discovery prompt with example Q&A |
| Exec start (delegated) | Delegation protocol for Master |
| Worker spawn | TDD + Debugging protocols |

*Why this works*: Agent must consciously write `## Discovery` section. Agent must mention verification in summary. No silent bypassing.

*Inspired by Git's philosophy*: Simple primitives, hard enforcement. `git commit` refuses without staged changes. No exceptions.

---

## Subtasks: First-Class TDD Support

Subtasks enable granular tracking within a task, perfect for TDD workflows:

```
.hive/features/user-auth/tasks/01-auth-service/
├── spec.md
├── report.md
└── subtasks/
    ├── 1-write-failing-tests/
    │   ├── status.json
    │   ├── spec.md      ← Detailed test requirements
    │   └── report.md    ← What tests were written
    ├── 2-implement-auth-service/
    │   ├── status.json
    │   ├── spec.md      ← Implementation approach
    │   └── report.md    ← What was implemented
    └── 3-verify-coverage/
        ├── status.json
        └── report.md    ← Final verification results
```

**Subtask Types:**
| Type | Purpose |
|------|---------|
| `test` | Write failing tests first |
| `implement` | Make tests pass |
| `verify` | Final verification |
| `review` | Code review checkpoint |
| `research` | Investigation before coding |
| `debug` | Fix issues |
| `custom` | Anything else |

---

## Key Design Decisions

### No loop-until-done

Unlike Ralph Wiggum's approach (keep retrying until success), we plan first.

- Ralph: "Just keep trying until it works"
- Hive: "Plan carefully, then execute with confidence"

Different philosophy. Both valid. Hive is for when you want control over direction.

### Fix tasks, not revert commands

When something goes wrong:
- ~~Add a revert command~~ (we tried this, ended badly)
- **Spawn a fix task** (agent can git revert if they decide to)

Everything is a task. Even fixes. Keeps the model consistent.

### Blocked workers, not infinite loops

When a Forager encounters a decision it can't make:
- Worker reports `status: "blocked"` with blocker info (reason, options, recommendation)
- Swarm Bee asks user via `question()` tool — NEVER plain text
- Swarm resumes with `hive_worktree_create(continueFrom: "blocked", decision: answer)`
- New worker spawns in SAME worktree with decision context

This is different from "loop until done":
- Ralph Wiggum: Keep retrying until success
- Hive: Stop, ask, resume with clarity

Workers pause for decisions. They don't guess.

### Free-form context

Context structure is free-form. Content matters, not structure.

- Agent writes what's useful
- No forced directory structure
- No prescribed file names

Already have injection via `agents.md`, `CLAUDE.md`. Hive adds feature-scoped context.

### Platform, not replacement

Hive works WITH existing tools, not instead of them.

| Existing Tool | Hive Adds |
|---------------|-----------|
| `agents.md` | Feature-scoped context |
| `CLAUDE.md` | Plan + approval workflow |
| Git branches | Worktree isolation per task |
| Todo lists | Structured task tracking with status |

---

## What Hive Is / Isn't

### Hive IS:
- A plan-first development system
- A structure for multi-agent coordination
- A context persistence layer
- A platform that enhances existing tools
- A TDD-friendly workflow with subtask tracking

### Hive IS NOT:
- A visual dashboard (Vibe Kanban does this better)
- A loop-until-done executor (Ralph Wiggum does this)
- Heavy upfront documentation (Spec Kit territory)
- An agent replacement (Oh My OpenCode territory)

---

## How Hive Differs from Alternatives

| Tool | Philosophy | Hive's Take |
|------|------------|-------------|
| **[Spec Kit](https://github.com/github/spec-kit)** | Spec-first, heavy upfront docs | Too heavy. Specs emerge from planning, not before. |
| **[Ralph Wiggum](https://awesomeclaude.ai/ralph-wiggum)** | Loop until done, persistence wins | Different philosophy. We plan first, not retry first. |
| **[Conductor](https://github.com/gemini-cli-extensions/conductor)** | Context-driven, track-based | Similar goals. We add worktree isolation + batching. |
| **[Oh My OpenCode](https://github.com/code-yeongyu/oh-my-opencode)** | Agent-first, delegation model | Great complement! OMO as Hive Queen, Hive as workflow. |
| **Vibe Kanban** | Visual dashboard for agents | We're workflow, not UI. Could complement each other. |

**Hive's unique value**:
1. Batch-based parallelism with context flow (nobody else does this)
2. Worktree isolation per task (clean discard)
3. Two-phase autonomy with approval gate
4. Task-based everything (even fixes are tasks)
5. TDD subtasks with spec.md/report.md audit trail

---

## What We Learned From Others

Hive didn't emerge in a vacuum. We studied existing tools, took what worked, and built upon them.

### From Spec Kit (GitHub)

**What they do well:**
- Structured specifications before coding
- Clear contracts between human intent and agent execution
- Documentation as a first-class artifact

**What we learned:**
- Specs are valuable, but requiring them UPFRONT is too heavy
- Most developers won't write detailed specs before they understand the problem
- Specs should EMERGE from dialogue, not precede it

**What we built:**
- `plan.md` emerges from conversation, not a template
- `spec.md` per task captures just enough context
- No forced structure — content matters, not format

### From Conductor (Gemini CLI Extensions)

**What they do well:**
- Context-driven execution with "tracks"
- Persistent memory across sessions
- Structured workflow without being rigid

**What we learned:**
- Context persistence is essential (we agreed completely)
- Track-based organization works, but needs isolation
- Parallel execution needs coordination, not just parallelism

**What we built:**
- Feature-scoped context in `.hive/context/`
- Git worktrees for true isolation (not just logical tracks)
- Batched parallelism with context flow between batches

### From Ralph Wiggum

**What they do well:**
- Persistence wins — keep trying until success
- Automated retry loops for long-running tasks
- "Set and forget" execution model

**What we learned:**
- Loops are powerful for VERIFICATION, not planning
- Unbounded retries can waste time on wrong approaches
- Sometimes you need to stop and re-plan, not retry

**What we built:**
- TDD subtasks give feedback loops WHERE IT MATTERS (verification)
- Plan approval gate prevents wasted retries on bad plans
- Fix tasks instead of infinite loops — know when to pivot

### From Antigravity (Plan System)

**What they do well:**
- Structured planning with clear phases
- Human review gates before execution
- Task breakdown with dependencies

**What we learned:**
- Two-phase model (plan → execute) is the right abstraction
- Approval gates build trust and catch scope creep
- Dependencies between tasks need explicit handling

**What we built:**
- Plan → Approve → Execute workflow
- Batched parallelism handles dependencies naturally
- Glue tasks synthesize results between batches

### From Boris Cherny's 13 Tips

**What resonated most:**
- Tip 4: Team CLAUDE.md — shared context compounds
- Tip 6: Start in Plan mode — planning before execution
- Tip 8: Leverage subagents — parallel workers with coordination
- Tip 13: Feedback loops — 2-3x quality improvement

**What we built:**
- `.hive/context/` for feature-scoped CLAUDE.md equivalent
- Plan approval gate enforces "plan mode first"
- Batched parallelism with worktree isolation
- TDD subtasks with spec.md/report.md for feedback loops

### From Oh My OpenCode

**What they do well:**
- Agent-first architecture with specialized workers
- Delegation model — right agent for right task
- System prompt engineering for agent behavior
- Seamless integration with OpenCode ecosystem

**What we learned:**
- Specialized agents beat one-size-fits-all
- Delegation needs structure to avoid chaos
- Agent behavior is shaped by context, not just prompts
- The "Hive Queen" orchestrating workers is a powerful pattern

**What we built:**
- Hive as the WORKFLOW layer, OMO as the AGENT layer
- Feature-scoped context shapes agent behavior per-task
- Batched parallelism = structured delegation
- Perfect complement: OMO agents execute Hive tasks

---

## The Synthesis

What makes Hive unique is the COMBINATION:

| Concept | Borrowed From | Hive's Addition |
|---------|---------------|-----------------|
| Specs | Spec Kit | Emerge from dialogue, not upfront |
| Context persistence | Conductor | Feature-scoped, not global |
| Retry loops | Ralph Wiggum | Only for verification (TDD), not planning |
| Plan gates | Antigravity | Approval before execution |
| Feedback loops | Boris Cherny | TDD subtasks with audit trail |
| Parallelism | All of them | Batched with context flow + worktree isolation |
| Agent delegation | Oh My OpenCode | Hive as workflow layer, OMO as agent layer |

**The result:** A system where humans shape direction, agents execute in isolation, context persists, and tests verify — all with full audit trail.

---

## The Mental Model

```
Feature
└── Plan (dialogue until approved)
    └── Tasks (parallel in batches)
        └── Subtasks (TDD: test → implement → verify)
            └── Worktrees (isolated execution)
                └── Reports (what was done)
                    └── Context (persists for next time)
```

Human shapes at the top. Agent builds at the bottom. Gate in the middle. Tests verify the work.

---

## Evolution Notes

*This section tracks how our thinking evolved.*

### v0.1 (Initial)
- Started with 8 principles
- Consolidated to 5 (nothing lost, just cleaner)
- Dropped "revert command" idea after bad experience
- Chose free-form context over prescribed structure

### v0.8 (Subtask Folder Structure)
- Added P6: Tests Define Done
- Subtasks became first-class with own folders
- Each subtask has spec.md and report.md
- TDD workflow: test → implement → verify
- Inspired by Boris Cherny's "feedback loop" principle

### v0.9 (Iron Laws + Hard Gates)
- Added P7: Iron Laws + Hard Gates
- Soft guidance fails — agents rationalize around it
- Iron Laws: ~15 lines of Never/Always rules in system prompt
- Hard Gates: Tools refuse without prerequisites (discovery, verification)
- Phase Injection: Right context at right time (discovery → delegation → TDD)
- Inspired by Git's philosophy: simple primitives, hard enforcement

### v0.10 (Hive Agent Architecture)
- Introduced specialized hive agents:
  - `hive` — Hybrid planner + orchestrator
  - `architect` — Planner only, cannot execute or delegate
  - `swarm` — Orchestrator, delegates to workers
  - `scout` — Explorer/Researcher/Retrieval, uses MCP tools
  - `forager` — Executor, works in isolated worktrees
  - `hygienic` — Consultant/Reviewer/Debugger, validates plan quality
- MCP tools auto-enabled (OMO-style): grep_app, context7, websearch, ast_grep
- Agent registration for @mention support in OpenCode
- Blocked worker protocol: workers pause for decisions, resume with clarity

### v1.1 (Consolidation + Knowledge Transfer)

**Theme:** Less infrastructure, smarter agents. Trust the model, not the tooling.

- **Tool consolidation (22 → 14 tools)**: Removed the entire background task infrastructure (~5,000 lines). Direct worktree execution proved simpler and more reliable than the async queue-poll-result pattern. Renamed `hive_exec_*` → `hive_worktree_*` to reflect the actual execution model
- **Journal infrastructure removed**: Journals were write-only artifacts nobody read. Context files (`hive_context_write`) replaced them — persistent, queryable, and actually consumed by downstream workers
- **Worker Orient Phase**: Workers now run a pre-flight checklist before coding — read references, check existing patterns, verify assumptions. This came from observing workers that jumped straight into implementation and missed critical context. Orient aligns with P1 (Context Persists) and P7 (Iron Laws)
- **Task-type auto-inference**: `buildSpecContent()` infers whether a task is greenfield, testing, modification, bugfix, or refactoring from the task name and plan section. This is orchestrator-level intelligence — the worker gets better context without the planner having to annotate every task
- **Richer worker summaries**: Instead of parsing structured notepad entries, we trust the model to write useful summaries. Guidance now asks for files changed, key decisions, gotchas, and what's left. "Models are smart" — structure the ask, not the answer
- **Scout research persistence**: Scout findings now persist to context files, so research survives the session. Before this, a Scout could discover critical patterns and that knowledge died when the session ended
- **Post-batch review checkpoints**: After merging each batch, orchestrators can consult the Hygienic reviewer to catch drift before it compounds. Review is collaborative, not mandatory — the beekeeper decides
- **Active Discovery**: Planning agents now challenge user assumptions during the planning phase. This isn't adversarial — it's collaborative pushback that aligns with P3 (Human Shapes, Agent Builds) and P4 (Good Enough Wins). An agent that accepts everything uncritically isn't planning, it's transcribing

**Design insight:** The common thread is knowledge transfer. Orient ensures workers receive context. Richer summaries ensure orchestrators receive results. Scout persistence ensures future sessions receive research. Active Discovery ensures plans receive honest scrutiny. Every change improved how information flows between agents.

### v1.1.1 (Prompt Hardening + Self-Maintenance)

**Theme:** Behavioral enforcement through prompt engineering, plus agents that bootstrap and maintain their own operating manual.

We studied [Oh My OpenCode](https://github.com/code-yeongyu/oh-my-opencode) (omo) to learn prompt engineering patterns. Key insight: omo is prompt-composition-based (dynamic assembly), Hive is tool-based (`hive_status`, `hive_plan_write`, etc.). We borrowed selectively, not wholesale.

**What changed across all 6 agent prompts:**

- **Architect**: Expanded intent classification with Strategy column, 6-item clearance checklist before plan submission, Test Strategy section for planning test approaches, Turn Termination rules to prevent dangling turns
- **Forager**: "Resolve Before Blocking" guidance (try 3+ approaches before reporting blocked), expanded Orient pre-flight checklist, 6-item Completion Checklist before `hive_worktree_commit`
- **Scout**: Fixed leaked persistence example (truncated research dump was polluting output), added year awareness to Iron Laws so agents know the current date
- **Swarm**: Removed reference to non-existent "oracle" subagent, added "After Delegation — VERIFY" checklist, Turn Termination section
- **Hive**: Turn Termination in Universal section (valid/invalid turn endings), Hard Blocks table replacing vague "Iron Laws" prose, AI-Slop Flags for detecting scope inflation and premature abstraction
- **Hygienic**: Agent-executable verification emphasis with concrete ✅/❌ examples, expanded Active Implementation Simulation for more thorough mental dry-runs

**Skill cleanup:**

- Deleted `onboarding` skill (unreferenced by any agent, 10 total → 9)
- Fixed `executing-plans` skill: replaced broken `finishing-a-development-branch` reference with `verification-before-completion`
- Fixed `test-driven-development` skill: removed broken `@testing-anti-patterns.md` reference
- Updated `writing-plans` skill with agent-executable acceptance criteria guidance
- Added 3 unreferenced-but-kept skills to Hive's loading table: `systematic-debugging`, `test-driven-development`, `verification-before-completion`

**New capabilities:**

- **AGENTS.md integration**: Self-maintaining bootstrap that evolves with the project. New `hive_agents_md` tool with two operations: `init` (codebase scan → AGENTS.md template) and `sync` (context findings → AGENTS.md proposals). Sync respects P2 (Plan → Approve → Execute) — agents propose updates, humans approve. Context files flow into living documentation instead of becoming stale write-only artifacts
- **Docker sandbox**: Lightweight container isolation for TDD (P6 + P7 alignment). Workers execute tests in sandboxed Docker containers via bash interception hook — transparent to agents, no code changes needed. Escape hatch: `HOST: <command>` prefix bypasses sandbox for host-level operations. Level 1 implementation (docker run) with auto-detection of project runtime (node:22-slim, python:3.12-slim, etc.). Aligns with "Good Enough Wins" (P4) — most projects need clean test environments, not full devcontainer complexity

**Design insight:** Both features address the same meta-problem: *How do agents learn from their own work?* Prompts are contracts, not suggestions — concrete tables, checklists, and ✅/❌ examples survive model interpretation (P7). AGENTS.md captures project-level learnings (conventions, patterns, gotchas). Docker sandbox ensures those learnings are tested in isolation. Together they create a self-improving loop: agents document what they learn, test in clean environments, and future agents benefit from both.

### v1.2.0 (Tighten the Gates, Deepen the Loop)

**Theme:** Make agents smarter about their infrastructure, tighten enforcement.

- **Docker Mastery Skill**: On-demand skill teaching agents to think in containers — debugging, docker-compose, Dockerfile authoring, image optimization. Docker is a platform for sandboxes (testing, integration, deployment), not just transparent wrapping. Primary user: Forager. Loaded via `hive_skill("docker-mastery")`
- **AGENTS.md Mastery Skill**: On-demand skill teaching agents what makes effective pseudo-memory. AGENTS.md isn't documentation — it's the first briefing every session. Quality > quantity. Signal entries change agent behavior; noise entries waste context window. Loaded via `hive_skill("agents-md-mastery")`
- **Tighter Discovery gate**: Replaced substring match with regex + content length check (minimum 100 chars). Empty or hidden Discovery sections now rejected. Aligns with P7 (Hard Gates)
- **Sandbox bypass audit**: All HOST: commands logged with `[hive:sandbox]` prefix. Escape hatch removed from agent prompts — agents must ask users when host access needed. P7 enforcement without removing the mechanism
- **Atomic AGENTS.md apply**: New `apply` action on `hive_agents_md` tool. Agents propose → user approves → apply writes atomically. Eliminates manual edit errors during approval flow
- **Persistent sandbox containers**: One container per worktree, reused across commands. 50 test runs = 1 container, not 50. `docker run -d` + `docker exec` replaces ephemeral `docker run --rm`
- **Context lifecycle management**: Archive method moves stale contexts to timestamped archive/. Stats method reports context health. Size warning at 20K chars. Prevents unbounded context growth

**Design insight:** v1.1.1 asked "how do agents learn from their work?" v1.2.0 asks "how do agents learn to use their tools?" Skills are the answer — on-demand depth without prompt bloat. The Docker skill teaches container thinking. The AGENTS.md skill teaches memory hygiene. Both make agents more capable without adding infrastructure.

---

<p align="center">
  <em>Plan first. Execute with trust. Context persists. Tests verify. Gates enforce.</em>
</p>
