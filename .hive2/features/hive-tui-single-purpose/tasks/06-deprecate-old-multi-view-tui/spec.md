# Task: 06-deprecate-old-multi-view-tui

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
- 03-build-task-tracker-tui: Built Task Tracker TUI with OpenTUI/SolidJS:

**Files Created:**
- `packages/hive-tui/src/task-tracker/index.tsx` - Entry point
- `packages/hive-tui/src/task-tracker/app.tsx` - Main app with task list, navigation, detail panels
- `packages/hive-tui/src/task-tracker/components/task-row.tsx` - Task display with status icons
- `packages/hive-tui/src/task-tracker/components/detail-panel.tsx` - Spec/report viewer

**Features:**
- Progress bar showing done/in_progress/pending counts
- Task list with status icons (✓/⏳/○) and colors
- j/k navigation, g/G for top/bottom
- Enter/Space to toggle detail panel
- Tab to switch between spec/report views
- Auto-refresh via useFileWatcher
- Uses TaskService.list() and TaskService.readSpec()

**API Note:** TaskService has readSpec but no readReport yet - report reading shows (empty) placeholder.
- 04-integrate-tui-into-existing-hive-tools: Added `show_tui` parameter to hive tools for TUI integration:

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
- 05-add-comment-updatedelete-to-planservice: Added update and delete methods to PlanService for comment CRUD:

**New Methods in packages/hive-core/src/services/planService.ts:**

1. `updateComment(featureName, commentId, body)`:
   - Finds comment by ID and updates its body
   - Updates timestamp on edit
   - Returns updated PlanComment or null if not found

2. `deleteComment(featureName, commentId)`:
   - Removes comment by ID from threads array
   - Returns true if deleted, false if not found

Both methods read/write to comments.json file via existing path utilities.

