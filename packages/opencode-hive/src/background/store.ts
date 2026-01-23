/**
 * In-memory store for background task records.
 * 
 * Provides:
 * - CRUD operations for task records
 * - Idempotency key lookups
 * - State machine enforcement
 * - Query methods for task filtering
 */

import {
  BackgroundTaskRecord,
  BackgroundTaskStatus,
  BackgroundTaskProgress,
  isValidTransition,
  isTerminalStatus,
} from './types.js';

/**
 * Generate a unique task ID.
 */
function generateTaskId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `task-${timestamp}-${random}`;
}

/**
 * In-memory store for background tasks.
 * Thread-safe for single-process Node.js (no concurrent access issues).
 */
export class BackgroundTaskStore {
  private tasks: Map<string, BackgroundTaskRecord> = new Map();
  private idempotencyIndex: Map<string, string> = new Map(); // idempotencyKey -> taskId

  /**
   * Create a new task record.
   * 
   * @param options - Task creation options
   * @returns The created task record
   * @throws If idempotencyKey already exists (use getByIdempotencyKey first)
   */
  create(options: {
    agent: string;
    description: string;
    sessionId: string;
    idempotencyKey?: string;
    parentSessionId?: string;
    parentMessageId?: string;
    hiveFeature?: string;
    hiveTaskFolder?: string;
    workdir?: string;
  }): BackgroundTaskRecord {
    // Check idempotency key first
    if (options.idempotencyKey) {
      const existingId = this.idempotencyIndex.get(options.idempotencyKey);
      if (existingId) {
        throw new Error(
          `Idempotency key "${options.idempotencyKey}" already exists for task "${existingId}". ` +
          `Use getByIdempotencyKey() to retrieve the existing task.`
        );
      }
    }

    const taskId = generateTaskId();
    const now = new Date().toISOString();

    const record: BackgroundTaskRecord = {
      taskId,
      sessionId: options.sessionId,
      agent: options.agent,
      description: options.description,
      status: 'spawned',
      provider: 'hive',
      idempotencyKey: options.idempotencyKey,
      createdAt: now,
      lastActiveAt: now,
      parentSessionId: options.parentSessionId,
      parentMessageId: options.parentMessageId,
      hiveFeature: options.hiveFeature,
      hiveTaskFolder: options.hiveTaskFolder,
      workdir: options.workdir,
    };

    this.tasks.set(taskId, record);

    // Index by idempotency key if provided
    if (options.idempotencyKey) {
      this.idempotencyIndex.set(options.idempotencyKey, taskId);
    }

    return record;
  }

  /**
   * Get a task by ID.
   */
  get(taskId: string): BackgroundTaskRecord | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get a task by idempotency key.
   */
  getByIdempotencyKey(key: string): BackgroundTaskRecord | undefined {
    const taskId = this.idempotencyIndex.get(key);
    if (!taskId) return undefined;
    return this.tasks.get(taskId);
  }

  /**
   * Get a task by Hive feature and task folder.
   */
  getByHiveTask(feature: string, taskFolder: string): BackgroundTaskRecord | undefined {
    for (const task of this.tasks.values()) {
      if (task.hiveFeature === feature && task.hiveTaskFolder === taskFolder) {
        return task;
      }
    }
    return undefined;
  }

  /**
   * Update task status with state machine enforcement.
   * 
   * @param taskId - Task ID to update
   * @param newStatus - New status
   * @param updates - Additional field updates
   * @returns Updated task record
   * @throws If transition is invalid
   */
  updateStatus(
    taskId: string,
    newStatus: BackgroundTaskStatus,
    updates?: Partial<Pick<BackgroundTaskRecord, 'errorMessage' | 'progress'>>
  ): BackgroundTaskRecord {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task "${taskId}" not found`);
    }

    if (!isValidTransition(task.status, newStatus)) {
      throw new Error(
        `Invalid state transition: ${task.status} -> ${newStatus} for task "${taskId}"`
      );
    }

    const now = new Date().toISOString();

    // Update timestamps based on transition
    if (newStatus === 'running' && !task.startedAt) {
      task.startedAt = now;
    }

    if (isTerminalStatus(newStatus) && !task.completedAt) {
      task.completedAt = now;
    }

    task.status = newStatus;
    task.lastActiveAt = now;

    if (updates?.errorMessage !== undefined) {
      task.errorMessage = updates.errorMessage;
    }

    if (updates?.progress !== undefined) {
      task.progress = { ...task.progress, ...updates.progress };
    }

    return task;
  }

  /**
   * Update task progress without changing status.
   */
  updateProgress(taskId: string, progress: Partial<BackgroundTaskProgress>): BackgroundTaskRecord {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task "${taskId}" not found`);
    }

    const now = new Date().toISOString();
    task.lastActiveAt = now;
    task.progress = { ...task.progress, ...progress };

    return task;
  }

  /**
   * Delete a task.
   */
  delete(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    // Remove from idempotency index
    if (task.idempotencyKey) {
      this.idempotencyIndex.delete(task.idempotencyKey);
    }

    return this.tasks.delete(taskId);
  }

  /**
   * List all tasks, optionally filtered.
   */
  list(filter?: {
    status?: BackgroundTaskStatus | BackgroundTaskStatus[];
    parentSessionId?: string;
    hiveFeature?: string;
  }): BackgroundTaskRecord[] {
    let tasks = Array.from(this.tasks.values());

    if (filter?.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      tasks = tasks.filter(t => statuses.includes(t.status));
    }

    if (filter?.parentSessionId) {
      tasks = tasks.filter(t => t.parentSessionId === filter.parentSessionId);
    }

    if (filter?.hiveFeature) {
      tasks = tasks.filter(t => t.hiveFeature === filter.hiveFeature);
    }

    // Sort by creation time (oldest first)
    return tasks.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  /**
   * Get all active (non-terminal) tasks.
   */
  getActive(): BackgroundTaskRecord[] {
    return this.list().filter(t => !isTerminalStatus(t.status));
  }

  /**
   * Get task count by status.
   */
  countByStatus(): Record<BackgroundTaskStatus, number> {
    const counts: Record<BackgroundTaskStatus, number> = {
      spawned: 0,
      pending: 0,
      running: 0,
      completed: 0,
      error: 0,
      cancelled: 0,
      blocked: 0,
      failed: 0,
    };

    for (const task of this.tasks.values()) {
      counts[task.status]++;
    }

    return counts;
  }

  /**
   * Clear all tasks (for testing).
   */
  clear(): void {
    this.tasks.clear();
    this.idempotencyIndex.clear();
  }

  /**
   * Get total task count.
   */
  get size(): number {
    return this.tasks.size;
  }
}

/**
 * Singleton store instance for the plugin lifecycle.
 * Created on first import, persists for plugin duration.
 */
let globalStore: BackgroundTaskStore | null = null;

/**
 * Get or create the global store instance.
 */
export function getStore(): BackgroundTaskStore {
  if (!globalStore) {
    globalStore = new BackgroundTaskStore();
  }
  return globalStore;
}

/**
 * Reset the global store (for testing).
 */
export function resetStore(): void {
  globalStore = null;
}
