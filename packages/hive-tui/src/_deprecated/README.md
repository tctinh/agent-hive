# Deprecated: Ink/React TUI Implementation

**Status**: DEPRECATED - Do not use for new development

This directory contains the original hive-tui implementation built with:
- [Ink](https://github.com/vadimdemedes/ink) (React for CLIs)
- React 18
- ink-text-input

## Why Deprecated

The Ink/React implementation has limitations:
- **No mouse click support** - Ink doesn't support onClick/onMouseDown events
- **Keyboard/scroll sync issues** - Mouse scroll via tmux doesn't sync with keyboard navigation
- **Complex state management** - React hooks less elegant for terminal UI patterns

## Replacement

The new implementation uses `@opentui/solid` (same framework as OpenCode):
- Native mouse event support (`onMouseDown`, `onMouseUp`)
- SolidJS reactive signals
- Better keyboard handling via `useKeyboard()`

## Files Preserved

```
_deprecated/
├── App.tsx           # View router with keyboard handling
├── components/
│   ├── Header.tsx
│   ├── ProgressBar.tsx
│   ├── TaskList.tsx
│   └── CommentInput.tsx
├── hooks/
│   ├── useHiveState.ts
│   └── useMouse.ts   # Attempted mouse support (incomplete)
├── views/
│   ├── Dashboard.tsx
│   ├── PlanViewer.tsx
│   ├── SpecViewer.tsx
│   └── FeatureSelect.tsx
└── utils/
    └── tmux.ts
```

## Reference Only

This code is kept for reference. It is not imported or used by the current implementation.
