---
name: "Execute Approved Hive Plan"
description: "Sync tasks from an approved plan and begin execution."
agent: "hive"
model: "gpt-5.4"
tools:
  - "read"
  - "search"
  - "tctinh.vscode-hive/hivePlanRead"
  - "tctinh.vscode-hive/hiveStatus"
  - "tctinh.vscode-hive/hiveTasksSync"
---

Confirm the plan is approved with hive_plan_read, sync tasks with hive_tasks_sync, then delegate the next runnable task directly to @forager.

Preserve Hive guardrails: follow task dependencies, keep planning and execution separate, and have the worker record progress and completion with hive_task_update rather than worktree or merge flows.

If the work involves browser behavior, web flows, or end-to-end validation, prefer built-in browser tools and Playwright MCP where available instead of inventing extension-only browser helpers.
