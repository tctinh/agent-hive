/**
 * Core hook cadence logic, extracted for testability.
 * Determines whether a hook should execute based on its configured cadence.
 */
const fallbackTurnCounters: Record<string, number> = {};

export function shouldExecuteHook(
  hookName: string,
  configService: { getHookCadence(name: string, opts?: { safetyCritical?: boolean }): number } | undefined,
  turnCounters: Record<string, number> | undefined,
  options?: { safetyCritical?: boolean },
): boolean {
  // Fall back to cadence=1 if config service is unavailable during early hook execution.
  const cadence = configService?.getHookCadence(hookName, options) ?? 1;
  const counters = turnCounters ?? fallbackTurnCounters;

  // Increment turn counter
  counters[hookName] = (counters[hookName] || 0) + 1;
  const currentTurn = counters[hookName];

  // Cadence of 1 means fire every turn (no gating needed)
  if (cadence === 1) {
    return true;
  }

  // Fire on turns 1, (1+cadence), (1+2*cadence), ...
  // Using (currentTurn - 1) % cadence === 0 ensures turn 1 always fires
  return (currentTurn - 1) % cadence === 0;
}

export const HIVE_SYSTEM_PROMPT = `
## Hive — Active Session

**Important:** hive_worktree_commit commits to the task branch but does NOT merge.
Use hive_merge to integrate changes into the current branch.
`;
