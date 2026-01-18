# Simplified Single-Purpose Hive TUIs

## Overview

Refactor the current multi-view TUI into two focused, single-purpose TUIs that the agent controls. Each TUI appears when needed and the agent closes it when moving to the next step.

**Key Principle:** Agent controls TUI lifecycle. User reviews/interacts, then chats with agent to proceed.

## Architecture

```
packages/hive-tui/src/
├── plan-viewer/
│   ├── index.tsx           # Entry point
│   ├── app.tsx             # Main component
│   └── components/
│       ├── plan-line.tsx       # Line with comment indicator
│       ├── comment-inline.tsx  # Inline comment display
│       └── comment-input.tsx   # Comment add/edit input
│
├── task-tracker/
│   ├── index.tsx           # Entry point
│   ├── app.tsx             # Main component
│   └── components/
│       ├── task-row.tsx        # Task with status icon
│       └── detail-panel.tsx    # Expandable spec/report viewer
│
├── shared/
│   ├── hooks/
│   │   └── use-file-watcher.ts
│   └── components/
│       └── header.tsx
│
└── _deprecated/            # Old multi-view code (keep for reference)
```

## Tasks

### 1. Create shared infrastructure
- Move `use-hive-watcher.ts` to `shared/hooks/`
- Create shared `header.tsx` component
- Set up bunfig.toml and tsconfig for new structure

### 2. Build Plan Viewer TUI

**Entry:** `bun packages/hive-tui/src/plan-viewer/index.tsx <feature>`

**Layout:**
```
┌─────────────────────────────────────────────┐
│ 📋 PLAN: feature-name                       │
├─────────────────────────────────────────────┤
│  1 │ # Feature Name                         │
│  2 │                                        │
│  3 │ ## Overview                            │
│ >4 │ What we're building...                 │
│    │   💬 user: This needs more detail      │
│    │   💬 user: Also add error handling     │
│  5 │                                        │
├─────────────────────────────────────────────┤
│ [c]omment [e]dit [d]elete  [j/k] Navigate   │
└─────────────────────────────────────────────┘
```

**Features:**
- Display plan.md with line numbers
- Inline comments shown below their line (GitHub-style)
- `j/k` or `↑/↓` to navigate lines
- `g/G` for top/bottom
- `c` to add comment on selected line
- Click existing comment to select it
- `e` to edit selected comment
- `d` to delete selected comment
- Mouse click to select line
- Auto-refresh via file watcher
- No quit key (agent controls lifecycle)

**Comment storage:** Use existing `plan.comments.json` format

### 3. Build Task Tracker TUI

**Entry:** `bun packages/hive-tui/src/task-tracker/index.tsx <feature>`

**Layout (collapsed detail):**
```
┌─────────────────────────────────────────────┐
│ 📊 TASKS: feature-name           [3/8 done] │
├─────────────────────────────────────────────┤
│ ✓ 01-setup-deps                             │
│ ✓ 02-create-components                      │
│>⟳ 03-add-routing                            │
│ ○ 04-tests                                  │
│ ○ 05-finalize                               │
├─────────────────────────────────────────────┤
│ [s]pec [r]eport [Enter] Expand  [j/k] Nav   │
└─────────────────────────────────────────────┘
```

**Layout (expanded detail):**
```
┌─────────────────────────────────────────────┐
│ 📊 TASKS: feature-name           [3/8 done] │
├─────────────────────────────────────────────┤
│ ✓ 01-setup-deps                             │
│>⟳ 03-add-routing                            │
├─────────────────────────────────────────────┤
│ SPEC: 03-add-routing                        │
│ ───────────────────────────────────────     │
│ ## Task Description                         │
│                                             │
│ Create routing for the application using    │
│ React Router. Set up the following routes:  │
│ - / → Dashboard                             │
│ - /settings → Settings page                 │
│                                             │
│ ## Acceptance Criteria                      │
│ - Routes work correctly                     │
│ - 404 page for unknown routes               │
├─────────────────────────────────────────────┤
│ [s]pec [r]eport [Esc] Collapse  [j/k] Nav   │
└─────────────────────────────────────────────┘
```

**Features:**
- Task list with status icons:
  - `✓` completed
  - `⟳` in_progress
  - `○` pending
  - `✗` failed/aborted
- Progress count in header `[3/8 done]`
- `j/k` or `↑/↓` to navigate tasks
- `s` to show spec.md in expandable panel
- `r` to show report.md in expandable panel
- `Enter` to expand/toggle detail panel
- `Esc` to collapse detail panel
- Mouse click to select task
- Auto-refresh via file watcher
- No quit key (agent controls lifecycle)

### 4. Update Hive MCP tools

Add new tools to `packages/hive-core/src/tools/`:

**`hive_tui_plan`**
- Opens Plan Viewer TUI in tmux pane
- Args: `feature: string`
- Returns: `{ pane_id: string }`
- Spawns: `bun packages/hive-tui/src/plan-viewer/index.tsx <feature>`

**`hive_tui_tasks`**
- Opens Task Tracker TUI in tmux pane
- Args: `feature: string`
- Returns: `{ pane_id: string }`
- Spawns: `bun packages/hive-tui/src/task-tracker/index.tsx <feature>`

**`hive_tui_close`**
- Closes a TUI pane
- Args: `pane_id: string`
- Returns: `{ success: boolean }`
- Runs: `tmux kill-pane -t <pane_id>`

### 5. Deprecate old multi-view TUI

- Move current `app.tsx`, `views/`, `components/` to `_deprecated/`
- Update `hive_tui` tool to use new `hive_tui_plan` (for backward compat)
- Keep old code for reference

### 6. Update workflow documentation

Document the new agent workflow:
1. Agent writes plan → calls `hive_tui_plan` → Plan Viewer opens
2. User reviews, adds comments, chats with agent
3. Agent edits plan → calls `hive_tui_close` + `hive_tui_plan` → new Plan Viewer
4. User approves via chat → agent calls `hive_tui_close`
5. Agent syncs tasks → calls `hive_tui_tasks` → Task Tracker opens
6. User monitors progress, views specs/reports
7. When complete → agent calls `hive_tui_close`

## Technical Notes

### OpenTUI Setup
- Requires `bunfig.toml` with preload: `./packages/hive-tui/node_modules/@opentui/solid/scripts/preload.ts`
- Requires Zig installed for native components
- Use `await render()` to keep process alive

### File Watcher
- Watch `.hive/features/<feature>/plan.md`, `plan.comments.json`, `tasks/**/*`
- Debounce 100ms
- Use chokidar

### No Quit Key
- TUIs don't have a quit key
- Agent controls lifecycle via tmux pane management
- If user closes manually (Ctrl+C), tmux pane exits gracefully

## Out of Scope
- Diff viewer for code review (future)
- Feature selector TUI (future)
- Multiple comment authors (just use "user" for now)
