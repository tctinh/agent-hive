---
name: plan-first
description: Use the Hive plan-first workflow when work in this repository spans multiple steps, review checkpoints, or cross-file changes.
---

Use the bundled Hive MCP tools as the source of truth for workflow state.

## Core Rules

- Start with `mcp__hive__status` to detect the active feature and phase.
- If no feature exists, create one with `mcp__hive__feature_create` before writing a plan.
- Write or revise plans with `mcp__hive__plan_write`.
- Do not start implementation until the user approves the plan and `mcp__hive__plan_approve` has been called.
- Before execution, call `mcp__hive__tasks_sync`.
- Start runnable tasks with `mcp__hive__worktree_start`.
- Finish task work with `mcp__hive__worktree_commit`, then integrate explicitly with `mcp__hive__merge`.
- Create append-only follow-up work with `mcp__hive__task_create` when the work should not force a plan rewrite.
- Keep progress current with `mcp__hive__task_update`.
- Write durable notes through `mcp__hive__context_write`.

## Preferred Agent Roles

- `hive:architect-planner` for planning and scoping
- `hive:scout-researcher` for repository discovery
- `hive:forager-worker` for implementation in worktree isolation
- `hive:hygienic-reviewer` for quality review and verification

## Important Constraint

Treat `.hive` as managed state. If a Hive MCP tool exists for the action, use it instead of hand-editing Hive metadata files.