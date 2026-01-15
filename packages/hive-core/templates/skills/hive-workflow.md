---
name: hive-workflow
description: Plan-first AI development with isolated git worktrees and human review. Use for any feature development.
---

# Hive Workflow

You are working in a Hive-enabled repository. Follow this plan-first workflow.

## Lifecycle

```
Feature -> Plan -> Review -> Approve -> Execute -> Merge -> Complete
```

## Phase 1: Planning

1. `hive_feature_create({ name: "feature-name" })` - Creates feature directory
2. Research the codebase, understand what needs to change
3. Save findings with `hive_context_write({ name: "research", content: "..." })`
4. Write the plan:
   ```
   hive_plan_write({ content: `# Feature Name

   ## Overview
   What we're building and why.

   ## Tasks

   ### 1. First Task
   Description of what to do.

   ### 2. Second Task
   Description of what to do.
   `})
   ```
5. **STOP** and tell user: "Plan written. Please review in VS Code."

## Phase 2: Review (Human)

- User reviews plan.md in VS Code
- User can add comments (appear as `> User: comment`)
- Use `hive_plan_read()` to see user comments
- Revise plan based on feedback
- User clicks "Approve" when ready

## Phase 3: Execution

After user approves:

1. `hive_tasks_sync()` - Generates tasks from `### N. Task Name` headers
2. For each task in order:
   ```
   hive_exec_start({ task: "01-task-name" })
   # Implement in isolated worktree
   hive_exec_complete({ task: "01-task-name", summary: "What was done" })
   hive_merge({ task: "01-task-name", strategy: "squash" })
   ```

## Phase 4: Completion

After all tasks merged:
```
hive_feature_complete({ name: "feature-name" })
```

## Rules

1. **Never skip planning** - Always write plan first
2. **Context is critical** - Save all research with `hive_context_write`
3. **Wait for approval** - Don't execute until user approves
4. **One task at a time** - Complete and merge before starting next
5. **Squash merges** - Keep history clean with single commit per task

## Tool Reference

| Phase | Tool | Purpose |
|-------|------|---------|
| Plan | `hive_feature_create` | Start new feature |
| Plan | `hive_plan_write` | Write the plan |
| Plan | `hive_plan_read` | Check for user comments |
| Plan | `hive_context_write` | Save research findings |
| Execute | `hive_tasks_sync` | Generate tasks from plan |
| Execute | `hive_exec_start` | Start task (creates worktree) |
| Execute | `hive_exec_complete` | Finish task (commits changes) |
| Execute | `hive_merge` | Integrate task to main |
| Complete | `hive_feature_complete` | Mark feature done |

## Example

User: "Add dark mode support"

```
1. hive_feature_create({ name: "dark-mode" })
2. Research: grep for theme, colors, CSS variables
3. hive_context_write({ name: "research", content: "Found theme in src/theme/..." })
4. hive_plan_write({ content: "# Dark Mode\n\n## Tasks\n\n### 1. Add theme context..." })
5. Tell user: "Plan ready for review"
6. [User reviews and approves]
7. hive_tasks_sync()
8. For each task: exec_start -> implement -> exec_complete -> merge
9. hive_feature_complete({ name: "dark-mode" })
```
