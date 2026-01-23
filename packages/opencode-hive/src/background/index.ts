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
export {
  BackgroundTaskStatus,
  BackgroundTaskRecord,
  BackgroundTaskProgress,
  SpawnOptions,
  SpawnResult,
  OpencodeClient,
  AgentInfo,
  AgentValidationResult,
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
export {
  AgentGate,
  AgentValidationOptions,
  createAgentGate,
} from './agent-gate.js';

// Manager
export {
  BackgroundManager,
  BackgroundManagerOptions,
  createBackgroundManager,
} from './manager.js';
