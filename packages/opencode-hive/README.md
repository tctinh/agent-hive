# opencode-hive

[![npm version](https://img.shields.io/npm/v/opencode-hive)](https://www.npmjs.com/package/opencode-hive)
[![License: MIT with Commons Clause](https://img.shields.io/badge/License-MIT%20with%20Commons%20Clause-blue.svg)](../../LICENSE)

**From Vibe Coding to Hive Coding** — The OpenCode plugin that brings structure to AI-assisted development.

## Why Hive?

Stop losing context. Stop repeating decisions. Start shipping with confidence.

```
Vibe: "Just make it work"
Hive: Plan → Review → Approve → Execute → Ship
```

## Installation

```bash
npm install opencode-hive
```

## Optional: Enable MCP Research Tools

1. Create `.opencode/mcp-servers.json` using the template:
   - From this repo: `packages/opencode-hive/templates/mcp-servers.json`
   - Or from npm: `node_modules/opencode-hive/templates/mcp-servers.json`
2. Set `EXA_API_KEY` to enable `websearch_exa` (optional).
3. Restart OpenCode.

This enables tools like `grep_app_searchGitHub`, `context7_query-docs`, `websearch_web_search_exa`, and `ast_grep_search`.

## The Workflow

1. **Create Feature** — `hive_feature_create("dark-mode")`
2. **Write Plan** — AI generates structured plan
3. **Review** — You review in VS Code, add comments
4. **Approve** — `hive_plan_approve()`
5. **Execute** — Tasks run in isolated git worktrees
6. **Ship** — Clean commits, full audit trail

## Tools

### Feature Management
| Tool | Description |
|------|-------------|
| `hive_feature_create` | Create a new feature |
| `hive_feature_list` | List all features |
| `hive_feature_complete` | Mark feature as complete |

### Planning
| Tool | Description |
|------|-------------|
| `hive_plan_write` | Write plan.md |
| `hive_plan_read` | Read plan and comments |
| `hive_plan_approve` | Approve plan for execution |

### Tasks
| Tool | Description |
|------|-------------|
| `hive_tasks_sync` | Generate tasks from plan |
| `hive_task_create` | Create manual task |
| `hive_task_update` | Update task status/summary |

### Execution
| Tool | Description |
|------|-------------|
| `hive_exec_start` | Start work on task (creates worktree) |
| `hive_exec_complete` | Complete task (applies changes) |
| `hive_exec_abort` | Abort task (discard changes) |

## Plan Format

```markdown
# Feature Name

## Overview
What we're building and why.

## Tasks

### 1. Task Name
Description of what to do.

### 2. Another Task
Description.
```

## Pair with VS Code

For the full experience, install [vscode-hive](https://marketplace.visualstudio.com/items?itemName=tctinh.vscode-hive) to review plans inline with comments.

## License

MIT with Commons Clause — Free for personal and non-commercial use. See [LICENSE](../../LICENSE) for details.

---

**Stop vibing. Start hiving.** 🐝
