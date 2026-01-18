/**
 * Tmux spawn utilities - NO JSX dependencies
 * Safe to import from non-JSX environments like opencode-hive
 */
export { 
  spawnTuiPane, 
  closeTuiPane, 
  isInsideTmux, 
  isTmuxAvailable, 
  getManualCommand,
  type SpawnTuiResult,
  type TuiMode,
} from './shared/utils/tmux';
