/**
 * Background Poller for session status and stability detection.
 * 
 * This module provides READ-ONLY observation of background task sessions.
 * It does NOT write to .hive - only updates in-memory task progress.
 * 
 * Capabilities:
 * - Track session status (running/idle)
 * - Track message growth and last activity timestamps
 * - Compute "maybe stuck" heuristics
 * - Exponential backoff to avoid polling storms
 */

import { BackgroundTaskStore } from './store.js';
import { BackgroundTaskRecord, isTerminalStatus, OpencodeClient } from './types.js';

/**
 * Configuration for the background poller.
 */
export interface PollerConfig {
  /** Base polling interval in ms (default: 5000) */
  pollIntervalMs?: number;
  /** Max polling interval with backoff (default: 30000) */
  maxPollIntervalMs?: number;
  /** Time before task is considered "maybe stuck" (default: 600000 = 10 min) */
  stuckThresholdMs?: number;
  /** Minimum runtime before stuck detection kicks in (default: 30000 = 30 sec) */
  minRuntimeBeforeStuckMs?: number;
  /** Consecutive stable polls before marking as stable (default: 3) */
  stableCountThreshold?: number;
}

/**
 * Optional callbacks for reacting to observed session state.
 *
 * NOTE: Poller remains "read-only" with respect to `.hive`.
 * These callbacks are intended for in-memory lifecycle transitions (e.g. marking
 * a background task completed) handled by the owning manager.
 */
export interface PollerHandlers {
  /**
   * Invoked when the poller observes that a background session is idle/complete.
   *
   * The owning manager should:
   * - transition the task to a terminal state
   * - release any concurrency slot
   * - cleanup poller state
   */
  onSessionIdle?: (sessionId: string, reason: 'status' | 'stable') => void;
}

const DEFAULT_CONFIG: Required<PollerConfig> = {
  pollIntervalMs: 5000,
  maxPollIntervalMs: 30000,
  stuckThresholdMs: 10 * 60 * 1000, // 10 minutes
  minRuntimeBeforeStuckMs: 30 * 1000, // 30 seconds
  stableCountThreshold: 3,
};

/**
 * Observation result for a single task.
 */
export interface TaskObservation {
  taskId: string;
  sessionId: string;
  status: string;
  messageCount: number;
  lastActivityAt: string | null;
  maybeStuck: boolean;
  stablePolls: number;
  isStable: boolean;
}

/**
 * Internal tracking state per task.
 */
interface TaskPollingState {
  lastMessageCount: number;
  stablePolls: number;
  lastPollAt: number;
  consecutiveErrors: number;
}

/**
 * Background Poller - read-only observer for task sessions.
 * 
 * IMPORTANT: This poller does NOT write to .hive.
 * It only updates in-memory task progress for status reporting.
 */
export class BackgroundPoller {
  private store: BackgroundTaskStore;
  private client: OpencodeClient;
  private config: Required<PollerConfig>;
  private handlers: PollerHandlers;
  private pollingState: Map<string, TaskPollingState> = new Map();
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private isPolling = false;
  private currentIntervalMs: number;

  constructor(
    store: BackgroundTaskStore,
    client: OpencodeClient,
    config: PollerConfig = {},
    handlers: PollerHandlers = {}
  ) {
    this.store = store;
    this.client = client;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.handlers = handlers;
    this.currentIntervalMs = this.config.pollIntervalMs;
  }

  /**
   * Start the background poller.
   * Automatically stops when no active tasks remain.
   */
  start(): void {
    if (this.pollInterval) return;

    this.pollInterval = setInterval(() => {
      this.poll().catch(err => {
        console.warn('[BackgroundPoller] Poll error:', err);
      });
    }, this.currentIntervalMs);

    // Don't keep process alive just for polling
    this.pollInterval.unref();
  }

