import type { TaskStatusType } from '../types.js';

/**
 * Minimal task info needed for dependency graph computation.
 */
export interface TaskWithDeps {
  folder: string;
  status: TaskStatusType;
  dependsOn?: string[];
}

/**
 * Result of computing runnable and blocked tasks.
 */
export interface RunnableBlockedResult {
  /** Task folders that are pending and have all dependencies satisfied (done) */
  runnable: string[];
  /** Map of task folder -> array of unsatisfied dependency folders */
  blocked: Record<string, string[]>;
}

/**
 * Compute which pending tasks are runnable (all deps done) and which are blocked.
 * 
 * A task is runnable if:
 * - Its status is 'pending'
 * - All its dependencies have status 'done'
 * 
 * A task is blocked if:
 * - Its status is 'pending'
 * - At least one dependency does NOT have status 'done'
 * 
 * Only 'done' satisfies a dependency. Other statuses (in_progress, cancelled,
 * failed, blocked, partial) do NOT satisfy dependencies.
 * 
 * @param tasks - Array of tasks with their status and dependencies
 * @returns Object with runnable task folders and blocked tasks with their missing deps
 */
export function computeRunnableAndBlocked(tasks: TaskWithDeps[]): RunnableBlockedResult {
  // Build a map of folder -> status for quick lookup
  const statusByFolder = new Map<string, TaskStatusType>();
  for (const task of tasks) {
    statusByFolder.set(task.folder, task.status);
  }

  const runnable: string[] = [];
  const blocked: Record<string, string[]> = {};

  for (const task of tasks) {
    // Only consider pending tasks
    if (task.status !== 'pending') {
      continue;
    }

    const deps = task.dependsOn ?? [];
    
    // Find unmet dependencies (deps that are not 'done')
    const unmetDeps = deps.filter(dep => {
      const depStatus = statusByFolder.get(dep);
      return depStatus !== 'done';
    });

    if (unmetDeps.length === 0) {
      runnable.push(task.folder);
    } else {
      blocked[task.folder] = unmetDeps;
    }
  }

  return { runnable, blocked };
}
