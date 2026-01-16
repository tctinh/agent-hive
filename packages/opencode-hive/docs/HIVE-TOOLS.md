# Hive Tools & Skills Inventory

## Tools (25 total)

### Feature Management (3 tools) - KEEP
| Tool | Purpose |
|------|---------|
| `hive_feature_create` | Create new feature, set as active |
| `hive_feature_list` | List all features |
| `hive_feature_complete` | Mark feature completed (irreversible) |

### Plan Management (3 tools) - KEEP
| Tool | Purpose |
|------|---------|
| `hive_plan_write` | Write plan.md (clears comments) |
| `hive_plan_read` | Read plan.md and user comments |
| `hive_plan_approve` | Approve plan for execution |

### Task Management (3 tools) - KEEP
| Tool | Purpose |
|------|---------|
| `hive_tasks_sync` | Generate tasks from approved plan (parses ### headers) |
| `hive_task_create` | Create manual task (not from plan) |
| `hive_task_update` | Update task status or summary |

### Subtask Management (5 tools) - KEEP
| Tool | Purpose |
|------|---------|
| `hive_subtask_create` | Create subtask (types: test/implement/review/verify/research/debug/custom) |
| `hive_subtask_update` | Update subtask status |
| `hive_subtask_list` | List subtasks for a task |
| `hive_subtask_spec_write` | Write spec.md for subtask |
| `hive_subtask_report_write` | Write report.md for subtask |

### Execution (3 tools) - KEEP
| Tool | Purpose |
|------|---------|
| `hive_exec_start` | Create worktree and begin work |
| `hive_exec_complete` | Commit changes, write report (does NOT merge) |
| `hive_exec_abort` | Discard changes, reset status |

### Merge (2 tools) - KEEP
| Tool | Purpose |
|------|---------|
| `hive_merge` | Merge task branch (strategies: merge/squash/rebase) |
| `hive_worktree_list` | List all worktrees for feature |

### Context (3 tools) - KEEP
| Tool | Purpose |
|------|---------|
| `hive_context_write` | Write context file |
| `hive_context_read` | Read specific or all context |
| `hive_context_list` | List context files |

### Session (2 tools) - KEEP
| Tool | Purpose |
|------|---------|
| `hive_session_open` | Open session, return full context |
| `hive_session_list` | List all sessions for feature |

### Ask (2 tools) - REMOVE
| Tool | Purpose | Removal Reason |
|------|---------|----------------|
| `hive_ask` | Blocking question with timeout | Uses Queen Panel. Use OpenCode `question` tool instead. |
| `hive_ask_list_pending` | List pending asks | Dependent on hive_ask |

---

## Skills (7 total)

### hive-core/templates/skills/ (4 files)
| Skill | Purpose | Action |
|-------|---------|--------|
| `hive-workflow.md` | Overall Hive workflow | CONSOLIDATE into `hive.md` |
| `hive-planning.md` | Planning phase guidance | CONSOLIDATE into `hive.md` |
| `hive-execution.md` | Execution phase guidance | CONSOLIDATE into `hive.md` |
| `copilot-agent.md` | Copilot-specific instructions | KEEP separate |

### opencode-hive/templates/skills/ (3 files)
| Skill | Purpose | Action |
|-------|---------|--------|
| `step-log.md` | Step logging format | REVIEW - may consolidate |
| `plan.md` | Plan format template | REVIEW - may consolidate |
| `decision.md` | Decision log format | REVIEW - may consolidate |

---

## Summary

### Keep (23 tools)
All tools except ask-related ones.

### Remove (2 tools)
- `hive_ask`
- `hive_ask_list_pending`

### Consolidate (3 skills → 1)
- `hive-workflow.md` + `hive-planning.md` + `hive-execution.md` → `hive.md`

### Keep Separate
- `copilot-agent.md`

---

## Post-Simplification Tool Count

**Before**: 25 tools, 7 skills
**After**: 23 tools, 5 skills (or 2 if opencode-hive skills also consolidated)
