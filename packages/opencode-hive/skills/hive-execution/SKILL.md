---
name: hive-execution
description: Execute Hive feature tasks with worktree isolation, parallel orchestration, and clean git history. Use when running synced Hive tasks.
---

# Hive Execution

Quick reference for executing Hive tasks (Receiver Mode).

## Architecture

```
@hive (Receiver Mode)
      │
      ▼
hive_exec_start ──► Forager Worker (isolated worktree)
      │                    │
      │                    ▼
      │              MCP tools (research)
      │                    │
      │                    ▼
      │              hive_exec_complete
      ▼
hive_merge ──► Main branch
```

---

## Workflow Summary

1. **Tasks sync** → Generate from approved plan
2. **Exec start** → Creates worktree, spawns Forager automatically
3. **Worker executes** → Implements, verifies, reports
4. **Complete** → GATE: requires verification mention
5. **Merge** → Squash into feature branch

---

## Task Lifecycle

```
hive_exec_start({ task })           # Creates worktree, spawns Forager
  ↓
[Forager implements in worktree]
  ↓
hive_exec_complete({ task, summary, status })  # Commits to branch
  ↓
hive_merge({ task, strategy: "squash" })  # Integrates to main
```

---

## Parallel Execution (Swarming)

For parallelizable tasks:

```
hive_exec_start({ task: "02-task-a" })
hive_exec_start({ task: "03-task-b" })
hive_exec_start({ task: "04-task-c" })

hive_worker_status()  # Monitor all
```

---

## Blocker Handling

### Quick Decision

```
hive_worker_status()  # Get blocker details
→ Ask user via question tool
→ hive_exec_start({ task, continueFrom: "blocked", decision: "..." })
```

### Plan Gap (Replan)

If blocker suggests plan is incomplete:

1. Ask user: Revise Plan / Quick Fix / Abort
2. If revise:
   ```
   hive_exec_abort({ task })
   hive_context_write({ name: "learnings", content: "..." })
   hive_plan_write({ content: "..." })  // Updated plan
   ```
3. Wait for re-approval, then `hive_tasks_sync()`

---

## Research During Execution

Workers use MCP tools for research:

```
grep_app_searchGitHub({ query: "usage pattern", language: ["TypeScript"] })
context7_query-docs({ libraryId: "/...", query: "API usage" })
```

---

## Gates

| Tool | Gate | Error |
|------|------|-------|
| hive_plan_write | ## Discovery section | "BLOCKED: Discovery required" |
| hive_exec_complete | Verification in summary | "BLOCKED: No verification" |

---

## Tool Reference

| Tool | Purpose |
|------|---------|
| hive_status | Check overall progress + phase |
| hive_tasks_sync | Generate tasks from plan |
| hive_exec_start | Spawn Forager worker |
| hive_exec_complete | Mark task done |
| hive_exec_abort | Discard changes, restart |
| hive_worker_status | Check workers/blockers |
| hive_merge | Integrate to main |
| hive_worktree_list | See active worktrees |
| grep_app_searchGitHub | Find code in OSS |
| context7_query-docs | Library documentation |

---

## Error Recovery

### Task Failed
```
hive_exec_abort({ task })  # Discards changes
hive_exec_start({ task })  # Fresh start
```

### After 3 Failures
1. Stop all workers
2. Use MCP tools to research the problem
3. Ask user how to proceed

### Merge Conflicts
1. Resolve conflicts in worktree
2. Commit resolution
3. Run `hive_merge` again
