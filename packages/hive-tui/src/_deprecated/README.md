# Deprecated: Multi-View TUI Implementation

**Status**: DEPRECATED - Do not use for new development

This directory contains deprecated hive-tui implementations:

## _deprecated/views-old/ (OpenTUI multi-view - DEPRECATED)

The original OpenTUI multi-view implementation with:
- Dashboard, PlanViewer, SpecViewer, FeatureSelect views
- Complex view router in app-multi-view.tsx
- HiveProvider context

**Why Deprecated:** Multi-view navigation was complex. Single-purpose TUIs are simpler:
- `hive-tui plan <feature>` - Plan Viewer only
- `hive-tui tasks <feature>` - Task Tracker only

## _deprecated/App.tsx, views/, components/ (Ink/React - DOUBLE DEPRECATED)

The original Ink/React implementation:
- Ink (React for CLIs)
- React 18
- ink-text-input

**Why Deprecated:**
- No mouse click support
- Keyboard/scroll sync issues
- Complex state management

## Current Implementation

Use the new single-purpose TUIs:

```bash
hive-tui plan my-feature   # Plan Viewer with inline comments
hive-tui tasks my-feature  # Task Tracker with spec/report panels
```

Or via hive tools with `show_tui: true`:
```
hive_plan_read(feature="my-feature", show_tui=true)
hive_status(feature="my-feature", show_tui=true)
```

## Reference Only

This code is kept for reference. It is not imported or used by the current implementation.
