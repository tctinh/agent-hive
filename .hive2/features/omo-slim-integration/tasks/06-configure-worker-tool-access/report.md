# Task Report: 06-configure-worker-tool-access

**Feature:** omo-slim-integration
**Completed:** 2026-01-17T05:50:11.930Z
**Status:** success
**Commit:** b1e5ea016bd7cb9dedb0535eaeee713e91158506

---

## Summary

Created worker-tools.ts config defining WORKER_ALLOWED_TOOLS (question, hive_exec_complete, hive_exec_abort, etc.) and WORKER_DENIED_TOOLS (hive_exec_start, background_task, hive_merge, etc.). Added isToolAllowedForWorker(), getWorkerToolConfig(), and generateToolAccessDoc() helpers.

---

## Changes

- **Files changed:** 2
- **Insertions:** +122
- **Deletions:** -0

### Files Modified

- `packages/opencode-hive/src/config/index.ts`
- `packages/opencode-hive/src/config/worker-tools.ts`
