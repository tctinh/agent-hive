/**
 * Deterministic prompt budgeting utilities for Hive.
 *
 * Limits history/context included in prompts to bound growth:
 * - Include only last N completed tasks
 * - Truncate each task summary to max M chars (with clear truncation marker)
 * - Apply max budget for inlined context (or switch to file references / name-only listing past a cap)
 * - Emit warnings when any budget causes truncation so it's never silent
 *
 * Shared by opencode-hive, hive-mcp, and any future harness.
 *
 * IMPORTANT: Never removes access to full info - always provides file paths the worker can read.
 */

// ============================================================================
// Types
// ============================================================================

export interface TaskInput {
  name: string;
  summary: string;
}

export interface BudgetedTask {
  name: string;
  summary: string;
  truncated: boolean;
  originalLength?: number;
}

export interface ContextInput {
  name: string;
  content: string;
}

export interface BudgetedContext {
  name: string;
  content: string;
  truncated: boolean;
  originalLength?: number;
  pathHint?: string;
}

export interface TruncationEvent {
  type: 'tasks_dropped' | 'summary_truncated' | 'context_truncated' | 'context_names_only';
  message: string;
  count?: number;
  affected?: string[];
}

export interface BudgetConfig {
  maxTasks?: number;
  maxSummaryChars?: number;
  maxContextChars?: number;
  maxTotalContextChars?: number;
  feature?: string;
}

export interface TaskBudgetResult {
  tasks: BudgetedTask[];
  truncationEvents: TruncationEvent[];
  droppedTasksHint?: string;
}

export interface ContextBudgetResult {
  files: BudgetedContext[];
  truncationEvents: TruncationEvent[];
  namesOnlyFiles?: string[];
}

// ============================================================================
// Default Budget
// ============================================================================

export const DEFAULT_BUDGET: Required<Omit<BudgetConfig, 'feature'>> = {
  maxTasks: 10,
  maxSummaryChars: 2000,
  maxContextChars: 20000,
  maxTotalContextChars: 60000,
};

// ============================================================================
// Truncation
// ============================================================================

const TRUNCATION_MARKER = '...[truncated]';

function truncateWithMarker(str: string, maxLength: number): { result: string; truncated: boolean } {
  if (str.length <= maxLength) {
    return { result: str, truncated: false };
  }

  const cutoff = maxLength - TRUNCATION_MARKER.length;
  if (cutoff <= 0) {
    return { result: TRUNCATION_MARKER, truncated: true };
  }

  return {
    result: str.slice(0, cutoff) + TRUNCATION_MARKER,
    truncated: true,
  };
}

// ============================================================================
// Task Budgeting
// ============================================================================

export function applyTaskBudget(
  tasks: TaskInput[],
  config: BudgetConfig = {}
): TaskBudgetResult {
  const maxTasks = config.maxTasks ?? DEFAULT_BUDGET.maxTasks;
  const maxSummaryChars = config.maxSummaryChars ?? DEFAULT_BUDGET.maxSummaryChars;
  const feature = config.feature;

  const truncationEvents: TruncationEvent[] = [];
  let droppedTasksHint: string | undefined;

  if (tasks.length === 0) {
    return { tasks: [], truncationEvents: [] };
  }

  let selectedTasks = tasks;
  const droppedTasks: string[] = [];

  if (tasks.length > maxTasks) {
    const dropCount = tasks.length - maxTasks;
    droppedTasks.push(...tasks.slice(0, dropCount).map(t => t.name));
    selectedTasks = tasks.slice(dropCount);

    truncationEvents.push({
      type: 'tasks_dropped',
      message: `Dropped ${dropCount} older task(s) to stay within budget of ${maxTasks}`,
      count: dropCount,
      affected: droppedTasks,
    });

    if (feature) {
      droppedTasksHint = `Dropped tasks: ${droppedTasks.join(', ')}. Full reports available at .hive/features/${feature}/tasks/<task>/report.md`;
    } else {
      droppedTasksHint = `Dropped tasks: ${droppedTasks.join(', ')}. Full reports available in task directories.`;
    }
  }

  const budgetedTasks: BudgetedTask[] = selectedTasks.map(task => {
    const { result, truncated } = truncateWithMarker(task.summary, maxSummaryChars);

    if (truncated) {
      truncationEvents.push({
        type: 'summary_truncated',
        message: `Truncated summary for task "${task.name}" from ${task.summary.length} to ${result.length} chars`,
        affected: [task.name],
      });
    }

    return {
      name: task.name,
      summary: result,
      truncated,
      originalLength: truncated ? task.summary.length : undefined,
    };
  });

  return {
    tasks: budgetedTasks,
    truncationEvents,
    droppedTasksHint,
  };
}

// ============================================================================
// Context Budgeting
// ============================================================================

export function applyContextBudget(
  files: ContextInput[],
  config: BudgetConfig = {}
): ContextBudgetResult {
  const maxContextChars = config.maxContextChars ?? DEFAULT_BUDGET.maxContextChars;
  const maxTotalContextChars = config.maxTotalContextChars ?? DEFAULT_BUDGET.maxTotalContextChars;
  const feature = config.feature;

  const truncationEvents: TruncationEvent[] = [];
  const namesOnlyFiles: string[] = [];

  if (files.length === 0) {
    return { files: [], truncationEvents: [] };
  }

  const budgetedFiles: BudgetedContext[] = [];
  let totalChars = 0;
  let switchedToNamesOnly = false;

  for (const file of files) {
    const pathHint = feature
      ? `.hive/features/${feature}/context/${file.name}.md`
      : `context/${file.name}.md`;

    if (totalChars >= maxTotalContextChars && !switchedToNamesOnly) {
      switchedToNamesOnly = true;
      truncationEvents.push({
        type: 'context_names_only',
        message: `Switched to name-only listing after ${totalChars} chars (budget: ${maxTotalContextChars})`,
        affected: files.slice(files.indexOf(file)).map(f => f.name),
      });
    }

    if (switchedToNamesOnly) {
      namesOnlyFiles.push(file.name);
      budgetedFiles.push({
        name: file.name,
        content: `[Content available at: ${pathHint}]`,
        truncated: true,
        originalLength: file.content.length,
        pathHint,
      });
      continue;
    }

    const { result, truncated } = truncateWithMarker(file.content, maxContextChars);

    if (truncated) {
      truncationEvents.push({
        type: 'context_truncated',
        message: `Truncated context file "${file.name}" from ${file.content.length} to ${result.length} chars. Full content at: ${pathHint}`,
        affected: [file.name],
      });
    }

    budgetedFiles.push({
      name: file.name,
      content: result,
      truncated,
      originalLength: truncated ? file.content.length : undefined,
      pathHint: truncated ? pathHint : undefined,
    });

    totalChars += result.length;
  }

  return {
    files: budgetedFiles,
    truncationEvents,
    namesOnlyFiles: namesOnlyFiles.length > 0 ? namesOnlyFiles : undefined,
  };
}
