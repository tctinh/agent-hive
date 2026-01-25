/**
 * Prompt and payload observability utilities for Hive.
 * 
 * Provides visibility into prompt/payload sizes to detect when
 * thresholds are exceeded, preventing silent truncation risks.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Metadata about prompt component sizes (in characters).
 */
export interface PromptMeta {
  /** Size of the plan content in characters */
  planChars: number;
  /** Size of all context files combined in characters */
  contextChars: number;
  /** Size of previous task summaries in characters */
  previousTasksChars: number;
  /** Size of the task spec in characters */
  specChars: number;
  /** Size of the final worker prompt in characters */
  workerPromptChars: number;
}

/**
 * Metadata about the JSON payload.
 */
export interface PayloadMeta {
  /** Size of the full JSON payload in characters */
  jsonPayloadChars: number;
  /** Whether the prompt is inlined in the payload */
  promptInlined: boolean;
  /** Whether the prompt is referenced by file path */
  promptReferencedByFile: boolean;
}

/**
 * Warning about threshold exceedance.
 */
export interface PromptWarning {
  /** Type of warning */
  type: 'workerPromptSize' | 'jsonPayloadSize' | 'contextSize' | 'previousTasksSize' | 'planSize';
  /** Severity level */
  severity: 'info' | 'warning' | 'critical';
  /** Human-readable message */
  message: string;
  /** Current value */
  currentValue: number;
  /** Threshold that was exceeded */
  threshold: number;
}

/**
 * Configurable thresholds for warnings.
 */
export interface PromptThresholds {
  /** Max chars for worker prompt before warning (default: 100KB) */
  workerPromptMaxChars: number;
  /** Max chars for JSON payload before warning (default: 150KB) */
  jsonPayloadMaxChars: number;
  /** Max chars for context before warning (default: 50KB) */
  contextMaxChars: number;
  /** Max chars for previous tasks before warning (default: 20KB) */
  previousTasksMaxChars: number;
  /** Max chars for plan before warning (default: 30KB) */
  planMaxChars?: number;
}

// ============================================================================
// Default Thresholds
// ============================================================================

/**
 * Default thresholds for prompt/payload size warnings.
 * 
 * These are conservative defaults based on typical LLM context limits
 * and tool output size restrictions.
 */
export const DEFAULT_THRESHOLDS: PromptThresholds = {
  // Worker prompt: 100KB (~25K tokens at 4 chars/token)
  workerPromptMaxChars: 100_000,
  
  // JSON payload: 150KB (includes prompt + metadata)
  jsonPayloadMaxChars: 150_000,
  
  // Context files: 50KB (encourages bounded context)
  contextMaxChars: 50_000,
  
  // Previous task summaries: 20KB (encourages concise summaries)
  previousTasksMaxChars: 20_000,
  
  // Plan: 30KB (encourages focused plans)
  planMaxChars: 30_000,
};

// ============================================================================
// Calculation Functions
// ============================================================================

/**
 * Calculate metadata about prompt component sizes.
 */
export function calculatePromptMeta(inputs: {
  plan: string;
  context: string;
  previousTasks: string;
  spec: string;
  workerPrompt: string;
}): PromptMeta {
  return {
    planChars: safeLength(inputs.plan),
    contextChars: safeLength(inputs.context),
    previousTasksChars: safeLength(inputs.previousTasks),
    specChars: safeLength(inputs.spec),
    workerPromptChars: safeLength(inputs.workerPrompt),
  };
}

/**
 * Calculate metadata about the JSON payload.
 */
export function calculatePayloadMeta(inputs: {
  jsonPayload: string;
  promptInlined: boolean;
  promptReferencedByFile?: boolean;
}): PayloadMeta {
  return {
    jsonPayloadChars: safeLength(inputs.jsonPayload),
    promptInlined: inputs.promptInlined,
    promptReferencedByFile: inputs.promptReferencedByFile ?? !inputs.promptInlined,
  };
}

// ============================================================================
// Warning Detection
// ============================================================================

