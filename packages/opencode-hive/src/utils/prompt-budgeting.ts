/**
 * Deterministic prompt budgeting utilities for Hive.
 *
 * Limits history/context included in prompts to bound growth:
 * - Include only last N completed tasks
 * - Truncate each task summary to max M chars (with clear truncation marker)
 * - Apply max budget for inlined context (or switch to file references / name-only listing past a cap)
 * - Emit warnings when any budget causes truncation so it's never silent
 *
 * IMPORTANT: Never removes access to full info - always provides file paths the worker can read.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Input task for budgeting.
 */
export interface TaskInput {
  name: string;
  summary: string;
}

/**
 * Budgeted task with truncation info.
 */
export interface BudgetedTask {
  name: string;
  summary: string;
  truncated: boolean;
  originalLength?: number;
}

/**
 * Input context file for budgeting.
 */
export interface ContextInput {
  name: string;
  content: string;
}

/**
 * Budgeted context file with truncation info.
 */
export interface BudgetedContext {
  name: string;
  content: string;
  truncated: boolean;
  originalLength?: number;
  /** Hint for where to find full content */
  pathHint?: string;
}

/**
 * Truncation event for observability.
 */
export interface TruncationEvent {
  type: 'tasks_dropped' | 'summary_truncated' | 'context_truncated' | 'context_names_only';
  message: string;
  count?: number;
  /** Names of affected items */
  affected?: string[];
}

/**
 * Budget configuration.
 */
export interface BudgetConfig {
  /** Max number of previous tasks to include (default: 10) */
  maxTasks?: number;
  /** Max chars per task summary (default: 2000) */
  maxSummaryChars?: number;
  /** Max chars per context file (default: 20000) */
  maxContextChars?: number;
  /** Max total chars for all context files combined (default: 60000) */
  maxTotalContextChars?: number;
  /** Feature name for generating file path hints */
  feature?: string;
}

/**
 * Result of applying task budget.
 */
export interface TaskBudgetResult {
  tasks: BudgetedTask[];
  truncationEvents: TruncationEvent[];
  /** Hint about dropped tasks and where to find them */
  droppedTasksHint?: string;
}

/**
 * Result of applying context budget.
 */
export interface ContextBudgetResult {
  files: BudgetedContext[];
  truncationEvents: TruncationEvent[];
  /** Names of files that were converted to name-only */
  namesOnlyFiles?: string[];
}

// ============================================================================
// Default Budget
// ============================================================================

/**
 * Default budget configuration.
 *
 * Conservative defaults that balance context richness with bounded growth.
 */
export const DEFAULT_BUDGET: Required<Omit<BudgetConfig, 'feature'>> = {
  // Include last 10 completed tasks (typical feature scale)
  maxTasks: 10,

  // 2000 chars per summary (~500 words)
  maxSummaryChars: 2000,

  // 20KB per context file
  maxContextChars: 20000,

  // 60KB total context
  maxTotalContextChars: 60000,
};

// ============================================================================
// Truncation Marker
// ============================================================================

const TRUNCATION_MARKER = '...[truncated]';

/**
 * Truncate a string to max length with marker.
 */
function truncateWithMarker(str: string, maxLength: number): { result: string; truncated: boolean } {
  if (str.length <= maxLength) {
    return { result: str, truncated: false };
  }

  // Leave room for the marker
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

/**
 * Apply budget limits to previous tasks.
 *
 * - Keeps only the last N tasks (most recent)
 * - Truncates summaries exceeding max chars
 * - Emits truncation events for observability
 * - Provides hints for accessing full info
 */
export function applyTaskBudget(
  tasks: TaskInput[],
  config: BudgetConfig = {}
): TaskBudgetResult {
  const maxTasks = config.maxTasks ?? DEFAULT_BUDGET.maxTasks;
  const maxSummaryChars = config.maxSummaryChars ?? DEFAULT_BUDGET.maxSummaryChars;
  const feature = config.feature;

  const truncationEvents: TruncationEvent[] = [];
  let droppedTasksHint: string | undefined;

  // Handle empty input
  if (tasks.length === 0) {
    return { tasks: [], truncationEvents: [] };
  }

  // Keep only last N tasks (most recent)
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

    // Generate hint for accessing dropped tasks
    if (feature) {
      droppedTasksHint = `Dropped tasks: ${droppedTasks.join(', ')}. Full reports available at .hive/features/${feature}/tasks/<task>/report.md`;
    } else {
      droppedTasksHint = `Dropped tasks: ${droppedTasks.join(', ')}. Full reports available in task directories.`;
    }
  }

  // Truncate summaries if needed
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

/**
 * Apply budget limits to context files.
 *
 * - Truncates individual files exceeding max chars
 * - Switches to name-only listing when total exceeds budget
 * - Emits truncation events for observability
 * - Provides file path hints for accessing full content
 */
export function applyContextBudget(
  files: ContextInput[],
  config: BudgetConfig = {}
): ContextBudgetResult {
  const maxContextChars = config.maxContextChars ?? DEFAULT_BUDGET.maxContextChars;
  const maxTotalContextChars = config.maxTotalContextChars ?? DEFAULT_BUDGET.maxTotalContextChars;
  const feature = config.feature;

  const truncationEvents: TruncationEvent[] = [];
  const namesOnlyFiles: string[] = [];

  // Handle empty input
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

    // Check if we've exceeded total budget - switch to names only
    if (totalChars >= maxTotalContextChars && !switchedToNamesOnly) {
      switchedToNamesOnly = true;
      truncationEvents.push({
        type: 'context_names_only',
        message: `Switched to name-only listing after ${totalChars} chars (budget: ${maxTotalContextChars})`,
        affected: files.slice(files.indexOf(file)).map(f => f.name),
      });
    }

    if (switchedToNamesOnly) {
      // Name-only: just include the name and path hint
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

    // Truncate individual file if needed
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

// ============================================================================
// Combined Budgeting Helper
// ============================================================================

/**
 * Result of applying all budgets.
 */
export interface BudgetResult {
  tasks: TaskBudgetResult;
  context: ContextBudgetResult;
  /** All truncation events combined */
  allTruncationEvents: TruncationEvent[];
  /** Whether any truncation occurred */
  hadTruncation: boolean;
}

/**
 * Apply all budget limits to tasks and context.
 */
export function applyAllBudgets(
  tasks: TaskInput[],
  contextFiles: ContextInput[],
  config: BudgetConfig = {}
): BudgetResult {
  const taskResult = applyTaskBudget(tasks, config);
  const contextResult = applyContextBudget(contextFiles, config);

  const allTruncationEvents = [
    ...taskResult.truncationEvents,
    ...contextResult.truncationEvents,
  ];

  return {
    tasks: taskResult,
    context: contextResult,
    allTruncationEvents,
    hadTruncation: allTruncationEvents.length > 0,
  };
}
