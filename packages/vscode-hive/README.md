# vscode-hive

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/tctinh.vscode-hive)](https://marketplace.visualstudio.com/items?itemName=tctinh.vscode-hive)
[![License: MIT with Commons Clause](https://img.shields.io/badge/License-MIT%20with%20Commons%20Clause-blue.svg)](../../LICENSE)

**From Vibe Coding to Hive Coding** — The VS Code companion for reviewing, commenting on, and approving Hive work through plan.md.

## Why Hive?

OpenCode runs the work. This extension keeps the plan, comments, approvals, feature status, and retained Copilot-facing Hive tools close to your editor.

```
Vibe: Hope it works
Hive: Review → Approve → Confidence
```

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Hive"
4. Click Install

### From VSIX

Download from [Releases](https://github.com/tctinh/agent-hive/releases) and install manually.

## Features

### 📋 Feature Sidebar
See all your features at a glance with progress indicators.

### 💬 Inline Plan Review
Add comments directly on plan.md. Discuss, iterate, approve.

### 🔄 Real-time Updates
Watches `.hive/` folder for changes. Always in sync.

### 🧭 Retained Copilot Tool Surface
Copilot Chat sees only the Hive feature, plan, task, and status tools that still add structured value.

### 🚀 Execution Companion
Keep review and task status in VS Code, then delegate implementation directly to `@forager` and record progress with `hive_task_update`.

## Usage

### Review a Hive feature

1. Create or open a repository that already has `.hive/` output from `opencode-hive`
2. Click the Hive icon in the Activity Bar
3. Open `plan.md` from the sidebar and review it as the single required review and execution document
4. Add comments directly on `plan.md`, then click **Done Review** when the plan is ready
5. Sync or inspect tasks with the retained Hive feature/plan/task/status tools in Copilot Chat
6. Delegate runnable implementation directly to `@forager` and use `hive_task_update` to record progress or completion

### What this extension is for in `1.4.0`

- **Plan-first review**: inspect `plan.md` as the single required review and execution document
- **Sidebar visibility**: features, tasks, status, and reports in one place
- **Inline comments**: discuss changes directly in `plan.md`
- **Retained Hive tools**: use feature, plan, task, and status tools in Copilot Chat without the legacy worktree/merge/context-write surface

### Bootstrap generation (kept for continuity)

The extension still ships bootstrap helpers that can generate `.github/agents`, `.github/skills`, `.github/hooks`, `.github/instructions`, and related scaffolding for teams that want continuity with older repository layouts.

Those generated artifacts are no longer the primary supported execution path for Hive. In `1.4.0`, the supported harness is OpenCode; `vscode-hive` stays focused on review/sidebar UX.

## Commands

| Command | Description |
|---------|-------------|
| Hive: New Feature | Create a new feature |
| Hive: Refresh | Refresh the feature tree |
| View Details | Show feature details |
| View Report | Open feature report |
| Open in OpenCode | Open step in OpenCode |

### Usage Tips

- **Task names**: Use kebab-case or snake_case. Spaces in task names may cause git worktree errors.
- **Context management**: Check `.hive/features/<name>/context/` for optional notes; files like `overview.md`, `decisions.md`, or `architecture.md` are ordinary context files, not separate review gates.
- **Plan review**: `plan.md` is the only required review document and should keep a readable overview/design summary before `## Tasks`.
- **Execution handoff**: delegate runnable implementation directly to `@forager` and record task progress with `hive_task_update`.

### Troubleshooting

**Issue**: "Invalid reference" error when starting task
- **Solution**: Task names with spaces may cause git worktree errors. Use kebab-case (e.g., `user-auth` instead of `User Authentication`).

## Pair with OpenCode

For the supported workflow, install [opencode-hive](https://www.npmjs.com/package/opencode-hive) and use this extension as the review/sidebar companion plus the reduced Copilot-facing Hive tool surface.

## Requirements

- VS Code 1.80.0 or higher
- A project with `.hive/` folder (created by opencode-hive)

## License

MIT with Commons Clause — Free for personal and non-commercial use. See [LICENSE](../../LICENSE) for details.

---

**Stop vibing. Start hiving.** 🐝
