# Agent Hive 🐝

**From Vibe Coding to Hive Coding** — Plan first. Execute with trust. Context persists.

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

---

## The Hive Solution

| Problem | Hive Solution |
|---------|---------------|
| Lost context | **Context persists** — Feature-scoped knowledge survives sessions |
| Subagents go wild | **Batched parallelism** — Coordinated execution with context flow |
| Scope creep | **Plan approval gate** — Human shapes, agent builds |
| Messes to clean up | **Worktree isolation** — Each task isolated, easy discard |
| No audit trail | **Automatic tracking** — Every task logged to `.hive/` |

**Hive doesn't change how you work. It makes what happens traceable and auditable.**

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
Main Agent: Creates plan, you approve it
    │
    ├── Batch 1 (parallel):
    │   ├── Task A (own worktree, tracked)
    │   ├── Task B (own worktree, tracked)
    │   └── Task C (own worktree, tracked)
    │           ↓
    │      Context flows forward
    │           ↓
    ├── Batch 2 (parallel):
    │   ├── Task D (uses A+B+C results)
    │   └── Task E (uses A+B+C results)
    │
Hive: Full audit of what each agent did
You: Clear visibility into everything ✅
```

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

Open VS Code. The Hive sidebar shows your plan. You can:

- Read through each task
- Add comments ("Use httpOnly cookies for tokens")
- Approve when ready

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
.hive/features/user-auth/
├── plan.md              # Your approved plan
├── context/             # Decisions and calibration
│   └── architecture.md
└── tasks/
    ├── 01-extract-auth-logic/
    │   ├── spec.md      # Task context, prior/upcoming tasks
    │   └── report.md    # Summary, files changed, diff stats
    ├── 02-add-token-refresh/
    │   ├── spec.md
    │   └── report.md
    └── 03-update-api-routes/
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
│  See the plan in sidebar                                    │
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
- **Inline Comments** — Add review comments directly on plan.md
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

**Review plans, add comments, approve — all without leaving VS Code.**

### Extension Features

| Feature | Description |
|---------|-------------|
| **Feature Tree** | Hierarchical view of all features, tasks, and their status |
| **Plan Review** | Open plan.md with syntax highlighting and inline commenting |
| **Task Details** | Expand any task to see spec.md (context) and report.md (results) |
| **Status Icons** | Visual indicators: ✅ done, 🔄 in-progress, ⏳ pending, ❌ failed |
| **Context Files** | Browse and edit context files stored per-feature |
| **Session History** | View past sessions and their outcomes |

### Extension Requirements

> **Important:** The VS Code extension is a companion tool for [OpenCode](https://opencode.ai). It provides visualization and review capabilities but does not execute tasks on its own.

**You need:**
1. **OpenCode CLI** — The AI coding assistant that runs the Hive workflow
2. **opencode-hive plugin** — Installed in your OpenCode configuration
3. **vscode-hive extension** — For visual management in VS Code

The extension watches your `.hive/` directory and displays the current state. All planning and execution happens through OpenCode.

### Using the Extension

1. **Open your project** in VS Code (must have `.hive/` directory)
2. **Click the Hive icon** in the Activity Bar (left sidebar)
3. **Browse features** — Expand to see tasks, context, sessions
4. **Review plans** — Click on plan.md to open with inline commenting
5. **Add comments** — Use VS Code's comment feature on plan.md lines
6. **Approve plans** — Click the approve button when ready
7. **Monitor progress** — Watch task status update in real-time as OpenCode executes

---

## Quick Start

### 1. Add to OpenCode

Add `opencode-hive` to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-hive"]
}
```

OpenCode handles the rest — no manual npm install needed.

### 2. Install VS Code Extension

```bash
code --install-extension tctinh.vscode-hive
```

Or search "Hive" in VS Code Extensions.

### 3. Start Hiving

```
You: "Create a feature for user dashboard"
```

That's it. You're hiving.

---

## Packages

| Package | Platform | Description |
|---------|----------|-------------|
| **[opencode-hive](https://www.npmjs.com/package/opencode-hive)** | npm | OpenCode plugin — planning, execution, tracking |
| **[vscode-hive](https://marketplace.visualstudio.com/items?itemName=tctinh.vscode-hive)** | VS Code | Visual management — review, comment, approve |

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

Hive is built on 6 core principles:

1. **Context Persists** — Calibration survives sessions. The "3 months later" problem solved.
2. **Plan → Approve → Execute** — Dialogue until approved, then trust. Two phases with a clear gate.
3. **Human Shapes, Agent Builds** — Human owns the why. Agent owns the how.
4. **Good Enough Wins** — Capture what works for this context. Reject over-engineering.
5. **Batched Parallelism** — Parallel tasks in batches. Sequential batches share context.
6. **Tests Define Done** — For implementation tasks, tests provide the feedback loop. TDD for agents.

See [PHILOSOPHY.md](PHILOSOPHY.md) for the full framework.

---

## Built for the OpenCode Ecosystem

Designed to work seamlessly with:

- **[OpenCode](https://opencode.ai)** — The AI coding CLI
- **VS Code** — Your editor for reviews
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
