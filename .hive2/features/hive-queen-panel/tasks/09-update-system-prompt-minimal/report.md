# Task Report: 09-update-system-prompt-minimal

**Feature:** hive-queen-panel
**Completed:** 2026-01-13T19:23:56.999Z
**Status:** success
**Commit:** 586d51bda86c65d334cb16a084dfa65d31389b38

---

## Summary

Updated system prompt with minimal additions:
- Added Ask tools (hive_ask, hive_ask_list_pending) to tool table
- Added hive_session_refresh to Session tools row
- Added "Execution Phase - Stay Aligned" section with guidance:
  - Call hive_session_refresh periodically during execution
  - Check for user steering comments and pending work
  - Use hive_ask for blocking user input
- Build verified: opencode-hive built successfully (0.64 MB)

---

## Changes

- **Files changed:** 1
- **Insertions:** +12
- **Deletions:** -1

### Files Modified

- `packages/opencode-hive/src/index.ts`
