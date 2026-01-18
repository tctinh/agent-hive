# Task Report: 04-remove-showtui-from-existing-tools

**Feature:** hive-tui-standalone-tool-refactor
**Completed:** 2026-01-18T12:48:26.873Z
**Status:** success
**Commit:** be5241edb17276636a63e9533abf87670427da46

---

## Summary

Removed show_tui parameter from hive_plan_read and hive_status:
- Removed show_tui arg from both tools
- Removed TUI spawn logic from both tools
- Cleaned up the inlined dynamic import
- Users should now use hive_tui(mode, feature) to launch TUIs explicitly

---

## Changes

- **Files changed:** 1
- **Insertions:** +2
- **Deletions:** -26

### Files Modified

- `packages/opencode-hive/src/index.ts`
