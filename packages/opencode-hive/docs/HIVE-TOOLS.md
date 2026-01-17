# Hive Tools Inventory

## Tools (19 total)

### Feature Management (3 tools)
| Tool | Purpose |
|------|---------|
| `hive_feature_create` | Create new feature, set as active |
| `hive_feature_list` | List all features |
| `hive_feature_complete` | Mark feature completed (irreversible) |

### Plan Management (3 tools)
| Tool | Purpose |
|------|---------|
| `hive_plan_write` | Write plan.md (clears comments) |
| `hive_plan_read` | Read plan.md and user comments |
| `hive_plan_approve` | Approve plan for execution |

### Task Management (3 tools)
| Tool | Purpose |
|------|---------|
| `hive_tasks_sync` | Generate tasks from approved plan (parses ### headers) |
| `hive_task_create` | Create manual task (not from plan) |
| `hive_task_update` | Update task status or summary |

### Execution (3 tools)
| Tool | Purpose |
|------|---------|
| `hive_exec_start` | Create worktree and begin work. With OMO-Slim: spawns delegated worker |
| `hive_exec_complete` | Commit changes, write report (does NOT merge) |
| `hive_exec_abort` | Discard changes, reset status |

### Merge (2 tools)
| Tool | Purpose |
|------|---------|
| `hive_merge` | Merge task branch (strategies: merge/squash/rebase) |
| `hive_worktree_list` | List all worktrees for feature |

### Context (1 tool)
| Tool | Purpose |
|------|---------|
| `hive_context_write` | Write context file |

### Status (2 tools)
| Tool | Purpose |
|------|---------|
| `hive_status` | Get comprehensive feature status as JSON |
| `hive_worker_status` | Check delegated worker status (OMO-Slim integration) |

### Review (1 tool)
| Tool | Purpose |
|------|---------|
| `hive_request_review` | Request human review |

### Steering (1 tool)
| Tool | Purpose |
|------|---------|
| `hive_steering` | Get steering comments from VSCode sidebar |

---

## OMO-Slim Integration

When `oh-my-opencode-slim` is installed alongside Hive, additional capabilities are unlocked:

### Delegated Execution Mode

| Without OMO-Slim | With OMO-Slim |
|------------------|---------------|
| `hive_exec_start` creates worktree, you work inline | `hive_exec_start` spawns a worker agent in tmux pane |
| Single agent works on task | Specialized agents (explore, frontend, etc.) |
| No visibility into progress | Watch workers in real-time |
| Manual human-in-the-loop | `question` tool for decisions |

### Worker Agents

Hive auto-selects the right agent based on task content:

| Pattern | Agent |
|---------|-------|
| test, spec, coverage | `explore` |
| ui, component, react | `frontend-ui-ux-engineer` |
| doc, readme, comment | `document-writer` |
| refactor, simplify | `code-simplicity-reviewer` |
| research, investigate | `librarian` |
| image, visual, design | `multimodal-looker` |
| architecture, strategy | `oracle` |
| (default) | `general` |

### Checkpoint Protocol

Workers write CHECKPOINT files for major decisions:

```
REASON: About to commit authentication changes
STATUS: Implemented JWT refresh, added tests
NEXT: Commit and move to API routes
DECISION_NEEDED: no
```

Use `hive_worker_status` to check for checkpoints.

## Removed Tools

| Tool | Reason |
|------|--------|
| `hive_subtask_*` (5 tools) | Subtask complexity not needed, use todowrite instead |
| `hive_session_*` (2 tools) | Replaced by `hive_status` |
| `hive_context_read` | Agents can read files directly |
| `hive_context_list` | Agents can use glob/Read |

---

## Tool Categories Summary

| Category | Count | Tools |
|----------|-------|-------|
| Feature | 3 | create, list, complete |
| Plan | 3 | write, read, approve |
| Task | 3 | sync, create, update |
| Exec | 3 | start, complete, abort |
| Merge | 2 | merge, worktree_list |
| Context | 1 | write |
| Status | 1 | status |
| Review | 1 | request_review |
| Steering | 1 | steering |
| **Total** | **18** | |
