/**
 * Unit tests for background tasking module.
 * 
 * Tests:
 * - Store CRUD operations
 * - State machine transitions
 * - Idempotency behavior
 * - Agent gate validation
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { BackgroundTaskStore, resetStore } from './store.js';
import { isValidTransition, isTerminalStatus, VALID_TRANSITIONS } from './types.js';
import { AgentGate } from './agent-gate.js';
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
