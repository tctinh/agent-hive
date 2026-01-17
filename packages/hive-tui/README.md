# hive-tui

Terminal User Interface for Hive plan review and task tracking. Built with [Ink](https://github.com/vadimdemedes/ink) (React for CLIs).

## Overview

Brings the VSCode Hive sidebar experience to terminal/tmux users. View plans, add comments, and track task progress without leaving your terminal.

## Quick Start

```bash
# Run directly with bun
bun packages/hive-tui/src/index.tsx <feature-name>

# Or build and use CLI
bun run build
./dist/index.js <feature-name>

# Via hive_tui tool (inside opencode)
# Automatically spawns in tmux pane if inside tmux
```

## Keyboard Shortcuts

### Global
| Key | Action |
|-----|--------|
| `1` | Dashboard view |
| `2` | Plan Viewer |
| `3` | Spec Viewer |
| `4` | Feature Selector |
| `q` | Quit |

### Plan Viewer
| Key | Action |
|-----|--------|
| `j` / `k` or `↑` / `↓` | Navigate lines |
| `c` | Add comment on current line |
| `PageUp` / `PageDown` | Jump 10 lines |
| `Esc` | Back to dashboard |

### Spec Viewer
| Key | Action |
|-----|--------|
| `↑` / `↓` | Scroll content |
| `←` / `→` | Switch between tasks |
| `Esc` | Back to dashboard |

### Feature Selector
| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate features |
| `Enter` | Select feature |
| `Esc` | Back to dashboard |

## Views

### Dashboard (1)
- Feature name and status badge
- Progress bar with percentage
- Task list with status icons:
  - ✅ done
  - 🔄 in_progress
  - ⏳ pending
  - ❌ blocked

### Plan Viewer (2)
- Full-screen plan.md display with line numbers
- Line-based commenting (saved to comments.json)
- Comment indicators (💬) on commented lines
- Comments sync with VSCode Hive extension

### Spec Viewer (3)
- Task specification display
- Tab through tasks with ←→
- Shows spec.md for selected task

### Feature Selector (4)
- List all features in project
- Quick switch between features

## Real-Time Updates

The TUI uses file watchers to automatically refresh when:
- Plan is updated
- Task status changes
- Comments are added (from VSCode or TUI)

## tmux Integration

When inside a tmux session, use the `hive_tui` tool in opencode:

```
hive_tui(feature="my-feature")
```

This spawns the TUI in a side pane (60 columns wide) so you can code and review simultaneously.

## Development

```bash
cd packages/hive-tui

# Run in development mode
bun run dev <feature-name>

# Type check
bun run typecheck

# Build
bun run build
```

## Architecture

```
src/
├── index.tsx         # Entry point, CLI arg parsing
├── App.tsx           # View router, keyboard handler
├── components/
│   ├── Header.tsx        # Feature name + status badge
│   ├── ProgressBar.tsx   # [████░░░] percentage
│   ├── TaskList.tsx      # Grid with status icons
│   └── CommentInput.tsx  # Inline text input
├── hooks/
│   └── useHiveState.ts   # File watcher + state
├── utils/
│   └── tmux.ts           # tmux spawn utilities
└── views/
    ├── Dashboard.tsx     # Home screen
    ├── PlanViewer.tsx    # Plan with commenting
    ├── SpecViewer.tsx    # Task specs
    └── FeatureSelect.tsx # Feature picker
```

## Requirements

- Node.js 18+ or Bun
- Terminal with color support
- tmux (optional, for side-pane mode)
