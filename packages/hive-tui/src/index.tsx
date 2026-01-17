#!/usr/bin/env bun
/**
 * hive-tui - Terminal UI for Hive plan review
 * Built with @opentui/solid (SolidJS terminal renderer)
 */

import { render } from '@opentui/solid';
import { HiveProvider, useHive } from './context/hive';
import { App } from './app';

// Entry point
const featureName = process.argv[2];
if (!featureName) {
  console.log('Usage: hive-tui <feature-name>');
  process.exit(1);
}

// Root component with providers
function Root() {
  // Set initial feature after context is available
  const hive = useHive();
  hive.setFeature(featureName);
  hive.setProjectRoot(process.cwd());
  
  return <App />;
}

render(
  () => (
    <HiveProvider>
      <Root />
    </HiveProvider>
  ),
  {
    targetFps: 60,
    exitOnCtrlC: false, // Handle q key ourselves
  }
);
