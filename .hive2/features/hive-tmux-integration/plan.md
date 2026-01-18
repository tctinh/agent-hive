# Hive TUI - Terminal Plan Review

## Overview

Terminal-based plan review interface using Ink (React for CLI). Brings VSCode sidebar experience to tmux users with:
- Task status overview with progress
- Full-screen plan viewer with line-based commenting
- Task spec viewer  
- Feature switching
- Real-time file watching
- Agent-spawnable via `hive_tui` tool

**Key Principle**: Reuse existing hive-core services. TUI uses same `comments.json` format as VSCode extension.

## Grounded API Usage

### hive-core Services (What TUI Calls)

| Service | Method | Returns | TUI Usage |
|---------|--------|---------|-----------|
| `planService` | `read(feature)` | `{content, status, comments}` | PlanViewer content + comments |
| `planService` | `addComment(feature, {line, body, author})` | void | Save comment from TUI |
| `planService` | `getComments(feature)` | `PlanComment[]` | Display comment indicators |
| `featureService` | `list()` | `string[]` | FeatureSelector list |
| `featureService` | `getInfo(name)` | `FeatureInfo` | Dashboard header, task count |
| `featureService` | `getActive()` | `string \| null` | Default feature if none specified |
| `taskService` | `list(feature)` | `TaskInfo[]` | Dashboard task list |

### Types from hive-core

```typescript
// PlanComment - what we read/write for comments
interface PlanComment {
  id: string;        // Auto-generated UUID
  line: number;      // Line number in plan.md
  body: string;      // Comment text
  author: string;    // 'tui', 'vscode', or user name
  timestamp: string; // ISO date
}

// FeatureInfo - dashboard header
interface FeatureInfo {
  name: string;
  status: 'planning' | 'approved' | 'executing' | 'completed';
  tasks: number;       // Total task count
  hasPlan: boolean;
  commentCount: number;
}

// TaskInfo - task list
interface TaskInfo {
  folder: string;    // e.g. "01-setup-database"
  name: string;      // e.g. "Setup Database"
  status: 'pending' | 'in_progress' | 'done' | 'cancelled';
  origin: 'plan' | 'manual';
  summary?: string;
}
```

## Architecture

```
packages/hive-tui/
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── src/
    ├── index.tsx           # Entry: parse args, render(<App />)
    ├── App.tsx             # View router + keyboard handler
    ├── views/
    │   ├── Dashboard.tsx   # Home: header + tasks + hints
    │   ├── PlanViewer.tsx  # Full-screen plan with comments
    │   ├── SpecViewer.tsx  # Read-only task spec
    │   └── FeatureSelect.tsx
    ├── components/
    │   ├── Header.tsx      # Feature name, status badge
    │   ├── TaskList.tsx    # Grid of tasks with icons
    │   ├── ProgressBar.tsx # [████░░░░] 43%
    │   └── CommentInput.tsx
    ├── hooks/
    │   └── useHiveState.ts # chokidar watcher + state
    └── utils/
        └── tmux.ts         # isInsideTmux, spawnTuiPane
```

## Views

### Dashboard (Home)
```
┌────────────────────────────────────────────┐
│ 🐝 HIVE │ auth-system │ planning     [f]  │
├────────────────────────────────────────────┤
│ TASKS [3/7] ████████░░░░░░░ 43%           │
├────────────────────────────────────────────┤
│ ✅ 01-setup   ✅ 02-model   ✅ 03-service │
│ 🔄 04-routes  ⏳ 05-tests   ⏳ 06-docs    │
│ ⏳ 07-cleanup                              │
├────────────────────────────────────────────┤
│ 💬 2 comments on plan                      │
├────────────────────────────────────────────┤
│ [p] plan  [s] spec  [f] feature  [q] quit │
└────────────────────────────────────────────┘

Data sources:
- Header: featureService.getInfo(name) → {name, status}
- Tasks: taskService.list(feature) → TaskInfo[]
- Comments: planService.getComments(feature).length
```

### PlanViewer (Full-screen)
```
┌────────────────────────────────────────────┐
│ 📄 PLAN: auth-system          [c] [Esc]   │
├────────────────────────────────────────────┤
│   1 │ # Auth System                        │
│   2 │                                      │
│   3 │ ## Overview                          │
│  12 │💬### 1. Setup Database              │
│  13 │ Create PostgreSQL schema...          │
├────────────────────────────────────────────┤
│ COMMENTS                                   │
│ L12: Use bcrypt not md5                   │
├────────────────────────────────────────────┤
│ ↑↓ scroll  [c] comment  [Esc] back        │
└────────────────────────────────────────────┘

Data sources:
- Content: planService.read(feature).content
- Comments: planService.read(feature).comments
- Add: planService.addComment(feature, {line, body, author: 'tui'})
```

