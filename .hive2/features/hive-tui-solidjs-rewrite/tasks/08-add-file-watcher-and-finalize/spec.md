# Task: 08-add-file-watcher-and-finalize

## Feature: hive-tui-solidjs-rewrite

## Context

## opentui-research

# OpenTUI Research from OpenCode Source

## Dependencies (from package.json)
```json
"@opentui/core": "0.1.74",
"@opentui/solid": "0.1.74", 
"solid-js": "1.9.7"
```

## tsconfig.json Key Settings
```json
{
  "jsx": "preserve",
  "jsxImportSource": "@opentui/solid",
  "paths": {
    "@tui/*": ["./src/cli/cmd/tui/*"]
  }
}
```

## Key Imports from app.tsx (line 1-5)
```tsx
import { render, useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/solid"
import { TextAttributes } from "@opentui/core"
import { Switch, Match, createEffect, createSignal, Show, batch, on } from "solid-js"
import { createStore } from "solid-js/store"
```

## render() API (line 118-179)
```tsx
render(
  () => <App />,
  {
    targetFps: 60,
    gatherStats: false,
    exitOnCtrlC: false,
    useKittyKeyboard: {},
  }
)
```

## Mouse Event Handlers
From sidebar.tsx (lines 105, 165, 209, 228, 282):
```tsx
<text onMouseDown={() => setExpanded("mcp", !expanded.mcp)}>Click to toggle</text>
<text fg={theme.textMuted} onMouseDown={() => kv.set("dismissed_getting_started", true)}>dismiss</text>
<box onMouseUp={async () => { ... }}>Copy</box>
```

## useKeyboard Hook (line 659-663)
```tsx
useKeyboard((evt) => {
  if (evt.ctrl && evt.name === "c") {
    handleExit()
  }
})
```

## Terminal Dimensions (line 185, 650)
```tsx
const dimensions = useTerminalDimensions()
// Usage: dimensions().width, dimensions().height
```

## Context Pattern (route.tsx)
```tsx
import { createStore } from "solid-js/store"
import { createSimpleContext } from "./helper"

export const { use: useRoute, provider: RouteProvider } = createSimpleContext({
  name: "Route",
  init: () => {
    const [store, setStore] = createStore<Route>({ type: "home" })
    return {
      get data() { return store },
      navigate(route: Route) { setStore(route) },
    }
  },
})
```

## Elements (lowercase, not React-style)
- `<box>` - container with flexbox
- `<text>` - text with fg, bold attributes  
- `<scrollbox>` - scrollable container

## Styling Props
- `fg={theme.text}` - foreground color
- `backgroundColor={theme.background}`
- `flexDirection="column"` / `"row"`
- `gap={1}`, `paddingTop={1}`, etc.
- `<b>Bold text</b>` inside <text>

## Provider Nesting Pattern (app.tsx line 118-163)
Heavy provider nesting for contexts - ThemeProvider, RouteProvider, etc.


## Completed Tasks

- 01-preserve-old-ink-code-as-deprecated: Moved all Ink/React TUI files to src/_deprecated/ (App.tsx, components/, hooks/, views/, utils/). Added README.md explaining deprecation reasons and preserved file structure. Only index.tsx remains in src/ root.
- 02-setup-package-with-opentui-dependencies: Setup OpenTUI/SolidJS: Updated package.json (removed ink/react, added @opentui/core, @opentui/solid, solid-js, babel-preset-solid). Updated tsconfig.json with jsx=preserve, jsxImportSource=@opentui/solid. Updated tsup.config.ts with esbuild jsx options. Created minimal index.tsx with render() and box/text/b elements. Build passes (562 B). Key learnings: OpenTUI uses <b>/<strong> tags for bold, not bold prop.
- 03-create-entry-point-context-helpers-and-app-shell: Created SolidJS context and app shell: context/helper.tsx (createSimpleContext pattern), context/hive.tsx (feature, projectRoot, view, selectedTask signals with navigate helper), app.tsx (useKeyboard for 1/2/3/4/q/Esc, Switch/Match view routing, placeholder views), index.tsx (HiveProvider wrapper, render with targetFps:60). Build passes (4.14 KB).
- 04-build-base-components: Created base components: header.tsx (feature name, status badge with colors), progress-bar.tsx (visual bar with filled/empty blocks), task-list.tsx (For loop with onMouseDown click handler per task, status icons, selection highlighting). Added components/index.ts barrel export. Build passes (4.14 KB).
- 05-build-dashboard-view: Created views/dashboard.tsx: Uses Header, ProgressBar, TaskList components. Loads feature info and tasks from hive-core (featureService, taskService). onTaskClick navigates to spec view. Updated app.tsx to import real Dashboard and added letter shortcuts (d/p/s/f). Build passes (9.22 KB).
- 06-build-planviewer-with-mouse-click: Created views/plan-viewer.tsx with MOUSE CLICK support: onMouseDown on each line to select, j/k/arrows navigation synced with scroll, g/G top/bottom, c to comment with inline input, Esc to cancel/back. Comments saved via planService.addComment and displayed with 💬 indicator. Updated app.tsx to import real PlanViewer. Build passes (16.02 KB).
- 07-build-specviewer-and-featureselect: Created views/spec-viewer.tsx (clickable task list with onMouseDown, spec content display, ←→ to switch tasks, j/k to scroll) and views/feature-select.tsx (clickable feature list with Enter/click to select, shows current feature). Updated app.tsx to import real components. Build passes (24.42 KB).

