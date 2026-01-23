/**
 * Background tasking types for Hive worker execution.
 * 
 * This module defines the core types for background task management,
 * state machine transitions, and integration with Hive task lifecycle.
 */

/**
 * Background task status states.
 * 
 * State machine:
 *   spawned -> pending -> running -> completed/error/cancelled
 *                                 -> blocked/failed (Hive-specific)
 * 
 * - spawned: Task created, session not yet started
 * - pending: Waiting for concurrency slot
 * - running: Session active, work in progress
 * - completed: Session idle, work finished successfully
 * - error: Session errored or failed to start
 * - cancelled: Explicitly cancelled by user/system
 * - blocked: Worker reported blocker (Hive protocol)
 * - failed: Worker reported failure (Hive protocol)
 */
export type BackgroundTaskStatus =
  | 'spawned'
  | 'pending'
  | 'running'
  | 'completed'
  | 'error'
  | 'cancelled'
  | 'blocked'
  | 'failed';

/**
 * Core background task record stored in memory.
 */
export interface BackgroundTaskRecord {
  /** Unique task ID (generated or user-provided) */
  taskId: string;
  /** OpenCode session ID for this task */
  sessionId: string;
  /** Agent type handling this task */
  agent: string;
  /** Human-readable description */
  description: string;
  /** Current status */
  status: BackgroundTaskStatus;
  /** Provider identity for multi-provider support */
  provider: 'hive';
  /** Idempotency key for safe retries */
  idempotencyKey?: string;
  /** ISO timestamp when task was created */
  createdAt: string;
  /** ISO timestamp when task started running */
  startedAt?: string;
  /** ISO timestamp when task completed/failed/cancelled */
  completedAt?: string;
  /** ISO timestamp of last activity */
  lastActiveAt?: string;
  /** Parent session ID (orchestrator session) */
  parentSessionId?: string;
  /** Parent message ID */
  parentMessageId?: string;
  /** Hive feature name (if Hive-linked) */
  hiveFeature?: string;
  /** Hive task folder (if Hive-linked) */
  hiveTaskFolder?: string;
  /** Working directory for task execution */
  workdir?: string;
  /** Error message if status is error */
  errorMessage?: string;
  /** Progress tracking */
  progress?: BackgroundTaskProgress;
}

/**
 * Progress tracking for a background task.
 */
export interface BackgroundTaskProgress {
  /** Number of tool calls made */
  toolCalls?: number;
  /** Last tool used */
  lastTool?: string;
  /** Last message content (truncated) */
  lastMessage?: string;
  /** ISO timestamp of last message */
  lastMessageAt?: string;
  /** Number of messages in session */
  messageCount?: number;
}

/**
 * Options for spawning a new background task.
 */
export interface SpawnOptions {
  /** Agent type to use */
  agent: string;
  /** Task prompt/instructions */
  prompt: string;
  /** Human-readable description */
  description: string;
  /** Idempotency key for safe retries */
  idempotencyKey?: string;
  /** Working directory for task execution */
  workdir?: string;
  /** Parent session ID (orchestrator session) */
  parentSessionId?: string;
  /** Parent message ID */
  parentMessageId?: string;
  /** Hive feature name (if Hive-linked) */
  hiveFeature?: string;
  /** Hive task folder (if Hive-linked) */
  hiveTaskFolder?: string;
  /** Whether to wait for completion (sync mode) */
  sync?: boolean;
}

/**
 * Result of a spawn operation.
 */
export interface SpawnResult {
  /** The created/existing task record */
  task: BackgroundTaskRecord;
  /** Whether an existing task was returned (idempotency hit) */
  wasExisting: boolean;
  /** Error message if spawn failed */
  error?: string;
}

/**
 * Valid state transitions for the background task state machine.
 */
export const VALID_TRANSITIONS: Record<BackgroundTaskStatus, BackgroundTaskStatus[]> = {
  spawned: ['pending', 'running', 'error', 'cancelled'],
  pending: ['running', 'error', 'cancelled'],
  running: ['completed', 'error', 'cancelled', 'blocked', 'failed'],
  completed: [], // Terminal state
  error: [], // Terminal state
  cancelled: [], // Terminal state
  blocked: ['running', 'cancelled'], // Can resume
  failed: [], // Terminal state
};

/**
 * Check if a status is terminal (no further transitions possible).
 */
export function isTerminalStatus(status: BackgroundTaskStatus): boolean {
  return VALID_TRANSITIONS[status].length === 0;
}

/**
 * Check if a transition is valid.
 */
export function isValidTransition(from: BackgroundTaskStatus, to: BackgroundTaskStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

/**
 * OpenCode client interface (minimal subset needed for background tasks).
 * This allows stubbing in tests without importing the full SDK.
 */
export interface OpencodeClient {
  session: {
    create(options: {
      body: {
        title?: string;
        parentID?: string;
      };
    }): Promise<{ data?: { id?: string } }>;
    
    prompt(options: {
      path: { id: string };
      body: {
        agent?: string;
        parts: Array<{ type: string; text: string }>;
        tools?: Record<string, boolean>;
      };
    }): Promise<{ data?: unknown }>;
    
    get(options: {
      path: { id: string };
    }): Promise<{ data?: { id?: string; status?: string; parentID?: string } }>;
    
    messages(options: {
      path: { id: string };
    }): Promise<{ data?: unknown[] }>;
    
    abort(options: {
      path: { id: string };
    }): Promise<void>;
  };
  
  app: {
    agents(options: Record<string, unknown>): Promise<{
      data?: Array<{ name: string; description?: string; mode?: string }>;
    }>;
    
    log(options: {
      body: { service: string; level: string; message: string };
    }): Promise<void>;
  };
  
  config: {
    get(): Promise<{
      data?: Record<string, unknown>;
    }>;
  };
}

/**
 * Agent info from OpenCode registry.
 */
export interface AgentInfo {
  name: string;
  description?: string;
  mode?: string;
}

/**
 * Result of agent validation.
 */
export interface AgentValidationResult {
  valid: boolean;
  error?: string;
  agent?: AgentInfo;
}
