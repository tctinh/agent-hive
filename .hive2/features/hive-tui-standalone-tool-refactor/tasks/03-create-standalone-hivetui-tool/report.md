# Task Report: 03-create-standalone-hivetui-tool

**Feature:** hive-tui-standalone-tool-refactor
**Completed:** 2026-01-18T12:44:54.469Z
**Status:** success
**Commit:** fb455caa6eb50c63eaf5cbb36f9d332f6733b3eb

---

## Summary

Updated hive_tui tool to use new single-purpose TUIs:
- Added `mode` parameter: 'plan' | 'tasks' (required)
- 'plan' mode launches Plan Viewer TUI
- 'tasks' mode launches Task Tracker TUI
- Updated keyboard shortcut hints for each mode
- Changed pane width from 60 to 70 columns

---

## Changes

- **Files changed:** 1
- **Insertions:** +27
- **Deletions:** -18

### Files Modified

- `packages/opencode-hive/src/index.ts`
