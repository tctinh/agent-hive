# Task Report: 04-integrate-tui-into-existing-hive-tools

**Feature:** hive-tui-single-purpose
**Completed:** 2026-01-17T11:59:44.614Z
**Status:** success
**Commit:** ece98a5494755e449a8218ea7ae6e2eb4e80b819

---

## Summary

Added `show_tui` parameter to hive tools for TUI integration:

**OpenCode Plugin (packages/opencode-hive/src/index.ts):**
- `hive_plan_read`: Added `show_tui` boolean param that spawns Plan Viewer TUI via `spawnTuiPane('plan', feature, projectRoot)`
- `hive_status`: Added `show_tui` boolean param that spawns Task Tracker TUI via `spawnTuiPane('tasks', feature, projectRoot)`

**VSCode Extension:**
- `packages/vscode-hive/src/tools/plan.ts`: Added `show_tui` param with graceful fallback (VSCode doesn't support tmux)
- `packages/vscode-hive/src/tools/status.ts`: Added `show_tui` param with log warning

**Behavior:**
- When `show_tui: true` in tmux: spawns TUI in side pane
- When TUI spawn fails: falls back to JSON output
- In VSCode: warns that TUI not supported, returns normal data

---

## Changes

- **Files changed:** 3
- **Insertions:** +50
- **Deletions:** -4

### Files Modified

- `packages/opencode-hive/src/index.ts`
- `packages/vscode-hive/src/tools/plan.ts`
- `packages/vscode-hive/src/tools/status.ts`
