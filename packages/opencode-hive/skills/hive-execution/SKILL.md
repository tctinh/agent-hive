---
name: hive-execution
description: Execute Hive feature tasks with worktree isolation, parallel orchestration, and clean git history. Use when running synced Hive tasks.
---

# Hive Execution Orchestration

Execute Hive feature tasks with worktree isolation and clean git history. Supports both sequential (single executor) and parallel (multiple executors) workflows.

## When to Use This Skill

- Executing a Hive feature with synced tasks
- Managing worktree lifecycle (create, work, merge, cleanup)
- Ensuring single-commit-per-task on main branch
- Optionally: Running tasks in parallel when multiple executors are available

## Pre-Execution Checklist

Before starting execution, verify:

1. **Feature exists**: `hive_feature_list` shows target feature
2. **Plan approved**: Feature status is `approved` or `executing`
3. **Tasks synced**: `hive_session_open(feature)` shows task list
4. **Base branch clean**: No uncommitted changes in main worktree

## Execution Models

### Sequential Execution (Single Executor)

When running with a single executor, process tasks in order:

```
Task 01 → complete → merge
Task 02 → complete → merge
Task 03 → complete → merge
...
```

Follow task numbering order unless dependencies require otherwise.

### Parallel Execution (Multiple Executors - Optional)

If your environment supports multiple parallel executors, tasks can be organized into **phases** based on dependencies:

```
Phase 0 (start immediately, parallel):
  - Executor A: Task that creates shared infrastructure (BLOCKER)
  - Executor B: Independent task (no dependencies)
  - Executor C: Independent task (no dependencies)

Phase 1 (after Phase 0 blockers merged, parallel):
  - Executor A: Task depending on Phase 0 blocker
  - Executor B: Another dependent task
  - Executor C: Another dependent task

Phase 2 (final gate):
  - Any executor: Verification/integration task
```

### Dependency Rules

When determining execution order (sequential or parallel):

| Dependency Type | Action |
|-----------------|--------|
| **Blocker task** | Must be merged before dependents start |
| **Shared files** | Tasks touching same files = sequential |
| **Independent** | Can run in parallel (if supported) or in any order |

## Task Execution Lifecycle

For EACH task, follow this exact sequence:

### 1. Start Task (creates isolated worktree)

```
hive_exec_start(task="<task-folder-name>")
```

This:
- Creates a git worktree from current base branch
- Sets task status to `in_progress`
- Generates `spec.md` with context from completed tasks

### 2. Implement in Worktree

Work ONLY within the task's worktree directory. The worktree path is returned by `hive_exec_start`.

- Read `spec.md` for task context and acceptance criteria
- Implement changes
- Verify against acceptance criteria
- Run tests/build if applicable

### 3. Complete Task (commits to task branch)

```
hive_exec_complete(task="<task-folder-name>", summary="<what-was-done>")
```

This:
- Commits all changes to the task branch
- Generates `report.md` with diff stats
- Sets task status to `done`
- **Does NOT merge** - worktree preserved

### 4. Merge to Main (squash for clean history)

```
hive_merge(task="<task-folder-name>", strategy="squash")
```

This:
- Squash-merges task branch into current branch
- Results in exactly ONE commit per task on main
- Commit message follows format: `hive(<task>): <summary>`

### 5. Cleanup (optional, recommended)

After successful merge, the worktree can be removed via git:

```bash
git worktree remove .hive/worktrees/<feature>/<task>
git branch -d hive/<feature>/<task>
```

## Scheduling Strategy

### Single Executor (Default)

Execute tasks sequentially in numerical order:

```
1. hive_exec_start → implement → hive_exec_complete → hive_merge
2. Move to next task
3. Repeat until all tasks done
```

Respect dependencies: if Task 05 depends on Task 02, ensure Task 02 is merged before starting Task 05.

### Multiple Executors (Optional Optimization)

If your environment supports parallel execution (e.g., multiple agent sessions, CI runners, or orchestration tools):

1. **Identify blockers**: Tasks that create shared resources others depend on
2. **Group by phase**: Tasks that can run in parallel within each phase
3. **Assign to executors**: Balance workload across available executors
4. **Minimize conflicts**: Avoid assigning tasks touching same files to same phase

#### Example Schedule (3 Executors)

