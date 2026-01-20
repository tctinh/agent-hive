---
name: hive-execution
description: Execute Hive feature tasks with worktree isolation, parallel orchestration, and clean git history. Use when running synced Hive tasks.
---

# Hive Execution

Quick reference for executing Hive tasks.

## Workflow Summary

1. **Feature create** → Discovery guide injected
2. **Discovery** → Q&A documented in plan.md
3. **Plan write** → GATE: requires ## Discovery section
4. **Approval** → User reviews in VS Code
5. **Exec start** → Delegation guide (Master), TDD+debugging (Worker)
6. **Complete** → GATE: requires verification mention
7. **Merge** → Squash into feature branch

## Gates

| Tool | Gate | Error |
|------|------|-------|
| hive_plan_write | ## Discovery section | "BLOCKED: Discovery required" |
| hive_exec_complete | Verification in summary | "BLOCKED: No verification" |

## Task Lifecycle

```
hive_exec_start(task)      # Creates worktree
  ↓
[implement in worktree]
  ↓
hive_exec_complete(task, summary)  # Commits to branch
  ↓
hive_merge(task, strategy: "squash")  # Integrates to main
```

## Quick Reference

| Tool | Purpose |
|------|---------|
| hive_status | Check overall progress |
| hive_worker_status | Check delegated workers |
| hive_exec_abort | Discard changes, restart |
| hive_merge | Integrate completed task |
| hive_worktree_list | See active worktrees |

## Error Recovery

### Task Failed
```
hive_exec_abort(task)  # Discards changes
hive_exec_start(task)  # Fresh start
```

### Merge Conflicts
1. Resolve conflicts in worktree
2. Commit resolution
3. Run hive_merge again
