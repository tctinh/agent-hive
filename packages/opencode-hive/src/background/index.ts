/**
 * Background tasking module for Hive worker execution.
 * 
 * Provides the internal background task management capabilities used by:
 * - background_task / background_output / background_cancel tools (Task 04)
 * - hive_exec_start integration (Task 05)
 * 
 * Core capabilities:
 * 1. In-memory store with state machine enforcement
 * 2. Idempotency support for safe retries
 * 3. Dynamic agent discovery and gating
 * 4. Hive task persistence via TaskService
 */

// Types
export type {
  BackgroundTaskStatus,
  BackgroundTaskRecord,
  BackgroundTaskProgress,
  SpawnOptions,
  SpawnResult,
  OpencodeClient,
  AgentInfo,
  AgentValidationResult,
} from './types.js';

export {
  VALID_TRANSITIONS,
  isTerminalStatus,
  isValidTransition,
} from './types.js';

// Store
export {
  BackgroundTaskStore,
  getStore,
  resetStore,
} from './store.js';

// Agent Gate
export type {
  AgentValidationOptions,
} from './agent-gate.js';

export {
  AgentGate,
  createAgentGate,
} from './agent-gate.js';

// Manager
export type {
  BackgroundManagerOptions,
} from './manager.js';

export {
  BackgroundManager,
  createBackgroundManager,
} from './manager.js';
