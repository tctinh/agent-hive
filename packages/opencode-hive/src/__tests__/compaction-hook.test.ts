import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { buildCompactionPrompt } from '../utils/compaction-prompt.js';
import { buildCompactionReanchor } from '../utils/compaction-anchor.js';
import type { PluginInput } from '@opencode-ai/plugin';
import { SessionService } from 'hive-core';
import type { Message, Part } from '@opencode-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('buildCompactionPrompt', () => {
  test('includes resume instruction to continue current task', () => {
    const prompt = buildCompactionPrompt();
    expect(prompt).toContain('Next action: resume from where you left off.');
    expect(prompt).toMatch(/worker|assignment|resume/i);
  });

  test('instructs reading task spec file, not full repo', () => {
    const prompt = buildCompactionPrompt();
    expect(prompt).toMatch(/worker-prompt\.md|task spec|spec file/i);
  });

  test('does not instruct calling hive_status on resume', () => {
    const prompt = buildCompactionPrompt();
    expect(prompt).not.toMatch(/hive_status/);
  });

  test('does not instruct re-reading entire codebase or full repo', () => {
    const prompt = buildCompactionPrompt();
    expect(prompt).not.toMatch(/read (the |all |entire |full )?(repo|codebase|project)/i);
  });

  test('instructs to avoid status-tool rediscovery', () => {
    const prompt = buildCompactionPrompt();
    expect(prompt).toMatch(/do not|avoid|skip/i);
    expect(prompt).toMatch(/status/i);
  });

  test('is stable across multiple calls (same output)', () => {
    const prompt1 = buildCompactionPrompt();
    const prompt2 = buildCompactionPrompt();
    expect(prompt1).toBe(prompt2);
  });

  test('is concise (under 600 characters)', () => {
    const prompt = buildCompactionPrompt();
    expect(prompt.length).toBeLessThan(600);
  });
});

describe('buildCompactionReanchor', () => {
  test('builds a primary-session reanchor without worker prompt context', () => {
    const anchor = buildCompactionReanchor({
      agent: 'hive-master',
      sessionKind: 'primary',
      directivePrompt: 'Finish the current task and report findings only.',
    });

    expect(anchor.prompt).toContain('Compaction recovery');
    expect(anchor.prompt).toContain('Role: Hive');
    expect(anchor.prompt).toContain('Original directive survives via post-compaction replay.');
    expect(anchor.prompt).not.toContain('worker-prompt.md');
    expect(anchor.context).toEqual([]);
  });

  test('builds a task-worker reanchor with exact worker prompt path', () => {
    const anchor = buildCompactionReanchor({
      agent: 'forager-worker',
      sessionKind: 'task-worker',
      featureName: 'my-feature',
      taskFolder: '01-task',
      workerPromptPath: '.hive/features/my-feature/tasks/01-task/worker-prompt.md',
    });

    expect(anchor.prompt).toContain('Compaction recovery');
    expect(anchor.prompt).toContain('Role: Forager');
    expect(anchor.prompt).toContain('Re-read worker-prompt.md now to recall your assignment.');
    expect(anchor.context).toEqual(['.hive/features/my-feature/tasks/01-task/worker-prompt.md']);
  });

  test('falls back to generic worker prompt guidance when task metadata is partial', () => {
    const anchor = buildCompactionReanchor({
      agent: 'forager-worker',
      sessionKind: 'task-worker',
    });

    expect(anchor.prompt).toContain('worker-prompt.md');
    expect(anchor.context).toEqual([]);
  });
});

function createStubShell(): PluginInput['$'] {
  const fn = ((..._args: unknown[]) => {
    throw new Error('shell not available in this test');
  }) as unknown as PluginInput['$'];
  return Object.assign(fn, {
    braces(pattern: string) { return [pattern]; },
    escape(input: string) { return input; },
    env() { return fn; },
    cwd() { return fn; },
    nothrow() { return fn; },
    throws() { return fn; },
  });
}

function buildCompactionTransformOutput(sessionID: string, cwd: string) {
  return {
    messages: [
      {
        info: {
          id: `msg-summary-${sessionID}`,
          sessionID,
          role: 'assistant',
          time: { created: Date.now() },
          system: [],
          modelID: 'm',
          providerID: 'p',
          mode: 'compaction',
          path: { cwd, root: cwd },
          cost: 0,
          tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
          summary: true,
        } as Message,
        parts: [{ id: `prt-summary-${sessionID}`, sessionID, messageID: `msg-summary-${sessionID}`, type: 'text', text: 'Summary text' } as Part],
      },
      {
        info: {
          id: `msg-continue-${sessionID}`,
          sessionID,
          role: 'user',
          time: { created: Date.now() },
        } as Message,
        parts: [{ id: `prt-continue-${sessionID}`, sessionID, messageID: `msg-continue-${sessionID}`, type: 'text', text: 'Continue if you have next steps.', synthetic: true } as Part],
      },
    ],
  };
}

