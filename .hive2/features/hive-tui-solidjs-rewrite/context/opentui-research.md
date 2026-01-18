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
