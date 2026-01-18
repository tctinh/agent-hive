# Task Report: 07-add-tmux-utilities-and-hivetui-tool

**Feature:** hive-tmux-integration
**Completed:** 2026-01-17T08:58:45.103Z
**Status:** success
**Commit:** 65e28bcaf38d06c9381b17fef8654f86ed8d89df

---

## Summary

Added tmux utilities (packages/hive-tui/src/utils/tmux.ts) with isInsideTmux, isTmuxAvailable, spawnTuiPane, closeTuiPane, getManualCommand functions. Added hive_tui tool to opencode-hive that auto-spawns TUI in tmux pane or returns manual command. Updated HIVE_SYSTEM_PROMPT to include TUI tool. Both packages build successfully.

---

## Changes

- **Files changed:** 2
- **Insertions:** +157
- **Deletions:** -1

### Files Modified

- `packages/hive-tui/src/utils/tmux.ts`
- `packages/opencode-hive/src/index.ts`
