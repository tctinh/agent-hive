# Agent Hive

**Plan first. Execute with trust. Context persists.**

Agent Hive is a workflow layer that sits on top of your AI coding tool. It imposes just enough structure to make multi-agent, multi-step work traceable and recoverable — without taking ownership of your editor, your model, or your coding style.

[![npm](https://img.shields.io/npm/v/opencode-hive.svg?label=opencode-hive)](https://www.npmjs.com/package/opencode-hive)
[![npm](https://img.shields.io/npm/v/claude-code-hive.svg?label=claude-code-hive)](https://www.npmjs.com/package/claude-code-hive)
[![npm](https://img.shields.io/npm/v/@tctinh/agent-hive-mcp.svg?label=agent-hive-mcp)](https://www.npmjs.com/package/@tctinh/agent-hive-mcp)
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/tctinh.vscode-hive.svg?label=vscode-hive)](https://marketplace.visualstudio.com/items?itemName=tctinh.vscode-hive)
[![License: MIT with Commons Clause](https://img.shields.io/badge/License-MIT%20with%20Commons%20Clause-blue.svg)](LICENSE)

---

## Demo

https://github.com/user-attachments/assets/6290b435-1566-46b4-ac98-0420ed321204

---

## Why Hive

Raw agentic coding has a consistent failure mode: agents spray changes across a codebase, sessions lose context, parallel workers collide, and nobody can reconstruct what happened. Hive fixes this with a small, strict loop:

```
You describe the work
    ↓
Hive discovers, asks, builds plan.md
    ↓
You review and approve   ← human gate
    ↓
Workers execute tasks in isolated git worktrees (batched parallel)
    ↓
Results merge. plan/spec/report live in .hive/ forever.
```

| Without Hive | With Hive |
|---|---|
| Agent touches 40 files, half break | Tasks run in isolated worktrees — discard any worker |
| New session starts from zero | Feature state persists in `.hive/features/<name>/` |
| Parallel agents collide, duplicate | Explicit batches with dependency ordering |
| "What happened here?" | plan.md, spec.md, report.md per task |
| Scope creep mid-execution | Human approval gate before any code change |

---

## Choose Your Platform

| Platform | Hive role | Best for |
|---|---|---|
| **[Claude Code](#claude-code)** | Full runtime (plugin + MCP) | Claude Code CLI users |
| **[OpenCode](#opencode)** | Full runtime (plugin) | OpenCode CLI users — most feature-complete |
| **[VS Code](#vs-code)** | Companion UI (review + status) | Visual review alongside a CLI runtime |

The VS Code extension is **not** a runtime. It visualises the `.hive/` state written by Claude Code or OpenCode and lets you approve plans without leaving the editor.

---

## Claude Code

The Claude Code plugin ships three Hive agents (`hive`, `forager`, `hygienic`), a `/hive` slash command, 11 on-demand skills, a `SessionStart` hook, and spawns the `@tctinh/agent-hive-mcp` MCP server as a sidecar.

### Install

```bash
# inside Claude Code
/plugin marketplace add tctinh/agent-hive
/plugin install hive@agent-hive
```

The marketplace definition lives at [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json) and points at [`packages/claude-code-hive`](packages/claude-code-hive). The plugin spawns the MCP runtime on demand via `npx -y -p @tctinh/agent-hive-mcp@latest hive-mcp`, so you don't need to install the MCP package separately — npx fetches and caches it the first time `/hive` runs.

Requirements: Node.js 18+ on your PATH so `npx` is available.

### Start

```
/hive add user authentication
```

`/hive` is the only entry point you need — it creates a feature, runs discovery, writes the plan, waits for approval, and dispatches workers.

### What you get

- **`hive:hive`** — Opus-tier orchestrator. Plans features, batches tasks, dispatches workers, merges results.
- **`hive:forager`** — Sonnet-tier worker. Runs a single task in an isolated worktree, commits, exits. Workers cannot spawn sub-workers.
- **`hive:hygienic`** — Opus-tier reviewer. Falsification-first review against the approved plan.
- **`/hive` command** — Single entry point; stateful across sessions via the plan file.
- **MCP gate tools** — `hive_feature_create`, `hive_plan_write`, `hive_plan_approve`, `hive_tasks_sync`, `hive_status`, `hive_worktree_commit`, `hive_merge`, `hive_feature_complete`, plus research tools.
- **`SessionStart` hook** — Re-injects current feature context so a new session doesn't restart from zero.
- **11 skills** — Loaded on demand: writing-plans, executing-plans, dispatching-parallel-agents, parallel-exploration, systematic-debugging, test-driven-development, verification-before-completion, code-reviewer, brainstorming, docker-mastery, agents-md-mastery.

Workers are dispatched via Claude Code's native `Agent` tool with `isolation: worktree` — Claude Code creates a fresh git worktree per worker automatically. The orchestrator never edits code directly; it plans, dispatches, and merges.

---

## OpenCode

The OpenCode runtime is Hive's most mature implementation. It integrates with OpenCode's session, plugin, and compaction systems natively.

### Install

Add the plugin to `opencode.json` — OpenCode handles npm resolution automatically; you do not need to `npm install` yourself.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-hive@latest"]
}
```

### Optional config — `.hive/agent-hive.json`

Project-scoped config (preferred); falls back to `.opencode/agent_hive.json` or `~/.config/opencode/agent_hive.json`.

```json
{
  "$schema": "https://raw.githubusercontent.com/tctinh/agent-hive/main/packages/opencode-hive/schema/agent_hive.schema.json",
  "agentMode": "unified",
  "agents": {
    "hive-master":    { "model": "anthropic/claude-sonnet-4-20250514", "temperature": 0.5 },
    "forager-worker": { "model": "anthropic/claude-sonnet-4-20250514", "temperature": 0.3 }
  }
}
```

### Start

Chat with OpenCode. Ask it to "create a feature for user authentication" and Hive activates automatically.

### What you get

- **7 agents** — Unified mode: `hive-master` handles planning + orchestration. Dedicated mode: `architect-planner` + `swarm-orchestrator`. Plus `scout-researcher`, `forager-worker`, `hygienic-reviewer`, `hive-helper`.
- **17 MCP tools** — Full lifecycle: feature, plan, tasks, worktrees, context, merge, status, agents-md, research.
- **11 skills** — Same library as Claude Code, loaded via OpenCode's native `skill` tool.
- **Compaction recovery** — OpenCode sessions compact on long runs; Hive stores durable session metadata in `.hive/sessions.json` so agents re-anchor with the correct role after compaction.
- **Optional research MCPs** — Exa web search, Context7 docs, grep.app, ast-grep. Disable individually via `disableMcps`.

See [`packages/opencode-hive/README.md`](packages/opencode-hive/README.md) for per-agent model routing, derived subagents, and DCP safety.

---

## VS Code

The VS Code extension is a **companion**, not a runtime. It shows you the state of `.hive/` that a CLI runtime (Claude Code or OpenCode) is writing, and lets you approve plans and comment on them without leaving the editor.

### Install

```bash
code --install-extension tctinh.vscode-hive
```

Or search **"Agent Hive"** in the Extensions panel.

### What you get

- **Hive sidebar** (activity-bar view) — features tree, per-task status, inline comments on `plan.md`.
- **One-click plan approval** — opens `plan.md`, lets you add/resolve inline comments, Approve button writes approval state back to `.hive/`.
- **Task detail** — open `spec.md` (what the worker was told) and `report.md` (what it did).
- **`hive.initNest` command** — scaffolds `.hive/`, `.github/agents/`, `.github/prompts/`, `.github/copilot-instructions.md`, `.claude/skills/hive/SKILL.md`, and `.opencode/skill/hive/SKILL.md` so any runtime has the right files to read.
- **Language-model tools** — the extension registers Hive operations (`hive_feature_create`, `hive_plan_write`, `hive_plan_approve`, `hive_status`, etc.) via VS Code's `vscode.lm.registerTool` API. These are read/write wrappers around `.hive/` state that any VS Code LM client can call — useful for quick edits from the editor, **not** a replacement for Claude Code or OpenCode as the execution runtime.

### Typical setup

Run Claude Code or OpenCode in a terminal pane; keep VS Code open for the Hive sidebar. Plan review and approval happen in VS Code; execution happens in the CLI. The extension watches `.hive/` and reflects changes in real time.

---

## The Workflow

Every platform runs the same four phases.

### 1. Discovery + Plan

Hive asks questions, reads the codebase, checks existing patterns, then writes `.hive/features/<name>/plan.md`:

```markdown
# User Authentication

## Overview
Add JWT-based auth with login, signup, protected routes.

## Tasks

### 1. Extract auth logic to service
Move scattered auth code to AuthService.

### 2. Add token refresh mechanism
Implement refresh token rotation.

### 3. Update API routes
Convert all routes to use AuthService.
```

### 2. Human Approval

Nothing executes until you approve — in the chat, via the VS Code Approve button, or by calling `hive_plan_approve`. The human owns the *what*. The agent owns the *how*.

### 3. Batched Parallel Execution

```
Orchestrator
├── Batch 1 (parallel):
│   ├── Forager A → worktree-a → commit
│   ├── Forager B → worktree-b → commit
│   └── Forager C → worktree-c → commit
│       ↓ merge + full test suite
└── Batch 2 (parallel):
    ├── Forager D (uses A+B+C results)
    └── Forager E
        ↓ merge + full test suite
```

Independent tasks run concurrently. Dependent tasks wait. Each worker runs in its own worktree, verifies its own work, and commits. The orchestrator merges batch-by-batch and runs the full suite after each merge.

### 4. Audit Trail

```
.hive/features/01_user-auth/
├── plan.md              # the approved contract
├── tasks.json           # task state
├── context/
│   └── overview.md      # human-facing branch summary
└── tasks/
    ├── 01-extract-auth-logic/
    │   ├── spec.md      # what the worker was told
    │   └── report.md    # what it did
    └── 02-add-token-refresh/
        ├── spec.md
        └── report.md
```

---

## Platform Comparison

|  | Claude Code | OpenCode | VS Code |
|---|---|---|---|
| **Role** | Runtime | Runtime | Companion |
| **Entry point** | `/hive` slash command | Ask in chat | Sidebar + LM tools |
| **Worker dispatch** | `Agent` tool (native) | OpenCode subagent system | N/A |
| **Worktree isolation** | `isolation: worktree` (auto) | `hive_worktree_*` tools | N/A |
| **MCP runtime** | `@tctinh/agent-hive-mcp` sidecar | `opencode-hive` plugin (in-process) | Built-in LM tool bridge |
| **Skills** | 11 bundled | 11 via native `skill` | N/A |
| **Context injection** | `SessionStart` hook | Compaction hooks + sessions.json | Watches `.hive/` passively |
| **Distribution** | Plugin marketplace + npm | npm (via `opencode.json`) | VS Code Marketplace |

---

## Philosophy

Hive is built on nine principles. They explain why the workflow is shaped the way it is.

**P1 — Context Persists.** `.hive/features/` is durable memory. Plan, tasks, context, reports survive session end, compaction, and restarts.

**P2 — Plan → Approve → Execute.** No code changes before a human approves the plan. Trust is established, not assumed.

**P3 — Human Shapes, Agent Builds.** The human owns *what* and *why*. The agent owns *how*. Scope is fixed at approval.

**P4 — Good Enough Wins.** Workers do best-effort verification at task level; the full suite runs at batch level. No perfectionism spirals.

**P5 — Batched Parallelism.** Independent tasks run in parallel inside a batch. Batches run sequentially so context flows forward.

**P6 — Tests Define Done.** A batch is done when the suite passes, not when a worker says so.

**P7 — Iron Laws + Hard Gates.** Constraints are enforced by tools, not by prompts. A plan without `## Tasks` does not pass; a worker that commits incomplete work gets rejected.

**P8 — Cross-Model Prompts.** Agent instructions work across model families. The workflow design does not depend on any one model's quirks.

**P9 — Deterministic Contracts Beat Soft Memory.** What a version ships is defined by the checked-in artifacts all agreeing on a version. What a feature did is defined by `plan.md`, `spec.md`, `report.md` — not by what anyone remembers.

See [PHILOSOPHY.md](PHILOSOPHY.md) for the full evolution log.

---

## Skills

| Skill | When the orchestrator loads it |
|---|---|
| `writing-plans` | Creating or revising a feature plan |
| `executing-plans` | Running a batch execution pass |
| `dispatching-parallel-agents` | Spawning multiple concurrent workers |
| `parallel-exploration` | Multi-domain research |
| `systematic-debugging` | Diagnosing a failing test or regression |
| `test-driven-development` | Implementing new behaviour with tests |
| `verification-before-completion` | Checking work before declaring done |
| `code-reviewer` | Reviewing changes against plan and quality bar |
| `brainstorming` | Exploring options before committing |
| `docker-mastery` | Docker / docker-compose / container debugging |
| `agents-md-mastery` | Reviewing agent instruction files |

---

## Troubleshooting

**Worker appears stuck.** Call `hive_status({ feature })` first. Use `continueFrom: 'blocked'` only when status confirms `blocked` — not `pending` or `in_progress`.

**Session resumed without context.** The SessionStart hook (Claude Code) or compaction recovery (OpenCode) should re-inject. If not, call `hive_status` explicitly.

**OpenCode with DCP.** Protect Hive tools from pruning:

```jsonc
{
  "tools": {
    "settings": {
      "protectedTools": ["hive_status", "hive_worktree_start", "hive_worktree_create", "hive_worktree_commit", "hive_worktree_discard", "question"]
    }
  }
}
```

**Claude Code marketplace install, MCP fails to launch.** The plugin invokes the MCP runtime via `npx -y -p @tctinh/agent-hive-mcp@latest hive-mcp`, which requires Node.js 18+ on PATH. If npx is sandboxed or the registry is blocked, pre-cache the package with `npx -y -p @tctinh/agent-hive-mcp@latest hive-mcp --version` (then Ctrl-C) before starting Claude Code.

---

## Packages

| Package | Registry | Description |
|---|---|---|
| [`opencode-hive`](https://www.npmjs.com/package/opencode-hive) | npm | OpenCode plugin — full runtime, 7 agents, 17 tools |
| [`claude-code-hive`](https://www.npmjs.com/package/claude-code-hive) | npm | Claude Code plugin assets — agents, skills, hooks, `/hive` |
| [`@tctinh/agent-hive-mcp`](https://www.npmjs.com/package/@tctinh/agent-hive-mcp) | npm | MCP gate-tools server (used by Claude Code) |
| [`vscode-hive`](https://marketplace.visualstudio.com/items?itemName=tctinh.vscode-hive) | VS Code Marketplace | Sidebar, plan review, LM tool bridge |

---

## Related Projects

| Tool | How Hive relates |
|---|---|
| [Oh My OpenCode](https://github.com/code-yeongyu/oh-my-opencode) | Companion — OMO handles delegation, Hive adds workflow structure |
| [Conductor](https://github.com/gemini-cli-extensions/conductor) | Similar goal; Hive adds the human approval gate and worktree isolation |
| [Spec Kit](https://github.com/github/spec-kit) | Heavy upfront specs — Hive specs emerge from conversation |
| [Ralph Wiggum](https://awesomeclaude.ai/ralph-wiggum) | Retry-first vs plan-first — different philosophy, both valid |

---

## License

MIT with Commons Clause — free for personal and non-commercial use. See [LICENSE](LICENSE).

---

<p align="center">
  <strong>Stop vibing. Start hiving.</strong>
  <br>
  <em>Plan first. Execute with trust. Context persists.</em>
</p>
