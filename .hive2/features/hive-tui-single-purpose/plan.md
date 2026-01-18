# Simplified Single-Purpose Hive TUIs

## Overview

Refactor the current multi-view TUI into two focused, single-purpose TUIs that integrate with existing Hive tools via an optional `show_tui` flag. Each TUI appears when needed and the agent closes it when moving to the next step.

**Key Principle:** Agent controls TUI lifecycle through existing tools. User reviews/interacts, then chats with agent to proceed.

## Architecture

```
packages/hive-tui/src/
├── plan-viewer/
│   ├── index.tsx           # Entry point
│   ├── app.tsx             # Main component  
│   └── components/
│       ├── plan-line.tsx       # Line with inline comments
│       └── comment-editor.tsx  # Inline comment add/edit/delete
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
└── _deprecated/            # Old multi-view code
```

## Tasks

### 1. Create shared infrastructure
- Move `use-hive-watcher.ts` to `shared/hooks/`
- Create shared `header.tsx` component
- Extract tmux utilities from `_deprecated/utils/tmux.ts` to `shared/utils/tmux.ts`

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
- `c` to add comment on selected line (inline input)
- Click existing comment to select it
- `e` to edit selected comment (inline edit - text replaced in-place)
- `d` to delete selected comment
- Mouse click to select line or comment
- Auto-refresh via file watcher
- No quit key (agent controls lifecycle)

**Comment storage:** Use existing `comments.json` format:
```json
{"threads": [{"id": "...", "line": 4, "body": "...", "author": "user", "timestamp": "..."}]}
```

### 3. Build Task Tracker TUI

**Entry:** `bun packages/hive-tui/src/task-tracker/index.tsx <feature>`

**Layout (collapsed):**
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

**Layout (expanded - detail panel scrollable independently):**
```
┌─────────────────────────────────────────────┐
│ 📊 TASKS: feature-name           [3/8 done] │
├─────────────────────────────────────────────┤
│ ✓ 01-setup-deps                             │
│>⟳ 03-add-routing                            │
├─────────────────────────────────────────────┤
│ SPEC: 03-add-routing              [j/k ▲▼] │
│ ───────────────────────────────────────     │
│ ## Task Description                         │
│                                             │
│ Create routing for the application using    │
│ React Router. Set up the following routes:  │
├─────────────────────────────────────────────┤
│ [s]pec [r]eport [Esc] Collapse  [j/k] Scroll│
└─────────────────────────────────────────────┘
```

**Features:**
- Task list with status icons: `✓` completed, `⟳` in_progress, `○` pending, `✗` failed
- Progress count in header `[3/8 done]`
- `j/k` or `↑/↓` to navigate tasks (when collapsed) or scroll detail (when expanded)
- `s` to show spec.md in expandable panel
- `r` to show report.md in expandable panel
- `Enter` to expand/toggle detail panel
- `Esc` to collapse detail panel
- Detail panel scrolls independently when expanded
- Mouse click to select task
- Auto-refresh via file watcher
- No quit key (agent controls lifecycle)

### 4. Integrate TUI into existing Hive tools

Add `show_tui?: boolean` parameter to existing tools in `packages/opencode-hive/src/index.ts`:

**Tools that open Plan Viewer:**
```typescript
hive_plan_write: tool({
  args: {
    content: ...,
    feature: ...,
    show_tui: tool.schema.boolean().optional().describe('Open Plan Viewer TUI after writing'),
  },
  async execute({ content, feature, show_tui }) {
    // ... existing logic ...
    if (show_tui && process.env.TMUX) {
      const paneId = spawnPlanViewer(feature, directory);
      return `Plan written. TUI opened in pane ${paneId}`;
    }
    return 'Plan written.';
  }
})

hive_plan_read: tool({
  args: {
    feature: ...,
    show_tui: tool.schema.boolean().optional().describe('Open Plan Viewer TUI'),
  },
  // ... opens Plan Viewer if show_tui=true
})
```

**Tools that open Task Tracker:**
```typescript
hive_tasks_sync: tool({
  args: {
    feature: ...,
    show_tui: tool.schema.boolean().optional().describe('Open Task Tracker TUI after syncing'),
  },
  // ... opens Task Tracker if show_tui=true
})

hive_status: tool({
  args: {
    feature: ...,
    show_tui: tool.schema.boolean().optional().describe('Open Task Tracker TUI'),
  },
  // ... opens Task Tracker if show_tui=true
})
```

**New tool for closing TUI:**
```typescript
hive_tui_close: tool({
  description: 'Close a TUI pane by ID',
  args: {
    pane_id: tool.schema.string().describe('Tmux pane ID to close'),
  },
  async execute({ pane_id }) {
    execSync(`tmux kill-pane -t "${pane_id}"`);
    return `Closed pane ${pane_id}`;
  }
})
```

**Tool return values include pane_id:**
When `show_tui=true`, tools return the pane ID so agent can close it later:
```json
{
  "message": "Plan written successfully",
  "pane_id": "3:0.1"
}
```

### 5. Add comment update/delete to PlanService

Add methods to `packages/hive-core/src/services/planService.ts`:

```typescript
updateComment(featureName: string, commentId: string, body: string): PlanComment | null {
  const data = readJson<CommentsJson>(commentsPath) || { threads: [] };
  const comment = data.threads.find(c => c.id === commentId);
  if (!comment) return null;
  comment.body = body;
  comment.timestamp = new Date().toISOString();
  writeJson(commentsPath, data);
  return comment;
}

deleteComment(featureName: string, commentId: string): boolean {
  const data = readJson<CommentsJson>(commentsPath) || { threads: [] };
  const idx = data.threads.findIndex(c => c.id === commentId);
  if (idx === -1) return false;
  data.threads.splice(idx, 1);
  writeJson(commentsPath, data);
  return true;
}
```

### 6. Deprecate old multi-view TUI

- Move current `app.tsx`, `views/`, `components/`, `context/` to `_deprecated/`
- Update existing `hive_tui` tool to spawn Plan Viewer by default (backward compat)
- Keep old code for reference

## Technical Notes

### OpenTUI Setup
- Requires `bunfig.toml` with preload: `./packages/hive-tui/node_modules/@opentui/solid/scripts/preload.ts`
- Requires Zig installed for native components
- Use `await render()` to keep process alive

### File Watcher (reuse existing)
- Watch `.hive/features/<feature>/plan.md`, `comments.json`, `tasks/**/*`
- Debounce 100ms
- Use chokidar via `use-hive-watcher.ts`

### Tmux Integration
- Check `process.env.TMUX` before spawning
- Use `tmux split-window -h -d -l 60 -P` to spawn side pane
- Return pane ID (e.g., "3:0.1") for later closing
- `tmux kill-pane -t <pane_id>` to close

### No Quit Key
- TUIs don't have a quit key
- Agent controls lifecycle via `hive_tui_close`
- If user closes manually (Ctrl+C), pane exits gracefully

## Out of Scope
- Diff viewer for code review (future)
- Feature selector TUI (future)
- Multiple comment authors (just use "user" for now)