  /**
   * Stop the background poller.
   */
  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isPolling = false;
  }

  /**
   * Check if poller is currently running.
   */
  isRunning(): boolean {
    return this.pollInterval !== null;
  }

  /**
   * Get observations for all active tasks.
   * This is a read-only snapshot of current state.
   */
  getObservations(): TaskObservation[] {
    const observations: TaskObservation[] = [];
    const activeTasks = this.store.getActive();

    for (const task of activeTasks) {
      const state = this.pollingState.get(task.taskId);
      const observation = this.buildObservation(task, state);
      observations.push(observation);
    }

    return observations;
  }

  /**
   * Get observation for a specific task.
   */
  getTaskObservation(taskId: string): TaskObservation | null {
    const task = this.store.get(taskId);
    if (!task) return null;

    const state = this.pollingState.get(taskId);
    return this.buildObservation(task, state);
  }

  /**
   * Perform a single poll cycle.
   * Updates in-memory progress only - NO .hive writes.
   */
  async poll(): Promise<void> {
    if (this.isPolling) return; // Prevent concurrent polls
    this.isPolling = true;

    try {
      const activeTasks = this.store.getActive();

      // Auto-stop if no active tasks
      if (activeTasks.length === 0) {
        this.stop();
        return;
      }

      // Batch fetch session statuses if possible
      let sessionStatuses: Record<string, { type: string }> = {};
      try {
        const statusResult = await this.client.session.status?.();
        sessionStatuses = (statusResult?.data ?? {}) as Record<string, { type: string }>;
      } catch {
        // Session status endpoint may not exist - continue with message-based detection
      }

      // Poll each active task
      for (const task of activeTasks) {
        if (task.status !== 'running') continue;
        await this.pollTask(task, sessionStatuses);
      }

      // Adjust polling interval based on activity
      this.adjustPollingInterval(activeTasks);
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * Poll a single task and update its progress.
   * READ-ONLY: Only updates in-memory store, never writes .hive.
   */
  private async pollTask(
    task: BackgroundTaskRecord,
    sessionStatuses: Record<string, { type: string }>
  ): Promise<void> {
    const state = this.pollingState.get(task.taskId) ?? {
      lastMessageCount: 0,
      stablePolls: 0,
      lastPollAt: Date.now(),
      consecutiveErrors: 0,
    };

    try {
      const sessionType = sessionStatuses[task.sessionId]?.type;

      // Get message count from session
      const messagesResult = await this.client.session.messages({
        path: { id: task.sessionId },
      });

      const messages = messagesResult.data ?? [];
      const currentMessageCount = messages.length;

      // Update in-memory progress (NOT .hive)
      const now = new Date().toISOString();
      
      if (currentMessageCount > state.lastMessageCount) {
        // Activity detected - reset stable counter
        state.stablePolls = 0;
        this.store.updateProgress(task.taskId, {
          messageCount: currentMessageCount,
          lastMessageAt: now,
        });
      } else {
        // No new messages - increment stable counter
        state.stablePolls++;
      }

      state.lastMessageCount = currentMessageCount;
      state.lastPollAt = Date.now();
      state.consecutiveErrors = 0;

      this.pollingState.set(task.taskId, state);

      // Completion detection
      //
      // Preferred: rely on session.status() batch endpoint when available.
      // Fallback: if status is unknown, use stability (no message growth) as a
      // conservative completion signal to avoid tasks stuck "running" forever.
      const isIdle = sessionType === 'idle' || sessionType === 'completed';
      if (isIdle) {
        this.handlers.onSessionIdle?.(task.sessionId, 'status');
        return;
      }

      // If we don't have a usable status signal, use stability detection.
      // Only attempt this once the session has produced at least one message,
      // otherwise we risk completing before the agent loop actually starts.
      if (!sessionType && currentMessageCount > 0 && state.stablePolls >= this.config.stableCountThreshold) {
        // Try session.get() first if it exposes status.
        try {
          const session = await this.client.session.get({ path: { id: task.sessionId } });
          const status = (session.data as { status?: string } | undefined)?.status;
          if (status === 'idle' || status === 'completed') {
            this.handlers.onSessionIdle?.(task.sessionId, 'status');
            return;
          }
        } catch {
          // Ignore and fall back to stability.
        }

        // Last-resort fallback: stable message count for N polls.
        this.handlers.onSessionIdle?.(task.sessionId, 'stable');
      }
    } catch (error) {
      state.consecutiveErrors++;
      state.lastPollAt = Date.now();
      this.pollingState.set(task.taskId, state);

      // Don't spam errors - only log after multiple failures
      if (state.consecutiveErrors >= 3) {
        console.warn(`[BackgroundPoller] Multiple errors polling task ${task.taskId}:`, error);
      }
    }
  }

  /**
   * Build an observation from task and polling state.
   */
  private buildObservation(
    task: BackgroundTaskRecord,
    state: TaskPollingState | undefined
  ): TaskObservation {
    const now = Date.now();
    const stablePolls = state?.stablePolls ?? 0;
    const lastActivityAt = task.progress?.lastMessageAt ?? task.lastActiveAt ?? null;

    // Compute "maybe stuck" heuristic
    let maybeStuck = false;
    if (task.status === 'running' && task.startedAt) {
      const startedAt = new Date(task.startedAt).getTime();
      const runtime = now - startedAt;

      // Only check if task has been running long enough
      if (runtime >= this.config.minRuntimeBeforeStuckMs) {
        const lastActivity = lastActivityAt ? new Date(lastActivityAt).getTime() : startedAt;
        const timeSinceActivity = now - lastActivity;
        maybeStuck = timeSinceActivity >= this.config.stuckThresholdMs;
      }
    }

    return {
      taskId: task.taskId,
      sessionId: task.sessionId,
      status: task.status,
      messageCount: task.progress?.messageCount ?? 0,
      lastActivityAt,
      maybeStuck,
      stablePolls,
      isStable: stablePolls >= this.config.stableCountThreshold,
    };
  }

  /**
   * Adjust polling interval based on activity patterns.
   * Uses exponential backoff when tasks are stable.
   */
  private adjustPollingInterval(activeTasks: BackgroundTaskRecord[]): void {
    // Count how many tasks have recent activity
    const now = Date.now();
    let recentActivityCount = 0;

    for (const task of activeTasks) {
      const state = this.pollingState.get(task.taskId);
      if (state && state.stablePolls < 2) {
        recentActivityCount++;
      }
    }

    // If most tasks are stable, increase interval (backoff)
    const stableRatio = activeTasks.length > 0
      ? (activeTasks.length - recentActivityCount) / activeTasks.length
      : 0;

    if (stableRatio > 0.8) {
      // Most tasks stable - increase interval
      this.currentIntervalMs = Math.min(
        this.currentIntervalMs * 1.5,
        this.config.maxPollIntervalMs
      );
    } else if (recentActivityCount > 0) {
      // Activity detected - reset to base interval
      this.currentIntervalMs = this.config.pollIntervalMs;
    }

    // Restart interval with new timing if changed significantly
    if (this.pollInterval && Math.abs(this.currentIntervalMs - this.config.pollIntervalMs) > 1000) {
      this.stop();
      this.start();
    }
  }

  /**
   * Clean up polling state for a task.
   * Call when task reaches terminal state.
   */
  cleanupTask(taskId: string): void {
    this.pollingState.delete(taskId);
  }

  /**
   * Clear all state (for testing or shutdown).
   */
  clear(): void {
    this.stop();
    this.pollingState.clear();
  }
}

/**
 * Create a new BackgroundPoller instance.
 */
export function createPoller(
  store: BackgroundTaskStore,
  client: OpencodeClient,
  config?: PollerConfig,
  handlers?: PollerHandlers
): BackgroundPoller {
  return new BackgroundPoller(store, client, config, handlers);
}
