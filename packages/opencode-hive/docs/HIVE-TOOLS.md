# Hive Tools Inventory

## Tools (18 total)

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
| `hive_exec_start` | Create worktree and begin work |
| `hive_exec_complete` | Commit changes, write report (does NOT merge) |
| `hive_exec_abort` | Discard changes, reset status |

#### hive_exec_start output

- `workerPromptPath`: file path to `.hive/features/<feature>/tasks/<task>/worker-prompt.md`
- `workerPromptPreview`: short preview of the prompt
- `promptMeta`, `payloadMeta`, `budgetApplied`, `warnings`: size and budget observability

Delegation uses `background_task` with `promptFile` pointing at `workerPromptPath` to avoid inlining large prompts.

### Merge (2 tools)
| Tool | Purpose |
|------|---------|
| `hive_merge` | Merge task branch (strategies: merge/squash/rebase) |
| `hive_worktree_list` | List all worktrees for feature |

### Context (1 tool)
| Tool | Purpose |
|------|---------|
| `hive_context_write` | Write context file |

### Status (1 tool)
| Tool | Purpose |
|------|---------|
| `hive_status` | Get comprehensive feature status as JSON |

### Review (1 tool)
| Tool | Purpose |
|------|---------|
| `hive_request_review` | Request human review |

### Steering (1 tool)
| Tool | Purpose |
|------|---------|
| `hive_steering` | Get steering comments from VSCode sidebar |

---

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
