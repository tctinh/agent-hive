# Task Report: 03-create-worker-prompt-template

**Feature:** omo-slim-integration
**Completed:** 2026-01-17T05:44:39.193Z
**Status:** success
**Commit:** 1bbe9ab3fe0b854733e98750d96b4b13dc10cd08

---

## Summary

Created worker-prompt.ts template with buildWorkerPrompt() that injects full context (feature, task, worktree, plan, context files), documents question tool protocol for human-in-the-loop, checkpoint protocol for major pauses, and completion protocol (hive_exec_complete/abort).

---

## Changes

- **Files changed:** 2
- **Insertions:** +206
- **Deletions:** -0

### Files Modified

- `packages/opencode-hive/src/templates/index.ts`
- `.../opencode-hive/src/templates/worker-prompt.ts`
