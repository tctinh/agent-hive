# Agent Hive 🐝

**From Vibe Coding to Hive Coding** — Plan first. Execute with trust. Context persists.

[![npm version](https://img.shields.io/npm/v/opencode-hive.svg)](https://www.npmjs.com/package/opencode-hive)
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/tctinh.vscode-hive.svg)](https://marketplace.visualstudio.com/items?itemName=tctinh.vscode-hive)
[![License: MIT with Commons Clause](https://img.shields.io/badge/License-MIT%20with%20Commons%20Clause-blue.svg)](LICENSE)

---

## Demo

https://github.com/user-attachments/assets/6290b435-1566-46b4-ac98-0420ed321204

---

## The Problem

Vibe coding is powerful but chaotic. Without structure:

| Pain Point | What Happens |
|------------|--------------|
| **Lost context** | New session = start from scratch. "We discussed this yesterday" means nothing. |
| **Subagents go wild** | Parallel agents do their own thing. No coordination, duplicated work. |
| **Scope creep** | "Add dark mode" becomes "rewrite the entire theme system." |
| **Messes to clean up** | Agent changes 47 files. Half are broken. Good luck reverting. |
| **No audit trail** | "What happened?" Nobody knows. Logs scattered everywhere. |
| **Agent hallucination** | Agent invents solutions that don't fit your codebase. No grounding. |

---

## The Hive Solution

| Problem | Hive Solution |
|---------|---------------|
| Lost context | **Context persists** — Feature-scoped knowledge survives sessions |
| Subagents go wild | **Batched parallelism** — Coordinated execution with context flow |
| Scope creep | **Plan approval gate** — Human shapes, agent builds |
| Messes to clean up | **Worktree isolation** — Each task isolated, easy discard |
| No audit trail | **Automatic tracking** — Every task logged to `.hive/` |
| Agent hallucination | **Context files** — Research and decisions ground agent work |

**Hive doesn't change how you work. It makes what happens traceable, auditable, and grounded.**

---

## Built on Battle-Tested Principles

We studied what actually works in the AI coding community and built upon it:

| Source | What We Learned | Hive Implementation |
|--------|-----------------|---------------------|
| **[Boris Cherny's 13 Tips](https://www.anthropic.com/research/claude-code-best-practices)** | Feedback loops = 2-3x quality | Best-effort worker verification + batch testing |
| **[Spec Kit](https://github.com/github/spec-kit)** | Specs are valuable | Specs emerge from dialogue, not upfront |
| **[Conductor](https://github.com/gemini-cli-extensions/conductor)** | Context persistence matters | Feature-scoped `.hive/features/<name>/context/` |
| **[Ralph Wiggum](https://awesomeclaude.ai/ralph-wiggum)** | Retry loops work for verification | Best-effort verification, not infinite retries |
| **[Oh My OpenCode](https://github.com/code-yeongyu/oh-my-opencode)** | Agent delegation scales | OMO as Hive Queen, Hive as workflow |
| **Antigravity** | Plan gates build trust | Plan → Approve → Execute workflow |

> *"Give Claude a way to verify its work. When Claude has a feedback loop, it will 2-3x the quality of the final result."* — Boris Cherny

See [PHILOSOPHY.md](PHILOSOPHY.md) for the full breakdown of what we learned from each tool.

---

## Quick Start

### Option A: OpenCode

Add `opencode-hive` to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-hive"]
}
```

OpenCode handles the rest — no manual npm install needed.

Today, the supported execution contract is still OpenCode-native:

- OpenCode owns sessions, compaction, and todo storage.
- Hive layers plan/task/worktree state into `.hive/` files and primary-session prompts.
- Hive / Architect / Swarm can align OpenCode's built-in todo list from the primary session, but Hive does **not** add a new upstream todo write API.
- Subagents and task workers should not be described as independently writing Hive task todos back into OpenCode.

### Option B: VS Code companion (recommended with OpenCode)

Install the **Agent Hive** extension for review, comments, and sidebar status:

```bash
code --install-extension tctinh.vscode-hive
```

Use the VS Code extension to review `context/overview.md`, comment on `plan.md`, approve work, and launch back into OpenCode when you want a visual companion. `vscode-hive` remains a review/sidebar surface in `1.4.0`; OpenCode is the supported execution harness.

For local plugin testing:

1. Keep `plugin: ["opencode-hive"]` in `opencode.json` (not `opencode-hive@latest`).
2. Build `packages/hive-core` first, then `packages/opencode-hive`.
3. Symlink `~/.cache/opencode/node_modules/opencode-hive` to your local `packages/opencode-hive` checkout.

### Configuration

Run Agent Hive once to auto-generate a default configuration at `~/.config/opencode/agent_hive.json`. Review it to ensure it matches your local setup.

```json
{
  "$schema": "https://raw.githubusercontent.com/tctinh/agent-hive/main/packages/opencode-hive/schema/agent_hive.schema.json",
  "agentMode": "unified",
  "disableSkills": [],
  "disableMcps": [],
  "agents": {
    "hive-master": {
      "model": "anthropic/claude-sonnet-4-20250514",
      "temperature": 0.5
    }
  }
}
```

#### Core Options

| Option | Values | Description |
|--------|--------|-------------|
| `agentMode` | `unified` (default), `dedicated` | `unified`: Single `hive-master` agent handles planning + orchestration. `dedicated`: Separate `architect-planner` and `swarm-orchestrator` agents. |
| `disableSkills` | `string[]` | Globally disable specific skills (won't appear in `hive_skill` tool). |
| `disableMcps` | `string[]` | Globally disable MCP servers. Options: `websearch`, `context7`, `grep_app`, `ast_grep`. |

#### Agent Models

Configure models for each agent role. **Update these to models available on your system:**

```json
{
  "agents": {
    "hive-master": { "model": "anthropic/claude-sonnet-4-20250514", "temperature": 0.5 },
    "scout-researcher": { "model": "anthropic/claude-sonnet-4-20250514", "temperature": 0.5 },
    "forager-worker": { "model": "anthropic/claude-sonnet-4-20250514", "temperature": 0.3 },
    "hygienic-reviewer": { "model": "anthropic/claude-sonnet-4-20250514", "temperature": 0.3 }
  }
}
```

All agents: `hive-master`, `architect-planner`, `swarm-orchestrator`, `scout-researcher`, `forager-worker`, `hygienic-reviewer`.

#### Custom Derived Subagents

You can define plugin-only custom subagents with `customAgents` by deriving from either `forager-worker` or `hygienic-reviewer`.

- Omitted `model`, `temperature`, `variant`, and `autoLoadSkills` inherit from the selected base agent.
- Custom agent IDs cannot reuse built-in Hive IDs or plugin-reserved IDs (for example, `hive`, `architect`, `swarm`, `build`, `plan`, `code`).

For the full published JSON example and complete inheritance details, see [`packages/opencode-hive/README.md`](./packages/opencode-hive/README.md#custom-derived-subagents).

#### Skills

Skills provide specialized workflows that agents can load on-demand via `hive_skill`.

| Skill | Description |
|-------|-------------|
| `brainstorming` | Explores user intent, requirements, and design before implementation |
| `writing-plans` | Creates detailed implementation plans with bite-sized tasks |
| `executing-plans` | Executes tasks in batches with review checkpoints |
| `dispatching-parallel-agents` | Dispatches multiple agents for concurrent independent work |
| `test-driven-development` | Enforces write-test-first, red-green-refactor cycle |
| `systematic-debugging` | Requires root cause investigation before proposing fixes |
| `verification-before-completion` | Requires running verification commands before claiming success |
| `parallel-exploration` | Fan-out research across multiple Scout agents |
| `code-reviewer` | Reviews code changes against plan for quality and alignment |
| `docker-mastery` | Docker container expertise — debugging, docker-compose, optimization |
| `agents-md-mastery` | AGENTS.md quality review — signal vs noise, when to prune |

**Per-agent skills:** Restrict which skills appear in `hive_skill()` tool:

```json
{
  "agents": {
    "forager-worker": {
      "skills": ["test-driven-development", "verification-before-completion"]
    }
  }
}
```

**Auto-load skills:** Automatically inject skills into an agent's system prompt at session start:

```json
{
  "agents": {
    "hive-master": { "autoLoadSkills": ["parallel-exploration"] },
    "forager-worker": { "autoLoadSkills": ["test-driven-development", "verification-before-completion"] }
  }
}
```

**Supported skill sources for `autoLoadSkills`:**

1. **Hive builtin** — Skills bundled with opencode-hive (always win if ID matches)
2. **Project OpenCode** — `<project>/.opencode/skills/<id>/SKILL.md`
3. **Global OpenCode** — `~/.config/opencode/skills/<id>/SKILL.md`
4. **Project Claude** — `<project>/.claude/skills/<id>/SKILL.md`
5. **Global Claude** — `~/.claude/skills/<id>/SKILL.md`

Missing or invalid skills emit a warning and are skipped—startup continues without failure.

**How these interact:**
- `skills` controls what's available in `hive_skill()` — the agent can manually load these
- `autoLoadSkills` injects skills unconditionally at session start — no manual loading needed
- These are **independent**: a skill can be auto-loaded but not appear in `hive_skill()`, or vice versa
- Default `autoLoadSkills` are merged with user config (use `disableSkills` to remove defaults)

#### MCP Research Tools

Auto-enabled by default. Disable with `disableMcps`:

| MCP | Tool | Description | Requirements |
|-----|------|-------------|--------------|
| `websearch` | `websearch_web_search_exa` | Web search via Exa AI | `EXA_API_KEY` env var |
| `context7` | `context7_query-docs` | Library documentation lookup | None |
| `grep_app` | `grep_app_searchGitHub` | GitHub code search via grep.app | None |
| `ast_grep` | `ast_grep_search` | AST-aware code search/replace | None (runs via npx) |

#### Model Variants

Set reasoning/effort levels per agent:

```json
{
  "agents": {
    "hive-master": { "model": "anthropic/claude-sonnet-4-20250514", "variant": "high" },
    "forager-worker": { "variant": "medium" }
  }
}
```

Variants must match keys in your OpenCode config at `provider.<provider>.models.<model>.variants`.

See [packages/opencode-hive/README.md](packages/opencode-hive/README.md) for advanced configuration options.

### Start Hiving

```
You: "Create a feature for user dashboard"
```

That's it. You're hiving.

### Troubleshooting

#### Blocked-resume loop recovery

1. Run `hive_status({ feature })` before any resume attempt and read the current task status.
2. Use `continueFrom: 'blocked'` only when the task is in the exact `blocked` state.
3. For normal starts (for example `pending` / `in_progress`), call `hive_worktree_start({ feature, task })`.
4. If a resume attempt is rejected, re-run `hive_status` and recover from the reported status instead of retrying the same blocked resume.

#### Using with DCP plugin (recommended safety config)

If you use Dynamic Context Pruning (DCP), use a Hive-safe profile in `~/.config/opencode/dcp.jsonc` so orchestration state is not aggressively pruned.

Recommended baseline:

```jsonc
{
  "manualMode": {
    "enabled": true,
    "automaticStrategies": false
  },
  "turnProtection": {
    "enabled": true,
    "turns": 12
  },
  "tools": {
    "settings": {
      "nudgeEnabled": false,
      "protectedTools": [
        "hive_status",
        "hive_worktree_start",
        "hive_worktree_create",
        "hive_worktree_commit",
        "hive_worktree_discard",
        "question"
      ]
    }
  },
  "strategies": {
    "deduplication": { "enabled": false },
    "supersedeWrites": { "enabled": false },
    "purgeErrors": { "enabled": false }
  }
}
```

Also keep OpenCode plugin config as `"opencode-hive"` (not `"opencode-hive@latest"`) during local testing.

#### Compaction recovery for Hive sessions

OpenCode session compaction can strip away role and task framing at exactly the point Hive depends on it. Hive therefore persists enough semantic `.hive` state to rebuild that framing after compaction without pretending that raw chat history is durable.

Recovery state is stored in two places:

- Global session identity in `.hive/sessions.json`
- Feature-local mirrors in `.hive/features/<feature>/sessions.json` after a feature is bound

Where:

- Primary sessions are re-anchored to their current Hive role.
- Scout and Hygienic subagents are re-anchored as subagents.
- Forager workers and forager-derived custom agents are re-anchored as task workers.
- Primary and subagent sessions replay the stored user directive once after compaction, then escalate on later compactions if no new real directive arrived.
- Task workers are told to re-read `worker-prompt.md` instead of rediscovering the assignment from scratch.
- The task-scoped recovery contract is semantic and file-backed: task folder identity, `workerPromptPath`, and bounded recovery text are the durable checkpoint surface.

The recovery prompt is intentionally narrow. It reminds the session that compaction happened, restores the expected role, replays the directive only for primary/subagent sessions, points task workers back to `worker-prompt.md`, and tells the agent to continue from where it left off without re-reading the full codebase.

To make it simple: if a long-running Hive session or worker is compacted mid-task, Hive now has a durable breadcrumb trail in `.hive/sessions.json`, feature-local `sessions.json` files, and task `worker-prompt.md` files so the session can resume with the right constraints instead of improvising a new role. This is a grounded recovery aid, not an upstream OpenCode checkpoint API.

---

## How It Works

### The Old Way (Chaos)

```
Main Agent: "Build auth system"
    │
    ├── Subagent 1: Does... something?
    ├── Subagent 2: Also does... something?
    └── Subagent 3: Conflicts with Subagent 1?
    │
You: "What just happened?" 🤷
```

### The Hive Way (Orchestrated)

```
Swarm Bee: Creates plan, you approve it
    │
    ├── Batch 1 (parallel):
    │   ├── Forager A (own worktree, tracked)
    │   ├── Forager B (own worktree, tracked)
    │   └── Forager C (own worktree, tracked)
    │           ↓
    │      Context flows forward
    │           ↓
    ├── Batch 2 (parallel):
    │   ├── Forager D (uses A+B+C results)
    │   └── Forager E (uses A+B+C results)
    │
Hive: Full audit of what each agent did
You: Clear visibility into everything ✅
```

**The Hive Colony:**
| Agent | Role |
|-------|------|
| **Hive (Hybrid)** 👑 | Plans + orchestrates (phase-aware, skills on-demand) |
| **Architect (Planner)** 🏗️ | Discovers requirements, writes plans |
| **Swarm (Orchestrator)** 🐝 | Orchestrates execution, delegates to workers |
| **Scout (Explorer/Researcher/Retrieval)** 🔍 | Explores codebase + external docs/data |
| **Forager (Worker/Coder)** 🍯 | Executes tasks in isolated worktrees |
| **Hive Helper** 🛠️ | Runtime-only merge recovery helper for isolated branch reconciliation; not a network consumer |
| **Hygienic (Consultant/Reviewer/Debugger)** 🧹 | Reviews plan quality, OKAY/REJECT verdict |

### Compaction-safe recovery path

Within OpenCode, compaction is expected to happen on long sessions. Hive now treats that as a recovery path, not a fresh start.

Recovery involves the following:

1. The plugin records durable session metadata as the session runs.
2. Feature-aware tool boundaries attach feature, task, and worker-prompt metadata when that metadata becomes known.
3. Child-session provenance is captured through the current OpenCode task/subagent lifecycle that Hive can observe, so status/recovery can point back to the right task worker instead of guessing.
4. When OpenCode emits `session.compacted`, Hive rebuilds a minimal re-anchor prompt from that durable state and replays it through `experimental.chat.messages.transform`.
5. Task workers get their `worker-prompt.md` path added back into context so they can recover the exact assignment without broad rediscovery.

Todo alignment follows a similarly grounded contract:

- OpenCode todos are session-scoped and replace-all.
- Hive sync is primary-session mediated through OpenCode's built-in todo tools.
- Hive's prompts tell primary agents to preserve non-Hive todo entries during sync rather than replacing the whole list blindly.
- No upstream change in this feature gives subagents first-class todo write access.

This recovery model has a strict ownership boundary:

- Use context-window-sized discovery up front so one delegated investigation still fits safely in a single working session.
- Prefer conservative early return when a Scout run starts widening or losing confidence.
- Treat compaction recovery as a fallback, with one-recovery-attempt escalation instead of permission to keep stretching the same exploration indefinitely.

Some notes:

- Custom subagents derived from `forager-worker` are treated as task workers for compaction recovery.
- `hive-helper` is treated as a runtime-only subagent for merge recovery; it does not appear in generated `.github/agents/` docs and does not appear in `packages/vscode-hive/src/generators/` in v1.
- `hive-helper` is not a network consumer; it benefits indirectly from better upstream planning/orchestration/review decisions.
- Custom subagents derived from `hygienic-reviewer` are treated as subagents.
- One-recovery-attempt escalation means a primary or subagent session gets one normal directive replay cycle after compaction, then must escalate back to the parent/orchestrator instead of looping through repeated compact-and-replay retries.
- The recovery prompt avoids telling agents to call broad status tools or re-scan the repository because that tends to recreate drift after compaction.
- OpenCode still does not expose a public Hive-specific todo write API or a first-class native checkpoint API; the durable truth remains Hive's `.hive` artifacts plus bounded hook-timed refresh.

---

## Real Example: Building Auth with Hive

### Step 1: Start the Conversation

```
You: "Let's add authentication to the app"
```

The agent creates a structured plan:

```markdown
# User Authentication

## Overview
Add JWT-based authentication with login, signup, and protected routes.

## Tasks

### 1. Extract auth logic to service
Move scattered auth code to dedicated AuthService class.

### 2. Add token refresh mechanism
Implement refresh token rotation for security.

### 3. Update API routes
Convert all routes to use the new AuthService.
```

### Step 2: Review in VS Code

Open VS Code. The Hive sidebar shows each feature's status and task progress, while `context/overview.md` is the primary human-facing branch summary and `plan.md` remains execution truth. You can:

- Open `context/overview.md` for the branch summary/history and main review surface
- Open `plan.md` for the execution contract, optional Design Summary, and numbered task details
- Browse other context files when supporting detail helps
- Approve when the overview and execution details both look right

### Step 3: Execute

```
You: "Execute"
```

Each task runs in its own worktree. Parallel agents don't conflict. Everything is tracked.

### Step 4: Ship

When done, you have:

- **Working code** — Auth system implemented
- **Clean git history** — Each task merged cleanly
- **Full audit trail** — What was done, when, by which agent

```
.hive/features/01_user-auth/
├── feature.json         # Feature metadata
├── plan.md              # Execution source of truth (can include a readable design summary before ## Tasks)
├── tasks.json           # Task list with status
├── comments/            # Review threads (plan comments live here)
│   └── plan.json
├── context/             # Persistent knowledge files
│   ├── overview.md      # Primary human-facing branch summary/history
│   └── architecture.md  # Optional example context file
└── tasks/
    ├── 01-extract-auth-logic/
    │   ├── status.json  # Task state
    │   ├── spec.md      # Task context, prior/upcoming tasks
    │   └── report.md    # Summary, files changed, diff stats
    ├── 02-add-token-refresh/
    │   ├── status.json
    │   ├── spec.md
    │   └── report.md
    └── 03-update-api-routes/
        ├── status.json
        ├── spec.md
        └── report.md
```

**That's hiving.** Natural conversation → structured plan → approved execution → documented result.

---

## The Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  1. PLAN                                                    │
│  Chat with your agent about what to build                   │
│  Agent creates structured plan in .hive/                    │
├─────────────────────────────────────────────────────────────┤
│  2. REVIEW (in VS Code)                                     │
│  Review context/overview.md first, then plan.md             │
│  Add inline comments, refine, approve                       │
├─────────────────────────────────────────────────────────────┤
│  3. EXECUTE (parallel-friendly)                             │
│  Tasks run in isolated worktrees                            │
│  Batched parallelism with context flow                      │
├─────────────────────────────────────────────────────────────┤
│  4. SHIP                                                    │
│  Clean merges, full history                                 │
│  Context persists for next time                             │
└─────────────────────────────────────────────────────────────┘
```

---

## VS Code Extension

Visual management without leaving your editor:

- **Sidebar** — See all features and progress at a glance
- **Overview-First Review** — Open `context/overview.md` first, then use `plan.md` for execution details
- **Inline Comments** — Add review comments on `context/overview.md` or `plan.md`
- **Approve Button** — One-click plan approval
- **Real-time Updates** — Watches `.hive/` for changes
- **Launch Tasks** — Open tasks in OpenCode from VS Code
- **Expandable Tasks** — Click to view spec.md and report.md for each task

```
┌─────────────────────────────────────┐
│ HIVE                           [+]  │
├─────────────────────────────────────┤
│ ▼ user-auth              [3/3]  ✅  │
│   ├─ 01-extract-auth-logic     ✅   │
│   │   ├─ spec.md                    │
│   │   └─ report.md                  │
│   ├─ 02-add-token-refresh      ✅   │
│   └─ 03-update-api-routes      ✅   │
│ ▶ dark-mode              [0/3]  📋  │
│ ▶ api-refactor           [2/5]  🔄  │
└─────────────────────────────────────┘
```

**Review `context/overview.md` first, then `plan.md`; optionally include a Mermaid summary before `## Tasks`, add comments, approve — all without leaving VS Code.**

### Extension Features

| Feature | Description |
|---------|-------------|
| **Feature Tree** | Hierarchical view of all features, tasks, and their status |
| **Plan Review** | Open `context/overview.md` for branch review, then `plan.md` for execution details, optional design summary, and inline commenting |
| **Task Details** | Expand any task to see spec.md (context) and report.md (results) |
| **Status Icons** | Visual indicators: ✅ done, 🔄 in-progress, ⏳ pending, ❌ failed |
| **Context Files** | Browse per-feature context files for supporting detail alongside the plan |
| **Session History** | View feature history and status |

### Extension Requirements

> **Important:** The VS Code extension is a companion tool for [OpenCode](https://opencode.ai). It provides visualization and review capabilities but does not execute tasks on its own.

**You need:**
1. **OpenCode CLI** — The AI coding assistant that runs the Hive workflow
2. **opencode-hive plugin** — Installed in your OpenCode configuration
3. **vscode-hive extension** — For visual management in VS Code

The extension watches your `.hive/` directory and displays the current state. All planning and execution happens through OpenCode. In this feature, todo alignment and compaction recovery still come from the OpenCode runtime plus `.hive` artifacts; the extension is only a review/status surface.

### Using the Extension

1. **Open your project** in VS Code (must have `.hive/` directory)
2. **Click the Hive icon** in the Activity Bar (left sidebar)
3. **Browse features** — Expand to see tasks, context, sessions
   - New features may be stored on disk as `01_feature-name`, while `.hive/active-feature` keeps the active logical feature name
4. **Review the branch summary** — Click `context/overview.md` first for the current summary/history
5. **Review the execution plan** — Open `plan.md` for the execution contract and numbered tasks
6. **Use Mermaid only when it helps** — Optional pre-task `graph TD`, `graph LR`, or `sequenceDiagram` blocks can summarize the work
7. **Add comments** — Use VS Code's comment feature on overview or plan lines
8. **Approve plans** — Click the approve button when the branch summary and plan are aligned
9. **Monitor progress** — Watch task status update in real-time as OpenCode executes

---

## Packages

| Package | Platform | Description |
|---------|----------|-------------|
| **[opencode-hive](https://www.npmjs.com/package/opencode-hive)** | npm | OpenCode plugin — 7 specialized bee agents, 18 tools, 11 skills. `hive_network_query` is a read-only retrieval tool for planning, orchestration, and review roles first. |
| **[vscode-hive](https://marketplace.visualstudio.com/items?itemName=tctinh.vscode-hive)** | VS Code | Review/sidebar companion — inspect status, comment on plans, approve, launch OpenCode |

**Agent Selection:** Use `hive`, `architect`, or `swarm` as your primary agent. Use `@scout`, `@forager`, or `@hygienic` to mention subagents directly.

When Hive Network is available, treat it as an optional lookup with no startup lookup. Start from the live request and live repository state, then query prior features only when it would materially improve planning, orchestration, or review. planning, orchestration, and review roles get network access first. live-file verification still required.

---

## Why Hive?

### 🎯 Plan First

Human shapes the what and why. Agent handles the how. The approval gate is where trust is earned.

### 🤖 Easy Orchestrate

Break work into isolated tasks. Subagents work in parallel without conflicts. Batches coordinate context flow.

### 📊 Easy Audit

Every decision, every change, every agent action — automatically captured in `.hive/`

### 🚀 Easy Ship

Clean git history (worktree merges), full documentation (generated as you work), traceable decisions (who did what, when).

---

## Comparison

| Feature | Vibe Coding | Spec-First Tools | Agent Hive |
|---------|-------------|------------------|------------|
| Setup required | None | Heavy | Minimal |
| Documentation | None | Upfront | Emerges from work |
| Planning | Ad-hoc | Required first | Conversational |
| Tracking | None | Manual | Automatic |
| Audit trail | None | If maintained | Built-in |
| Multi-agent ready | Chaos | ❌ | ✅ Native |
| Subagent tracing | Painful | ❌ | ✅ Automatic |
| VS Code UI | ❌ | ❌ | ✅ Full support |

---

## Philosophy

Hive is built on 7 core principles:

1. **Context Persists** — Calibration survives sessions. The "3 months later" problem solved.
2. **Plan → Approve → Execute** — Dialogue until approved, then trust. Two phases with a clear gate.
3. **Human Shapes, Agent Builds** — Human owns the why. Agent owns the how.
4. **Good Enough Wins** — Capture what works for this context. Reject over-engineering.
5. **Batched Parallelism** — Parallel tasks in batches. Sequential batches share context.
6. **Tests Define Done** — Workers do best-effort checks; orchestrator runs full suite after batch merge.
7. **Iron Laws + Hard Gates** — Non-negotiable constraints enforced by tools, not guidelines.

See [PHILOSOPHY.md](PHILOSOPHY.md) for the full framework.

---

## Related Tools

Hive complements these excellent projects:

| Tool | What It Does | How Hive Relates |
|------|--------------|------------------|
| **[Oh My OpenCode](https://github.com/code-yeongyu/oh-my-opencode)** | Agent-first delegation with specialized workers | Perfect combo: OMO as Hive Queen orchestrating Hive workers |
| **[Conductor](https://github.com/gemini-cli-extensions/conductor)** | Context-driven track-based execution | Similar goals; Hive adds worktree isolation + batching |
| **[Spec Kit](https://github.com/github/spec-kit)** | Heavy upfront specification | Hive: specs emerge from planning, not before |
| **[Ralph Wiggum](https://awesomeclaude.ai/ralph-wiggum)** | Loop-until-done persistence | Different philosophy; Hive plans first, not retries first |

---

## Platform Support

| Platform | Setup | Status |
|----------|-------|--------|
| **GitHub Copilot** | Legacy generated `.github/*` artifacts may still exist for continuity | Not supported as an execution harness in `1.4.0` |
| **OpenCode** | Add `opencode-hive` plugin | Full support |
| **VS Code** | Install the extension for review/sidebar workflows | Full support as a companion |

Designed to work seamlessly with:

- **[OpenCode](https://opencode.ai)** — The primary Hive runtime and supported execution harness
- **VS Code** — Your editor for overview/plan review, comments, and approvals via `vscode-hive`
- **Legacy `.github/*` bootstrap artifacts** — Still generated for continuity when teams choose to keep them, but no longer the supported primary path
- **Git** — Worktrees for isolation

---

## License

MIT with Commons Clause — Free for personal and non-commercial use. See [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>Stop vibing. Start hiving.</strong> 🐝
  <br>
  <em>Plan first. Execute with trust. Context persists.</em>
</p>
