#!/usr/bin/env bun
/**
 * Plan Viewer TUI - Standalone TUI for reviewing plan.md with inline comments
 * 
 * Usage: bun plan-viewer/index.tsx <feature-name>
 * 
 * Features:
 * - Display plan.md with line numbers
 * - Inline comments shown below their line (GitHub-style)
 * - Add/edit/delete comments
 * - Mouse click to select line or comment
 * - Auto-refresh via file watcher
 * - No quit key (agent controls lifecycle)
 */

import { render } from '@opentui/solid';
import { createSignal } from 'solid-js';
import { App } from './app';

// Get feature name from args
const featureName = process.argv[2];
if (!featureName) {
  console.error('Usage: bun plan-viewer/index.tsx <feature-name>');
  process.exit(1);
}

const projectRoot = process.cwd();

// Render the Plan Viewer
await render(
  () => <App feature={featureName} projectRoot={projectRoot} />,
  {
    targetFps: 60,
    exitOnCtrlC: false, // Agent controls lifecycle
  }
);
