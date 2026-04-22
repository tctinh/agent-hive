# Agent Hive

**Plan first. Execute with trust. Context persists.**

Agent Hive brings structured, auditable AI development to the tools you already use. Instead of vibe-coding your way to chaos, you get a reproducible workflow: discover → plan → human approves → parallel workers execute → everything is tracked.

[![npm](https://img.shields.io/npm/v/opencode-hive.svg?label=opencode-hive)](https://www.npmjs.com/package/opencode-hive)
[![npm](https://img.shields.io/npm/v/claude-code-hive.svg?label=claude-code-hive)](https://www.npmjs.com/package/claude-code-hive)
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/tctinh.vscode-hive.svg)](https://marketplace.visualstudio.com/items?itemName=tctinh.vscode-hive)
[![License: MIT with Commons Clause](https://img.shields.io/badge/License-MIT%20with%20Commons%20Clause-blue.svg)](LICENSE)

---

## Demo

https://github.com/user-attachments/assets/6290b435-1566-46b4-ac98-0420ed321204

---

## What is Agent Hive?

Hive is a workflow layer that sits on top of your AI coding tool. It imposes just enough structure to make multi-step, multi-agent work traceable and recoverable — without taking ownership of your editor, your model, or your coding style.

The core loop is always the same regardless of platform:

```
You describe the work
    ↓
Hive asks questions, builds a plan
    ↓
You review and approve the plan
    ↓
Workers execute tasks in isolated git worktrees (in parallel)
    ↓
Results merge. Everything is tracked in .hive/
```

What Hive adds over raw agentic coding:

| Without Hive | With Hive |
|---|---|
| Agent changes 40 files, half break | Tasks isolated in worktrees — discard any worker |
| New session = start from scratch | Feature context persists in `.hive/features/<name>/` |
| Parallel agents conflict, duplicate | Batched parallelism with explicit dependency ordering |
| "What happened?" nobody knows | Full audit trail: plan, tasks, specs, reports, context |
| Agent drifts into scope creep | Human approval gate before any execution begins |

---

## Choose Your Platform

Hive ships a native implementation for each major AI coding environment. The workflow is the same; the integration layer is tuned to each platform.

| Platform | Package | Best for |
|---|---|---|
| **Claude Code** | `claude-code-hive` + `@tctinh/agent-hive-mcp` | Claude Code CLI users |
| **OpenCode** | `opencode-hive` | OpenCode CLI users (most mature runtime) |
| **VS Code + Copilot** | `vscode-hive` extension | Review, sidebar, Copilot Chat tools |

---

## Install: Claude Code

The Claude Code plugin ships three things together: agent definitions (Hive orchestrator, Forager worker, Hygienic reviewer), a `/hive` slash command, 11 bundled skills, and a self-contained MCP server.

**1. Install the packages**

```bash
mkdir -p .agent-hive/claude && cd .agent-hive/claude
npm init -y
npm install claude-code-hive@latest @tctinh/agent-hive-mcp@latest
```

**2. Point Claude Code at the plugin**

In your `CLAUDE.md` or Claude Code settings, register the plugin:

```json
{
  "plugins": [".agent-hive/claude/node_modules/claude-code-hive/plugin.json"]
}
```

Or add it via the Claude Code CLI:

```bash
claude plugins add .agent-hive/claude/node_modules/claude-code-hive/plugin.json
```

**3. Start hiving**

```
/hive add user authentication
```

That's it. The `/hive` command bootstraps a new feature, walks through planning, and dispatches workers when you approve.

### What the Claude Code plugin provides

- **`/hive` slash command** — Your single entry point. Start a feature, resume one, or run any hive operation.
- **`hive:hive` agent** — Opus-tier orchestrator. Plans features, dispatches workers, merges results.
- **`hive:forager` agent** — Sonnet-tier worker. Executes a single task in an isolated worktree. Spawned automatically by the orchestrator.
- **`hive:hygienic` agent** — Opus-tier reviewer. Falsification-first code review; challenges implementation against the plan.
- **MCP tools via `@tctinh/agent-hive-mcp`** — `hive_feature_create`, `hive_plan_write`, `hive_plan_approve`, `hive_tasks_sync`, `hive_status`, `hive_merge`, `hive_worktree_commit`, `hive_feature_complete`, and more.
- **SessionStart hook** — Automatically injects the current feature context at the start of every Claude Code session so the orchestrator resumes in the right state.
- **11 bundled skills** — Loaded on-demand by the orchestrator: `writing-plans`, `executing-plans`, `dispatching-parallel-agents`, `parallel-exploration`, `systematic-debugging`, `test-driven-development`, `verification-before-completion`, `code-reviewer`, `brainstorming`, `docker-mastery`, `agents-md-mastery`.

### How workers run (Claude Code)

The Claude Code implementation uses Claude Code's native `Agent` tool for worker dispatch. When the orchestrator dispatches a Forager, it calls:

```js
Agent({ agent: "hive:forager", prompt: "...", run_in_background: true })
```

Forager runs with `isolation: worktree` — Claude Code creates a fresh git worktree for each worker automatically. The worker calls `hive_worktree_commit` when done, and the orchestrator merges the result. Workers cannot spawn sub-agents; they operate alone inside their worktree.

---

## Install: OpenCode

The OpenCode runtime is Hive's most mature implementation. It manages sessions, compaction recovery, and multi-agent orchestration natively through the OpenCode plugin system.

**1. Add `opencode-hive` to your `opencode.json`**

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-hive@latest"]
}
```

OpenCode downloads and activates the plugin automatically. No separate npm install.

**2. Optional: configure models and behaviour**

Create `.hive/agent-hive.json` in your project (or `~/.config/opencode/agent_hive.json` globally):

```json
{
  "$schema": "https://raw.githubusercontent.com/tctinh/agent-hive/main/packages/opencode-hive/schema/agent_hive.schema.json",
  "agentMode": "unified",
  "agents": {
    "hive-master":   { "model": "anthropic/claude-sonnet-4-20250514", "temperature": 0.5 },
    "forager-worker": { "model": "anthropic/claude-sonnet-4-20250514", "temperature": 0.3 }
  }
}
```

**3. Start hiving**

```
You: "Create a feature for user authentication"
```

Hive activates automatically when the OpenCode session starts.

### What the OpenCode plugin provides

- **7 specialized agents** — `hive-master` (unified) or `architect-planner` + `swarm-orchestrator` (dedicated mode), plus `scout-researcher`, `forager-worker`, `hygienic-reviewer`, `hive-helper`.
- **18 MCP tools** — The full gate toolset: feature lifecycle, plan, tasks, worktrees, context, merge, status, skills, network query, and agents-md.
- **11 skills loaded on-demand** — Same skill set as Claude Code, accessed via `hive_skill` tool.
- **Compaction recovery** — Long OpenCode sessions compact mid-task. Hive stores durable session metadata in `.hive/sessions.json` and feature-local mirrors so agents re-anchor with the right role and task context after compaction instead of starting fresh.
- **Research MCPs** — Optional auto-enabled integrations: Exa web search, Context7 docs, grep.app GitHub search, ast-grep structural search.

### Configuration options

| Option | Values | Effect |
|---|---|---|
| `agentMode` | `unified` (default), `dedicated` | `unified`: one `hive-master` handles planning + orchestration. `dedicated`: separate `architect-planner` and `swarm-orchestrator`. |
| `disableSkills` | `string[]` | Remove specific skills from `hive_skill`. |
| `disableMcps` | `string[]` | Disable research MCPs: `websearch`, `context7`, `grep_app`, `ast_grep`. |

See [`packages/opencode-hive/README.md`](packages/opencode-hive/README.md) for advanced options: custom derived subagents, per-agent model routing, auto-load skills, and DCP safety config.

---

## Install: VS Code

The VS Code extension is a companion, not a runtime. It gives you a visual window into the `.hive/` state that OpenCode or Claude Code is writing, plus LM tools that work inside Copilot Chat.

**Install from the marketplace:**

```bash
code --install-extension tctinh.vscode-hive
```

Or search **"Agent Hive"** in the VS Code Extensions panel.

### What the VS Code extension provides

- **Hive sidebar** — Activity bar panel showing all features, tasks, and live status.

  ```
  ┌─────────────────────────────────────┐
  │ HIVE                           [+]  │
  ├─────────────────────────────────────┤
  │ ▼ user-auth              [3/3]  ✅  │
  │   ├─ 01-extract-auth-logic     ✅   │
  │   ├─ 02-add-token-refresh      ✅   │
  │   └─ 03-update-api-routes      ✅   │
  │ ▶ dark-mode              [0/3]  📋  │
  │ ▶ api-refactor           [2/5]  🔄  │
  └─────────────────────────────────────┘
  ```

- **Plan review** — Open `plan.md` directly from the sidebar. Add inline comments, resolve threads, click **Approve** to unblock execution.
- **Task detail** — Expand any task to read `spec.md` (what the worker was told) and `report.md` (what it actually did).
- **Copilot LM tools** — When using GitHub Copilot Chat in VS Code, the Hive tools (`hive_feature_create`, `hive_plan_write`, `hive_plan_approve`, `hive_status`, etc.) are available as language model tools. You can run the full Hive workflow through Copilot if you prefer it over OpenCode or Claude Code.
- **Generated repo artifacts** — When you run `hive.initNest`, the extension generates Copilot-native scaffolding in `.github/agents/`, `.github/prompts/`, and `.github/copilot-instructions.md`, giving Copilot context about the Hive workflow.

### VS Code as a review surface with OpenCode or Claude Code

The most common setup is: OpenCode or Claude Code does the execution, VS Code does the review.

1. OpenCode/Claude Code writes plan and tasks to `.hive/`
2. You switch to VS Code, open the Hive sidebar
3. Read `plan.md`, add comments, click **Approve**
4. Switch back to OpenCode/Claude Code to continue execution

The extension watches `.hive/` and reflects changes in real time.

---

## The Workflow in Detail

Every platform runs the same four-phase loop:

### Phase 1 — Discovery + Plan

Hive asks questions before writing a plan. It reads the codebase, checks existing patterns, clarifies ambiguity. The result is a `plan.md`:

```markdown
# User Authentication

## Overview
Add JWT-based auth with login, signup, and protected routes.

## Tasks

### 1. Extract auth logic to service
Move scattered auth code to AuthService.

### 2. Add token refresh mechanism
Implement refresh token rotation.

### 3. Update API routes
Convert all routes to use AuthService.
```

The plan lives at `.hive/features/<name>/plan.md`. It is the single execution contract.

### Phase 2 — Human Approval

Nothing executes until you say so. Review `plan.md`, add comments if needed, then approve — either in the chat, via VS Code's approve button, or by calling `hive_plan_approve`.

This is the gate. The human owns the *what*. The agent owns the *how*.

### Phase 3 — Parallel Execution

Tasks run in isolated git worktrees. Independent tasks run concurrently; tasks with dependencies run after their predecessors. Each worker receives a `spec.md`, executes, verifies its own work, and calls `hive_worktree_commit`. The orchestrator merges batch by batch and runs the full test suite after each batch.

```
Orchestrator
├── Batch 1 (parallel):
│   ├── Forager A → worktree-a → commit
│   ├── Forager B → worktree-b → commit
│   └── Forager C → worktree-c → commit
│       ↓ merge batch + run tests
└── Batch 2 (parallel):
    ├── Forager D (uses A+B+C results)
    └── Forager E (uses A+B+C results)
        ↓ merge batch + run tests
```

### Phase 4 — Audit Trail

When everything is done, `.hive/` contains the full history:

```
.hive/features/01_user-auth/
├── plan.md              # What was approved
├── tasks.json           # All tasks and final status
├── context/             # Persistent context files
│   └── overview.md      # Human-facing branch summary
└── tasks/
    ├── 01-extract-auth-logic/
    │   ├── spec.md      # What the worker was told
    │   └── report.md    # What it did
    └── 02-add-token-refresh/
        ├── spec.md
        └── report.md
```

---

## Platform Comparison

|  | Claude Code | OpenCode | VS Code |
|---|---|---|---|
| **Type** | Full runtime | Full runtime | Companion |
| **Entry point** | `/hive` slash command | Hive agent in chat | Sidebar + Copilot LM tools |
| **Worker dispatch** | `Agent` tool (native to Claude Code) | OpenCode subagent system | N/A |
| **Worker isolation** | `isolation: worktree` (automatic) | `hive_worktree_start` + git worktree | N/A |
| **MCP tools** | `@tctinh/agent-hive-mcp` (packaged) | `opencode-hive` (plugin) | Built-in LM tools |
| **Skills** | 11 bundled in plugin package | 11 via `hive_skill` tool | N/A |
| **Context injection** | `SessionStart` hook (automatic) | OpenCode session hooks | Watches `.hive/` passively |
| **Compaction recovery** | Stateless (each session starts fresh) | Full recovery via `.hive/sessions.json` | N/A |
| **Maturity** | Production (v1.4.6+) | Mature (v1.4.0+) | Companion (all versions) |
| **Requires** | Claude Code CLI | OpenCode CLI | VS Code |

### Key implementation differences

**Claude Code** — The orchestrator is a Claude Code agent (`hive:hive`) that uses the native `Agent` tool to spawn workers. Each worker gets its own worktree automatically through Claude Code's `isolation: worktree` feature. The MCP server runs as a sidecar process launched by the plugin's packaged script. No runtime configuration needed beyond pointing the plugin at the right `plugin.json`.

**OpenCode** — Hive integrates deeply with OpenCode's session and plugin system. The plugin manages seven agent roles with separate model routing, compaction recovery hooks, research MCPs, and a rich config schema. Suitable for long, complex sessions where context persistence and recovery matter most.

**VS Code** — A read/review layer over whatever runtime is writing to `.hive/`. The extension adds value as a review companion regardless of which execution harness is running. The Copilot LM tools are a full alternative runtime path for teams already using GitHub Copilot.

---

## Philosophy

Hive is built on nine principles. They explain why it works the way it does.

**P1 — Context Persists**
`.hive/features/` is the durable memory. Plan, tasks, context files, and reports survive session end, compaction, and model restarts. The agent never starts from nothing on an existing feature.

**P2 — Plan → Approve → Execute**
No code changes before a human approves the plan. The approval gate is not optional. This is where trust is established, not assumed.

**P3 — Human Shapes, Agent Builds**
The human owns the *what* and the *why*. The agent owns the *how*. Discovery (asking questions, reading code) happens before any plan is written. Scope is fixed at approval.

**P4 — Good Enough Wins**
Best-effort verification at the worker level; full suite at the batch level. Workers don't loop forever trying to be perfect — they do their best, commit, and let the orchestrator catch failures after the merge.

**P5 — Batched Parallelism**
Independent tasks run in parallel inside a batch. Batches run sequentially so each batch can use the results of the previous one. Context flows forward, not just sideways.

**P6 — Tests Define Done**
Workers run the tests they can. The orchestrator runs the full build + test suite after merging each batch. A batch is not done until it passes the suite, not until a worker says so.

**P7 — Iron Laws + Hard Gates**
Constraints are enforced by tools, not by prompts. A worker that calls `hive_worktree_commit` without completing its task gets a rejection. A plan without a `## Tasks` section doesn't pass. The system catches violations mechanically.

**P8 — Cross-Model Prompts**
Agent instructions work across model families. No prompt assumes a specific model's quirks. Hive runs on Claude, but the workflow design doesn't depend on it.

**P9 — Deterministic Contracts Beat Soft Memory**
What a version ships is defined by the checked-in artifacts (manifests, lockfiles, docs, tests) all agreeing on the same version. What a feature did is defined by `plan.md`, `spec.md`, `report.md`, and `.hive/sessions.json` — not by what anyone remembers.

See [PHILOSOPHY.md](PHILOSOPHY.md) for the full evolution history.

---

## Skills Reference

All platforms share the same skill library. Skills are specialized workflow guides that the orchestrator loads for the relevant task type.

| Skill | When it activates |
|---|---|
| `writing-plans` | Creating or revising a feature plan |
| `executing-plans` | Running a batch execution pass |
| `dispatching-parallel-agents` | Spawning multiple concurrent workers |
| `parallel-exploration` | Multi-domain research across Scout agents |
| `systematic-debugging` | Diagnosing a failing test or regression |
| `test-driven-development` | Implementing new behaviour with tests |
| `verification-before-completion` | Checking work before declaring done |
| `code-reviewer` | Reviewing changes against plan and quality bar |
| `brainstorming` | Exploring options before committing to an approach |
| `docker-mastery` | Docker, docker-compose, container debugging |
| `agents-md-mastery` | Reviewing agent instruction files |

---

## Troubleshooting

**Worker appears stuck / task in wrong state**

Call `hive_status({ feature })` first. The status tells you exactly what state each task is in. Use `continueFrom: 'blocked'` only when the status confirms the task is `blocked` — not for `pending` or `in_progress` tasks.

**Session resumed but agent has no context**

The SessionStart hook (Claude Code) or compaction recovery (OpenCode) should re-inject context. If it doesn't, call `hive_status` explicitly to reload the current feature state.

**DCP with OpenCode**

If using Dynamic Context Pruning, protect Hive tools from pruning. Add to your DCP config:

```jsonc
{
  "tools": {
    "settings": {
      "protectedTools": ["hive_status", "hive_worktree_start", "hive_worktree_create", "hive_worktree_commit", "hive_worktree_discard", "question"]
    }
  }
}
```

**Provenance / npm publish errors**

The `NPM_KEY` secret must be an **Automation token** (not a Publish token). Generate one at npmjs.com → Account → Access Tokens → Generate New Token → Automation.

---

## Packages

| Package | Registry | Description |
|---|---|---|
| [`opencode-hive`](https://www.npmjs.com/package/opencode-hive) | npm | OpenCode plugin — full runtime, 7 agents, 18 tools, 11 skills |
| [`claude-code-hive`](https://www.npmjs.com/package/claude-code-hive) | npm | Claude Code plugin assets — agents, skills, hooks, `/hive` command |
| [`@tctinh/agent-hive-mcp`](https://www.npmjs.com/package/@tctinh/agent-hive-mcp) | npm | MCP server for Claude Code — the gate tools runtime |
| [`vscode-hive`](https://marketplace.visualstudio.com/items?itemName=tctinh.vscode-hive) | VS Code Marketplace | Review companion — sidebar, plan comments, Copilot LM tools |

---

## Related Projects

| Tool | How Hive relates |
|---|---|
| [Oh My OpenCode](https://github.com/code-yeongyu/oh-my-opencode) | Natural companion — OMO handles agent delegation, Hive adds workflow structure |
| [Conductor](https://github.com/gemini-cli-extensions/conductor) | Similar goal; Hive adds the human approval gate and worktree isolation |
| [Spec Kit](https://github.com/github/spec-kit) | Heavy upfront specs — Hive specs emerge from conversation, not before |
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