```markdown
## Scheduling (3 executors)

### Phase 0 (start immediately, parallel)
- Executor A: 02-create-shared-helpers (BLOCKER - others depend on this)
- Executor B: 01-update-documentation (independent)  
- Executor C: 08-fix-config-issue (independent)

### Phase 1 (after Task 02 merged, parallel)
- Executor A: 06-feature-using-helpers, then 03-another-feature
- Executor B: 04-related-feature
- Executor C: 07-different-feature

### Phase 2 (final gate)
- Any executor: 09-final-verification
```

> **Note**: Parallel execution is an optimization. The same tasks can always be executed sequentially by a single executor.

## Tool Quick Reference

| Phase | Tool | Purpose |
|-------|------|---------|
| Start | `hive_exec_start(task)` | Create worktree, begin work |
| Work | `hive_subtask_create(task, name, type)` | Break into TDD subtasks |
| Progress | `hive_subtask_update(task, subtask, status)` | Track subtask completion |
| Complete | `hive_exec_complete(task, summary)` | Commit changes to branch |
| Integrate | `hive_merge(task, strategy="squash")` | Merge to main with single commit |
| Abort | `hive_exec_abort(task)` | Discard changes, reset status |
| Status | `hive_worktree_list()` | See all active worktrees |

## Commit Discipline

### Requirements

- **One commit per task on main**: Use `hive_merge(strategy="squash")`
- **Meaningful message**: Reflect the "why" not just "what"
- **Follow conventions**: Check repo's existing commit style

### Commit Message Format

```
hive(<task-folder>): <concise summary of change>

<optional body explaining why this change was needed>
```

## Error Recovery

### Task Failed Mid-Execution

```
hive_exec_abort(task="<task>")  # Discards changes, resets to pending
hive_exec_start(task="<task>")  # Fresh start
```

### Merge Conflicts

If `hive_merge` reports conflicts:

1. Resolve conflicts in the worktree
2. Commit the resolution
3. Run `hive_merge` again OR merge manually

### Blocker Task Failed

If a Phase 0 blocker fails:

1. Do NOT start Phase 1 tasks
2. Fix the blocker
3. Complete and merge blocker
4. THEN start Phase 1

## Verification Gate

Before marking feature complete:

- [ ] All tasks show status `done`
- [ ] All task branches merged to main
- [ ] No orphaned worktrees (`hive_worktree_list` empty or cleaned)
- [ ] Final verification task passed
- [ ] Build passes on main branch

## Example: Full Execution Flow

### Sequential (Single Executor)

```
# 1. Open session to see current state
hive_session_open(feature="my-feature")

# 2. Execute tasks in order
hive_exec_start(task="01-first-task")
# ... implement ...
hive_exec_complete(task="01-first-task", summary="Completed first task")
hive_merge(task="01-first-task", strategy="squash")

hive_exec_start(task="02-second-task")
# ... implement ...
hive_exec_complete(task="02-second-task", summary="Completed second task")
hive_merge(task="02-second-task", strategy="squash")

# Continue for remaining tasks...

# 3. Complete feature
hive_feature_complete(feature="my-feature")
```

### Parallel (Multiple Executors - Optional)

```
# 1. Open session to see current state
hive_session_open(feature="my-feature")

# 2. Phase 0 - Start parallel tasks
# Executor A:
hive_exec_start(task="02-shared-helpers")
# ... implement ...
hive_exec_complete(task="02-shared-helpers", summary="Added shared test helpers module")
hive_merge(task="02-shared-helpers", strategy="squash")

# Executor B (parallel):
hive_exec_start(task="01-update-docs")
# ... implement ...
hive_exec_complete(task="01-update-docs", summary="Updated README with new metrics")
hive_merge(task="01-update-docs", strategy="squash")

# 3. Phase 1 - After blocker merged
# Executor A:
hive_exec_start(task="06-use-helpers")
# ... implement using the helpers from task 02 ...
hive_exec_complete(task="06-use-helpers", summary="Integrated shared helpers in tests")
hive_merge(task="06-use-helpers", strategy="squash")

# 4. Final verification
hive_exec_start(task="09-final-check")
# ... run full test suite, verify everything works ...
hive_exec_complete(task="09-final-check", summary="All tests pass, CI green")
hive_merge(task="09-final-check", strategy="squash")

# 5. Complete feature
hive_feature_complete(feature="my-feature")
```
