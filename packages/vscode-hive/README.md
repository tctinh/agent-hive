# vscode-hive

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/tctinh.vscode-hive)](https://marketplace.visualstudio.com/items?itemName=tctinh.vscode-hive)
[![License: MIT with Commons Clause](https://img.shields.io/badge/License-MIT%20with%20Commons%20Clause-blue.svg)](../../LICENSE)

**From Vibe Coding to Hive Coding** — The VS Code extension for reviewing and approving AI-generated plans.

## Why Hive?

Your AI writes the plan. You review it. Then it executes. No surprises.

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

### 🚀 OpenCode Integration
Launch tasks directly in OpenCode from the sidebar.

## Usage

### With GitHub Copilot

1. Install [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot) and [Copilot Chat](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat)
2. Copy the [Hive agent file](https://github.com/tctinh/agent-hive/blob/main/docs/Hive.agent.md) to `.github/agents/Hive.agent.md` in your repository
3. Open Copilot Chat (`Cmd/Ctrl+Shift+L`) choose Hive agent and type:
   ```
   I want hive to add user authentication
   ```
4. Copilot will:
   - Create a feature with a detailed plan
   - Wait for your review and approval
   - Execute tasks in isolated git worktrees
   - Generate commits and merge when ready

**Key Features:**
- **Plan-first approach**: AI writes plans, you review before execution
- **23 integrated tools**: From feature creation to merging
- **Parallel execution**: Run multiple tasks at once with sub-agents
- **Persistent context**: Research findings saved across sessions
- **TDD support**: Built-in subtasks for test-driven development

### Standalone Mode (without Copilot)

1. Hive activates when `.hive/` folder exists in your workspace
2. Click the Hive icon in the Activity Bar
3. View features, tasks, and execution progress
4. Open plan.md to add review comments
5. Click "Done Review" when ready to continue

## Commands

| Command | Description |
|---------|-------------|
| Hive: New Feature | Create a new feature |
| Hive: Refresh | Refresh the feature tree |
| View Details | Show feature details |
| View Report | Open feature report |
| Open in OpenCode | Open step in OpenCode |

## GitHub Copilot Setup

### Prerequisites

1. **VS Code 1.100.0 or higher** - Required for LanguageModelTools API
2. **GitHub Copilot** - Install from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot)
3. **GitHub Copilot Chat** - Install from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat)
4. **Hive Extension** - This extension (tctinh.vscode-hive)

### Installation Steps

1. Install the [Hive extension](https://marketplace.visualstudio.com/items?itemName=tctinh.vscode-hive) from VS Code Marketplace
2. Copy the [Hive agent file](https://github.com/tctinh/agent-hive/blob/main/docs/Hive.agent.md) to your repository
3. Open Copilot Chat (`Cmd/Ctrl+Shift+L`) choose the Hive agent    and start building:
   ```
   I want to hive plan add user authentication
   ```

### Agent File

The `.github/agents/Hive.agent.md` file defines how GitHub Copilot should use Hive tools. It includes:

```yaml
---
description: 'Plan-first feature development with isolated worktrees...'
tools: ['vscode', 'execute', 'read', 'edit', 'tctinh.vscode-hive/hiveFeatureCreate', ...]
---
# Your custom instructions here
```

You can customize this file to add your own workflows and preferences.

### Available Tools

| Domain | Tools |
|---------|--------|
| **Feature** | `hiveFeatureCreate`, `hiveFeatureList`, `hiveFeatureComplete` |
| **Plan** | `hivePlanWrite`, `hivePlanRead`, `hivePlanApprove` |
| **Task** | `hiveTasksSync`, `hiveTaskCreate`, `hiveTaskUpdate` |
| **Subtask** | `hiveSubtaskCreate`, `hiveSubtaskUpdate`, `hiveSubtaskList`, `hiveSubtaskSpecWrite`, `hiveSubtaskReportWrite` |
| **Exec** | `hiveExecStart`, `hiveExecComplete`, `hiveExecAbort` |
| **Merge** | `hiveMerge`, `hiveWorktreeList` |
| **Context** | `hiveContextWrite`, `hiveContextRead`, `hiveContextList` |

### Usage Tips

- **Task names**: Use kebab-case or snake_case. Spaces in task names may cause git worktree errors.
- **Context management**: Copilot saves research findings automatically. Check `.hive/features/<name>/context/` for reference.
- **Parallel execution**: Use `runSubagent` for independent tasks. Each sub-agent gets full tool access.
- **Plan review**: Open `plan.md` in VS Code to add comments, then click "Done Review" in the Hive sidebar.
- **Merging**: `hiveExecComplete` commits changes, but you must call `hiveMerge` to integrate.

### Troubleshooting

**Issue**: Copilot doesn't recognize Hive tools
- **Solution**: Verify `.github/agents/Hive.agent.md` exists and has valid YAML frontmatter with correct tool names.

**Issue**: "Invalid reference" error when starting task
- **Solution**: Task names with spaces may cause git worktree errors. Use kebab-case (e.g., `user-auth` instead of `User Authentication`).

**Issue**: Tools not available in Copilot Chat
- **Solution**: Ensure both GitHub Copilot and Copilot Chat extensions are installed and activated. Restart VS Code if needed.

## Pair with OpenCode

For the full workflow, install [opencode-hive](https://www.npmjs.com/package/opencode-hive) plugin.

## Requirements

- VS Code 1.80.0 or higher
- A project with `.hive/` folder (created by opencode-hive)

## License

MIT with Commons Clause — Free for personal and non-commercial use. See [LICENSE](../../LICENSE) for details.

---

**Stop vibing. Start hiving.** 🐝
