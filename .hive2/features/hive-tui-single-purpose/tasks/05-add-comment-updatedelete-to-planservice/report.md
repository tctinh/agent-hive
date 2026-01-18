# Task Report: 05-add-comment-updatedelete-to-planservice

**Feature:** hive-tui-single-purpose
**Completed:** 2026-01-17T12:01:18.636Z
**Status:** success
**Commit:** 650d58ca7fb72d5ebc845b34748e6448b9808037

---

## Summary

Added update and delete methods to PlanService for comment CRUD:

**New Methods in packages/hive-core/src/services/planService.ts:**

1. `updateComment(featureName, commentId, body)`:
   - Finds comment by ID and updates its body
   - Updates timestamp on edit
   - Returns updated PlanComment or null if not found

2. `deleteComment(featureName, commentId)`:
   - Removes comment by ID from threads array
   - Returns true if deleted, false if not found

Both methods read/write to comments.json file via existing path utilities.

---

## Changes

- **Files changed:** 1
- **Insertions:** +34
- **Deletions:** -0

### Files Modified

- `packages/hive-core/src/services/planService.ts`
