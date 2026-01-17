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

/**
 * Spawn the Hive TUI in a new tmux pane
 * @param feature - Feature name to open in the TUI
 * @param projectRoot - Project root directory
 * @returns Result with success status and optional error
 */
export function spawnTuiPane(
  feature: string,
  projectRoot: string
): { success: boolean; paneId?: string; error?: string } {
  if (!isInsideTmux()) {
    return {
      success: false,
      error: 'Not inside a tmux session. Run tmux first or use: bun packages/hive-tui/src/index.tsx ' + feature,
    };
  }

  if (!isTmuxAvailable()) {
    return {
      success: false,
      error: 'tmux is not installed or not in PATH',
    };
  }

  try {
    // Split window horizontally and run hive-tui
    // -h: horizontal split (new pane to the right)
    // -d: don't switch focus to new pane
    // -l 60: new pane width is 60 columns
    // -P: print pane info
    const command = `tmux split-window -h -d -l 60 -P -c "${projectRoot}" "bun ${projectRoot}/packages/hive-tui/src/index.tsx ${feature}"`;
    
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
export function getManualCommand(feature: string, projectRoot: string): string {
  return `bun ${projectRoot}/packages/hive-tui/src/index.tsx ${feature}`;
}
