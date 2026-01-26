import { describe, it, expect, afterEach } from 'bun:test';
import type { BackgroundManager, OpencodeClient } from '../background/index.js';
import type { BackgroundTaskRecord } from '../background/types.js';
import { createBackgroundTools } from './background-tools.js';

describe('background_output observation metadata', () => {
  const realNow = Date.now;

  afterEach(() => {
    Date.now = realNow;
  });

  it('includes formatted observation details when activity exists', async () => {
    const fixedNow = new Date('2024-01-01T00:00:10.000Z').getTime();
    Date.now = () => fixedNow;

    const startedAt = new Date(fixedNow - 65_000).toISOString();
    const lastActivityAt = new Date(fixedNow - 5_000).toISOString();

    const task: BackgroundTaskRecord = {
      provider: 'hive',
      taskId: 'task-1',
      sessionId: 'session-1',
      agent: 'forager',
      description: 'Test',
      status: 'completed',
      createdAt: startedAt,
      startedAt,
      progress: {
        messageCount: 3,
        lastMessage: 'x'.repeat(205),
        lastMessageAt: lastActivityAt,
      },
    };

    const manager = {
      getTask: (taskId: string) => (taskId === 'task-1' ? task : undefined),
      getTaskObservation: (taskId: string) =>
        taskId === 'task-1'
          ? {
              taskId: 'task-1',
              sessionId: 'session-1',
              status: 'completed',
              messageCount: 3,
              lastActivityAt,
              maybeStuck: true,
              stablePolls: 0,
              isStable: false,
            }
          : null,
    } as unknown as BackgroundManager;

    const client = {
      session: {
        messages: async () => ({ data: [{ parts: [{ type: 'text', text: 'hello' }] }] }),
      },
    } as unknown as OpencodeClient;

    const tools = createBackgroundTools(manager, client);

    const result = await tools.background_output.execute({ task_id: 'task-1' });
    const parsed = JSON.parse(result as string) as {
      observation?: {
        elapsedMs: number;
        elapsedFormatted: string;
        messageCount: number;
        lastActivityAgo: string;
        lastActivityAt: string | null;
        lastMessagePreview: string | null;
        maybeStuck: boolean;
      };
      done?: boolean;
      cursor?: string;
      output?: string;
    };

    expect(parsed.observation).toBeDefined();
    expect(parsed.observation?.elapsedMs).toBe(65_000);
    expect(parsed.observation?.elapsedFormatted).toBe('1m 5s');
    expect(parsed.observation?.messageCount).toBe(3);
    expect(parsed.observation?.lastActivityAt).toBe(lastActivityAt);
    expect(parsed.observation?.lastActivityAgo).toBe('5s ago');
    expect(parsed.observation?.lastMessagePreview).toBe(`${'x'.repeat(200)}...`);
    expect(parsed.observation?.maybeStuck).toBe(true);
    expect(parsed.done).toBe(true);
    expect(parsed.cursor).toBe('3');
    expect(parsed.output).toContain('hello');
  });

  it('reports "never" when no activity is recorded', async () => {
    const fixedNow = new Date('2024-01-01T00:10:00.000Z').getTime();
    Date.now = () => fixedNow;

    const startedAt = new Date(fixedNow - 30_000).toISOString();

    const task: BackgroundTaskRecord = {
      provider: 'hive',
      taskId: 'task-2',
      sessionId: 'session-2',
      agent: 'forager',
      description: 'Test',
      status: 'completed',
      createdAt: startedAt,
      startedAt,
      progress: {
        messageCount: 0,
      },
    };

    const manager = {
      getTask: (taskId: string) => (taskId === 'task-2' ? task : undefined),
      getTaskObservation: (taskId: string) =>
        taskId === 'task-2'
          ? {
              taskId: 'task-2',
              sessionId: 'session-2',
              status: 'completed',
              messageCount: 0,
              lastActivityAt: null,
              maybeStuck: false,
              stablePolls: 0,
              isStable: false,
            }
          : null,
    } as unknown as BackgroundManager;

    const client = {
      session: {
        messages: async () => ({ data: [] }),
      },
    } as unknown as OpencodeClient;

    const tools = createBackgroundTools(manager, client);
    const result = await tools.background_output.execute({ task_id: 'task-2' });
    const parsed = JSON.parse(result as string) as {
      observation?: {
        lastActivityAgo: string;
        lastActivityAt: string | null;
      };
    };

    expect(parsed.observation?.lastActivityAt).toBeNull();
    expect(parsed.observation?.lastActivityAgo).toBe('never');
  });
});
