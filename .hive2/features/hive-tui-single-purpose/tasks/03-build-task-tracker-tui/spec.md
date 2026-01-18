# Task: 03-build-task-tracker-tui

## Feature: hive-tui-single-purpose

## Completed Tasks

- 01-create-shared-infrastructure: Created shared infrastructure for single-purpose TUIs:

**shared/hooks/**
- `use-file-watcher.ts` - Chokidar-based file watcher that monitors .hive/features/<feature>/ and returns refreshKey signal

**shared/utils/**
- `tmux.ts` - Tmux utilities: isInsideTmux(), isTmuxAvailable(), spawnTuiPane(mode, feature, root), closeTuiPane(paneId), getManualCommand()

**shared/components/**
- `header.tsx` - Reusable header component with icon, title, feature name, and optional status

All exports consolidated in shared/index.ts. Build passed: 26.25 KB.
- 02-build-plan-viewer-tui: Built Plan Viewer TUI with OpenTUI/SolidJS:

**Files Created:**
- `packages/hive-tui/src/plan-viewer/index.tsx` - Entry point with CLI args parsing
- `packages/hive-tui/src/plan-viewer/app.tsx` - Main app with state, keyboard navigation, comment handling
- `packages/hive-tui/src/plan-viewer/components/plan-line.tsx` - Line display with inline comments
- `packages/hive-tui/src/plan-viewer/components/comment-editor.tsx` - Comment input UI

**Features:**
- Displays plan.md with line numbers and syntax highlighting
- Shows inline comments below lines (💬 icon)
- Navigation: j/k, g/G for top/bottom
- Comment actions: c=add, e=edit, d=delete
- Auto-refresh via useFileWatcher
- Header and footer with keybinding hints

**Fixed:**
- Updated shared/header.tsx to use borderStyle="single" (valid OpenTUI)
- Used proper OpenTUI API: text fg/bg, onMouseDown, Show component

**Note:** Typecheck fails due to workspace:* resolution in worktrees (hive-core not found). This resolves after merge when running from main.

