import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { buildCompactionPrompt } from '../utils/compaction-prompt.js';
import { buildCompactionReanchor } from '../utils/compaction-anchor.js';
import type { PluginInput } from '@opencode-ai/plugin';
import { SessionService } from 'hive-core';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('buildCompactionPrompt', () => {
  test('includes resume instruction to continue current task', () => {
    const prompt = buildCompactionPrompt();
    expect(prompt).toMatch(/continue/i);
    expect(prompt).toMatch(/task/i);
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
    expect(prompt).toMatch(/continue/i);
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
    } as any);

    const output = { context: [] as string[], prompt: undefined as string | undefined };
    await hooks['experimental.session.compacting']?.({ sessionID: 'sess-scout' }, output);

    expect(output.prompt).toBeDefined();
    expect(output.prompt).toContain('Compaction recovery');
    expect(output.prompt).toContain('Role: Scout');
    expect(output.prompt).not.toContain('worker-prompt.md');
    expect(output.context.join('\n')).not.toContain('worker-prompt.md');
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
