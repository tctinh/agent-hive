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

  test('instructs to avoid calling hive_status as first action', () => {
    const prompt = buildCompactionPrompt();
    expect(prompt).toMatch(/do not|avoid|skip/i);
    expect(prompt).toMatch(/hive_status|status/i);
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

describe('experimental.session.compacting hook output', () => {
  test('context includes resume directives (via buildCompactionPrompt)', () => {
    const prompt = buildCompactionPrompt();
    expect(prompt).toContain('Next action: resume from where you left off.');
    expect(prompt).not.toMatch(/hive_status/);
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

describe('experimental.session.compacting hook — session-aware re-anchoring', () => {
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

  test('primary Hive session → role re-anchor, no worker-prompt.md reminder', async () => {
    const sessionService = new SessionService(testRoot);
    sessionService.trackGlobal('sess-hive', {
      agent: 'hive-master',
      sessionKind: 'primary',
    } as any);

    const output = { context: [] as string[], prompt: undefined as string | undefined };
    await hooks['experimental.session.compacting']?.({ sessionID: 'sess-hive' }, output);

    expect(output.prompt).toBeDefined();
    expect(output.prompt).toContain('Compaction recovery');
    expect(output.prompt).toContain('Role: Hive');
    expect(output.prompt).not.toContain('worker-prompt.md');
    expect(output.context.join('\n')).not.toContain('worker-prompt.md');
  });

  test('scout/hygienic session → subagent role re-anchor, no worker-prompt.md reminder', async () => {
    const sessionService = new SessionService(testRoot);
    sessionService.trackGlobal('sess-scout', {
      agent: 'scout-researcher',
      sessionKind: 'subagent',
      directivePrompt: 'Inspect the LSP errors in trading/pipeline.py and return findings only.',
    } as any);

    const output = { context: [] as string[], prompt: undefined as string | undefined };
    await hooks['experimental.session.compacting']?.({ sessionID: 'sess-scout' }, output);

    expect(output.prompt).toBeDefined();
    expect(output.prompt).toContain('Compaction recovery');
    expect(output.prompt).toContain('Role: Scout');
    expect(output.prompt).toContain('Original directive survives via post-compaction replay.');
    expect(output.prompt).not.toContain('worker-prompt.md');
    expect(output.context.join('\n')).not.toContain('worker-prompt.md');
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

    const output = {
      messages: [
        {
          info: {
            id: 'msg-summary',
            sessionID: 'sess-replay',
            role: 'assistant',
            time: { created: Date.now() },
            system: [],
            modelID: 'm',
            providerID: 'p',
            mode: 'compaction',
            path: { cwd: testRoot, root: testRoot },
            cost: 0,
            tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
            summary: true,
          } as Message,
          parts: [{ id: 'prt-summary', sessionID: 'sess-replay', messageID: 'msg-summary', type: 'text', text: 'Summary text' } as Part],
        },
        {
          info: {
            id: 'msg-continue',
            sessionID: 'sess-replay',
            role: 'user',
            time: { created: Date.now() },
          } as Message,
          parts: [{ id: 'prt-continue', sessionID: 'sess-replay', messageID: 'msg-continue', type: 'text', text: 'Continue if you have next steps.', synthetic: true } as Part],
        },
      ],
    };

    await hooks['experimental.chat.messages.transform']?.({}, output as any);

    expect(output.messages).toHaveLength(3);
    const replay = output.messages[2];
    expect(replay.info.role).toBe('user');
    expect((replay.parts[0] as any).text).toContain('You are still Scout.');
    expect((replay.parts[0] as any).text).toContain('Inspect the LSP errors in trading/pipeline.py and return findings only.');

    const cleared = sessionService.getGlobal('sess-replay');
    expect(cleared?.replayDirectivePending).toBe(false);
  });

  test('primary/subagent compaction recovery transitions available -> consumed -> escalated', async () => {
    const sessionService = new SessionService(testRoot);
    sessionService.trackGlobal('sess-state-machine', {
      agent: 'scout-researcher',
      sessionKind: 'subagent',
      directivePrompt: 'Inspect the LSP errors in trading/pipeline.py and return findings only.',
      replayDirectivePending: false,
    } as any);

    await hooks.event?.({
      event: {
        type: 'session.compacted',
        properties: { sessionID: 'sess-state-machine' },
      } as any,
    });

    let session = sessionService.getGlobal('sess-state-machine');
    expect(session?.directiveRecoveryState).toBe('available');
    expect(session?.replayDirectivePending).toBe(true);

    const firstReplayOutput = buildCompactionTransformOutput('sess-state-machine', testRoot);
    await hooks['experimental.chat.messages.transform']?.({}, firstReplayOutput as any);

    session = sessionService.getGlobal('sess-state-machine');
    expect(firstReplayOutput.messages).toHaveLength(3);
    expect(session?.directiveRecoveryState).toBe('consumed');
    expect(session?.replayDirectivePending).toBe(false);

    await hooks.event?.({
      event: {
        type: 'session.compacted',
        properties: { sessionID: 'sess-state-machine' },
      } as any,
    });

    session = sessionService.getGlobal('sess-state-machine');
    expect(session?.directiveRecoveryState).toBe('escalated');
    expect(session?.replayDirectivePending).toBe(true);

    const secondReplayOutput = buildCompactionTransformOutput('sess-state-machine', testRoot);
    await hooks['experimental.chat.messages.transform']?.({}, secondReplayOutput as any);

    session = sessionService.getGlobal('sess-state-machine');
    expect(secondReplayOutput.messages).toHaveLength(3);
    expect(session?.directiveRecoveryState).toBe('escalated');
    expect(session?.replayDirectivePending).toBe(false);
  });

  test('later compaction events do not reset escalated primary/subagent sessions back to available', async () => {
    const sessionService = new SessionService(testRoot);
    sessionService.trackGlobal('sess-escalated-terminal', {
      agent: 'hive-master',
      sessionKind: 'primary',
      directivePrompt: 'Stay on the current assignment.',
      directiveRecoveryState: 'escalated',
      replayDirectivePending: false,
    } as any);

    await hooks.event?.({
      event: {
        type: 'session.compacted',
        properties: { sessionID: 'sess-escalated-terminal' },
      } as any,
    });

    const session = sessionService.getGlobal('sess-escalated-terminal');
    expect(session?.directiveRecoveryState).toBe('escalated');
    expect(session?.replayDirectivePending).toBe(false);
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

  test('messages.transform does not capture directives from a different session id', async () => {
    const sessionService = new SessionService(testRoot);
    sessionService.trackGlobal('sess-target', {
      agent: 'scout-researcher',
      sessionKind: 'subagent',
    } as any);

    const output = {
      messages: [
        {
          info: {
            id: 'msg-target',
            sessionID: 'sess-target',
            role: 'assistant',
            time: { created: Date.now() },
            system: [],
            modelID: 'm',
            providerID: 'p',
            mode: 'normal',
            path: { cwd: testRoot, root: testRoot },
            cost: 0,
            tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
          } as Message,
          parts: [],
        },
        {
          info: {
            id: 'msg-other',
            sessionID: 'sess-other',
            role: 'user',
            time: { created: Date.now() },
          } as Message,
          parts: [
            {
              id: 'prt-other',
              sessionID: 'sess-other',
              messageID: 'msg-other',
              type: 'text',
              text: 'Wrong session directive',
            } as Part,
          ],
        },
      ],
    };

    await hooks['experimental.chat.messages.transform']?.({}, output as any);

    const session = sessionService.getGlobal('sess-target');
    expect(session?.directivePrompt).toBeUndefined();
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

  test('messages.transform appends bounded worker replay after generic continue for task-worker sessions', async () => {
    const sessionService = new SessionService(testRoot);
    sessionService.trackGlobal('sess-tw-bounded', {
      agent: 'forager-worker',
      sessionKind: 'task-worker',
      featureName: 'my-feature',
      taskFolder: '05-implement-dashboard',
      workerPromptPath: '.hive/features/my-feature/tasks/05-implement-dashboard/worker-prompt.md',
      replayDirectivePending: true,
    } as any);

    const output = {
      messages: [
        {
          info: {
            id: 'msg-summary',
            sessionID: 'sess-tw-bounded',
            role: 'assistant',
            time: { created: Date.now() },
            system: [],
            modelID: 'm',
            providerID: 'p',
            mode: 'compaction',
            path: { cwd: testRoot, root: testRoot },
            cost: 0,
            tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
            summary: true,
          } as Message,
          parts: [{ id: 'prt-summary', sessionID: 'sess-tw-bounded', messageID: 'msg-summary', type: 'text', text: 'Summary text' } as Part],
        },
        {
          info: {
            id: 'msg-continue',
            sessionID: 'sess-tw-bounded',
            role: 'user',
            time: { created: Date.now() },
          } as Message,
          parts: [{ id: 'prt-continue', sessionID: 'sess-tw-bounded', messageID: 'msg-continue', type: 'text', text: 'Continue if you have next steps.', synthetic: true } as Part],
        },
      ],
    };

    await hooks['experimental.chat.messages.transform']?.({}, output as any);

    expect(output.messages).toHaveLength(3);
    const replay = output.messages[2];
    expect(replay.info.role).toBe('user');
    const replayText = (replay.parts[0] as any).text;
    expect(replayText).toContain('Forager');
    expect(replayText).toContain('my-feature');
    expect(replayText).toContain('05-implement-dashboard');
    expect(replayText).toContain('.hive/features/my-feature/tasks/05-implement-dashboard/worker-prompt.md');
    expect(replayText).toMatch(/Resume only this task|Finish only the current task assignment/);
    expect(replayText).toMatch(/[Dd]o not merge/);
    expect(replayText).toMatch(/[Dd]o not start the next task|[Dd]o not start task/i);
    expect(replayText).toMatch(/[Dd]o not call orchestration tools unless the worker prompt explicitly says so/);

    const cleared = sessionService.getGlobal('sess-tw-bounded');
    expect(cleared?.replayDirectivePending).toBe(false);
  });

  test('messages.transform replays bounded assignment for custom forager derivatives after compaction', async () => {
    const sessionService = new SessionService(testRoot);
    sessionService.trackGlobal('sess-custom-forager', {
      agent: 'my-custom-worker',
      baseAgent: 'forager-worker',
      sessionKind: 'task-worker',
      featureName: 'feature-b',
      taskFolder: '02-second-task',
      workerPromptPath: '.hive/features/feature-b/tasks/02-second-task/worker-prompt.md',
      replayDirectivePending: true,
    } as any);

    const output = {
      messages: [
        {
          info: {
            id: 'msg-summary',
            sessionID: 'sess-custom-forager',
            role: 'assistant',
            time: { created: Date.now() },
            system: [],
            modelID: 'm',
            providerID: 'p',
            mode: 'compaction',
            path: { cwd: testRoot, root: testRoot },
            cost: 0,
            tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
            summary: true,
          } as Message,
          parts: [{ id: 'prt-summary', sessionID: 'sess-custom-forager', messageID: 'msg-summary', type: 'text', text: 'Summary text' } as Part],
        },
        {
          info: {
            id: 'msg-continue',
            sessionID: 'sess-custom-forager',
            role: 'user',
            time: { created: Date.now() },
          } as Message,
          parts: [{ id: 'prt-continue', sessionID: 'sess-custom-forager', messageID: 'msg-continue', type: 'text', text: 'Continue if you have next steps.', synthetic: true } as Part],
        },
      ],
    };

    await hooks['experimental.chat.messages.transform']?.({}, output as any);

    expect(output.messages).toHaveLength(3);
    const replay = output.messages[2];
    expect(replay.info.role).toBe('user');
    const replayText = (replay.parts[0] as any).text;
    expect(replayText).toContain('Forager');
    expect(replayText).toContain('feature-b');
    expect(replayText).toContain('02-second-task');
    expect(replayText).toContain('.hive/features/feature-b/tasks/02-second-task/worker-prompt.md');
    expect(replayText).toMatch(/Resume only this task|Finish only the current task assignment/);
    expect(replayText).toMatch(/[Dd]o not merge/);
    expect(replayText).toMatch(/[Dd]o not call orchestration tools unless the worker prompt explicitly says so/);

    const cleared = sessionService.getGlobal('sess-custom-forager');
    expect(cleared?.replayDirectivePending).toBe(false);
  });

  test('messages.transform clears replay pending without injection when task-worker metadata is incomplete', async () => {
    const sessionService = new SessionService(testRoot);
    sessionService.trackGlobal('sess-tw-incomplete', {
      agent: 'forager-worker',
      sessionKind: 'task-worker',
      replayDirectivePending: true,
    } as any);

    const output = {
      messages: [
        {
          info: {
            id: 'msg-worker',
            sessionID: 'sess-tw-incomplete',
            role: 'assistant',
            time: { created: Date.now() },
            system: [],
            modelID: 'm',
            providerID: 'p',
            mode: 'compaction',
            path: { cwd: testRoot, root: testRoot },
            cost: 0,
            tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
            summary: true,
          } as Message,
          parts: [],
        },
      ],
    };

    await hooks['experimental.chat.messages.transform']?.({}, output as any);

    expect(output.messages).toHaveLength(1);
    const session = sessionService.getGlobal('sess-tw-incomplete');
    expect(session?.replayDirectivePending).toBe(false);
  });

  test('messages.transform clears replay pending without injection when workerPromptPath is missing', async () => {
    const sessionService = new SessionService(testRoot);
    sessionService.trackGlobal('sess-tw-missing-path', {
      agent: 'forager-worker',
      sessionKind: 'task-worker',
      featureName: 'my-feature',
      taskFolder: '05-implement-dashboard',
      replayDirectivePending: true,
    } as any);

    const output = {
      messages: [
        {
          info: {
            id: 'msg-worker',
            sessionID: 'sess-tw-missing-path',
            role: 'assistant',
            time: { created: Date.now() },
            system: [],
            modelID: 'm',
            providerID: 'p',
            mode: 'compaction',
            path: { cwd: testRoot, root: testRoot },
            cost: 0,
            tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
            summary: true,
          } as Message,
          parts: [],
        },
      ],
    };

    await hooks['experimental.chat.messages.transform']?.({}, output as any);

    expect(output.messages).toHaveLength(1);
    const session = sessionService.getGlobal('sess-tw-missing-path');
    expect(session?.replayDirectivePending).toBe(false);
  });

  test('messages.transform updates stored directive when a later real user message re-scopes a primary session', async () => {
    const sessionService = new SessionService(testRoot);
    sessionService.trackGlobal('sess-primary-rescope', {
      agent: 'hive-master',
      sessionKind: 'primary',
      directivePrompt: 'Old directive',
      directiveRecoveryState: 'escalated',
    } as any);

    const output = {
      messages: [
        {
          info: {
            id: 'msg-old',
            sessionID: 'sess-primary-rescope',
            role: 'user',
            time: { created: Date.now() - 1000 },
          } as Message,
          parts: [
            {
              id: 'prt-old',
              sessionID: 'sess-primary-rescope',
              messageID: 'msg-old',
              type: 'text',
              text: 'Old directive',
            } as Part,
          ],
        },
        {
          info: {
            id: 'msg-new',
            sessionID: 'sess-primary-rescope',
            role: 'user',
            time: { created: Date.now() },
          } as Message,
          parts: [
            {
              id: 'prt-new',
              sessionID: 'sess-primary-rescope',
              messageID: 'msg-new',
              type: 'text',
              text: 'New directive from the operator',
            } as Part,
          ],
        },
      ],
    };

    await hooks['experimental.chat.messages.transform']?.({}, output as any);

    const session = sessionService.getGlobal('sess-primary-rescope');
    expect(session?.directivePrompt).toBe('New directive from the operator');
    expect(session?.directiveRecoveryState).toBeUndefined();
  });

  test('forager session with known prompt path → role re-anchor + exact path', async () => {
    const sessionService = new SessionService(testRoot);
    sessionService.trackGlobal('sess-forager', {
      agent: 'forager-worker',
      sessionKind: 'task-worker',
      featureName: 'my-feature',
      taskFolder: '01-task',
      workerPromptPath: '.hive/features/my-feature/tasks/01-task/worker-prompt.md',
    } as any);

    const output = { context: [] as string[], prompt: undefined as string | undefined };
    await hooks['experimental.session.compacting']?.({ sessionID: 'sess-forager' }, output);

    expect(output.prompt).toBeDefined();
    expect(output.prompt).toContain('Compaction recovery');
    expect(output.prompt).toContain('Role: Forager');
    expect(output.context.join('\n')).toContain('worker-prompt.md');
  });

  test('forager session without known prompt path → role re-anchor + generic worker-prompt.md reminder', async () => {
    const sessionService = new SessionService(testRoot);
    sessionService.trackGlobal('sess-forager-noprompt', {
      agent: 'forager-worker',
      sessionKind: 'task-worker',
    } as any);

    const output = { context: [] as string[], prompt: undefined as string | undefined };
    await hooks['experimental.session.compacting']?.({ sessionID: 'sess-forager-noprompt' }, output);

    expect(output.prompt).toBeDefined();
    expect(output.prompt).toContain('Compaction recovery');
    expect(output.prompt).toContain('Role: Forager');
    expect(output.prompt).toContain('worker-prompt.md');
  });

  test('unknown session → safe generic Hive recovery anchor', async () => {
    const output = { context: [] as string[], prompt: undefined as string | undefined };
    await hooks['experimental.session.compacting']?.({ sessionID: 'sess-unknown-xyz' }, output);

    expect(output.prompt).toBeDefined();
    expect(output.prompt).toContain('Compaction recovery');
    expect(output.prompt).not.toContain('hive_status');
    expect(output.prompt).not.toMatch(/read (the |all |entire |full )?(repo|codebase|project)/i);
  });

  test('output.prompt does not reference hive_status', async () => {
    const sessionService = new SessionService(testRoot);
    sessionService.trackGlobal('sess-check', {
      agent: 'forager-worker',
      sessionKind: 'task-worker',
    } as any);

    const output = { context: [] as string[], prompt: undefined as string | undefined };
    await hooks['experimental.session.compacting']?.({ sessionID: 'sess-check' }, output);

    expect(output.prompt).not.toMatch(/hive_status/);
  });

  test('output.prompt does not reference hive_plan_read', async () => {
    const sessionService = new SessionService(testRoot);
    sessionService.trackGlobal('sess-check2', {
      agent: 'hive-master',
      sessionKind: 'primary',
    } as any);

    const output = { context: [] as string[], prompt: undefined as string | undefined };
    await hooks['experimental.session.compacting']?.({ sessionID: 'sess-check2' }, output);

    expect(output.prompt).not.toMatch(/hive_plan_read/);
  });
});
