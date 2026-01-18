# Task Report: 01-preserve-old-ink-code-as-deprecated

**Feature:** hive-tui-solidjs-rewrite
**Completed:** 2026-01-17T09:44:47.268Z
**Status:** success
**Commit:** 556cf8a43310f3acd2207b7f5d5ec002d5312cb8

---

## Summary

Moved all Ink/React TUI files to src/_deprecated/ (App.tsx, components/, hooks/, views/, utils/). Added README.md explaining deprecation reasons and preserved file structure. Only index.tsx remains in src/ root.

---

## Changes

- **Files changed:** 13
- **Insertions:** +48
- **Deletions:** -0

### Files Modified

- `packages/hive-tui/src/{ => _deprecated}/App.tsx`
- `packages/hive-tui/src/_deprecated/README.md`
- `.../{ => _deprecated}/components/CommentInput.tsx`
- `.../src/{ => _deprecated}/components/Header.tsx`
- `.../{ => _deprecated}/components/ProgressBar.tsx`
- `.../src/{ => _deprecated}/components/TaskList.tsx`
- `.../src/{ => _deprecated}/hooks/useHiveState.ts`
- `.../src/{ => _deprecated}/utils/projectRoot.ts`
- `.../hive-tui/src/{ => _deprecated}/utils/tmux.ts`
- `.../src/{ => _deprecated}/views/Dashboard.tsx`
- `.../src/{ => _deprecated}/views/FeatureSelect.tsx`
- `.../src/{ => _deprecated}/views/PlanViewer.tsx`
- `.../src/{ => _deprecated}/views/SpecViewer.tsx`
