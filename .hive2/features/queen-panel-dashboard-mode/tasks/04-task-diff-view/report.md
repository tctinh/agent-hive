# Task Report: 04-task-diff-view

**Feature:** queen-panel-dashboard-mode
**Completed:** 2026-01-15T12:12:58.913Z
**Status:** success
**Commit:** 060b745dcd9ce71673b8ea8a13f1a9ec2d41f907

---

## Summary

Added hive.viewTaskDiff command that opens the task's worktree folder in a new VS Code window. Uses WorktreeService.get() to find the worktree path.

---

## Changes

- **Files changed:** 3
- **Insertions:** +33
- **Deletions:** -6

### Files Modified

- `packages/vscode-hive/dist/extension.js`
- `packages/vscode-hive/dist/extension.js.map`
- `packages/vscode-hive/src/extension.ts`
