# Agent Hive 🐝

**From Vibe Coding to Hive Coding** — Organize the chaos into structured execution.

[![License: MIT with Commons Clause](https://img.shields.io/badge/License-MIT%20with%20Commons%20Clause-blue.svg)](LICENSE)

---

## The Problem

AI coding assistants are powerful, but without structure you get:
- 🌀 Lost context between sessions
- 🔄 No record of decisions made
- 📝 Zero audit trail
- 🎯 Scope creep and forgotten requirements

### The Subagent Problem

When you use multiple AI agents (subagents) to parallelize work:
- 🤖 **Agents do their own thing** — No coordination, duplicated work
- 🔍 **Hard to trace** — What did each agent actually do?
- 📊 **Impossible to audit** — Which agent made which decision?
- 🎭 **Context fragmentation** — Each agent has partial picture

**You can technically trace subagent work, but it's painful.** Logs scattered everywhere, no unified view, manual correlation required.

### The Spec Kit Problem

Traditional solutions like Spec Kit require detailed specifications upfront. That works for some teams, but:
- Most developers just want to code — not write docs first
- Specs become outdated the moment you start coding
- Heavy process that doesn't fit agile workflows

---

## The Hive Solution

| Problem | Hive Solution |
|---------|---------------|
| Agents do their own thing | **Structured plans** — agents follow the approved plan |
| Hard to trace | **Automatic tracking** — every action logged to .hive/ |
| Impossible to audit | **Full audit trail** — who did what, when, why |
| Context fragmentation | **Shared context** — plan.md is the single source of truth |
| Upfront documentation | **Passive docs** — specs emerge as you work |

**Hive doesn't change how you work. It makes what happens traceable and auditable.**

---

## How It Works

```
You: "Let's add dark mode to the app"
Agent: Plans the feature, Hive automatically captures it
You: Review in VS Code, add comments, approve
Agent: Executes tasks in isolated worktrees
You: Ship with full audit trail
```

### The Magic: Automatic Capture

When you work with your AI agent, Hive automatically:
- 📋 **Captures plans** as they're discussed
- 💬 **Records decisions** from your conversation
- 🔄 **Tracks execution** of each task
- 📊 **Builds documentation** as a side effect

**You don't write specs. Specs write themselves.**

---

## Subagent Orchestration Made Easy 🤖

This is where Hive really shines. **Multi-agent workflows become manageable.**

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
Main Agent: Creates plan, Hive tracks it
    │
    ├── Subagent 1: task-01 (own worktree, tracked)
    ├── Subagent 2: task-02 (own worktree, tracked)
    └── Subagent 3: task-03 (own worktree, tracked)
    │
Hive: Full audit of what each agent did
Main Agent: Merges all completed tasks
You: Clear visibility into everything ✅
```

### What Each Subagent Gets

- 🌳 **Isolated git worktree** — No conflicts with other agents
- 📋 **Clear task description** — From the approved plan
- 📊 **Own status.json** — Track progress independently
- 📝 **Summary on completion** — What was actually done

### What You Get

```
.hive/features/auth-system/tasks/
├── 01-extract-auth-logic/
│   ├── status.json    # started: 10:00, completed: 10:15
│   └── report.md      # "Extracted auth to AuthService class"
├── 02-add-token-refresh/
│   ├── status.json    # started: 10:05, completed: 10:20
│   └── report.md      # "Added refresh token rotation"
└── 03-update-api-routes/
    ├── status.json    # started: 10:10, completed: 10:25
    └── report.md      # "Updated 12 routes to use AuthService"
```

**Full visibility. Easy audit. No more "what did that agent do?"**

---

## Real Example: What "Hiving" Looks Like

Here's an actual feature we built using Hive — preparing this repo for release:

```
.hive/
└── features/
    └── release-preparation/
        ├── feature.json          # Feature metadata & session tracking
        ├── plan.md               # The approved plan (15 tasks)
        ├── comments.json         # Review comments from VS Code
        └── tasks/
            ├── 01-prepare-icon-asset/
            │   ├── status.json   # done, timestamps, summary
            │   └── report.md     # What was actually done
            ├── 02-update-packagejson-for-opencode-hive/
            │   ├── status.json
            │   └── report.md
            ...
            └── 15-create-releasingmd/
                ├── status.json
                └── report.md
```

### Task Status Example

```json
{
  "status": "done",
  "origin": "plan",
  "startedAt": "2026-01-06T16:40:13.161Z",
  "completedAt": "2026-01-06T16:41:04.350Z",
  "summary": "Copied PNG icon to packages/vscode-hive/icon.png and packages/opencode-hive/icon.png"
}
```

**15 tasks executed. Full audit trail. Clean merges. Documentation generated automatically.**

---

## Two Ways to Use Hive

### 1. Automatic Mode (Recommended)
Just work normally. Hive kicks in when it detects planning.

```
You: "I need to refactor the auth system"
Agent: [Plans automatically captured by Hive]
       Here's my plan:
       1. Extract auth logic to service
       2. Add token refresh
       3. Update API routes
You: "Looks good, let's do it"
Agent: [Executes with full tracking]
```

### 2. Explicit Mode
When you want more control:

```
hive_feature_create("auth-refactor")    # Start a feature
hive_plan_write(plan)                    # Write the plan
hive_plan_approve()                      # Approve it
hive_exec_start("01-extract-service")   # Execute task
hive_exec_complete(task, summary)        # Complete with summary
```

Or just say:
```
"Hive a plan for auth refactor"
"Hive execute auth-refactor"
```

---

## VS Code Extension: Not Just CLI

**Hive isn't CLI-only.** The VS Code extension makes management visual:

- 📋 **Sidebar** — See all features and their progress at a glance
- 💬 **Inline Comments** — Add review comments directly on plan.md
- ✅ **Approve Button** — One-click plan approval
- 🔄 **Real-time Updates** — Watches .hive/ folder for changes
- 🚀 **Launch Tasks** — Open tasks in OpenCode from VS Code

```
┌─────────────────────────────────────┐
│ HIVE                           [+]  │
├─────────────────────────────────────┤
│ ▼ release-preparation    [15/15] ✅ │
│   ├─ 01-prepare-icon-asset     ✅   │
│   ├─ 02-update-packagejson     ✅   │
│   ├─ 03-update-packagejson     ✅   │
│   └─ ...                            │
│ ▶ auth-refactor          [0/5]  📋  │
│ ▶ dark-mode              [2/3]  🔄  │
└─────────────────────────────────────┘
```

**Review plans, add comments, approve — all without leaving VS Code.**

---

## Why Hive?

### 🎯 Easy Orchestrate
Break work into isolated tasks. Subagents work in parallel without conflicts. Plan is the contract.

### 📊 Easy Audit
Every decision, every change, every agent action — automatically captured in .hive/

### 🚀 Easy Ship
When you're done, you have:
- Clean git history (worktree merges)
- Full documentation (generated automatically)
- Traceable decisions (who did what, when)

---

## The Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  PLAN                                                       │
│  Chat with your agent about what to build                   │
│  Hive captures the plan automatically                       │
├─────────────────────────────────────────────────────────────┤
│  REVIEW (in VS Code)                                        │
│  See the plan in sidebar                                    │
│  Add inline comments, refine, approve                       │
├─────────────────────────────────────────────────────────────┤
│  EXECUTE (parallel-friendly)                                │
│  Main agent or subagents work on tasks                      │
│  Each task in isolated worktree                             │
│  Every action tracked and auditable                         │
├─────────────────────────────────────────────────────────────┤
│  SHIP                                                       │
│  Clean merges, full history                                 │
│  Documentation generated as side effect                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Packages

| Package | Platform | Description |
|---------|----------|-------------|
| **[opencode-hive](https://www.npmjs.com/package/opencode-hive)** | npm | OpenCode plugin — planning, execution, tracking |
| **[vscode-hive](https://marketplace.visualstudio.com/items?itemName=tctinh.vscode-hive)** | VS Code | Visual management — review, comment, approve |

---

## Quick Start

### 1. Install

```bash
# OpenCode plugin
npm install opencode-hive

# VS Code extension
code --install-extension tctinh.vscode-hive
```

### 2. Just Start Coding

```
You: "Let's build a user dashboard"
Agent: [Hive automatically activates]
       I'll create a plan for the user dashboard...
```

Or be explicit:

```
You: "Hive a plan for user dashboard"
You: "Hive execute dashboard-feature"
```

---

## Built for the OpenCode Ecosystem

Designed to work seamlessly with:
- **[OpenCode](https://opencode.ai)** — The AI coding CLI
- **VS Code** — Your editor for reviews
- **Git** — Worktrees for isolation

Inspired by the workflow principles of **[Antigravity](https://antigravity.dev)**.

---

## Comparison

| Feature | Vibe Coding | Spec Kit | Agent Hive |
|---------|-------------|----------|------------|
| Setup required | None | Heavy | Minimal |
| Documentation | None | Upfront | Automatic |
| Planning | Ad-hoc | Required first | Conversational |
| Tracking | None | Manual | Automatic |
| Audit trail | None | If maintained | Built-in |
| Learning curve | None | Steep | Low |
| Multi-agent ready | ❌ Chaos | ❌ | ✅ Native |
| Subagent tracing | 😰 Painful | ❌ | ✅ Automatic |
| VS Code UI | ❌ | ❌ | ✅ Full support |

---

## License

MIT with Commons Clause — Free for personal and non-commercial use. See [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>Stop vibing. Start hiving.</strong> 🐝
  <br><br>
  <em>Specs along the way. Not in the way.</em>
  <br>
  <em>Subagents under control. Finally.</em>
</p>
