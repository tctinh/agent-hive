/**
 * Task Tracker TUI - Entry point
 * 
 * Usage: bun packages/hive-tui/src/task-tracker/index.tsx <feature>
 */
import { render } from '@opentui/solid';
import { App } from './app';

const [, , feature] = process.argv;
const projectRoot = process.cwd();

if (!feature) {
  console.error('Usage: bun task-tracker/index.tsx <feature>');
  process.exit(1);
}

await render(() => <App feature={feature} projectRoot={projectRoot} />);
