# Task Report: 04-drop-hiveask

**Feature:** hive-simplify-focus
**Completed:** 2026-01-16T10:02:34.854Z
**Status:** success
**Commit:** f6bdca1594af1dd86f8feabd79727774ebc3edca

---

## Summary

Dropped hive_ask tool and all related code. Removed: ask.ts (129 lines), panels/ (1117 lines), webview/ (341 lines). Cleaned extension.ts (statusBarItem, AskService, hive.showAsk/openQueenPanel commands). Updated hive-core/services/index.ts. Updated opencode-hive docs. Net -1,706 lines.

---

## Changes

- **Files changed:** 10
- **Insertions:** +4
- **Deletions:** -1706

### Files Modified

- `packages/hive-core/src/services/index.ts`
- `packages/opencode-hive/src/index.ts`
- `packages/vscode-hive/src/extension.ts`
- `packages/vscode-hive/src/panels/HiveQueenPanel.ts`
- `packages/vscode-hive/src/panels/types.ts`
- `packages/vscode-hive/src/tools/ask.ts`
- `packages/vscode-hive/src/tools/exec.ts`
- `packages/vscode-hive/src/tools/index.ts`
- `packages/vscode-hive/src/tools/session.ts`
- `packages/vscode-hive/src/webview/hiveQueen.ts`
