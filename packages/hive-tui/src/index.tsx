#!/usr/bin/env bun
/**
 * hive-tui - Terminal UI for Hive plan review
 * Built with @opentui/solid (SolidJS terminal renderer)
 */

import { render } from '@opentui/solid';

// Minimal app to verify build
function App() {
  return (
    <box>
      <text><b>Hive TUI</b> - Loading...</text>
    </box>
  );
}

// Entry point
const featureName = process.argv[2];
if (!featureName) {
  console.log('Usage: hive-tui <feature-name>');
  process.exit(1);
}

render(() => <App />, {
  targetFps: 60,
  exitOnCtrlC: true,
});
