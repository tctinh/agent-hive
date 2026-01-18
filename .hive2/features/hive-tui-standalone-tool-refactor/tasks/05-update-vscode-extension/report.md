# Task Report: 05-update-vscode-extension

**Feature:** hive-tui-standalone-tool-refactor
**Completed:** 2026-01-18T12:49:36.934Z
**Status:** success
**Commit:** b5103c6975ded80d72fa400a1f9ec8073214049a

---

## Summary

Removed show_tui from VSCode extension tools:
- Removed show_tui property from hive_plan_read inputSchema
- Removed show_tui property from hive_status inputSchema
- Removed TUI warning logic since it's no longer needed
- VSCode tools now only return JSON data (TUI is terminal-only)

---

## Changes

- **Files changed:** 2
- **Insertions:** +2
- **Deletions:** -22

### Files Modified

- `packages/vscode-hive/src/tools/plan.ts`
- `packages/vscode-hive/src/tools/status.ts`
