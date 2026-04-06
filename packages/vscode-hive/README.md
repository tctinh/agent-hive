# vscode-hive

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/tctinh.vscode-hive)](https://marketplace.visualstudio.com/items?itemName=tctinh.vscode-hive)
[![License: MIT with Commons Clause](https://img.shields.io/badge/License-MIT%20with%20Commons%20Clause-blue.svg)](../../LICENSE)

**From Vibe Coding to Hive Coding** — The VS Code companion for reviewing, commenting on, and approving Hive work.

## Why Hive?

OpenCode runs the work. This extension keeps the plan, comments, approvals, and feature status close to your editor.

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

### 🚀 OpenCode Companion
Launch the active step in OpenCode from the sidebar without losing review context.

## Usage

### Review a Hive feature

1. Create or open a repository that already has `.hive/` output from `opencode-hive`
2. Click the Hive icon in the Activity Bar
3. Open `context/overview.md` first for the branch summary/history
4. Open `plan.md` to add comments and review the execution contract
5. Click **Done Review** when the branch summary and plan are aligned
6. Use **Open in OpenCode** when you want to continue execution from the active step

### What this extension is for in `1.4.0`

- **Plan-first review**: inspect overview + plan before execution continues
- **Sidebar visibility**: features, tasks, status, and reports in one place
- **Inline comments**: discuss changes directly in `plan.md`
- **OpenCode handoff**: jump from the review surface back to the supported execution harness

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
- **Context management**: Check `.hive/features/<name>/context/` for reference; `overview.md` is reserved, while files like `decisions.md` or `architecture.md` are optional examples.
- **Plan review**: Open `context/overview.md` first, then `plan.md`; `plan.md` remains execution truth and can still contain a readable design summary before `## Tasks`.
- **OpenCode execution**: use the sidebar action to jump back into OpenCode for implementation work.

### Troubleshooting

**Issue**: "Invalid reference" error when starting task
- **Solution**: Task names with spaces may cause git worktree errors. Use kebab-case (e.g., `user-auth` instead of `User Authentication`).

## Pair with OpenCode

For the supported workflow, install [opencode-hive](https://www.npmjs.com/package/opencode-hive) and use this extension as the review/sidebar companion.

## Requirements

- VS Code 1.80.0 or higher
- A project with `.hive/` folder (created by opencode-hive)

## License

MIT with Commons Clause — Free for personal and non-commercial use. See [LICENSE](../../LICENSE) for details.

---

**Stop vibing. Start hiving.** 🐝
