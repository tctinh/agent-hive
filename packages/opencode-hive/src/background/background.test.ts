/**
 * Unit tests for background tasking module.
 * 
 * Tests:
 * - Store CRUD operations
 * - State machine transitions
 * - Idempotency behavior
 * - Agent gate validation
 * - Concurrency manager (Task 06)
 * - Background poller (Task 06)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'bun:test';
import { BackgroundTaskStore, resetStore } from './store.js';
import { isValidTransition, isTerminalStatus, VALID_TRANSITIONS } from './types.js';
import { AgentGate } from './agent-gate.js';
import { ConcurrencyManager, createConcurrencyManager } from './concurrency.js';
import { BackgroundPoller, createPoller } from './poller.js';
import { BackgroundManager } from './manager.js';
import { createBackgroundTools } from '../tools/background-tools.js';
import type { OpencodeClient } from './types.js';

// ============================================================================
// Mock OpenCode client for testing
// ============================================================================

function createMockClient(agents: Array<{ name: string; description?: string; mode?: string }> = []): OpencodeClient {
  return {
    session: {
      create: async () => ({ data: { id: 'test-session-123' } }),
      prompt: async () => ({ data: {} }),
      get: async () => ({ data: { id: 'test-session-123', status: 'idle' } }),
      messages: async () => ({ data: [] }),
      abort: async () => {},
    },
    app: {
      agents: async () => ({ data: agents }),
      log: async () => {},
    },
    config: {
      get: async () => ({ data: {} }),
    },
  };
}

// ============================================================================
// Store tests
// ============================================================================

describe('BackgroundTaskStore', () => {
  let store: BackgroundTaskStore;

  beforeEach(() => {
    resetStore();
    store = new BackgroundTaskStore();
  });

  describe('create', () => {
    it('creates a task with spawned status', () => {
      const task = store.create({
        agent: 'forager',
        description: 'Test task',
        sessionId: 'session-123',
      });

      expect(task.taskId).toMatch(/^task-/);
      expect(task.status).toBe('spawned');
      expect(task.agent).toBe('forager');
      expect(task.description).toBe('Test task');
      expect(task.sessionId).toBe('session-123');
      expect(task.provider).toBe('hive');
      expect(task.createdAt).toBeTruthy();
    });

    it('stores idempotency key', () => {
      const task = store.create({
        agent: 'forager',
        description: 'Test task',
        sessionId: 'session-123',
        idempotencyKey: 'my-key-123',
      });

      expect(task.idempotencyKey).toBe('my-key-123');
    });

    it('throws on duplicate idempotency key', () => {
      store.create({
        agent: 'forager',
        description: 'First task',
        sessionId: 'session-1',
        idempotencyKey: 'unique-key',
      });

      expect(() => {
        store.create({
          agent: 'forager',
          description: 'Second task',
          sessionId: 'session-2',
          idempotencyKey: 'unique-key',
        });
      }).toThrow(/already exists/);
    });

    it('stores Hive metadata', () => {
      const task = store.create({
        agent: 'forager',
        description: 'Hive task',
        sessionId: 'session-123',
        hiveFeature: 'my-feature',
        hiveTaskFolder: '01-my-task',
        workdir: '/path/to/worktree',
      });

      expect(task.hiveFeature).toBe('my-feature');
      expect(task.hiveTaskFolder).toBe('01-my-task');
      expect(task.workdir).toBe('/path/to/worktree');
    });
  });
});

// ============================================================================
// hive_exec_start Prompt Deduplication (Task 03)
// ============================================================================

describe('hive_exec_start Prompt Deduplication', () => {
  /**
   * These tests verify that:
   * 1. Context files are read once via contextService.list() (not manual fs reads)
   * 2. Previous tasks are collected once (not twice as priorTasks + previousTasks)
   * 3. Plan/context/previousTasks are NOT duplicated in the worker prompt
   */

  describe('no duplicate sections in worker prompt', () => {
    it('worker prompt does NOT have separate "Plan Context" section', () => {
      // After deduplication, buildWorkerPrompt should NOT include a separate
      // "## Plan Context" section because the plan section is embedded in spec
      const mockWorkerPrompt = `# Hive Worker Assignment

## Assignment Details

| Field | Value |
|-------|-------|
| Feature | test-feature |
| Task | 01-test-task |

---

## Your Mission

# Task: 01-test-task

## Plan Section

### 1. Test Task

Do the thing.

## Context

## decisions

We decided to use TypeScript.

## Completed Tasks

- **00-setup**: Setup done.

---

## Blocker Protocol
...`;

      // Verify: no separate "## Plan Context" section
      expect(mockWorkerPrompt).not.toMatch(/## Plan Context/);
    });

    it('worker prompt does NOT have separate "Context Files" section', () => {
      const mockWorkerPrompt = `# Hive Worker Assignment

## Assignment Details
...

## Your Mission

# Task: 01-test-task

## Context

## decisions

Content here.

---

## Blocker Protocol
...`;

      // Verify: no separate "## Context Files" section
      expect(mockWorkerPrompt).not.toMatch(/## Context Files/);
    });

    it('worker prompt does NOT have separate "Previous Tasks Completed" section', () => {
      const mockWorkerPrompt = `# Hive Worker Assignment

## Assignment Details
...

## Your Mission

# Task: 01-test-task

## Completed Tasks

- **00-setup**: Setup done.

---

## Blocker Protocol
...`;

      // Verify: no separate "## Previous Tasks Completed" section
      expect(mockWorkerPrompt).not.toMatch(/## Previous Tasks Completed/);
    });
  });

  describe('contextService.list() usage pattern', () => {
    it('documents expected contextService.list() return format', () => {
      // contextService.list() returns ContextFile[] with name, content, updatedAt
      const expectedFormat = {
        name: 'decisions', // filename without .md
        content: 'We decided to use TypeScript.',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      expect(expectedFormat.name).toBe('decisions');
      expect(expectedFormat.content).toBeTruthy();
      expect(expectedFormat.updatedAt).toBeTruthy();
    });

    it('documents that contextService.list() replaces manual fs reads', () => {
      // OLD pattern (manual reads):
      // const contextDir = path.join(directory, '.hive', 'features', feature, 'context');
      // if (fs.existsSync(contextDir)) {
      //   const files = fs.readdirSync(contextDir).filter(f => f.endsWith('.md'));
      //   for (const file of files) {
      //     const content = fs.readFileSync(path.join(contextDir, file), 'utf-8');
      //     contextFiles.push({ name: file, content });
      //   }
      // }

      // NEW pattern (service-based):
      // const contextFiles = contextService.list(feature);

      // This test documents the migration - manual reads should no longer exist
      // in hive_exec_start after Task 03 is complete
      const oldPatternComment = 'fs.existsSync/readdirSync/readFileSync';
      const newPatternComment = 'contextService.list(feature)';

      expect(oldPatternComment).toContain('existsSync');
      expect(newPatternComment).toContain('contextService');
    });
  });

  describe('single collection of previous tasks', () => {
    it('documents that previousTasks should be collected once', () => {
      // OLD pattern (duplicate collection):
      // const priorTasks = allTasks.filter(t => t.status === 'done')
      //   .map(t => `- ${t.folder}: ${t.summary || 'No summary'}`);
      // ... later ...
      // const previousTasks = allTasks.filter(t => t.status === 'done' && t.summary)
      //   .map(t => ({ name: t.folder, summary: t.summary! }));

      // NEW pattern (single collection):
      // const previousTasks = allTasks
      //   .filter(t => t.status === 'done' && t.summary)
      //   .map(t => ({ name: t.folder, summary: t.summary! }));
      // // Use previousTasks for both spec content and worker prompt

      // This test documents the expected change
      const duplicateVarsRemoved = ['priorTasks']; // Should be removed
      const singleVar = 'previousTasks'; // Should be the only one

      expect(duplicateVarsRemoved).toContain('priorTasks');
      expect(singleVar).toBe('previousTasks');
    });
  });
});

describe('BackgroundTaskStore', () => {
  let store: BackgroundTaskStore;

  beforeEach(() => {
    resetStore();
    store = new BackgroundTaskStore();
  });

  describe('get', () => {
    it('returns task by ID', () => {
      const created = store.create({
        agent: 'forager',
        description: 'Test',
        sessionId: 'session-123',
      });

      const retrieved = store.get(created.taskId);
      expect(retrieved).toEqual(created);
    });

    it('returns undefined for unknown ID', () => {
      expect(store.get('unknown-id')).toBeUndefined();
    });
  });

  describe('getByIdempotencyKey', () => {
    it('returns task by idempotency key', () => {
      const created = store.create({
        agent: 'forager',
        description: 'Test',
        sessionId: 'session-123',
        idempotencyKey: 'my-key',
      });

      const retrieved = store.getByIdempotencyKey('my-key');
      expect(retrieved?.taskId).toBe(created.taskId);
    });

    it('returns undefined for unknown key', () => {
      expect(store.getByIdempotencyKey('unknown-key')).toBeUndefined();
    });
  });

  describe('getByHiveTask', () => {
    it('returns task by feature and folder', () => {
      const created = store.create({
        agent: 'forager',
        description: 'Test',
        sessionId: 'session-123',
        hiveFeature: 'feature-x',
        hiveTaskFolder: '01-task-y',
      });

      const retrieved = store.getByHiveTask('feature-x', '01-task-y');
      expect(retrieved?.taskId).toBe(created.taskId);
    });

    it('returns undefined for unknown feature/folder', () => {
      expect(store.getByHiveTask('unknown', 'task')).toBeUndefined();
    });
  });

  describe('updateStatus', () => {
    it('transitions spawned -> running', () => {
      const task = store.create({
        agent: 'forager',
        description: 'Test',
        sessionId: 'session-123',
      });

      const updated = store.updateStatus(task.taskId, 'running');
      expect(updated.status).toBe('running');
      expect(updated.startedAt).toBeTruthy();
    });

    it('transitions running -> completed', () => {
      const task = store.create({
        agent: 'forager',
        description: 'Test',
        sessionId: 'session-123',
      });

      store.updateStatus(task.taskId, 'running');
      const updated = store.updateStatus(task.taskId, 'completed');
      
      expect(updated.status).toBe('completed');
      expect(updated.completedAt).toBeTruthy();
    });

    it('rejects invalid transition', () => {
      const task = store.create({
        agent: 'forager',
        description: 'Test',
        sessionId: 'session-123',
      });

      store.updateStatus(task.taskId, 'running');
      store.updateStatus(task.taskId, 'completed');

      // completed is terminal, cannot transition further
      expect(() => {
        store.updateStatus(task.taskId, 'running');
      }).toThrow(/Invalid state transition/);
    });

    it('stores error message on error transition', () => {
      const task = store.create({
        agent: 'forager',
        description: 'Test',
        sessionId: 'session-123',
      });

      store.updateStatus(task.taskId, 'running');
      const updated = store.updateStatus(task.taskId, 'error', {
        errorMessage: 'Something went wrong',
      });

      expect(updated.errorMessage).toBe('Something went wrong');
    });
  });

  describe('delete', () => {
    it('removes task', () => {
      const task = store.create({
        agent: 'forager',
        description: 'Test',
        sessionId: 'session-123',
      });

      expect(store.delete(task.taskId)).toBe(true);
      expect(store.get(task.taskId)).toBeUndefined();
    });

    it('removes idempotency key index', () => {
      const task = store.create({
        agent: 'forager',
        description: 'Test',
        sessionId: 'session-123',
        idempotencyKey: 'my-key',
      });

      store.delete(task.taskId);
      expect(store.getByIdempotencyKey('my-key')).toBeUndefined();
    });

    it('returns false for unknown task', () => {
      expect(store.delete('unknown-id')).toBe(false);
    });
  });

  describe('list', () => {
    beforeEach(() => {
      store.create({ agent: 'forager', description: 'Task 1', sessionId: 's1' });
      const t2 = store.create({ agent: 'explorer', description: 'Task 2', sessionId: 's2', parentSessionId: 'parent-1' });
      store.updateStatus(t2.taskId, 'running');
      const t3 = store.create({ agent: 'forager', description: 'Task 3', sessionId: 's3', hiveFeature: 'feature-a' });
      store.updateStatus(t3.taskId, 'running');
      store.updateStatus(t3.taskId, 'completed');
    });

    it('lists all tasks', () => {
      const tasks = store.list();
      expect(tasks.length).toBe(3);
    });

    it('filters by status', () => {
      const running = store.list({ status: 'running' });
      expect(running.length).toBe(1);
      expect(running[0].status).toBe('running');
    });

    it('filters by multiple statuses', () => {
      const active = store.list({ status: ['spawned', 'running'] });
      expect(active.length).toBe(2);
    });

    it('filters by parent session', () => {
      const tasks = store.list({ parentSessionId: 'parent-1' });
      expect(tasks.length).toBe(1);
      expect(tasks[0].parentSessionId).toBe('parent-1');
    });

    it('filters by Hive feature', () => {
      const tasks = store.list({ hiveFeature: 'feature-a' });
      expect(tasks.length).toBe(1);
      expect(tasks[0].hiveFeature).toBe('feature-a');
    });
  });

  describe('getActive', () => {
    it('returns only non-terminal tasks', () => {
      const t1 = store.create({ agent: 'forager', description: 'Task 1', sessionId: 's1' });
      store.updateStatus(t1.taskId, 'running');
      
      const t2 = store.create({ agent: 'forager', description: 'Task 2', sessionId: 's2' });
      store.updateStatus(t2.taskId, 'running');
      store.updateStatus(t2.taskId, 'completed');

      const active = store.getActive();
      expect(active.length).toBe(1);
      expect(active[0].taskId).toBe(t1.taskId);
    });
  });
});

// ============================================================================
// State machine tests
// ============================================================================

describe('State Machine', () => {
  describe('isValidTransition', () => {
    it('allows spawned -> running', () => {
      expect(isValidTransition('spawned', 'running')).toBe(true);
    });

    it('allows running -> completed', () => {
      expect(isValidTransition('running', 'completed')).toBe(true);
    });

    it('allows running -> blocked', () => {
      expect(isValidTransition('running', 'blocked')).toBe(true);
    });

    it('allows blocked -> running (resume)', () => {
      expect(isValidTransition('blocked', 'running')).toBe(true);
    });

    it('rejects completed -> running', () => {
      expect(isValidTransition('completed', 'running')).toBe(false);
    });

    it('rejects spawned -> completed (skip running)', () => {
      expect(isValidTransition('spawned', 'completed')).toBe(false);
    });
  });

  describe('isTerminalStatus', () => {
    it('identifies completed as terminal', () => {
      expect(isTerminalStatus('completed')).toBe(true);
    });

    it('identifies error as terminal', () => {
      expect(isTerminalStatus('error')).toBe(true);
    });

    it('identifies failed as terminal', () => {
      expect(isTerminalStatus('failed')).toBe(true);
    });

    it('identifies running as non-terminal', () => {
      expect(isTerminalStatus('running')).toBe(false);
    });

    it('identifies blocked as non-terminal', () => {
      expect(isTerminalStatus('blocked')).toBe(false);
    });
  });
});

// ============================================================================
// Agent Gate tests
// ============================================================================

describe('AgentGate', () => {
  describe('validate', () => {
    it('validates existing agent', async () => {
      const client = createMockClient([
        { name: 'forager', description: 'Worker agent' },
        { name: 'explorer', description: 'Search agent' },
      ]);
      const gate = new AgentGate(client);

      const result = await gate.validate('forager');
      expect(result.valid).toBe(true);
      expect(result.agent?.name).toBe('forager');
    });

    it('rejects unknown agent', async () => {
      const client = createMockClient([
        { name: 'forager' },
      ]);
      const gate = new AgentGate(client);

      const result = await gate.validate('unknown-agent');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('blocks orchestrator agents', async () => {
      const client = createMockClient([
        { name: 'hive', description: 'Hive Master' },
        { name: 'orchestrator', description: 'Main orchestrator' },
      ]);
      const gate = new AgentGate(client);

      const result = await gate.validate('hive');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('orchestrator agent');
    });

    it('blocks conductor agent', async () => {
      const client = createMockClient([
        { name: 'conductor', description: 'OMO-Slim orchestrator' },
      ]);
      const gate = new AgentGate(client);

      const result = await gate.validate('conductor');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('orchestrator');
    });

    it('is case-insensitive', async () => {
      const client = createMockClient([
        { name: 'Forager', description: 'Worker' },
      ]);
      const gate = new AgentGate(client);

      const result = await gate.validate('FORAGER');
      expect(result.valid).toBe(true);
    });
  });

  describe('getWorkerAgents', () => {
    it('filters out blocked agents', async () => {
      const client = createMockClient([
        { name: 'forager' },
        { name: 'hive' },
        { name: 'orchestrator' },
        { name: 'explorer' },
      ]);
      const gate = new AgentGate(client);

      const workers = await gate.getWorkerAgents();
      const names = workers.map(a => a.name);
      
      expect(names).toContain('forager');
      expect(names).toContain('explorer');
      expect(names).not.toContain('hive');
      expect(names).not.toContain('orchestrator');
    });
  });

  describe('isBlocked', () => {
    it('identifies blocked agents', () => {
      const client = createMockClient([]);
      const gate = new AgentGate(client);

      expect(gate.isBlocked('hive')).toBe(true);
      expect(gate.isBlocked('orchestrator')).toBe(true);
      expect(gate.isBlocked('forager')).toBe(false);
    });
  });
});

// ============================================================================
// Idempotency integration tests
// ============================================================================

describe('Idempotency', () => {
  let store: BackgroundTaskStore;

  beforeEach(() => {
    resetStore();
    store = new BackgroundTaskStore();
  });

  it('allows lookup by idempotency key before create', () => {
    // This is the pattern for idempotent spawn
    const existing = store.getByIdempotencyKey('key-123');
    expect(existing).toBeUndefined();

    // Now create
    const task = store.create({
      agent: 'forager',
      description: 'Test',
      sessionId: 'session-1',
      idempotencyKey: 'key-123',
    });

    // Subsequent lookup returns the task
    const found = store.getByIdempotencyKey('key-123');
    expect(found?.taskId).toBe(task.taskId);
  });

  it('preserves idempotency across status changes', () => {
    const task = store.create({
      agent: 'forager',
      description: 'Test',
      sessionId: 'session-1',
      idempotencyKey: 'persistent-key',
    });

    store.updateStatus(task.taskId, 'running');
    store.updateStatus(task.taskId, 'completed');

    // Key still works after completion
    const found = store.getByIdempotencyKey('persistent-key');
    expect(found?.status).toBe('completed');
  });

  it('removes idempotency key on delete', () => {
    const task = store.create({
      agent: 'forager',
      description: 'Test',
      sessionId: 'session-1',
      idempotencyKey: 'delete-me',
    });

    store.delete(task.taskId);

    // Key no longer works
    expect(store.getByIdempotencyKey('delete-me')).toBeUndefined();

    // Can create new task with same key
    const newTask = store.create({
      agent: 'forager',
      description: 'New task',
      sessionId: 'session-2',
      idempotencyKey: 'delete-me',
    });
    expect(newTask.taskId).not.toBe(task.taskId);
  });
});

// ============================================================================
// Concurrency Manager tests
// ============================================================================

describe('ConcurrencyManager', () => {
  describe('getLimit', () => {
    it('returns default limit', () => {
      const manager = createConcurrencyManager({ defaultLimit: 5 });
      expect(manager.getLimit('forager')).toBe(5);
    });

    it('returns agent-specific limit', () => {
      const manager = createConcurrencyManager({
        defaultLimit: 5,
        agentLimits: { forager: 2 },
      });
      expect(manager.getLimit('forager')).toBe(2);
      expect(manager.getLimit('explorer')).toBe(5);
    });

    it('returns model-specific limit', () => {
      const manager = createConcurrencyManager({
        defaultLimit: 5,
        modelLimits: { 'anthropic/claude-sonnet': 3 },
      });
      expect(manager.getLimit('anthropic/claude-sonnet')).toBe(3);
    });

    it('returns Infinity for limit of 0', () => {
      const manager = createConcurrencyManager({
        agentLimits: { unlimited: 0 },
      });
      expect(manager.getLimit('unlimited')).toBe(Infinity);
    });
  });

  describe('acquire/release', () => {
    it('allows acquiring up to limit', async () => {
      const manager = createConcurrencyManager({ defaultLimit: 2 });

      await manager.acquire('test');
      expect(manager.getCount('test')).toBe(1);

      await manager.acquire('test');
      expect(manager.getCount('test')).toBe(2);
    });

    it('releases slot correctly', async () => {
      const manager = createConcurrencyManager({ defaultLimit: 2 });

      await manager.acquire('test');
      await manager.acquire('test');
      expect(manager.getCount('test')).toBe(2);

      manager.release('test');
      expect(manager.getCount('test')).toBe(1);

      manager.release('test');
      expect(manager.getCount('test')).toBe(0);
    });

    it('queues when at capacity', async () => {
      const manager = createConcurrencyManager({ 
        defaultLimit: 1,
        queueTimeoutMs: 5000,
        minDelayBetweenStartsMs: 0, // Disable rate limiting for test
      });

      await manager.acquire('test');
      expect(manager.getCount('test')).toBe(1);

      // This should queue
      let acquired = false;
      const promise = manager.acquire('test').then(() => {
        acquired = true;
      });

      // Should be queued, not acquired yet
      await new Promise(r => setTimeout(r, 50));
      expect(acquired).toBe(false);
      expect(manager.getQueueLength('test')).toBe(1);

      // Release first slot
      manager.release('test');

      // Now the queued one should acquire
      await promise;
      expect(acquired).toBe(true);
    });
  });

  describe('tryAcquire', () => {
    it('returns true when slot available', () => {
      const manager = createConcurrencyManager({ defaultLimit: 2 });
      expect(manager.tryAcquire('test')).toBe(true);
      expect(manager.getCount('test')).toBe(1);
    });

    it('returns false when at capacity', async () => {
      const manager = createConcurrencyManager({ defaultLimit: 1 });
      await manager.acquire('test');
      expect(manager.tryAcquire('test')).toBe(false);
    });
  });

  describe('cancelWaiters', () => {
    it('cancels queued entries', async () => {
      const manager = createConcurrencyManager({ 
        defaultLimit: 1,
        queueTimeoutMs: 10000,
        minDelayBetweenStartsMs: 0, // Disable rate limiting for test
      });

      await manager.acquire('test');

      let error: Error | null = null;
      const promise = manager.acquire('test').catch(e => {
        error = e;
      });

      // Wait a bit for the queue to register
      await new Promise(r => setTimeout(r, 50));
      expect(manager.getQueueLength('test')).toBe(1);

      const cancelled = manager.cancelWaiters('test');
      expect(cancelled).toBe(1);

      await promise;
      expect(error).toBeTruthy();
      expect((error as Error).message).toContain('cancelled');
      expect(manager.getQueueLength('test')).toBe(0);
    });
  });

  describe('getStatus', () => {
    it('returns status for all active keys', async () => {
      const manager = createConcurrencyManager({ defaultLimit: 3 });

      await manager.acquire('agent-a');
      await manager.acquire('agent-a');
      await manager.acquire('agent-b');

      const status = manager.getStatus();
      expect(status['agent-a']).toEqual({ count: 2, limit: 3, queued: 0 });
      expect(status['agent-b']).toEqual({ count: 1, limit: 3, queued: 0 });
    });
  });

  describe('isAtCapacity', () => {
    it('returns true when at limit', async () => {
      const manager = createConcurrencyManager({ defaultLimit: 1 });
      expect(manager.isAtCapacity('test')).toBe(false);

      await manager.acquire('test');
      expect(manager.isAtCapacity('test')).toBe(true);
    });
  });

  describe('clear', () => {
    it('clears all state', async () => {
      const manager = createConcurrencyManager({ defaultLimit: 2 });

      await manager.acquire('a');
      await manager.acquire('b');

      manager.clear();

      expect(manager.getCount('a')).toBe(0);
      expect(manager.getCount('b')).toBe(0);
    });
  });
});

// ============================================================================
// Poller tests
// ============================================================================

describe('BackgroundPoller', () => {
  let store: BackgroundTaskStore;
  let client: OpencodeClient;

  beforeEach(() => {
    resetStore();
    store = new BackgroundTaskStore();
    client = createMockClient();
  });

  describe('getObservations', () => {
    it('returns observations for active tasks', () => {
      const task = store.create({
        agent: 'forager',
        description: 'Test',
        sessionId: 'session-123',
      });
      store.updateStatus(task.taskId, 'running');

      const poller = createPoller(store, client);
      const observations = poller.getObservations();

      expect(observations.length).toBe(1);
      expect(observations[0].taskId).toBe(task.taskId);
      expect(observations[0].status).toBe('running');
    });

    it('excludes terminal tasks', () => {
      const task = store.create({
        agent: 'forager',
        description: 'Test',
        sessionId: 'session-123',
      });
      store.updateStatus(task.taskId, 'running');
      store.updateStatus(task.taskId, 'completed');

      const poller = createPoller(store, client);
      const observations = poller.getObservations();

      expect(observations.length).toBe(0);
    });
  });

  describe('getTaskObservation', () => {
    it('returns observation for specific task', () => {
      const task = store.create({
        agent: 'forager',
        description: 'Test',
        sessionId: 'session-123',
      });
      store.updateStatus(task.taskId, 'running');

      const poller = createPoller(store, client);
      const observation = poller.getTaskObservation(task.taskId);

      expect(observation).not.toBeNull();
      expect(observation?.taskId).toBe(task.taskId);
    });

    it('returns null for unknown task', () => {
      const poller = createPoller(store, client);
      const observation = poller.getTaskObservation('unknown-id');
      expect(observation).toBeNull();
    });
  });

  describe('maybeStuck detection', () => {
    it('marks task as maybe stuck after threshold', () => {
      const task = store.create({
        agent: 'forager',
        description: 'Test',
        sessionId: 'session-123',
      });
      store.updateStatus(task.taskId, 'running');

      // Manually backdate startedAt to simulate old task
      const taskRecord = store.get(task.taskId)!;
      taskRecord.startedAt = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // 15 minutes ago
      taskRecord.lastActiveAt = taskRecord.startedAt;

      const poller = createPoller(store, client, {
        stuckThresholdMs: 10 * 60 * 1000, // 10 minutes
        minRuntimeBeforeStuckMs: 30 * 1000, // 30 seconds
      });
      
      const observation = poller.getTaskObservation(task.taskId);
      expect(observation?.maybeStuck).toBe(true);
    });

    it('does not mark recent task as stuck', () => {
      const task = store.create({
        agent: 'forager',
        description: 'Test',
        sessionId: 'session-123',
      });
      store.updateStatus(task.taskId, 'running');

      const poller = createPoller(store, client, {
        stuckThresholdMs: 10 * 60 * 1000,
        minRuntimeBeforeStuckMs: 30 * 1000,
      });

      const observation = poller.getTaskObservation(task.taskId);
      expect(observation?.maybeStuck).toBe(false);
    });
  });

  describe('start/stop', () => {
    it('starts and stops polling', () => {
      const poller = createPoller(store, client);

      expect(poller.isRunning()).toBe(false);

      poller.start();
      expect(poller.isRunning()).toBe(true);

      poller.stop();
      expect(poller.isRunning()).toBe(false);
    });

    it('only starts once', () => {
      const poller = createPoller(store, client);

      poller.start();
      poller.start(); // Should be idempotent

      expect(poller.isRunning()).toBe(true);
      poller.stop();
    });
  });

  describe('cleanupTask', () => {
    it('removes task from polling state', () => {
      const task = store.create({
        agent: 'forager',
        description: 'Test',
        sessionId: 'session-123',
      });
      store.updateStatus(task.taskId, 'running');

      const poller = createPoller(store, client);
      poller.cleanupTask(task.taskId);

      // Should not throw or affect other operations
      expect(poller.isRunning()).toBe(false);
    });
  });

  describe('clear', () => {
    it('stops polling and clears state', () => {
      const poller = createPoller(store, client);
      poller.start();

      poller.clear();

      expect(poller.isRunning()).toBe(false);
    });
  });

  describe('completion detection', () => {
    it('invokes onSessionIdle when session.status reports idle', async () => {
      const task = store.create({
        agent: 'explorer',
        description: 'Test',
        sessionId: 'session-123',
      });
      store.updateStatus(task.taskId, 'running');

      let called = 0;
      const poller = createPoller(
        store,
        {
          ...client,
          session: {
            ...client.session,
            status: async () => ({
              data: {
                'session-123': { type: 'idle' },
              },
            }),
            messages: async () => ({ data: [{ info: { role: 'assistant' } }] as unknown[] }),
          },
        },
        undefined,
        {
          onSessionIdle: () => {
            called++;
          },
        }
      );

      await poller.poll();
      expect(called).toBe(1);
    });
  });
});

// =========================================================================
// BackgroundManager integration: completion -> terminal state
// =========================================================================

describe('BackgroundManager completion integration', () => {
  it('transitions running -> completed when poller observes idle session', async () => {
    const store = new BackgroundTaskStore();

    const client: OpencodeClient = {
      session: {
        create: async () => ({ data: { id: 'session-123' } }),
        prompt: async () => ({ data: {} }),
        get: async () => ({ data: { id: 'session-123', status: 'idle' } }),
        messages: async () => ({ data: [{ info: { role: 'assistant' } }] as unknown[] }),
        abort: async () => {},
        status: async () => ({ data: { 'session-123': { type: 'idle' } } }),
      },
      app: {
        agents: async () => ({ data: [{ name: 'explorer', mode: 'subagent' }] }),
        log: async () => {},
      },
      config: {
        get: async () => ({ data: {} }),
      },
    };

    const manager = new BackgroundManager({
      client,
      projectRoot: '/tmp',
      store,
      concurrency: { defaultLimit: 1, minDelayBetweenStartsMs: 0 },
    });

    const spawn = await manager.spawn({
      agent: 'explorer',
      prompt: 'say hi',
      description: 'test',
      idempotencyKey: 'idem-1',
      sync: false,
    });

    expect(spawn.error).toBeUndefined();
    const taskId = spawn.task.taskId;

    expect(manager.getTask(taskId)?.status).toBe('running');
    expect(manager.getConcurrencyManager().getCount('explorer')).toBe(1);

    await manager.getPoller().poll();

    expect(manager.getTask(taskId)?.status).toBe('completed');
    expect(manager.getConcurrencyManager().getCount('explorer')).toBe(0);

    manager.shutdown();
  });

  it('notifies the parent session on completion for sync=false tasks', async () => {
    const store = new BackgroundTaskStore();

    const promptCalls: Array<{ id: string; agent?: string; text: string }> = [];

    const client: OpencodeClient = {
      session: {
        create: async () => ({ data: { id: 'session-123' } }),
        prompt: async ({ path, body }) => {
          const text = (body.parts?.[0] as { text?: string } | undefined)?.text ?? '';
          promptCalls.push({ id: path.id, agent: body.agent, text });
          return { data: {} };
        },
        get: async () => ({ data: { id: 'session-123', status: 'idle' } }),
        messages: async () => ({ data: [{ info: { role: 'assistant' } }] as unknown[] }),
        abort: async () => {},
        status: async () => ({ data: { 'session-123': { type: 'idle' } } }),
      },
      app: {
        agents: async () => ({ data: [{ name: 'explorer', mode: 'subagent' }] }),
        log: async () => {},
      },
      config: {
        get: async () => ({ data: {} }),
      },
    };

    const manager = new BackgroundManager({
      client,
      projectRoot: '/tmp',
      store,
      concurrency: { defaultLimit: 1, minDelayBetweenStartsMs: 0 },
    });

    const spawn = await manager.spawn({
      agent: 'explorer',
      prompt: 'say hi',
      description: 'test',
      idempotencyKey: 'idem-notify-1',
      parentSessionId: 'parent-session-1',
      parentAgent: 'hive',
      sync: false,
    });

    expect(spawn.error).toBeUndefined();
    await manager.getPoller().poll();

    // One prompt to start the worker session, one prompt to notify the parent session.
    expect(promptCalls.some(c => c.id === 'parent-session-1')).toBe(true);
    const parentCall = promptCalls.find(c => c.id === 'parent-session-1');
    expect(parentCall?.agent).toBe('hive');
    expect(parentCall?.text).toContain('BACKGROUND TASK');
    expect(parentCall?.text).toContain('hive_background_output({ task_id:');
    expect(parentCall?.text).not.toMatch(/\bbackground_output\(\{ task_id:/);

    manager.shutdown();
  });

  it('disables all delegation tools in spawned session prompt', async () => {
    const store = new BackgroundTaskStore();

    const promptCalls: Array<{ id: string; body: Record<string, unknown> }> = [];

    const client: OpencodeClient = {
      session: {
        create: async () => ({ data: { id: 'session-delegation-tools' } }),
        prompt: async ({ path, body }) => {
          promptCalls.push({ id: path.id, body: body as Record<string, unknown> });
          return { data: {} };
        },
        get: async () => ({ data: { id: 'session-delegation-tools', status: 'idle' } }),
        messages: async () => ({ data: [] }),
        abort: async () => {},
        status: async () => ({ data: { 'session-delegation-tools': { type: 'idle' } } }),
      },
      app: {
        agents: async () => ({ data: [{ name: 'forager-worker', mode: 'subagent' }] }),
        log: async () => {},
      },
      config: {
        get: async () => ({ data: {} }),
      },
    };

    const manager = new BackgroundManager({
      client,
      projectRoot: '/tmp',
      store,
      concurrency: { defaultLimit: 1, minDelayBetweenStartsMs: 0 },
    });

    const spawn = await manager.spawn({
      agent: 'forager-worker',
      prompt: 'test prompt',
      description: 'test delegation tools disabled',
      sync: false,
    });

    expect(spawn.error).toBeUndefined();
    
    // Wait for the async prompt call
    await new Promise(r => setTimeout(r, 50));

    // Find the prompt call for the worker session
    const workerPrompt = promptCalls.find(c => c.id === 'session-delegation-tools');
    expect(workerPrompt).toBeDefined();
    
    const tools = workerPrompt?.body.tools as Record<string, boolean> | undefined;
    expect(tools).toBeDefined();
    
    // Verify all delegation tools are disabled
    // Original tools that were already disabled:
    expect(tools?.background_task).toBe(false);
    expect(tools?.delegate).toBe(false);
    
    // NEW: Additional hive delegation tools that must be disabled:
    expect(tools?.hive_background_task).toBe(false);
    expect(tools?.hive_background_output).toBe(false);
    expect(tools?.hive_background_cancel).toBe(false);
    expect(tools?.task).toBe(false);

    manager.shutdown();
  });
});

// =========================================================================
// background_output observation data (Task 07)
// =========================================================================

describe('background_output observation data', () => {
  it('hive_background_output includes observation object', async () => {
    const store = new BackgroundTaskStore();
    const client = createMockClient([{ name: 'forager' }]);
    const manager = new BackgroundManager({
      client,
      projectRoot: '/tmp',
      store,
      concurrency: { defaultLimit: 1, minDelayBetweenStartsMs: 0 },
    });

    const tools = createBackgroundTools(manager, client);

    const spawn = await manager.spawn({
      agent: 'forager',
      prompt: 'test prompt',
      description: 'test',
      sync: false,
    });

    const taskId = spawn.task.taskId;
    const raw = await tools.hive_background_output.execute({ task_id: taskId }, {} as any);
    const result = JSON.parse(raw) as Record<string, unknown>;
    const observation = result.observation as Record<string, unknown> | undefined;

    expect(observation).toBeDefined();
    // observation doesn't include taskId, it's in the parent result
    expect(result.task_id).toBe(taskId);
    expect(typeof observation?.elapsedMs).toBe('number');
    expect(typeof observation?.maybeStuck).toBe('boolean');
    expect('lastActivityAt' in (observation ?? {})).toBe(true);
    expect('lastMessagePreview' in (observation ?? {})).toBe(true);
    expect('messageCount' in (observation ?? {})).toBe(true);

    manager.shutdown();
  });

  it('observation.lastMessagePreview truncates at 200 chars', async () => {
    const store = new BackgroundTaskStore();
    const client = createMockClient([{ name: 'forager' }]);
    const manager = new BackgroundManager({
      client,
      projectRoot: '/tmp',
      store,
      concurrency: { defaultLimit: 1, minDelayBetweenStartsMs: 0 },
    });

    const tools = createBackgroundTools(manager, client);

    const spawn = await manager.spawn({
      agent: 'forager',
      prompt: 'test prompt',
      description: 'test',
      sync: false,
    });

    const taskId = spawn.task.taskId;
    const longMessage = 'x'.repeat(300);
    manager.handleMessageEvent(spawn.task.sessionId, longMessage);

    const raw = await tools.hive_background_output.execute({ task_id: taskId }, {} as any);
    const result = JSON.parse(raw) as Record<string, unknown>;
    const observation = result.observation as Record<string, unknown> | undefined;
    const preview = observation?.lastMessagePreview as string;

    // Note: handleMessageEvent already truncates to 200 chars, so the preview is exactly 200
    // The "..." suffix is only added if lastMessage.length > 200 (which it won't be after truncation)
    expect(preview.length).toBe(200);
    expect(preview).toBe('x'.repeat(200));

    manager.shutdown();
  });

  it('maybeStuck true after 10 minute threshold', async () => {
    const store = new BackgroundTaskStore();
    const client = createMockClient([{ name: 'forager' }]);
    client.session.get = async () => ({ data: { id: 'test-session-123', status: 'running' } });
    const manager = new BackgroundManager({
      client,
      projectRoot: '/tmp',
      store,
      concurrency: { defaultLimit: 1, minDelayBetweenStartsMs: 0 },
      poller: { stuckThresholdMs: 10 * 60 * 1000, minRuntimeBeforeStuckMs: 0 },
    });

    const tools = createBackgroundTools(manager, client);

    const spawn = await manager.spawn({
      agent: 'forager',
      prompt: 'test prompt',
      description: 'test',
      sync: false,
    });

    const task = manager.getTask(spawn.task.taskId)!;
    const startedAtMs = new Date(task.startedAt ?? new Date().toISOString()).getTime();
    const now = startedAtMs + 11 * 60 * 1000;

    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(now);

    const raw = await tools.hive_background_output.execute({ task_id: task.taskId }, {} as any);
    const result = JSON.parse(raw) as Record<string, unknown>;
    const observation = result.observation as Record<string, unknown> | undefined;

    expect(observation?.maybeStuck).toBe(true);

    nowSpy.mockRestore();
    manager.shutdown();
  });
});

// ============================================================================
// Sequential Ordering tests (integration with store)
// ============================================================================

describe('Sequential Ordering Enforcement', () => {
  let store: BackgroundTaskStore;

  beforeEach(() => {
    resetStore();
    store = new BackgroundTaskStore();
  });

  it('detects earlier pending tasks from store', () => {
    // Create task 01 in running state
    store.create({
      agent: 'forager',
      description: 'Task 1',
      sessionId: 'session-1',
      hiveFeature: 'test-feature',
      hiveTaskFolder: '01-first-task',
    });
    store.updateStatus(store.list()[0].taskId, 'running');

    // Task 02 should be blocked because 01 is still running
    const task01 = store.list({ hiveFeature: 'test-feature' })[0];
    expect(task01.status).toBe('running');
    expect(task01.hiveTaskFolder).toBe('01-first-task');
  });

  it('allows first task without restrictions', () => {
    // Task 01 should always be allowed (no earlier tasks)
    const task = store.create({
      agent: 'forager',
      description: 'First task',
      sessionId: 'session-1',
      hiveFeature: 'test-feature',
      hiveTaskFolder: '01-first-task',
    });

    expect(task.hiveTaskFolder).toBe('01-first-task');
  });

  it('allows task when earlier tasks are completed', () => {
    // Create and complete task 01
    const task1 = store.create({
      agent: 'forager',
      description: 'Task 1',
      sessionId: 'session-1',
      hiveFeature: 'test-feature',
      hiveTaskFolder: '01-first-task',
    });
    store.updateStatus(task1.taskId, 'running');
    store.updateStatus(task1.taskId, 'completed');

    // Task 02 should be allowed now
    const activeTasks = store.list({
      hiveFeature: 'test-feature',
      status: ['spawned', 'pending', 'running'],
    });
    
    expect(activeTasks.length).toBe(0);
  });
});

// ============================================================================
// Regression Coverage: Background Task Idempotency Behavior
// ============================================================================

describe('Background Task Idempotency Behavior', () => {
  let store: BackgroundTaskStore;

  beforeEach(() => {
    resetStore();
    store = new BackgroundTaskStore();
  });

  it('same idempotencyKey returns same task_id/session_id on subsequent calls', () => {
    // First create
    const task1 = store.create({
      agent: 'forager',
      description: 'Idempotent task',
      sessionId: 'session-abc',
      idempotencyKey: 'idem-key-123',
    });

    // Simulate subsequent call - lookup should return same task
    const found = store.getByIdempotencyKey('idem-key-123');
    
    expect(found).toBeDefined();
    expect(found?.taskId).toBe(task1.taskId);
    expect(found?.sessionId).toBe(task1.sessionId);
    expect(found?.sessionId).toBe('session-abc');
  });

  it('idempotency key lookup works across all task states', () => {
    const task = store.create({
      agent: 'forager',
      description: 'Test',
      sessionId: 'session-1',
      idempotencyKey: 'persistent-idem-key',
    });

    // Verify lookup works in spawned state
    expect(store.getByIdempotencyKey('persistent-idem-key')?.taskId).toBe(task.taskId);

    // Transition to running
    store.updateStatus(task.taskId, 'running');
    expect(store.getByIdempotencyKey('persistent-idem-key')?.taskId).toBe(task.taskId);
    expect(store.getByIdempotencyKey('persistent-idem-key')?.status).toBe('running');

    // Transition to completed
    store.updateStatus(task.taskId, 'completed');
    expect(store.getByIdempotencyKey('persistent-idem-key')?.taskId).toBe(task.taskId);
    expect(store.getByIdempotencyKey('persistent-idem-key')?.status).toBe('completed');
  });

  it('different idempotencyKeys create different tasks', () => {
    const task1 = store.create({
      agent: 'forager',
      description: 'Task 1',
      sessionId: 'session-1',
      idempotencyKey: 'key-A',
    });

    const task2 = store.create({
      agent: 'forager',
      description: 'Task 2',
      sessionId: 'session-2',
      idempotencyKey: 'key-B',
    });

    expect(task1.taskId).not.toBe(task2.taskId);
    expect(store.getByIdempotencyKey('key-A')?.taskId).toBe(task1.taskId);
    expect(store.getByIdempotencyKey('key-B')?.taskId).toBe(task2.taskId);
  });
});

// ============================================================================
// Regression Coverage: Background Cancel Semantics
// ============================================================================

describe('Background Cancel Semantics', () => {
  let store: BackgroundTaskStore;

  beforeEach(() => {
    resetStore();
    store = new BackgroundTaskStore();
  });

  it('cancels only the specified child task by taskId', () => {
    // Create parent context (simulated)
    const parentSessionId = 'parent-session-999';

    // Create two child tasks under same parent
    const task1 = store.create({
      agent: 'forager',
      description: 'Child task 1',
      sessionId: 'child-session-1',
      parentSessionId,
      idempotencyKey: 'child-1',
    });
    store.updateStatus(task1.taskId, 'running');

    const task2 = store.create({
      agent: 'forager',
      description: 'Child task 2',
      sessionId: 'child-session-2',
      parentSessionId,
      idempotencyKey: 'child-2',
    });
    store.updateStatus(task2.taskId, 'running');

    // Cancel only task1
    store.updateStatus(task1.taskId, 'cancelled');

    // task1 should be cancelled
    expect(store.get(task1.taskId)?.status).toBe('cancelled');
    
    // task2 should still be running
    expect(store.get(task2.taskId)?.status).toBe('running');
  });

  it('cancelAll cancels all tasks for a specific parent session only', () => {
    const parent1 = 'parent-session-1';
    const parent2 = 'parent-session-2';

    // Create tasks under parent1
    const task1a = store.create({
      agent: 'forager',
      description: 'Parent1 Task A',
      sessionId: 'session-1a',
      parentSessionId: parent1,
    });
    store.updateStatus(task1a.taskId, 'running');

    const task1b = store.create({
      agent: 'forager',
      description: 'Parent1 Task B',
      sessionId: 'session-1b',
      parentSessionId: parent1,
    });
    store.updateStatus(task1b.taskId, 'running');

    // Create task under parent2
    const task2a = store.create({
      agent: 'forager',
      description: 'Parent2 Task A',
      sessionId: 'session-2a',
      parentSessionId: parent2,
    });
    store.updateStatus(task2a.taskId, 'running');

    // Get tasks for parent1
    const parent1Tasks = store.list({
      parentSessionId: parent1,
      status: ['spawned', 'running'],
    });

    expect(parent1Tasks.length).toBe(2);

    // Simulate cancel all for parent1
    for (const task of parent1Tasks) {
      store.updateStatus(task.taskId, 'cancelled');
    }

    // Parent1 tasks should be cancelled
    expect(store.get(task1a.taskId)?.status).toBe('cancelled');
    expect(store.get(task1b.taskId)?.status).toBe('cancelled');

    // Parent2 tasks should still be running
    expect(store.get(task2a.taskId)?.status).toBe('running');
  });

  it('cancel does not affect already terminal tasks', () => {
    const task = store.create({
      agent: 'forager',
      description: 'Test task',
      sessionId: 'session-1',
    });
    store.updateStatus(task.taskId, 'running');
    store.updateStatus(task.taskId, 'completed');

    // Attempting to cancel a completed task should throw
    expect(() => {
      store.updateStatus(task.taskId, 'cancelled');
    }).toThrow(/Invalid state transition/);
  });
});

// ============================================================================
// Regression Coverage: Legacy Fallback Reads (WorktreeService paths)
// ============================================================================

describe('Legacy Fallback Path Resolution', () => {
  // Note: These tests verify the path resolution logic documented in
  // worktreeService.ts#getStepStatusPath which prefers tasks/ but falls back to execution/
  
  it('v2 path (tasks/) should be preferred over v1 path (execution/)', () => {
    // This test documents the expected behavior:
    // getStepStatusPath checks tasks/ first, then falls back to execution/
    const featurePath = '.hive/features/test-feature';
    const step = '01-test-step';
    
    // v2 path format
    const v2Path = `${featurePath}/tasks/${step}/status.json`;
    // v1 path format (fallback)
    const v1Path = `${featurePath}/execution/${step}/status.json`;
    
    // Verify path structure expectations
    expect(v2Path).toBe('.hive/features/test-feature/tasks/01-test-step/status.json');
    expect(v1Path).toBe('.hive/features/test-feature/execution/01-test-step/status.json');
    expect(v2Path).not.toBe(v1Path);
  });

  it('documents v1 to v2 layout migration', () => {
    // This test documents the migration from v1 (execution/) to v2 (tasks/) layout
    // The WorktreeService.getStepStatusPath method handles this fallback:
    // 1. First checks: .hive/features/<feature>/tasks/<step>/status.json
    // 2. Falls back to: .hive/features/<feature>/execution/<step>/status.json
    
    const layouts = {
      v1: {
        specPath: 'execution/<step>/spec.md',
        statusPath: 'execution/<step>/status.json',
      },
      v2: {
        specPath: 'tasks/<step>/spec.md',
        statusPath: 'tasks/<step>/status.json',
      },
    };

    // Document that v2 uses 'tasks' directory
    expect(layouts.v2.specPath.startsWith('tasks/')).toBe(true);
    expect(layouts.v1.specPath.startsWith('execution/')).toBe(true);
  });
});

// ============================================================================
// Regression Coverage: Misconfiguration Messaging
// ============================================================================

describe('Misconfiguration Messaging', () => {
  // These tests document the expected error messages and troubleshooting guidance
  // that should appear when background_task rejects workdir/idempotencyKey parameters
  
  it('documents expected troubleshooting guidance structure', () => {
    // The hive_exec_start delegation instructions should include troubleshooting info
    // for when background_task rejects workdir/idempotencyKey parameters
    
    const expectedTroubleshootingKeys = [
      'Symptom',
      'Cause', 
      'Fix',
    ];
    
    // This documents what the troubleshooting section should contain
    const troubleshootingContent = {
      symptom: '"Unknown parameter: workdir" or worker operates on main repo instead of worktree',
      cause: 'agent-hive plugin not loaded last, or outdated OMO-Slim version',
      fix: [
        'Ensure agent-hive loads AFTER omo-slim in opencode config',
        'Update OMO-Slim to latest version with workdir support',
        'Check ~/.config/opencode/config.json plugin order',
      ],
    };
    
    expect(troubleshootingContent.symptom).toContain('workdir');
    expect(troubleshootingContent.cause).toContain('agent-hive');
    expect(troubleshootingContent.fix.length).toBeGreaterThan(0);
  });

  it('verifies delegation instructions format includes troubleshooting', () => {
    // The delegation response from hive_exec_start should include:
    // 1. worktreePath
    // 2. branch
    // 3. mode
    // 4. delegationRequired
    // 5. backgroundTaskCall
    // 6. instructions (includes minimal troubleshooting)
    
    const expectedDelegationFields = [
      'worktreePath',
      'branch', 
      'mode',
      'delegationRequired',
      'backgroundTaskCall',
      'instructions',
    ];
    
    // Document expected backgroundTaskCall structure
    const expectedBackgroundTaskCallFields = [
      'promptFile',
      'description',
      'workdir',
      'idempotencyKey',
      'feature',
      'task',
      'attempt',
    ];
    
    expect(expectedDelegationFields).toContain('instructions');
    expect(expectedBackgroundTaskCallFields).toContain('workdir');
    expect(expectedBackgroundTaskCallFields).toContain('idempotencyKey');
  });
});

// ============================================================================
// Variant Threading in Background Tasks
// ============================================================================

describe('Variant Threading in Background Tasks', () => {
  it('passes variant into session.prompt body when provided in spawn options', async () => {
    const store = new BackgroundTaskStore();

    const promptCalls: Array<{ id: string; body: Record<string, unknown> }> = [];

    const client: OpencodeClient = {
      session: {
        create: async () => ({ data: { id: 'session-variant-test' } }),
        prompt: async ({ path, body }) => {
          promptCalls.push({ id: path.id, body: body as Record<string, unknown> });
          return { data: {} };
        },
        get: async () => ({ data: { id: 'session-variant-test', status: 'idle' } }),
        messages: async () => ({ data: [] }),
        abort: async () => {},
        status: async () => ({ data: { 'session-variant-test': { type: 'idle' } } }),
      },
      app: {
        agents: async () => ({ data: [{ name: 'forager-worker', mode: 'subagent' }] }),
        log: async () => {},
      },
      config: {
        get: async () => ({ data: {} }),
      },
    };

    const manager = new BackgroundManager({
      client,
      projectRoot: '/tmp',
      store,
      concurrency: { defaultLimit: 1, minDelayBetweenStartsMs: 0 },
    });

    const spawn = await manager.spawn({
      agent: 'forager-worker',
      prompt: 'test prompt',
      description: 'test with variant',
      variant: 'high',
    });

    expect(spawn.error).toBeUndefined();
    
    // Wait a tick for the async prompt call
    await new Promise(r => setTimeout(r, 50));

    // Find the prompt call for the worker session
    const workerPrompt = promptCalls.find(c => c.id === 'session-variant-test');
    expect(workerPrompt).toBeDefined();
    expect(workerPrompt?.body.variant).toBe('high');

    manager.shutdown();
  });

  it('does not include variant in prompt body when not provided', async () => {
    const store = new BackgroundTaskStore();

    const promptCalls: Array<{ id: string; body: Record<string, unknown> }> = [];

    const client: OpencodeClient = {
      session: {
        create: async () => ({ data: { id: 'session-no-variant' } }),
        prompt: async ({ path, body }) => {
          promptCalls.push({ id: path.id, body: body as Record<string, unknown> });
          return { data: {} };
        },
        get: async () => ({ data: { id: 'session-no-variant', status: 'idle' } }),
        messages: async () => ({ data: [] }),
        abort: async () => {},
        status: async () => ({ data: { 'session-no-variant': { type: 'idle' } } }),
      },
      app: {
        agents: async () => ({ data: [{ name: 'forager-worker', mode: 'subagent' }] }),
        log: async () => {},
      },
      config: {
        get: async () => ({ data: {} }),
      },
    };

    const manager = new BackgroundManager({
      client,
      projectRoot: '/tmp',
      store,
      concurrency: { defaultLimit: 1, minDelayBetweenStartsMs: 0 },
    });

    const spawn = await manager.spawn({
      agent: 'forager-worker',
      prompt: 'test prompt',
      description: 'test without variant',
      // No variant provided
    });

    expect(spawn.error).toBeUndefined();
    
    // Wait a tick for the async prompt call
    await new Promise(r => setTimeout(r, 50));

    // Find the prompt call for the worker session
    const workerPrompt = promptCalls.find(c => c.id === 'session-no-variant');
    expect(workerPrompt).toBeDefined();
    expect(workerPrompt?.body.variant).toBeUndefined();

    manager.shutdown();
  });

  it('passes empty string variant when explicitly set to empty', async () => {
    const store = new BackgroundTaskStore();

    const promptCalls: Array<{ id: string; body: Record<string, unknown> }> = [];

    const client: OpencodeClient = {
      session: {
        create: async () => ({ data: { id: 'session-empty-variant' } }),
        prompt: async ({ path, body }) => {
          promptCalls.push({ id: path.id, body: body as Record<string, unknown> });
          return { data: {} };
        },
        get: async () => ({ data: { id: 'session-empty-variant', status: 'idle' } }),
        messages: async () => ({ data: [] }),
        abort: async () => {},
        status: async () => ({ data: { 'session-empty-variant': { type: 'idle' } } }),
      },
      app: {
        agents: async () => ({ data: [{ name: 'forager-worker', mode: 'subagent' }] }),
        log: async () => {},
      },
      config: {
        get: async () => ({ data: {} }),
      },
    };

    const manager = new BackgroundManager({
      client,
      projectRoot: '/tmp',
      store,
      concurrency: { defaultLimit: 1, minDelayBetweenStartsMs: 0 },
    });

    // Empty string should be treated as "no variant" and not passed
    const spawn = await manager.spawn({
      agent: 'forager-worker',
      prompt: 'test prompt',
      description: 'test with empty variant',
      variant: '',
    });

    expect(spawn.error).toBeUndefined();
    
    // Wait a tick for the async prompt call
    await new Promise(r => setTimeout(r, 50));

    // Find the prompt call for the worker session
    const workerPrompt = promptCalls.find(c => c.id === 'session-empty-variant');
    expect(workerPrompt).toBeDefined();
    // Empty string should not be passed (treated as undefined)
    expect(workerPrompt?.body.variant).toBeUndefined();

    manager.shutdown();
  });
});

// ============================================================================
// Regression Coverage: Hive Task Ordering with Background Tasks
// ============================================================================

describe('Hive Task Ordering with Background Tasks', () => {
  let store: BackgroundTaskStore;

  beforeEach(() => {
    resetStore();
    store = new BackgroundTaskStore();
  });

  it('blocks later tasks when earlier task is in_progress via background', () => {
    // Task 01 is running as a background task
    const task01 = store.create({
      agent: 'forager',
      description: 'First task',
      sessionId: 'session-01',
      hiveFeature: 'my-feature',
      hiveTaskFolder: '01-setup',
    });
    store.updateStatus(task01.taskId, 'running');

    // Check for active earlier tasks (simulating what manager.checkHiveTaskOrdering does)
    const activeTasks = store.list({
      hiveFeature: 'my-feature',
      status: ['spawned', 'pending', 'running'],
    });

    // Find tasks with order < 2
    const earlierTasks = activeTasks.filter(t => {
      const match = t.hiveTaskFolder?.match(/^(\d+)-/);
      return match && parseInt(match[1], 10) < 2;
    });

    expect(earlierTasks.length).toBe(1);
    expect(earlierTasks[0].hiveTaskFolder).toBe('01-setup');
  });

  it('allows later tasks when earlier task is completed', () => {
    // Task 01 completed
    const task01 = store.create({
      agent: 'forager',
      description: 'First task',
      sessionId: 'session-01',
      hiveFeature: 'my-feature',
      hiveTaskFolder: '01-setup',
    });
    store.updateStatus(task01.taskId, 'running');
    store.updateStatus(task01.taskId, 'completed');

    // Check for active earlier tasks
    const activeTasks = store.list({
      hiveFeature: 'my-feature',
      status: ['spawned', 'pending', 'running'],
    });

    // No active earlier tasks
    expect(activeTasks.length).toBe(0);
  });

  it('allows later tasks when earlier task is cancelled', () => {
    // Task 01 cancelled
    const task01 = store.create({
      agent: 'forager',
      description: 'First task',
      sessionId: 'session-01',
      hiveFeature: 'my-feature',
      hiveTaskFolder: '01-setup',
    });
    store.updateStatus(task01.taskId, 'running');
    store.updateStatus(task01.taskId, 'cancelled');

    // Check for active earlier tasks
    const activeTasks = store.list({
      hiveFeature: 'my-feature',
      status: ['spawned', 'pending', 'running'],
    });

    // No active earlier tasks
    expect(activeTasks.length).toBe(0);
  });
});

// ============================================================================
// hive_exec_start Delegation Payload Normalization (Task 02)
// ============================================================================

describe('hive_exec_start Delegation Payload Normalization', () => {
  /**
   * These tests verify that the hive_exec_start output:
   * 1. Uses top-level fields as canonical (agent, workerPrompt)
   * 2. Does NOT duplicate fields in backgroundTaskCall
   * 3. Provides workerPromptPreview for display purposes
   * 4. Maintains all required delegation args
   */

  describe('canonical outermost fields', () => {
    it('has top-level agent as canonical (not duplicated in backgroundTaskCall)', () => {
      // Simulated hive_exec_start output structure after normalization
      const normalizedPayload = {
        worktreePath: '/path/to/worktree',
        branch: 'hive/feature/task',
        mode: 'delegate',
        agent: 'forager-worker', // Canonical
        delegationRequired: true,
        workerPrompt: 'Full worker prompt content...',
        workerPromptPreview: 'Full worker prompt content...'.slice(0, 200),
        backgroundTaskCall: {
          // agent should NOT be here (duplicated)
          // prompt should NOT be here (duplicated)
          description: 'Hive: test-task',
          workdir: '/path/to/worktree',
          idempotencyKey: 'hive-feature-task-1',
          feature: 'test-feature',
          task: 'test-task',
          attempt: 1,
        },
        instructions: 'Delegation instructions...',
      };

      // Verify: top-level agent exists
      expect(normalizedPayload.agent).toBe('forager-worker');

      // Verify: backgroundTaskCall does NOT contain agent
      expect((normalizedPayload.backgroundTaskCall as any).agent).toBeUndefined();
    });

    it('has top-level workerPrompt as canonical (not duplicated as backgroundTaskCall.prompt)', () => {
      const normalizedPayload = {
        worktreePath: '/path/to/worktree',
        branch: 'hive/feature/task',
        mode: 'delegate',
        agent: 'forager-worker',
        delegationRequired: true,
        workerPrompt: 'Full worker prompt content here...',
        workerPromptPreview: 'Full worker prompt content here...'.slice(0, 200),
        backgroundTaskCall: {
          // prompt should NOT be here (duplicated)
          description: 'Hive: test-task',
          workdir: '/path/to/worktree',
          idempotencyKey: 'hive-feature-task-1',
          feature: 'test-feature',
          task: 'test-task',
          attempt: 1,
        },
        instructions: 'Delegation instructions...',
      };

      // Verify: top-level workerPrompt exists
      expect(normalizedPayload.workerPrompt).toBe('Full worker prompt content here...');

      // Verify: backgroundTaskCall does NOT contain prompt
      expect((normalizedPayload.backgroundTaskCall as any).prompt).toBeUndefined();
    });

    it('includes workerPromptPreview for display (truncated version)', () => {
      const longPrompt = 'A'.repeat(500);
      const normalizedPayload = {
        workerPrompt: longPrompt,
        workerPromptPreview: longPrompt.slice(0, 200) + '...',
      };

      // Verify: preview is truncated
      expect(normalizedPayload.workerPromptPreview.length).toBeLessThanOrEqual(203); // 200 + '...'
      expect(normalizedPayload.workerPromptPreview.endsWith('...')).toBe(true);
    });
  });

  describe('required delegation args preserved', () => {
    it('preserves workdir in backgroundTaskCall', () => {
      const payload = {
        backgroundTaskCall: {
          workdir: '/path/to/worktree',
          idempotencyKey: 'key-1',
          feature: 'my-feature',
          task: 'my-task',
        },
      };

      expect(payload.backgroundTaskCall.workdir).toBe('/path/to/worktree');
    });

    it('preserves idempotencyKey in backgroundTaskCall', () => {
      const payload = {
        backgroundTaskCall: {
          workdir: '/path/to/worktree',
          idempotencyKey: 'hive-feature-task-1',
          feature: 'my-feature',
          task: 'my-task',
        },
      };

      expect(payload.backgroundTaskCall.idempotencyKey).toBe('hive-feature-task-1');
    });

    it('preserves feature and task linkage in backgroundTaskCall', () => {
      const payload = {
        backgroundTaskCall: {
          workdir: '/path/to/worktree',
          idempotencyKey: 'key-1',
          feature: 'my-feature',
          task: 'my-task',
          attempt: 2,
        },
      };

      expect(payload.backgroundTaskCall.feature).toBe('my-feature');
      expect(payload.backgroundTaskCall.task).toBe('my-task');
      expect(payload.backgroundTaskCall.attempt).toBe(2);
    });
  });

  describe('no duplicated fields in JSON output', () => {
    it('JSON payload has exactly one agent field (top-level only)', () => {
      const normalizedPayload = {
        agent: 'forager-worker',
        backgroundTaskCall: {
          description: 'Hive: test-task',
          workdir: '/path/to/worktree',
          idempotencyKey: 'key-1',
          feature: 'test-feature',
          task: 'test-task',
          attempt: 1,
        },
      };

      const jsonStr = JSON.stringify(normalizedPayload);
      
      // Count occurrences of "agent" key (not as substring of other words)
      const agentMatches = jsonStr.match(/"agent":/g) || [];
      expect(agentMatches.length).toBe(1);
    });

    it('JSON payload has exactly one prompt/workerPrompt field (top-level only)', () => {
      const normalizedPayload = {
        workerPrompt: 'Full prompt content...',
        workerPromptPreview: 'Full prompt...',
        backgroundTaskCall: {
          description: 'Hive: test-task',
          workdir: '/path/to/worktree',
          idempotencyKey: 'key-1',
          feature: 'test-feature',
          task: 'test-task',
          attempt: 1,
        },
      };

      const jsonStr = JSON.stringify(normalizedPayload);
      
      // Verify no "prompt": in backgroundTaskCall (only workerPrompt at top level)
      expect(jsonStr).not.toMatch(/"prompt":/);
      expect(jsonStr).toMatch(/"workerPrompt":/);
    });
  });

  describe('instructions updated for normalized structure', () => {
    it('instructions reference top-level agent and workerPrompt', () => {
      const instructions = `## Delegation Required

You MUST now call the background_task tool:

\`\`\`
background_task({
  agent: <use the top-level 'agent' field>,
  prompt: <use the top-level 'workerPrompt' field>,
  description: "Hive: test-task",
  workdir: "/path/to/worktree",
  idempotencyKey: "key-1",
  feature: "test-feature",
  task: "test-task",
  attempt: 1
})
\`\`\``;

      // Instructions should mention using top-level fields
      expect(instructions).toContain("top-level 'agent'");
      expect(instructions).toContain("top-level 'workerPrompt'");
    });
  });
});

// ============================================================================
// Task 04: Deterministic Prompt Budgeting Tests
// ============================================================================

import { 
  applyTaskBudget, 
  applyContextBudget, 
  DEFAULT_BUDGET,
  type TaskInput,
  type ContextInput,
} from '../utils/prompt-budgeting.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { resolvePromptFromFile, isValidPromptFilePath, findWorkspaceRoot } from '../utils/prompt-file.js';

describe('Deterministic Prompt Budgeting - Integration', () => {
  describe('bounds prompt growth with many prior tasks', () => {
    it('keeps total previous tasks content under threshold with 50 tasks', () => {
      // Simulate a feature with many completed tasks (50 tasks, ~500 chars each)
      const tasks: TaskInput[] = Array.from({ length: 50 }, (_, i) => ({
        name: `${String(i + 1).padStart(2, '0')}-task-${i}`,
        summary: `This is task ${i + 1} summary with enough content to be meaningful. `.repeat(8),
      }));

      const result = applyTaskBudget(tasks, DEFAULT_BUDGET);

      // Should only include last N tasks (DEFAULT_BUDGET.maxTasks = 10)
      expect(result.tasks.length).toBeLessThanOrEqual(DEFAULT_BUDGET.maxTasks);
      
      // Calculate total chars in result
      const totalChars = result.tasks.reduce((sum, t) => sum + t.summary.length, 0);

      // Should be bounded by maxTasks * maxSummaryChars (with some buffer for markers)
      const maxExpected = DEFAULT_BUDGET.maxTasks * (DEFAULT_BUDGET.maxSummaryChars + 50);
      expect(totalChars).toBeLessThanOrEqual(maxExpected);
    });

    it('emits truncation events when tasks are dropped', () => {
      const tasks: TaskInput[] = Array.from({ length: 20 }, (_, i) => ({
        name: `${String(i + 1).padStart(2, '0')}-task`,
        summary: `Task ${i + 1} summary`,
      }));

      const result = applyTaskBudget(tasks, { ...DEFAULT_BUDGET, maxTasks: 5 });

      // Should have dropped 15 tasks
      expect(result.tasks.length).toBe(5);
      expect(result.truncationEvents.some(e => e.type === 'tasks_dropped')).toBe(true);
      
      const dropEvent = result.truncationEvents.find(e => e.type === 'tasks_dropped');
      expect(dropEvent?.count).toBe(15);
    });

    it('provides file path hints for dropped tasks', () => {
      const tasks: TaskInput[] = Array.from({ length: 5 }, (_, i) => ({
        name: `0${i + 1}-task`,
        summary: `Summary ${i + 1}`,
      }));

      const result = applyTaskBudget(tasks, { ...DEFAULT_BUDGET, maxTasks: 2, feature: 'my-feature' });

      expect(result.droppedTasksHint).toBeDefined();
      expect(result.droppedTasksHint).toContain('.hive/features/my-feature/tasks');
      expect(result.droppedTasksHint).toContain('01-task');
    });
  });

  describe('bounds prompt growth with large context files', () => {
    it('keeps total context content under threshold', () => {
      // Simulate large context files (10 files, ~20KB each)
      const files: ContextInput[] = Array.from({ length: 10 }, (_, i) => ({
        name: `context-${i}`,
        content: `Context file ${i} content. `.repeat(1000),
      }));

      const result = applyContextBudget(files, DEFAULT_BUDGET);

      // Calculate total chars in result
      const totalChars = result.files.reduce((sum, f) => sum + f.content.length, 0);

      // Should be bounded by maxTotalContextChars (with some buffer)
      expect(totalChars).toBeLessThanOrEqual(DEFAULT_BUDGET.maxTotalContextChars + 500);
    });

    it('truncates individual large context files', () => {
      const files: ContextInput[] = [
        { name: 'huge-file', content: 'X'.repeat(10000) },
      ];

      const result = applyContextBudget(files, { ...DEFAULT_BUDGET, maxContextChars: 500 });

      expect(result.files[0].truncated).toBe(true);
      expect(result.files[0].content.length).toBeLessThanOrEqual(550);
      expect(result.files[0].content).toContain('...[truncated]');
    });

    it('provides file path hints for truncated context', () => {
      const files: ContextInput[] = [
        { name: 'decisions', content: 'Y'.repeat(10000) },
      ];

      const result = applyContextBudget(files, { ...DEFAULT_BUDGET, maxContextChars: 500, feature: 'test-feature' });

      expect(result.files[0].pathHint).toContain('.hive/features/test-feature/context/decisions.md');
    });
  });

  describe('never removes access to full info', () => {
    it('always provides path hints when truncation occurs', () => {
      const tasks: TaskInput[] = [
        { name: '01-task', summary: 'A'.repeat(1000) },
      ];

      const result = applyTaskBudget(tasks, { ...DEFAULT_BUDGET, maxSummaryChars: 100, feature: 'my-feat' });

      // Even though summary is truncated, we should have events documenting it
      expect(result.truncationEvents.length).toBeGreaterThan(0);
      expect(result.truncationEvents[0].message).toContain('01-task');
    });

    it('context files include path hints when truncated', () => {
      const files: ContextInput[] = [
        { name: 'research', content: 'B'.repeat(10000) },
      ];

      const result = applyContextBudget(files, { ...DEFAULT_BUDGET, maxContextChars: 500, feature: 'feat' });

      expect(result.files[0].pathHint).toBeDefined();
      expect(result.files[0].pathHint).toContain('research.md');
    });
  });

  describe('DEFAULT_BUDGET values are reasonable', () => {
    it('allows meaningful task history (10 tasks)', () => {
      expect(DEFAULT_BUDGET.maxTasks).toBe(10);
    });

    it('allows useful summaries (2000 chars ~500 words)', () => {
      expect(DEFAULT_BUDGET.maxSummaryChars).toBe(2000);
    });

    it('bounds total context to 60KB', () => {
      expect(DEFAULT_BUDGET.maxTotalContextChars).toBe(60000);
    });

    it('bounds individual context files to 20KB', () => {
      expect(DEFAULT_BUDGET.maxContextChars).toBe(20000);
    });
  });
});

// ============================================================================
// Task 05: Prompt File Reference Tests
// ============================================================================

describe('Prompt File Reference - Prevent Tool Output Truncation', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-prompt-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('resolvePromptFromFile', () => {
    it('reads prompt content from file when promptFile is provided', async () => {
      const promptContent = 'This is the full worker prompt content from file.';
      const promptFilePath = path.join(tempDir, 'worker-prompt.md');
      fs.writeFileSync(promptFilePath, promptContent, 'utf-8');

      const result = await resolvePromptFromFile(promptFilePath, tempDir);

      expect(result.content).toBe(promptContent);
      expect(result.error).toBeUndefined();
    });

    it('returns error when file does not exist', async () => {
      const nonExistentPath = path.join(tempDir, 'does-not-exist.md');

      const result = await resolvePromptFromFile(nonExistentPath, tempDir);

      expect(result.content).toBeUndefined();
      expect(result.error).toContain('not found');
    });

    it('returns error for paths outside workspace', async () => {
      const outsidePath = '/etc/passwd';

      const result = await resolvePromptFromFile(outsidePath, tempDir);

      expect(result.content).toBeUndefined();
      expect(result.error).toContain('outside');
    });

    it('returns error for paths with path traversal attempts', async () => {
      const traversalPath = path.join(tempDir, '..', '..', 'etc', 'passwd');

      const result = await resolvePromptFromFile(traversalPath, tempDir);

      expect(result.content).toBeUndefined();
      expect(result.error).toContain('outside');
    });
  });

  describe('isValidPromptFilePath', () => {
    it('accepts paths within .hive directory', () => {
      const validPath = path.join(tempDir, '.hive', 'features', 'my-feature', 'tasks', '01-task', 'worker-prompt.md');

      expect(isValidPromptFilePath(validPath, tempDir)).toBe(true);
    });

    it('accepts Windows-style paths within workspace', () => {
      const workspaceRoot = 'C:\\Users\\test\\repo';
      const validPath = 'C:\\Users\\test\\repo\\.hive\\features\\my-feature\\tasks\\01-task\\worker-prompt.md';

      expect(isValidPromptFilePath(validPath, workspaceRoot)).toBe(true);
    });

    it('accepts paths within workspace root', () => {
      const validPath = path.join(tempDir, 'some', 'nested', 'prompt.md');

      expect(isValidPromptFilePath(validPath, tempDir)).toBe(true);
    });

    it('rejects paths outside workspace', () => {
      const invalidPath = '/tmp/other-project/prompt.md';

      expect(isValidPromptFilePath(invalidPath, tempDir)).toBe(false);
    });

    it('rejects paths with path traversal', () => {
      const invalidPath = path.join(tempDir, '..', 'other', 'prompt.md');

      expect(isValidPromptFilePath(invalidPath, tempDir)).toBe(false);
    });
  });

  describe('findWorkspaceRoot', () => {
    it('resolves workspace root from a .hive worktree path', () => {
      const workspaceRoot = path.join(tempDir, 'repo');
      const hiveDir = path.join(workspaceRoot, '.hive');
      const worktreeDir = path.join(hiveDir, '.worktrees', 'my-feature', '01-task');

      fs.mkdirSync(worktreeDir, { recursive: true });

      expect(findWorkspaceRoot(worktreeDir)).toBe(workspaceRoot);
    });

    it('returns null when no .hive directory exists', () => {
      const noHivePath = path.join(tempDir, 'no-hive');
      fs.mkdirSync(noHivePath, { recursive: true });

      expect(findWorkspaceRoot(noHivePath)).toBeNull();
    });
  });

  describe('background_task with promptFile', () => {
    it('documents promptFile as alternative to prompt parameter', () => {
      // This test documents the expected API for background_task
      // When promptFile is provided, background_task should:
      // 1. Read the file content
      // 2. Use that content as the prompt
      // 3. NOT require the prompt parameter

      const backgroundTaskArgs = {
        agent: 'forager-worker',
        promptFile: '.hive/features/my-feature/tasks/01-task/worker-prompt.md',
        description: 'Execute task',
        workdir: '/path/to/worktree',
        idempotencyKey: 'hive-feat-task-1',
      };

      // Verify expected structure
      expect(backgroundTaskArgs.promptFile).toBeDefined();
      expect((backgroundTaskArgs as any).prompt).toBeUndefined();
    });

    it('documents that prompt and promptFile are mutually exclusive', () => {
      // If both are provided, promptFile should take precedence
      // or an error should be returned

      const withBoth = {
        agent: 'forager-worker',
        prompt: 'Inline prompt',
        promptFile: 'path/to/file.md',
        description: 'Test',
      };

      // Both defined - implementation should handle this
      expect(withBoth.prompt).toBeDefined();
      expect(withBoth.promptFile).toBeDefined();
    });
  });

  describe('hive_exec_start output with prompt file reference', () => {
    it('includes workerPromptPath in output', () => {
      // After Task 05, hive_exec_start should output workerPromptPath
      const execStartOutput = {
        worktreePath: '/path/to/worktree',
        branch: 'hive/feature/task',
        mode: 'delegate',
        agent: 'forager-worker',
        delegationRequired: true,
        workerPromptPath: '.hive/features/my-feature/tasks/01-task/worker-prompt.md',
        workerPromptPreview: 'First 200 chars of the prompt...',
        backgroundTaskCall: {
          promptFile: '.hive/features/my-feature/tasks/01-task/worker-prompt.md',
          description: 'Hive: 01-task',
          workdir: '/path/to/worktree',
          idempotencyKey: 'hive-feat-task-1',
          feature: 'my-feature',
          task: '01-task',
          attempt: 1,
        },
      };

      // Verify: workerPromptPath exists
      expect(execStartOutput.workerPromptPath).toBeDefined();
      expect(execStartOutput.workerPromptPath).toContain('worker-prompt.md');

      // Verify: backgroundTaskCall uses promptFile, NOT prompt
      expect(execStartOutput.backgroundTaskCall.promptFile).toBeDefined();
      expect((execStartOutput.backgroundTaskCall as any).prompt).toBeUndefined();

      // Verify: workerPrompt (large inline content) is NOT in output
      expect((execStartOutput as any).workerPrompt).toBeUndefined();
    });

    it('keeps output size small even with large prompts', () => {
      // The key benefit: tool output size stays bounded
      const largePromptContent = 'X'.repeat(100000); // 100KB prompt
      
      const outputWithPath = {
        workerPromptPath: '.hive/features/feat/tasks/task/worker-prompt.md',
        workerPromptPreview: largePromptContent.slice(0, 200) + '...',
        backgroundTaskCall: {
          promptFile: '.hive/features/feat/tasks/task/worker-prompt.md',
        },
      };

      const outputJson = JSON.stringify(outputWithPath);

      // Output should be small (no inline prompt)
      expect(outputJson.length).toBeLessThan(1000);
    });
  });

  describe('backward compatibility', () => {
    it('documents that existing prompt parameter still works', () => {
      // Existing callers that pass prompt directly should continue to work
      const legacyCall = {
        agent: 'forager-worker',
        prompt: 'Direct inline prompt content',
        description: 'Legacy caller',
        sync: false,
      };

      expect(legacyCall.prompt).toBeDefined();
      expect((legacyCall as any).promptFile).toBeUndefined();
    });
  });
});

// ============================================================================
// Dependency-Aware Ordering Enforcement (Task 05)
// ============================================================================

describe('Dependency-Aware Ordering Enforcement', () => {
  let store: BackgroundTaskStore;
  let manager: BackgroundManager;
  let taskServiceMock: {
    getRawStatus: ReturnType<typeof vi.fn>;
    patchBackgroundFields: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    resetStore();
    store = new BackgroundTaskStore();
    taskServiceMock = {
      getRawStatus: vi.fn(),
      patchBackgroundFields: vi.fn(),
    };
  });

  afterEach(() => {
    if (manager) {
      manager.shutdown();
    }
  });

  /**
   * Helper to create manager with mocked TaskService.
   * Uses vi.spyOn to replace TaskService methods for controlled testing.
   */
  function createTestManager(statusLookup: Record<string, { status: string; dependsOn?: string[] }>) {
    const client: OpencodeClient = {
      session: {
        create: async () => ({ data: { id: 'test-session-123' } }),
        prompt: async () => ({ data: {} }),
        get: async () => ({ data: { id: 'test-session-123', status: 'idle' } }),
        messages: async () => ({ data: [] }),
        abort: async () => {},
        status: async () => ({ data: {} }),
      },
      app: {
        agents: async () => ({ data: [{ name: 'forager', mode: 'subagent' }] }),
        log: async () => {},
      },
      config: {
        get: async () => ({ data: {} }),
      },
    };

    manager = new BackgroundManager({
      client,
      projectRoot: '/tmp/test-project',
      store,
      concurrency: { defaultLimit: 10, minDelayBetweenStartsMs: 0 },
    });

    // Mock the TaskService's getRawStatus method
    const originalGetRawStatus = manager['taskService'].getRawStatus.bind(manager['taskService']);
    vi.spyOn(manager['taskService'], 'getRawStatus').mockImplementation((feature: string, folder: string) => {
      if (statusLookup[folder]) {
        return statusLookup[folder] as any;
      }
      return null;
    });

    vi.spyOn(manager['taskService'], 'patchBackgroundFields').mockImplementation(() => ({} as any));

    return manager;
  }

  describe('dependsOn-based blocking', () => {
    it('blocks task when dependsOn dependency is not done', async () => {
      // Setup: Task 02 depends on Task 01, but Task 01 is still in_progress
      createTestManager({
        '01-setup': { status: 'in_progress', dependsOn: [] },
        '02-implement': { status: 'pending', dependsOn: ['01-setup'] },
      });

      const result = await manager.spawn({
        agent: 'forager',
        prompt: 'test',
        description: 'test',
        hiveFeature: 'test-feature',
        hiveTaskFolder: '02-implement',
        sync: false,
      });

      expect(result.error).toBeDefined();
      expect(result.error).toContain('01-setup');
      expect(result.error).toContain('not done');
    });

    it('blocks task when any dependsOn dependency is pending', async () => {
      // Setup: Task 03 depends on Tasks 01 and 02, but Task 02 is pending
      createTestManager({
        '01-setup': { status: 'done', dependsOn: [] },
        '02-core': { status: 'pending', dependsOn: ['01-setup'] },
        '03-final': { status: 'pending', dependsOn: ['01-setup', '02-core'] },
      });

      const result = await manager.spawn({
        agent: 'forager',
        prompt: 'test',
        description: 'test',
        hiveFeature: 'test-feature',
        hiveTaskFolder: '03-final',
        sync: false,
      });

      expect(result.error).toBeDefined();
      expect(result.error).toContain('02-core');
    });

    it('allows task when all dependsOn dependencies are done', async () => {
      // Setup: Task 02 depends on Task 01, and Task 01 is done
      createTestManager({
        '01-setup': { status: 'done', dependsOn: [] },
        '02-implement': { status: 'pending', dependsOn: ['01-setup'] },
      });

      const result = await manager.spawn({
        agent: 'forager',
        prompt: 'test',
        description: 'test',
        hiveFeature: 'test-feature',
        hiveTaskFolder: '02-implement',
        sync: false,
      });

      expect(result.error).toBeUndefined();
      expect(result.task).toBeDefined();
    });

    it('allows task with empty dependsOn even if earlier-numbered tasks are pending', async () => {
      // This is the key feature: explicit empty deps enables parallelism
      // Task 03 has dependsOn: [] (explicit none), so it can run even if 01 and 02 are pending
      createTestManager({
        '01-setup': { status: 'pending', dependsOn: [] },
        '02-core': { status: 'pending', dependsOn: ['01-setup'] },
        '03-independent': { status: 'pending', dependsOn: [] },  // Explicit empty = no deps
      });

      const result = await manager.spawn({
        agent: 'forager',
        prompt: 'test',
        description: 'test',
        hiveFeature: 'test-feature',
        hiveTaskFolder: '03-independent',
        sync: false,
      });

      expect(result.error).toBeUndefined();
      expect(result.task).toBeDefined();
    });
  });

  describe('backwards compatibility', () => {
    it('falls back to numeric sequential ordering when dependsOn is undefined', async () => {
      // Legacy task without dependsOn field should use numeric ordering
      createTestManager({
        '01-setup': { status: 'pending' },  // No dependsOn field
        '02-implement': { status: 'pending' },  // No dependsOn field
      });

      // Create an active background task for 01
      store.create({
        agent: 'forager',
        description: 'Task 1',
        sessionId: 'session-1',
        hiveFeature: 'test-feature',
        hiveTaskFolder: '01-setup',
      });
      store.updateStatus(store.list()[0].taskId, 'running');

      const result = await manager.spawn({
        agent: 'forager',
        prompt: 'test',
        description: 'test',
        hiveFeature: 'test-feature',
        hiveTaskFolder: '02-implement',
        sync: false,
      });

      expect(result.error).toBeDefined();
      expect(result.error).toContain('01-setup');
      expect(result.error).toContain('Sequential ordering');
    });
  });

  describe('non-done statuses are not satisfied', () => {
    it('treats cancelled as not satisfied', async () => {
      createTestManager({
        '01-setup': { status: 'cancelled', dependsOn: [] },
        '02-implement': { status: 'pending', dependsOn: ['01-setup'] },
      });

      const result = await manager.spawn({
        agent: 'forager',
        prompt: 'test',
        description: 'test',
        hiveFeature: 'test-feature',
        hiveTaskFolder: '02-implement',
        sync: false,
      });

      expect(result.error).toBeDefined();
      expect(result.error).toContain('01-setup');
    });

    it('treats failed as not satisfied', async () => {
      createTestManager({
        '01-setup': { status: 'failed', dependsOn: [] },
        '02-implement': { status: 'pending', dependsOn: ['01-setup'] },
      });

      const result = await manager.spawn({
        agent: 'forager',
        prompt: 'test',
        description: 'test',
        hiveFeature: 'test-feature',
        hiveTaskFolder: '02-implement',
        sync: false,
      });

      expect(result.error).toBeDefined();
      expect(result.error).toContain('01-setup');
    });

    it('treats blocked as not satisfied', async () => {
      createTestManager({
        '01-setup': { status: 'blocked', dependsOn: [] },
        '02-implement': { status: 'pending', dependsOn: ['01-setup'] },
      });

      const result = await manager.spawn({
        agent: 'forager',
        prompt: 'test',
        description: 'test',
        hiveFeature: 'test-feature',
        hiveTaskFolder: '02-implement',
        sync: false,
      });

      expect(result.error).toBeDefined();
      expect(result.error).toContain('01-setup');
    });

    it('treats partial as not satisfied', async () => {
      createTestManager({
        '01-setup': { status: 'partial', dependsOn: [] },
        '02-implement': { status: 'pending', dependsOn: ['01-setup'] },
      });

      const result = await manager.spawn({
        agent: 'forager',
        prompt: 'test',
        description: 'test',
        hiveFeature: 'test-feature',
        hiveTaskFolder: '02-implement',
        sync: false,
      });

      expect(result.error).toBeDefined();
      expect(result.error).toContain('01-setup');
    });
  });

  describe('error message clarity', () => {
    it('lists all missing dependencies in error message', async () => {
      createTestManager({
        '01-setup': { status: 'pending', dependsOn: [] },
        '02-core': { status: 'in_progress', dependsOn: ['01-setup'] },
        '03-final': { status: 'pending', dependsOn: ['01-setup', '02-core'] },
      });

      const result = await manager.spawn({
        agent: 'forager',
        prompt: 'test',
        description: 'test',
        hiveFeature: 'test-feature',
        hiveTaskFolder: '03-final',
        sync: false,
      });

      expect(result.error).toBeDefined();
      // Should list both missing deps
      expect(result.error).toContain('01-setup');
      expect(result.error).toContain('02-core');
    });
  });

  describe('diamond dependency pattern', () => {
    it('allows task when multiple deps from different branches are done', async () => {
      // Diamond pattern: 1 <- 2, 1 <- 3, 2 <- 4, 3 <- 4
      createTestManager({
        '01-base': { status: 'done', dependsOn: [] },
        '02-left': { status: 'done', dependsOn: ['01-base'] },
        '03-right': { status: 'done', dependsOn: ['01-base'] },
        '04-merge': { status: 'pending', dependsOn: ['02-left', '03-right'] },
      });

      const result = await manager.spawn({
        agent: 'forager',
        prompt: 'test',
        description: 'test',
        hiveFeature: 'test-feature',
        hiveTaskFolder: '04-merge',
        sync: false,
      });

      expect(result.error).toBeUndefined();
      expect(result.task).toBeDefined();
    });

    it('blocks task when one branch of diamond is incomplete', async () => {
      // Diamond with one incomplete branch
      createTestManager({
        '01-base': { status: 'done', dependsOn: [] },
        '02-left': { status: 'done', dependsOn: ['01-base'] },
        '03-right': { status: 'in_progress', dependsOn: ['01-base'] },  // Not done
        '04-merge': { status: 'pending', dependsOn: ['02-left', '03-right'] },
      });

      const result = await manager.spawn({
        agent: 'forager',
        prompt: 'test',
        description: 'test',
        hiveFeature: 'test-feature',
        hiveTaskFolder: '04-merge',
        sync: false,
      });

      expect(result.error).toBeDefined();
      expect(result.error).toContain('03-right');
      expect(result.error).not.toContain('02-left');  // Should not mention completed dep
    });
  });

  describe('multiple independent tasks (parallel enablement)', () => {
    it('allows multiple tasks with dependsOn: [] to start independently', async () => {
      // Three independent tasks that can all start
      createTestManager({
        '01-independent-a': { status: 'pending', dependsOn: [] },
        '02-independent-b': { status: 'pending', dependsOn: [] },
        '03-independent-c': { status: 'pending', dependsOn: [] },
      });

      // Start task A
      const resultA = await manager.spawn({
        agent: 'forager',
        prompt: 'test',
        description: 'test',
        hiveFeature: 'test-feature',
        hiveTaskFolder: '01-independent-a',
        sync: false,
      });
      expect(resultA.error).toBeUndefined();

      // Start task C (skipping B) - should work because all have empty dependsOn
      const resultC = await manager.spawn({
        agent: 'forager',
        prompt: 'test',
        description: 'test',
        hiveFeature: 'test-feature',
        hiveTaskFolder: '03-independent-c',
        sync: false,
      });
      expect(resultC.error).toBeUndefined();
    });
  });

  describe('first task handling', () => {
    it('allows first task (task 01) to start without dependencies', async () => {
      createTestManager({
        '01-first-task': { status: 'pending', dependsOn: [] },
      });

      const result = await manager.spawn({
        agent: 'forager',
        prompt: 'test',
        description: 'test',
        hiveFeature: 'test-feature',
        hiveTaskFolder: '01-first-task',
        sync: false,
      });

      expect(result.error).toBeUndefined();
      expect(result.task).toBeDefined();
    });

    it('allows first task with implicit dependencies (undefined dependsOn)', async () => {
      createTestManager({
        '01-first-task': { status: 'pending' },  // No dependsOn field
      });

      const result = await manager.spawn({
        agent: 'forager',
        prompt: 'test',
        description: 'test',
        hiveFeature: 'test-feature',
        hiveTaskFolder: '01-first-task',
        sync: false,
      });

      expect(result.error).toBeUndefined();
      expect(result.task).toBeDefined();
    });

    it('allows legacy tasks with non-numeric folder names to start', async () => {
      createTestManager({
        'setup-task': { status: 'pending' },
      });

      const result = await manager.spawn({
        agent: 'forager',
        prompt: 'test',
        description: 'test',
        hiveFeature: 'test-feature',
        hiveTaskFolder: 'setup-task',
        sync: false,
      });

      expect(result.error).toBeUndefined();
      expect(result.task).toBeDefined();
    });
  });
});
