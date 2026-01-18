# Task Report: 01-remove-active-feature-gate

**Feature:** queen-panel-dashboard-mode
**Completed:** 2026-01-15T12:07:40.439Z
**Status:** success
**Commit:** 0256a4b9aad51575db10fdec29e562c03988eb42

---

## Summary

Removed active feature gate in openQueenPanel command. Now calls HiveQueenPanel.showDashboard() when no active feature instead of showing warning.

---

## Changes

- **Files changed:** 3
- **Insertions:** +9
- **Deletions:** -8

### Files Modified

- `packages/vscode-hive/dist/extension.js`
- `packages/vscode-hive/dist/extension.js.map`
- `packages/vscode-hive/src/extension.ts`
