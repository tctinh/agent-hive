/**
 * Tmux utilities for spawning and managing TUI panes
 */
import { execSync } from 'child_process';

/**
 * Check if we're running inside a tmux session
 */
export function isInsideTmux(): boolean {
  return !!process.env.TMUX;
}

/**
 * Check if tmux is available on the system
 */
export function isTmuxAvailable(): boolean {
  try {
    execSync('which tmux', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export type TuiMode = 'plan' | 'tasks';

export interface SpawnTuiResult {
  success: boolean;
  paneId?: string;
  error?: string;
}

/**
 * Spawn a TUI in a new tmux pane
 * @param mode - 'plan' for Plan Viewer, 'tasks' for Task Tracker
 * @param feature - Feature name to open in the TUI
 * @param projectRoot - Project root directory
 * @returns Result with success status and pane ID
 */
export function spawnTuiPane(
  mode: TuiMode,
  feature: string,
  projectRoot: string
): SpawnTuiResult {
  if (!isInsideTmux()) {
    return {
      success: false,
      error: `Not inside a tmux session. Run tmux first or use: bun packages/hive-tui/src/${mode}-viewer/index.tsx ${feature}`,
    };
  }

  if (!isTmuxAvailable()) {
    return {
      success: false,
      error: 'tmux is not installed or not in PATH',
    };
  }

  try {
    // Determine which TUI to spawn based on mode
    const tuiPath = mode === 'plan' 
      ? `${projectRoot}/packages/hive-tui/src/plan-viewer/index.tsx`
      : `${projectRoot}/packages/hive-tui/src/task-tracker/index.tsx`;

    // Split window horizontally and run the TUI
    // -h: horizontal split (new pane to the right)
    // -d: don't switch focus to new pane
    // -l 70: new pane width is 70 columns
    // -P: print pane info (returns pane ID)
    const command = `tmux split-window -h -d -l 70 -P -c "${projectRoot}" "bun ${tuiPath} ${feature}"`;
    
    const result = execSync(command, { 
      encoding: 'utf-8',
      cwd: projectRoot,
    }).trim();

    // result contains pane ID like "0:1.1"
    return {
      success: true,
      paneId: result,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to spawn tmux pane: ${err.message}`,
    };
  }
}

/**
 * Close a tmux pane by ID
 */
export function closeTuiPane(paneId: string): { success: boolean; error?: string } {
  if (!isInsideTmux()) {
    return { success: false, error: 'Not inside tmux' };
  }

  try {
    execSync(`tmux kill-pane -t "${paneId}"`, { stdio: 'ignore' });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get the manual command for running the TUI outside tmux
 */
export function getManualCommand(mode: TuiMode, feature: string, projectRoot: string): string {
  const tuiPath = mode === 'plan'
    ? `${projectRoot}/packages/hive-tui/src/plan-viewer/index.tsx`
    : `${projectRoot}/packages/hive-tui/src/task-tracker/index.tsx`;
  return `bun ${tuiPath} ${feature}`;
}
