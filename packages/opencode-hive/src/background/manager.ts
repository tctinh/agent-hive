/**
 * Background task manager for Hive worker execution.
 * 
 * Provides the main API for:
 * - Spawning background tasks with idempotency
 * - Managing task lifecycle (start, complete, cancel)
 * - Persisting Hive-linked task metadata via TaskService
 * - Querying task status
 * - Concurrency limiting with queueing
 * - Polling/stability detection (read-only)
 * - Sequential ordering enforcement for Hive tasks
 */

import { TaskService } from 'hive-core';
import { BackgroundTaskStore, getStore } from './store.js';
import { AgentGate, createAgentGate } from './agent-gate.js';
import { ConcurrencyManager, ConcurrencyConfig, createConcurrencyManager } from './concurrency.js';
import { BackgroundPoller, PollerConfig, createPoller, TaskObservation } from './poller.js';
import {
  BackgroundTaskRecord,
  BackgroundTaskStatus,
  OpencodeClient,
  SpawnOptions,
  SpawnResult,
  isTerminalStatus,
} from './types.js';

/**
 * Options for creating a BackgroundManager.
 */
export interface BackgroundManagerOptions {
  /** OpenCode client for session management */
  client: OpencodeClient;
  /** Project root directory for TaskService */
  projectRoot: string;
  /** Optional custom store (defaults to global singleton) */
  store?: BackgroundTaskStore;
  /** Concurrency configuration */
  concurrency?: ConcurrencyConfig;
  /** Poller configuration */
  poller?: PollerConfig;
  /** Enforce sequential execution for Hive tasks (default: true) */
  enforceHiveSequential?: boolean;
}

/**
 * Background task manager.
 * Coordinates between in-memory store, agent validation, Hive persistence,
 * concurrency limiting, and polling/stability detection.
 */
export class BackgroundManager {
  private store: BackgroundTaskStore;
  private agentGate: AgentGate;
  private client: OpencodeClient;
  private taskService: TaskService;
  private concurrencyManager: ConcurrencyManager;
  private poller: BackgroundPoller;
  private enforceHiveSequential: boolean;

  constructor(options: BackgroundManagerOptions) {
    this.client = options.client;
    this.store = options.store ?? getStore();
    this.agentGate = createAgentGate(options.client);
    this.taskService = new TaskService(options.projectRoot);
    this.concurrencyManager = createConcurrencyManager(options.concurrency);
    this.poller = createPoller(this.store, options.client, options.poller);
    this.enforceHiveSequential = options.enforceHiveSequential ?? true;
  }