describe('compaction replay on supported hooks', () => {
  let testRoot: string;
  let originalHome: string | undefined;
  let hooks: any;

  beforeEach(async () => {
    originalHome = process.env.HOME;
    testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-compaction-test-'));
    process.env.HOME = testRoot;

    fs.mkdirSync(path.join(testRoot, '.hive'), { recursive: true });

    const { execSync } = await import('child_process');
    execSync('git init', { cwd: testRoot });
    execSync('git config user.email "test@example.com"', { cwd: testRoot });
    execSync('git config user.name "Test"', { cwd: testRoot });
    fs.writeFileSync(path.join(testRoot, 'README.md'), 'test');
    execSync('git add README.md', { cwd: testRoot });
    execSync('git commit -m "init"', { cwd: testRoot });

    const { createOpencodeClient: mkClient } = await import('@opencode-ai/sdk');
    const client = mkClient({ baseUrl: 'http://localhost:1' }) as unknown as PluginInput['client'];

    const { default: pluginFactory } = await import('../index.js');
    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL('http://localhost:1'),
      project: { id: 'test', worktree: testRoot, time: { created: Date.now() } },
      client,
      $: createStubShell(),
    };
    hooks = await pluginFactory(ctx);
  });

  afterEach(() => {
    if (originalHome !== undefined) {
      process.env.HOME = originalHome;
    } else {
      delete process.env.HOME;
    }
    try {
      fs.rmSync(testRoot, { recursive: true, force: true });
    } catch (_) {}
  });

  test('does not register experimental.session.compacting', () => {
    expect(hooks['experimental.session.compacting']).toBeUndefined();
  });

  test('session.compacted marks directive replay pending and messages.transform replays stored directive once', async () => {
    const sessionService = new SessionService(testRoot);
    sessionService.trackGlobal('sess-replay', {
      agent: 'scout-researcher',
      sessionKind: 'subagent',
      directivePrompt: 'Inspect the LSP errors in trading/pipeline.py and return findings only.',
      replayDirectivePending: false,
    } as any);

    await hooks.event?.({
      event: {
        type: 'session.compacted',
        properties: { sessionID: 'sess-replay' },
      } as any,
    });

    const marked = sessionService.getGlobal('sess-replay');
    expect(marked?.replayDirectivePending).toBe(true);

    const output = buildCompactionTransformOutput('sess-replay', testRoot);
    await hooks['experimental.chat.messages.transform']?.({}, output as any);

    expect(output.messages).toHaveLength(3);
    const replay = output.messages[2];
    expect(replay.info.role).toBe('user');
    expect((replay.parts[0] as any).text).toContain('You are still Scout.');

    const cleared = sessionService.getGlobal('sess-replay');
    expect(cleared?.replayDirectivePending).toBe(false);
  });

  test('session.compacted marks replay pending for task-worker sessions with bounded recovery metadata', async () => {
    const sessionService = new SessionService(testRoot);
    sessionService.trackGlobal('sess-tw-replay', {
      agent: 'forager-worker',
      sessionKind: 'task-worker',
      featureName: 'my-feature',
      taskFolder: '01-task',
      workerPromptPath: '.hive/features/my-feature/tasks/01-task/worker-prompt.md',
      replayDirectivePending: false,
    } as any);

    await hooks.event?.({
      event: {
        type: 'session.compacted',
        properties: { sessionID: 'sess-tw-replay' },
      } as any,
    });

    const marked = sessionService.getGlobal('sess-tw-replay');
    expect(marked?.replayDirectivePending).toBe(true);
  });

  test('messages.transform appends bounded worker replay after compaction for task-worker sessions', async () => {
    const sessionService = new SessionService(testRoot);
    sessionService.trackGlobal('sess-tw-bounded', {
      agent: 'forager-worker',
      sessionKind: 'task-worker',
      featureName: 'my-feature',
      taskFolder: '05-implement-dashboard',
      workerPromptPath: '.hive/features/my-feature/tasks/05-implement-dashboard/worker-prompt.md',
      replayDirectivePending: true,
    } as any);

    const output = buildCompactionTransformOutput('sess-tw-bounded', testRoot);
    await hooks['experimental.chat.messages.transform']?.({}, output as any);

    expect(output.messages).toHaveLength(3);
    const replayText = (output.messages[2].parts[0] as any).text;
    expect(replayText).toContain('Forager');
    expect(replayText).toContain('my-feature');
    expect(replayText).toContain('05-implement-dashboard');
    expect(replayText).toContain('.hive/features/my-feature/tasks/05-implement-dashboard/worker-prompt.md');

    const cleared = sessionService.getGlobal('sess-tw-bounded');
    expect(cleared?.replayDirectivePending).toBe(false);
  });

  test('messages.transform captures initial non-synthetic user directive for later recovery', async () => {
    const output = {
      messages: [
        {
          info: {
            id: 'msg-user',
            sessionID: 'sess-capture',
            role: 'user',
            time: { created: Date.now() },
          } as Message,
          parts: [
            {
              id: 'prt-user',
              sessionID: 'sess-capture',
              messageID: 'msg-user',
              type: 'text',
              text: 'Investigate why the compacted scout forgot its role and return findings only.',
            } as Part,
          ],
        },
      ],
    };

    await hooks['experimental.chat.messages.transform']?.({}, output as any);

    const sessionService = new SessionService(testRoot);
    const session = sessionService.getGlobal('sess-capture');
    expect(session?.directivePrompt).toBe('Investigate why the compacted scout forgot its role and return findings only.');
  });
});