### SpecViewer
```
┌────────────────────────────────────────────┐
│ 📋 SPEC: 04-api-routes              [Esc] │
├────────────────────────────────────────────┤
│ # API Routes                               │
│                                            │
│ Implement REST endpoints for auth...       │
│ ...                                        │
├────────────────────────────────────────────┤
│ ↑↓ scroll  [Esc] back                     │
└────────────────────────────────────────────┘

Data sources:
- Find task: taskService.list(feature).find(t => t.status === 'in_progress')
- Spec path: .hive/features/{f}/tasks/{folder}/spec.md (direct read)
```

### FeatureSelector
```
┌────────────────────────────────────────────┐
│ 🐝 SELECT FEATURE                    [Esc]│
├────────────────────────────────────────────┤
│ > 🔄 auth-system (3/7 tasks)              │
│   ✅ user-profile (done)                  │
│   ⏳ payment-flow (planning)              │
├────────────────────────────────────────────┤
│ ↑↓ select  [Enter] switch  [Esc] cancel   │
└────────────────────────────────────────────┘

Data sources:
- Features: featureService.list()
- Per feature: featureService.getInfo(name) → {status, tasks}
```

## Dependencies

```json
{
  "name": "hive-tui",
  "version": "0.9.0",
  "bin": {
    "hive-tui": "./dist/index.js"
  },
  "dependencies": {
    "hive-core": "workspace:*",
    "ink": "^5.0.1",
    "react": "^18.3.1",
    "chokidar": "^3.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "typescript": "^5.0.0",
    "tsup": "^8.0.0"
  }
}
```

## Tasks

### 1. Create hive-tui package scaffold

Create `packages/hive-tui/`:

**package.json:**
```json
{
  "name": "hive-tui",
  "version": "0.9.0",
  "type": "module",
  "bin": { "hive-tui": "./dist/index.js" },
  "scripts": {
    "dev": "bun src/index.tsx",
    "build": "tsup src/index.tsx --format esm --dts"
  },
  "dependencies": {
    "hive-core": "workspace:*",
    "ink": "^5.0.1",
    "react": "^18.3.1",
    "chokidar": "^3.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "typescript": "^5.0.0",
    "tsup": "^8.0.0"
  }
}
```

**src/index.tsx:**
```tsx
#!/usr/bin/env node
import { render } from 'ink';
import { App } from './App.js';

const feature = process.argv[2] || undefined;
render(<App initialFeature={feature} />);
```

**src/App.tsx:**
```tsx
import React, { useState } from 'react';
import { useInput, useApp } from 'ink';
import { Dashboard } from './views/Dashboard.js';
// View router skeleton - views added in later tasks
```

Files created:
- packages/hive-tui/package.json
- packages/hive-tui/tsconfig.json
- packages/hive-tui/tsup.config.ts
- packages/hive-tui/src/index.tsx
- packages/hive-tui/src/App.tsx

### 2. Build Dashboard view with task list

**src/views/Dashboard.tsx:**
- Import `featureService`, `taskService`, `planService` from hive-core
- Call `featureService.getInfo(feature)` for header data
- Call `taskService.list(feature)` for task list
- Call `planService.getComments(feature).length` for comment count

**src/components/Header.tsx:**
```tsx
// Shows: 🐝 HIVE │ {name} │ {status}
// Status badge: planning/approved/executing/completed
```

**src/components/TaskList.tsx:**
```tsx
// Map TaskInfo[] to grid with icons
const STATUS_ICONS = {
  done: '✅',
  in_progress: '🔄', 
  pending: '⏳',
  cancelled: '❌'
};
```

**src/components/ProgressBar.tsx:**
```tsx
// Calculate: done.length / total.length
// Render: [████░░░░] 43%
```

Keyboard: `p` → PlanViewer, `s` → SpecViewer, `f` → FeatureSelect, `q` → exit

### 3. Build PlanViewer with commenting

**src/views/PlanViewer.tsx:**
- Call `planService.read(feature)` → `{content, comments}`
- Split content by lines, add line numbers
- Mark lines with comments using 💬 indicator
- Track `currentLine` state for scrolling
- Show comments panel at bottom

**src/components/CommentInput.tsx:**
```tsx
// Inline input at bottom when 'c' pressed
// Props: { line: number, onSubmit: (body: string) => void, onCancel: () => void }
// On submit: planService.addComment(feature, { line, body, author: 'tui' })
```

Keyboard:
- `↑↓` or `j/k` - scroll lines
- `c` - add comment at current line (shows CommentInput)
- `Enter` on commented line - show thread
- `Esc` - back to Dashboard

### 4. Build SpecViewer for task specs

