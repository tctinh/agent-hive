---
description: Start or continue the Hive plan-first workflow in this repository
argument-hint: [feature request]
---

# Hive Start

Use the bundled Hive MCP tools to manage `.hive` state instead of editing Hive metadata files directly.

## Workflow

1. Call `mcp__hive__status` first to determine whether there is an active feature and whether the current feature is still planning or already executing.
2. If there is no active feature and the user supplied a request in `$ARGUMENTS`, derive a short kebab-case feature name and call `mcp__hive__feature_create`.
3. If the active feature has no approved plan, switch into planning mode:
   - research the codebase,
   - write the feature plan through `mcp__hive__plan_write`,
   - summarize the proposed implementation,
   - ask for approval before implementation.
4. If the plan is approved but tasks have not been generated yet, call `mcp__hive__tasks_sync`.
5. If execution is active and a task is runnable, start it with `mcp__hive__worktree_start`.
6. Use the plugin agents when specialization helps:
   - `hive:architect-planner` for plan creation and revision
   - `hive:scout-researcher` for bounded read-only discovery
   - `hive:forager-worker` for isolated implementation work
   - `hive:hygienic-reviewer` for plan or code review
7. Close implementation work with `mcp__hive__worktree_commit`. Merge only after the task is done by calling `mcp__hive__merge`.
8. Keep task progress current with `mcp__hive__task_update` and re-check state with `mcp__hive__status` after major transitions.
9. End each substantial turn by stating the current Hive phase and the next action.

## Arguments

User request: $ARGUMENTS