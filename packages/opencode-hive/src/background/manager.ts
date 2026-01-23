/**
 * Background task manager for Hive worker execution.
 * 
 * Provides the main API for:
 * - Spawning background tasks with idempotency
 * - Managing task lifecycle (start, complete, cancel)
 * - Persisting Hive-linked task metadata via TaskService
 * - Querying task status
 */

import { TaskService } from 'hive-core';
import { BackgroundTaskStore, getStore } from './store.js';
import { AgentGate, createAgentGate } from './agent-gate.js';
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
}

/**
 * Background task manager.
 * Coordinates between in-memory store, agent validation, and Hive persistence.
 */
export class BackgroundManager {
  private store: BackgroundTaskStore;
  private agentGate: AgentGate;
  private client: OpencodeClient;
  private taskService: TaskService;

  constructor(options: BackgroundManagerOptions) {
    this.client = options.client;
    this.store = options.store ?? getStore();
    this.agentGate = createAgentGate(options.client);
    this.taskService = new TaskService(options.projectRoot);
  }

  /**
   * Spawn a new background task.
   * 
   * Handles idempotency:
   * - If idempotencyKey is provided and exists, returns existing task
   * - Otherwise creates new task
   * 
   * For Hive-linked tasks (hiveFeature + hiveTaskFolder provided):
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
        return {
          task: null as unknown as BackgroundTaskRecord,
          wasExisting: false,
          error: 'Failed to create OpenCode session',
        };
      }

      sessionId = sessionResult.data.id;
    } catch (error) {
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
      });

    return {
      task: this.store.get(task.taskId)!,
      wasExisting: false,
    };
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
   * Get task counts by status.
   */
  getCounts(): Record<BackgroundTaskStatus, number> {
    return this.store.countByStatus();
  }
}

/**
 * Create a new BackgroundManager.
 */
export function createBackgroundManager(options: BackgroundManagerOptions): BackgroundManager {
  return new BackgroundManager(options);
}