**src/views/SpecViewer.tsx:**
- Find current task: `taskService.list(feature).find(t => t.status === 'in_progress')`
- If none in_progress, use first pending
- Read spec directly: `fs.readFile(.hive/features/{f}/tasks/{folder}/spec.md)`
- Display with line numbers, scrollable

Keyboard: `↑↓` scroll, `Esc` back

### 5. Build FeatureSelector

**src/views/FeatureSelect.tsx:**
- Call `featureService.list()` for all feature names
- For each: `featureService.getInfo(name)` for status/task count
- Arrow navigation with highlight
- Enter to select, updates App state

Display format per row:
```
{icon} {name} ({done}/{total} tasks)
```

Icons by status:
```typescript
const STATUS_ICONS = {
  planning: '📝',
  approved: '✅', 
  executing: '🔄',
  completed: '🏁'
};
```

### 6. Add file watcher for real-time updates

**src/hooks/useHiveState.ts:**
```typescript
import { watch } from 'chokidar';
import { featureService, taskService, planService } from 'hive-core';

export function useHiveState(feature: string) {
  const [state, setState] = useState<HiveState | null>(null);
  
  useEffect(() => {
    // Initial load
    refresh();
    
    // Watch .hive/features/{feature}/
    const watcher = watch([
      `.hive/features/${feature}/meta.json`,
      `.hive/features/${feature}/plan.md`,
      `.hive/features/${feature}/comments.json`,
      `.hive/features/${feature}/tasks/*/status.json`
    ], { ignoreInitial: true });
    
    // Debounced refresh on change
    watcher.on('all', debounce(refresh, 100));
    
    return () => watcher.close();
  }, [feature]);
  
  const refresh = async () => {
    const info = await featureService.getInfo(feature);
    const tasks = await taskService.list(feature);
    const plan = await planService.read(feature);
    setState({ info, tasks, plan });
  };
  
  return { ...state, refresh };
}
```

### 7. Add tmux utilities and hive_tui tool

**src/utils/tmux.ts (in hive-tui):**
```typescript
import { execSync } from 'child_process';

export function isInsideTmux(): boolean {
  return !!process.env.TMUX;
}

export function spawnTuiPane(feature: string): { success: boolean; error?: string } {
  if (!isInsideTmux()) {
    return { success: false, error: 'Not inside tmux' };
  }
  
  try {
    // Split horizontally, run hive-tui in new pane
    execSync(`tmux split-window -h -d "hive-tui ${feature}"`);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
```

**Add to packages/opencode-hive/src/index.ts:**
```typescript
hive_tui: tool({
  description: 'Launch Hive TUI in a tmux pane for plan review and commenting',
  parameters: z.object({
    feature: z.string().optional().describe('Feature to show (default: active)')
  }),
  execute: async ({ feature }) => {
    const resolved = feature || featureService.getActive();
    if (!resolved) {
      return 'No active feature. Create one with hive_feature_create first.';
    }
    
    if (!isInsideTmux()) {
      return `Not in tmux. Run manually: hive-tui ${resolved}`;
    }
    
    const result = spawnTuiPane(resolved);
    if (result.success) {
      return `TUI opened for "${resolved}". User can review plan and add comments.`;
    }
    return `Failed: ${result.error}. Run manually: hive-tui ${resolved}`;
  }
})
```

Update opencode-hive package.json to depend on hive-tui.

### 8. Documentation and build setup

**Update packages/hive-tui/package.json bin:**
```json
"bin": {
  "hive-tui": "./dist/index.js"
}
```

**tsup.config.ts:**
```typescript
import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['esm'],
  dts: true,
  banner: { js: '#!/usr/bin/env node' }
});
```

**README.md updates:**
```markdown
## Terminal TUI

### Manual Launch
\`\`\`bash
hive-tui auth-system
\`\`\`

### Via OpenCode
Agent can spawn TUI: `hive_tui(feature="auth-system")`

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| p | Open plan viewer |
| s | Open spec viewer |
| f | Switch feature |
| c | Add comment (in plan viewer) |
| q | Quit |
| ↑↓ | Navigate/scroll |
| Esc | Back to dashboard |
```

## Testing Checklist

1. `cd packages/hive-tui && bun install`
2. `bun src/index.tsx test-feature` - Dashboard loads
3. Press `p` - PlanViewer shows with line numbers
4. Press `c` - CommentInput appears
5. Type comment, Enter - saved to comments.json
6. Check VSCode - comment appears
7. Press `f` - FeatureSelect, switch features
8. Edit plan.md externally - TUI auto-refreshes
9. Test hive_tui tool in OpenCode - pane spawns
10. Test outside tmux - shows manual command

## Non-Goals (v1)

- Worker panel (OMO-Slim integration)
- Configuration options
- Plan/spec editing (view + comment only)
- Multiple TUI panes
