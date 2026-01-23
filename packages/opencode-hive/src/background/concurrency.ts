/**
 * Concurrency Manager for background task execution.
 * 
 * Provides:
 * - Per-agent or per-model concurrency limiting
 * - Queueing with FIFO ordering
 * - Proper slot release and handoff
 * - Rate limiting with exponential backoff
 * - Timeout handling to prevent indefinite starvation
 */

/**
 * Configuration for concurrency limits.
 */
export interface ConcurrencyConfig {
  /** Default concurrent tasks per key (default: 3) */
  defaultLimit?: number;
  /** Per-agent limits: { "forager": 2, "explorer": 1 } */
  agentLimits?: Record<string, number>;
  /** Per-model limits: { "anthropic/claude-sonnet": 2 } */
  modelLimits?: Record<string, number>;
  /** Maximum wait time in queue before rejection (default: 300000 = 5 min) */
  queueTimeoutMs?: number;
  /** Minimum delay between task starts for same key (default: 1000 = 1 sec) */
  minDelayBetweenStartsMs?: number;
}

const DEFAULT_CONFIG: Required<ConcurrencyConfig> = {
  defaultLimit: 3,
  agentLimits: {},
  modelLimits: {},
  queueTimeoutMs: 5 * 60 * 1000, // 5 minutes
  minDelayBetweenStartsMs: 1000, // 1 second
};

/**
 * Queue entry with settled-flag pattern to prevent double-resolution.
 */
interface QueueEntry {
  resolve: () => void;
  reject: (error: Error) => void;
  settled: boolean;
  enqueuedAt: number;
  timeoutId: ReturnType<typeof setTimeout>;
}

/**
 * Concurrency Manager for background tasks.
 * 
 * Uses a key-based system where keys can be:
 * - Agent names: "forager", "explorer"
 * - Model identifiers: "anthropic/claude-sonnet"
 * - Custom keys: "hive-task"
 */
export class ConcurrencyManager {
  private config: Required<ConcurrencyConfig>;
  private counts: Map<string, number> = new Map();
  private queues: Map<string, QueueEntry[]> = new Map();
  private lastStartTimes: Map<string, number> = new Map();

