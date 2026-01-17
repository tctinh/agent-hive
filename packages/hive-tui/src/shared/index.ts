/**
 * Shared utilities for Hive TUI components
 */

// Hooks
export { useFileWatcher } from './hooks';

// Components
export { Header, type HeaderProps } from './components';

// Utils
export {
  isInsideTmux,
  isTmuxAvailable,
  spawnTuiPane,
  closeTuiPane,
  getManualCommand,
  type TuiMode,
  type SpawnTuiResult,
} from './utils';
