# Task: 02-build-plan-viewer-tui

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