/**
 * Check for threshold exceedances and generate warnings.
 * 
 * Returns an array of warnings. Empty array means all sizes are within limits.
 */
export function checkWarnings(
  promptMeta: PromptMeta,
  payloadMeta: PayloadMeta,
  thresholds: Partial<PromptThresholds> = {}
): PromptWarning[] {
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const warnings: PromptWarning[] = [];

  // Check worker prompt size
  if (promptMeta.workerPromptChars > t.workerPromptMaxChars) {
    const severity = getSeverity(promptMeta.workerPromptChars, t.workerPromptMaxChars);
    warnings.push({
      type: 'workerPromptSize',
      severity,
      message: `Worker prompt size (${formatBytes(promptMeta.workerPromptChars)}) exceeds threshold (${formatBytes(t.workerPromptMaxChars)})`,
      currentValue: promptMeta.workerPromptChars,
      threshold: t.workerPromptMaxChars,
    });
  }

  // Check JSON payload size
  if (payloadMeta.jsonPayloadChars > t.jsonPayloadMaxChars) {
    const severity = getSeverity(payloadMeta.jsonPayloadChars, t.jsonPayloadMaxChars);
    warnings.push({
      type: 'jsonPayloadSize',
      severity,
      message: `JSON payload size (${formatBytes(payloadMeta.jsonPayloadChars)}) exceeds threshold (${formatBytes(t.jsonPayloadMaxChars)})`,
      currentValue: payloadMeta.jsonPayloadChars,
      threshold: t.jsonPayloadMaxChars,
    });
  }

  // Check context size
  if (promptMeta.contextChars > t.contextMaxChars) {
    const severity = getSeverity(promptMeta.contextChars, t.contextMaxChars);
    warnings.push({
      type: 'contextSize',
      severity,
      message: `Context size (${formatBytes(promptMeta.contextChars)}) exceeds threshold (${formatBytes(t.contextMaxChars)})`,
      currentValue: promptMeta.contextChars,
      threshold: t.contextMaxChars,
    });
  }

  // Check previous tasks size
  if (promptMeta.previousTasksChars > t.previousTasksMaxChars) {
    const severity = getSeverity(promptMeta.previousTasksChars, t.previousTasksMaxChars);
    warnings.push({
      type: 'previousTasksSize',
      severity,
      message: `Previous tasks size (${formatBytes(promptMeta.previousTasksChars)}) exceeds threshold (${formatBytes(t.previousTasksMaxChars)})`,
      currentValue: promptMeta.previousTasksChars,
      threshold: t.previousTasksMaxChars,
    });
  }

  // Check plan size (if threshold is set)
  if (t.planMaxChars && promptMeta.planChars > t.planMaxChars) {
    const severity = getSeverity(promptMeta.planChars, t.planMaxChars);
    warnings.push({
      type: 'planSize',
      severity,
      message: `Plan size (${formatBytes(promptMeta.planChars)}) exceeds threshold (${formatBytes(t.planMaxChars)})`,
      currentValue: promptMeta.planChars,
      threshold: t.planMaxChars,
    });
  }

  return warnings;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Safely get length of a string, handling null/undefined.
 */
function safeLength(str: string | null | undefined): number {
  if (str == null) return 0;
  return str.length;
}

/**
 * Determine severity based on how much the threshold is exceeded.
 * - info: 1-1.5x threshold
 * - warning: 1.5-2x threshold  
 * - critical: >2x threshold
 */
function getSeverity(value: number, threshold: number): 'info' | 'warning' | 'critical' {
  const ratio = value / threshold;
  if (ratio > 2) return 'critical';
  if (ratio > 1.5) return 'warning';
  return 'info';
}

/**
 * Format bytes/chars for human-readable display.
 */
function formatBytes(chars: number): string {
  if (chars < 1000) return `${chars} chars`;
  if (chars < 1_000_000) return `${(chars / 1000).toFixed(1)}K chars`;
  return `${(chars / 1_000_000).toFixed(2)}M chars`;
}
