# Task Report: 06-deprecate-old-multi-view-tui

**Feature:** hive-tui-single-purpose
**Completed:** 2026-01-17T12:02:48.857Z
**Status:** success
**Commit:** 04576a4df09ad1d8f9ff20417fd011c650b6494c

---

## Summary

Deprecated old multi-view TUI and updated entry point:

**Changes:**
1. Moved old files to `src/_deprecated/`:
   - `views/` → `views-old/`
   - `components/` → `components-old/`
   - `hooks/` → `hooks-old/`
   - `context/` → `context/`
   - `app.tsx` → `app-multi-view.tsx`

2. Updated `src/index.tsx` as new launcher:
   - `hive-tui plan <feature>` → Plan Viewer TUI
   - `hive-tui tasks <feature>` → Task Tracker TUI
   - Old usage shows deprecation warning with migration instructions

3. Updated `_deprecated/README.md`:
   - Documents why multi-view was deprecated
   - Points to new single-purpose TUIs
   - Notes both OpenTUI multi-view and old Ink/React versions

---

## Changes

- **Files changed:** 15
- **Insertions:** +84
- **Deletions:** -62

### Files Modified

- `packages/hive-tui/src/_deprecated/README.md`
- `.../{app.tsx => _deprecated/app-multi-view.tsx}`
- `.../components-old}/header.tsx`
- `.../components-old}/index.ts`
- `.../components-old}/progress-bar.tsx`
- `.../components-old}/task-list.tsx`
- `.../src/{ => _deprecated}/context/helper.tsx`
- `.../src/{ => _deprecated}/context/hive.tsx`
- `.../src/{hooks => _deprecated/hooks-old}/index.ts`
- `.../hooks-old}/use-hive-watcher.ts`
- `.../{views => _deprecated/views-old}/dashboard.tsx`
- `.../views-old}/feature-select.tsx`
- `.../views-old}/plan-viewer.tsx`
- `.../views-old}/spec-viewer.tsx`
- `packages/hive-tui/src/index.tsx`