  /**
   * Spawn a new background task.
   * 
   * Handles idempotency:
   * - If idempotencyKey is provided and exists, returns existing task
   * - Otherwise creates new task
   * 
   * For Hive-linked tasks (hiveFeature + hiveTaskFolder provided):
   * - Enforces sequential ordering (blocks if earlier tasks pending)
   * - Persists idempotencyKey and workerSession to .hive task status.json
   * 
   * @param options - Spawn options
   * @returns Spawn result with task record
   */
  async spawn(options: SpawnOptions): Promise<SpawnResult> {
    // Check idempotency first
    if (options.idempotencyKey) {
      const existing = this.store.getByIdempotencyKey(options.idempotencyKey);
      if (existing) {
        return {
          task: existing,
          wasExisting: true,
        };
      }
    }

    // Also check by Hive task if linked
    if (options.hiveFeature && options.hiveTaskFolder) {
      const existing = this.store.getByHiveTask(options.hiveFeature, options.hiveTaskFolder);
      if (existing && !isTerminalStatus(existing.status)) {
        return {
          task: existing,
          wasExisting: true,
        };
      }

      // Enforce sequential ordering for Hive tasks
      if (this.enforceHiveSequential) {
        const orderingCheck = this.checkHiveTaskOrdering(options.hiveFeature, options.hiveTaskFolder);
        if (!orderingCheck.allowed) {
          return {
            task: null as unknown as BackgroundTaskRecord,
            wasExisting: false,
            error: orderingCheck.error,
          };
        }
      }
    }

    // Validate agent exists and is safe to spawn
    const validation = await this.agentGate.validate(options.agent);
    if (!validation.valid) {
      return {
        task: null as unknown as BackgroundTaskRecord, // Will be handled by caller
        wasExisting: false,
        error: validation.error,
      };
    }

    // Acquire concurrency slot (may wait in queue)
    const concurrencyKey = options.agent;
    try {
      await this.concurrencyManager.acquire(concurrencyKey);
    } catch (error) {
      return {
        task: null as unknown as BackgroundTaskRecord,
        wasExisting: false,
        error: `Concurrency limit reached: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }

    // Create OpenCode session
    let sessionId: string;
    try {
      const sessionResult = await this.client.session.create({
        body: {
          title: `Background: ${options.description}`,
          parentID: options.parentSessionId,
        },
      });

      if (!sessionResult.data?.id) {
        this.concurrencyManager.release(concurrencyKey);
        return {
          task: null as unknown as BackgroundTaskRecord,
          wasExisting: false,
          error: 'Failed to create OpenCode session',
        };
      }

      sessionId = sessionResult.data.id;
    } catch (error) {
      this.concurrencyManager.release(concurrencyKey);
      return {
        task: null as unknown as BackgroundTaskRecord,
        wasExisting: false,
        error: `Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }

    // Create task record
    const task = this.store.create({
      agent: options.agent,
      description: options.description,
      sessionId,
      idempotencyKey: options.idempotencyKey,
      parentSessionId: options.parentSessionId,
      parentMessageId: options.parentMessageId,
      hiveFeature: options.hiveFeature,
      hiveTaskFolder: options.hiveTaskFolder,
      workdir: options.workdir,
    });

    // Persist to Hive task status if linked
    if (options.hiveFeature && options.hiveTaskFolder) {
      try {
        this.taskService.patchBackgroundFields(
          options.hiveFeature,
          options.hiveTaskFolder,
          {
            idempotencyKey: options.idempotencyKey,
            workerSession: {
              taskId: task.taskId,
              sessionId: task.sessionId,
              agent: task.agent,
              mode: 'delegate',
              attempt: 1,
            },
          }
        );
      } catch (error) {
        // Log but don't fail - .hive persistence is secondary
        console.warn(
          `[BackgroundManager] Failed to persist to .hive: ${error instanceof Error ? error.message : 'Unknown'}`
        );
      }
    }

    // Transition to running and fire the prompt
    this.store.updateStatus(task.taskId, 'running');

    // Start the poller if not already running
    this.poller.start();

    // Fire prompt asynchronously (don't await)
    this.client.session
      .prompt({
        path: { id: sessionId },
        body: {
          agent: options.agent,
          parts: [{ type: 'text', text: options.prompt }],
          tools: {
            // Disable tools that could cause recursion
            background_task: false,
            delegate: false,
          },
        },
      })
      .catch((error: Error) => {
        // Handle prompt failure
        this.store.updateStatus(task.taskId, 'error', {
          errorMessage: error.message,
        });
        // Release concurrency slot on error
        this.concurrencyManager.release(concurrencyKey);
      });

    return {
      task: this.store.get(task.taskId)!,
      wasExisting: false,
    };
  }

  /**
   * Check if a Hive task can be started based on sequential ordering.
   * Returns error if earlier tasks are still pending/in_progress.
   */
  private checkHiveTaskOrdering(
    feature: string,
    taskFolder: string
  ): { allowed: boolean; error?: string } {
    // Extract task order from folder name (e.g., "01-task-name" -> 1)
    const orderMatch = taskFolder.match(/^(\d+)-/);
    if (!orderMatch) {
      // Can't determine order, allow execution
      return { allowed: true };
    }

    const taskOrder = parseInt(orderMatch[1], 10);
    if (taskOrder <= 1) {
      // First task, always allowed
      return { allowed: true };
    }

    // Check for any active background tasks for earlier Hive tasks in same feature
    const activeTasks = this.store.list({
      hiveFeature: feature,
      status: ['spawned', 'pending', 'running'],
    });

    for (const activeTask of activeTasks) {
      if (!activeTask.hiveTaskFolder) continue;
      
      const activeOrderMatch = activeTask.hiveTaskFolder.match(/^(\d+)-/);
      if (!activeOrderMatch) continue;

      const activeOrder = parseInt(activeOrderMatch[1], 10);
      if (activeOrder < taskOrder) {
        return {
          allowed: false,
          error: `Sequential ordering enforced: Task "${taskFolder}" cannot start while earlier task "${activeTask.hiveTaskFolder}" is still ${activeTask.status}. ` +
            `Complete or cancel the earlier task first. ` +
            `(Hive default: sequential execution for safety)`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Get a task by ID.
   */
  getTask(taskId: string): BackgroundTaskRecord | undefined {
    return this.store.get(taskId);
  }

  /**
   * Get a task by idempotency key.
   */
  getTaskByIdempotencyKey(key: string): BackgroundTaskRecord | undefined {
    return this.store.getByIdempotencyKey(key);
  }

  /**
   * Get a task by Hive feature and task folder.
   */
  getTaskByHiveTask(feature: string, taskFolder: string): BackgroundTaskRecord | undefined {
    return this.store.getByHiveTask(feature, taskFolder);
  }

  /**
   * Update task status.
   */
  updateStatus(
    taskId: string,
    status: BackgroundTaskStatus,
    options?: { errorMessage?: string }
  ): BackgroundTaskRecord {
    const task = this.store.updateStatus(taskId, status, options);

    // Persist status changes to Hive if linked
    if (task.hiveFeature && task.hiveTaskFolder) {
      try {
        this.taskService.patchBackgroundFields(
          task.hiveFeature,
          task.hiveTaskFolder,
          {
            workerSession: {
              sessionId: task.sessionId,
              lastHeartbeatAt: new Date().toISOString(),
            },
          }
        );
      } catch {
        // Ignore persistence errors
      }
    }

    return task;
  }

  /**
   * Cancel a task.
   */
  async cancel(taskId: string): Promise<BackgroundTaskRecord> {
    const task = this.store.get(taskId);
    if (!task) {
      throw new Error(`Task "${taskId}" not found`);
    }

    if (isTerminalStatus(task.status)) {
      throw new Error(`Cannot cancel task in terminal status: ${task.status}`);
    }

    // Abort the session
    try {
      await this.client.session.abort({
        path: { id: task.sessionId },
      });
    } catch {
      // Ignore abort errors (session may already be done)
    }

    // Release concurrency slot
    this.concurrencyManager.release(task.agent);

    // Clean up poller state
    this.poller.cleanupTask(taskId);

    return this.updateStatus(taskId, 'cancelled');
  }

  /**
   * Cancel all active tasks for a parent session.
   */
  async cancelAll(parentSessionId: string): Promise<BackgroundTaskRecord[]> {
    const tasks = this.store.list({
      parentSessionId,
      status: ['spawned', 'pending', 'running'],
    });

    const results: BackgroundTaskRecord[] = [];
    for (const task of tasks) {
      try {
        const cancelled = await this.cancel(task.taskId);
        results.push(cancelled);
      } catch {
        // Continue cancelling others
      }
    }

    return results;
  }

  /**
   * List all tasks, optionally filtered.
   */
  list(filter?: {
    status?: BackgroundTaskStatus | BackgroundTaskStatus[];
    parentSessionId?: string;
    hiveFeature?: string;
  }): BackgroundTaskRecord[] {
    return this.store.list(filter);
  }

  /**
   * Get all active tasks.
   */
  getActive(): BackgroundTaskRecord[] {
    return this.store.getActive();
  }

  /**
   * Handle session idle event (task completion).
   */
  handleSessionIdle(sessionId: string): void {
    const tasks = this.store.list();
    const task = tasks.find(t => t.sessionId === sessionId);
    
    if (task && task.status === 'running') {
      // Release concurrency slot
      this.concurrencyManager.release(task.agent);
      // Clean up poller state
      this.poller.cleanupTask(task.taskId);
      this.updateStatus(task.taskId, 'completed');
    }
  }

  /**
   * Handle message event (progress update).
   */
  handleMessageEvent(sessionId: string, messageText?: string): void {
    const tasks = this.store.list();
    const task = tasks.find(t => t.sessionId === sessionId);
    
    if (task && task.status === 'running') {
      this.store.updateProgress(task.taskId, {
        lastMessage: messageText?.slice(0, 200),
        lastMessageAt: new Date().toISOString(),
        messageCount: (task.progress?.messageCount ?? 0) + 1,
      });
    }
  }

  /**
   * Get the agent gate for direct access.
   */
  getAgentGate(): AgentGate {
    return this.agentGate;
  }

  /**
   * Get the concurrency manager for direct access.
   */
  getConcurrencyManager(): ConcurrencyManager {
    return this.concurrencyManager;
  }

  /**
   * Get the poller for direct access.
   */
  getPoller(): BackgroundPoller {
    return this.poller;
  }

  /**
   * Get observations for all active tasks from the poller.
   */
  getObservations(): TaskObservation[] {
    return this.poller.getObservations();
  }

  /**
   * Get observation for a specific task.
   */
  getTaskObservation(taskId: string): TaskObservation | null {
    return this.poller.getTaskObservation(taskId);
  }

  /**
   * Get task counts by status.
   */
  getCounts(): Record<BackgroundTaskStatus, number> {
    return this.store.countByStatus();
  }

  /**
   * Shutdown the manager and clean up resources.
   */
  shutdown(): void {
    this.poller.stop();
    this.concurrencyManager.clear();
  }
}

/**
 * Create a new BackgroundManager.
 */
export function createBackgroundManager(options: BackgroundManagerOptions): BackgroundManager {
  return new BackgroundManager(options);
}