  constructor(config: ConcurrencyConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get the concurrency limit for a key.
   * Checks model limits, then agent limits, then default.
   */
  getLimit(key: string): number {
    // Check model limits first (format: "provider/model")
    if (key.includes('/')) {
      const modelLimit = this.config.modelLimits[key];
      if (modelLimit !== undefined) {
        return modelLimit === 0 ? Infinity : modelLimit;
      }
      // Check provider-level limit
      const provider = key.split('/')[0];
      const providerLimit = this.config.modelLimits[provider];
      if (providerLimit !== undefined) {
        return providerLimit === 0 ? Infinity : providerLimit;
      }
    }

    // Check agent limits
    const agentLimit = this.config.agentLimits[key];
    if (agentLimit !== undefined) {
      return agentLimit === 0 ? Infinity : agentLimit;
    }

    // Default limit
    return this.config.defaultLimit === 0 ? Infinity : this.config.defaultLimit;
  }

  /**
   * Acquire a concurrency slot for the given key.
   * Returns immediately if slot is available, otherwise queues.
   * 
   * @throws Error if queue timeout is exceeded
   */
  async acquire(key: string): Promise<void> {
    const limit = this.getLimit(key);
    if (limit === Infinity) {
      return; // No limiting
    }

    // Check rate limiting (min delay between starts)
    await this.enforceRateLimit(key);

    const current = this.counts.get(key) ?? 0;
    if (current < limit) {
      this.counts.set(key, current + 1);
      this.lastStartTimes.set(key, Date.now());
      return;
    }

    // Queue for slot
    return new Promise<void>((resolve, reject) => {
      const queue = this.queues.get(key) ?? [];
      
      const entry: QueueEntry = {
        resolve: () => {
          if (entry.settled) return;
          entry.settled = true;
          clearTimeout(entry.timeoutId);
          this.lastStartTimes.set(key, Date.now());
          resolve();
        },
        reject: (error: Error) => {
          if (entry.settled) return;
          entry.settled = true;
          clearTimeout(entry.timeoutId);
          reject(error);
        },
        settled: false,
        enqueuedAt: Date.now(),
        timeoutId: setTimeout(() => {
          if (!entry.settled) {
            entry.settled = true;
            // Remove from queue
            const q = this.queues.get(key);
            if (q) {
              const idx = q.indexOf(entry);
              if (idx !== -1) q.splice(idx, 1);
            }
            reject(new Error(
              `Concurrency queue timeout for key "${key}" after ${this.config.queueTimeoutMs}ms`
            ));
          }
        }, this.config.queueTimeoutMs),
      };

      queue.push(entry);
      this.queues.set(key, queue);
    });
  }

  /**
   * Release a concurrency slot.
   * If there are waiters, hands off to the next one.
   */
  release(key: string): void {
    const limit = this.getLimit(key);
    if (limit === Infinity) {
      return;
    }

    const queue = this.queues.get(key);

    // Try to hand off to a waiting entry (skip any settled entries)
    while (queue && queue.length > 0) {
      const next = queue.shift()!;
      if (!next.settled) {
        // Hand off the slot to this waiter (count stays the same)
        next.resolve();
        return;
      }
    }

    // No handoff occurred - decrement the count to free the slot
    const current = this.counts.get(key) ?? 0;
    if (current > 0) {
      this.counts.set(key, current - 1);
    }
  }

  /**
   * Try to acquire without waiting.
   * Returns true if slot was acquired, false otherwise.
   */
  tryAcquire(key: string): boolean {
    const limit = this.getLimit(key);
    if (limit === Infinity) {
      return true;
    }

    const current = this.counts.get(key) ?? 0;
    if (current < limit) {
      this.counts.set(key, current + 1);
      this.lastStartTimes.set(key, Date.now());
      return true;
    }

    return false;
  }

  /**
   * Cancel all waiting entries for a key.
   */
  cancelWaiters(key: string): number {
    const queue = this.queues.get(key);
    if (!queue) return 0;

    let cancelled = 0;
    for (const entry of queue) {
      if (!entry.settled) {
        entry.reject(new Error(`Concurrency queue cancelled for key: ${key}`));
        cancelled++;
      }
    }

    this.queues.delete(key);
    return cancelled;
  }

  /**
   * Clear all state. Used during shutdown.
   */
  clear(): void {
    // Cancel all waiters
    for (const key of this.queues.keys()) {
      this.cancelWaiters(key);
    }
    this.counts.clear();
    this.queues.clear();
    this.lastStartTimes.clear();
  }

  /**
   * Get current slot count for a key.
   */
  getCount(key: string): number {
    return this.counts.get(key) ?? 0;
  }

  /**
   * Get queue length for a key.
   */
  getQueueLength(key: string): number {
    const queue = this.queues.get(key);
    if (!queue) return 0;
    return queue.filter(e => !e.settled).length;
  }

  /**
   * Get available slots for a key.
   */
  getAvailable(key: string): number {
    const limit = this.getLimit(key);
    if (limit === Infinity) return Infinity;
    const current = this.counts.get(key) ?? 0;
    return Math.max(0, limit - current);
  }

  /**
   * Check if a key is at capacity.
   */
  isAtCapacity(key: string): boolean {
    const limit = this.getLimit(key);
    if (limit === Infinity) return false;
    const current = this.counts.get(key) ?? 0;
    return current >= limit;
  }

  /**
   * Get status summary for all keys.
   */
  getStatus(): Record<string, { count: number; limit: number; queued: number }> {
    const status: Record<string, { count: number; limit: number; queued: number }> = {};

    // Include all keys with active counts
    for (const [key, count] of this.counts.entries()) {
      status[key] = {
        count,
        limit: this.getLimit(key),
        queued: this.getQueueLength(key),
      };
    }

    // Include keys with queued entries but no active count
    for (const key of this.queues.keys()) {
      if (!status[key]) {
        status[key] = {
          count: 0,
          limit: this.getLimit(key),
          queued: this.getQueueLength(key),
        };
      }
    }

    return status;
  }

  /**
   * Enforce rate limiting (minimum delay between starts).
   */
  private async enforceRateLimit(key: string): Promise<void> {
    const lastStart = this.lastStartTimes.get(key);
    if (!lastStart) return;

    const elapsed = Date.now() - lastStart;
    const delay = this.config.minDelayBetweenStartsMs - elapsed;

    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Create a new ConcurrencyManager instance.
 */
export function createConcurrencyManager(config?: ConcurrencyConfig): ConcurrencyManager {
  return new ConcurrencyManager(config);
}
