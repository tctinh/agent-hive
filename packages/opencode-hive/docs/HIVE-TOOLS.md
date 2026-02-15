# Hive Tools Inventory

## Tools (14 total)

### Feature Management (2 tools)
| Tool | Purpose |
|------|---------|
| `hive_feature_create` | Create new feature, set as active |
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

### Worktree (3 tools)
| Tool | Purpose |
|------|---------|
| `hive_worktree_create` | Create worktree and begin work |
| `hive_worktree_commit` | Commit changes, write report (does NOT merge), return JSON completion contract |
| `hive_worktree_discard` | Discard changes, reset status |

#### hive_worktree_commit output

- Always returns JSON with control-flow fields:
  - `ok`: whether the operation succeeded
  - `terminal`: whether worker should stop (`true`) or continue (`false`)
  - `status`: completion status (`completed`, `blocked`, `failed`, `partial`) or error/rejected state
  - `taskState`: resulting persisted task state
  - `nextAction`: explicit next step for worker/orchestrator
- Non-terminal responses (for example `reason: "verification_required"`) require worker remediation and retry.

#### hive_worktree_create output

- `workerPromptPath`: file path to `.hive/features/<feature>/tasks/<task>/worker-prompt.md`
- `workerPromptPreview`: short preview of the prompt
- `promptMeta`, `payloadMeta`, `budgetApplied`, `warnings`: size and budget observability

### Merge (1 tool)
| Tool | Purpose |
|------|---------|
| `hive_merge` | Merge task branch (strategies: merge/squash/rebase) |

### Context (1 tool)
| Tool | Purpose |
|------|---------|
| `hive_context_write` | Write context file |

### Status (1 tool)
| Tool | Purpose |
|------|---------|
| `hive_status` | Get comprehensive feature status as JSON |

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
| Feature | 2 | create, complete |
| Plan | 3 | write, read, approve |
| Task | 3 | sync, create, update |
| Worktree | 3 | create, commit, discard |
| Merge | 1 | merge |
| Context | 1 | write |
| Status | 1 | status |
| Steering | 1 | steering |
| **Total** | **14** | |
