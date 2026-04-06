import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { PluginInput } from '@opencode-ai/plugin';
import { createOpencodeClient } from '@opencode-ai/sdk';
import plugin from '../index';

const OPENCODE_CLIENT = createOpencodeClient({ baseUrl: 'http://localhost:1' }) as unknown as PluginInput['client'];
const TEST_ROOT_BASE = '/tmp/hive-e2e-network';

type ToolContext = {
  sessionID: string;
  messageID: string;
  agent: string;
  abort: AbortSignal;
};

function createStubShell(): PluginInput['$'] {
  let shell: PluginInput['$'];

  const fn = ((..._args: unknown[]) => {
    throw new Error('shell not available in this test');
  }) as unknown as PluginInput['$'];

  shell = Object.assign(fn, {
    braces(pattern: string) {
      return [pattern];
    },
    escape(input: string) {
      return input;
    },
    env() {
      return shell;
    },
    cwd() {
      return shell;
    },
    nothrow() {
      return shell;
    },
    throws() {
      return shell;
    },
  });

  return shell;
}

function createToolContext(sessionID: string): ToolContext {
  return {
    sessionID,
    messageID: 'msg_test',
    agent: 'test',
    abort: new AbortController().signal,
  };
}

function createProject(worktree: string): PluginInput['project'] {
  return {
    id: 'test',
    worktree,
    time: { created: Date.now() },
  };
}

async function createHooks(testRoot: string) {
  const ctx: PluginInput = {
    directory: testRoot,
    worktree: testRoot,
    serverUrl: new URL('http://localhost:1'),
    project: createProject(testRoot),
    client: OPENCODE_CLIENT,
    $: createStubShell(),
  };

  return await plugin(ctx);
}

describe('e2e: hive_network_query', () => {
  let testRoot: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    originalHome = process.env.HOME;
    fs.rmSync(TEST_ROOT_BASE, { recursive: true, force: true });
    fs.mkdirSync(TEST_ROOT_BASE, { recursive: true });
    testRoot = fs.mkdtempSync(path.join(TEST_ROOT_BASE, 'project-'));
    process.env.HOME = testRoot;

    execSync('git init', { cwd: testRoot });
    execSync('git config user.email "test@example.com"', { cwd: testRoot });
    execSync('git config user.name "Test"', { cwd: testRoot });
    fs.writeFileSync(path.join(testRoot, 'README.md'), 'network test');
    execSync('git add README.md', { cwd: testRoot });
    execSync('git commit -m "init"', { cwd: testRoot });
  });

  afterEach(() => {
    fs.rmSync(TEST_ROOT_BASE, { recursive: true, force: true });
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
  });

  it('returns deterministic cross-feature plan and network-safe context snippets', async () => {
    const hooks = await createHooks(testRoot);
    const toolContext = createToolContext('sess_hive_network_query');

    await hooks.tool!.hive_feature_create.execute({ name: 'alpha-feature' }, toolContext);
    await hooks.tool!.hive_plan_write.execute({
      feature: 'alpha-feature',
      content: `# Alpha Feature

## Discovery

**Q: Is this a test?**
A: Yes, this integration test validates deterministic cross-feature network retrieval from plan and durable context only.

## Tasks

### 1. Alpha Task
Document network design constraints.
`,
    }, toolContext);
    await hooks.tool!.hive_context_write.execute({
      feature: 'alpha-feature',
      name: 'learnings',
      content: 'Network design learnings from alpha feature.',
    }, toolContext);
    await hooks.tool!.hive_context_write.execute({
      feature: 'alpha-feature',
      name: 'overview',
      content: 'network design hidden in overview',
    }, toolContext);

    await hooks.tool!.hive_feature_create.execute({ name: 'beta-feature' }, toolContext);
    await hooks.tool!.hive_plan_write.execute({
      feature: 'beta-feature',
      content: `# Beta Feature

## Discovery

**Q: Is this a test?**
A: Yes, this integration test validates deterministic cross-feature network retrieval from multiple features.

## Tasks

### 1. Beta Task
Document network design rollout.
`,
    }, toolContext);

    await hooks.tool!.hive_feature_create.execute({ name: 'current-feature' }, toolContext);
    await hooks.tool!.hive_plan_write.execute({
      feature: 'current-feature',
      content: `# Current Feature

## Discovery

**Q: Is this a test?**
A: Yes, this integration test validates that the active feature is excluded from network query results.

## Tasks

### 1. Current Task
Mention network design locally only.
`,
    }, toolContext);
    await hooks.tool!.hive_context_write.execute({
      feature: 'current-feature',
      name: 'learnings',
      content: 'Current feature network design details should be excluded.',
    }, toolContext);

    const raw = await hooks.tool!.hive_network_query.execute({ query: 'network design' }, toolContext);
    const result = JSON.parse(raw as string) as {
      query: string;
      currentFeature: string;
      results: Array<{
        feature: string;
        sourceType: 'plan' | 'context';
        sourceName: string;
        path: string;
        updatedAt: string;
        snippet: string;
      }>;
    };

    expect(result.query).toBe('network design');
    expect(result.currentFeature).toBe('current-feature');
    expect(result.results.map((entry) => [entry.feature, entry.sourceType, entry.sourceName])).toEqual([
      ['alpha-feature', 'plan', 'plan.md'],
      ['alpha-feature', 'context', 'learnings'],
      ['beta-feature', 'plan', 'plan.md'],
    ]);
    expect(result.results.every((entry) => entry.feature !== 'current-feature')).toBe(true);
    expect(result.results.every((entry) => !entry.path.endsWith('overview.md'))).toBe(true);
    expect(result.results.every((entry) => typeof entry.updatedAt === 'string' && entry.updatedAt.length > 0)).toBe(true);
    expect(result.results.every((entry) => entry.snippet.toLowerCase().includes('network design'))).toBe(true);
  });

  it('returns explicit no-match JSON instead of an empty string', async () => {
    const hooks = await createHooks(testRoot);
    const toolContext = createToolContext('sess_hive_network_no_match');

    await hooks.tool!.hive_feature_create.execute({ name: 'source-feature' }, toolContext);
    await hooks.tool!.hive_plan_write.execute({
      feature: 'source-feature',
      content: `# Source Feature

## Discovery

**Q: Is this a test?**
A: Yes, this test proves hive_network_query returns explicit JSON when there are no cross-feature matches.

## Tasks

### 1. Source Task
Keep this unrelated.
`,
    }, toolContext);

    await hooks.tool!.hive_feature_create.execute({ name: 'active-feature' }, toolContext);

    const raw = await hooks.tool!.hive_network_query.execute({ query: 'does not exist anywhere' }, toolContext);
    const result = JSON.parse(raw as string) as {
      query: string;
      currentFeature: string;
      results: unknown[];
    };

    expect(result).toEqual({
      query: 'does not exist anywhere',
      currentFeature: 'active-feature',
      results: [],
    });
  });
});
