import { describe, expect, it, spyOn, afterEach, mock } from 'bun:test';
import { ConfigService } from 'hive-core';
import * as path from 'path';
import plugin from '../index';

type PluginInput = {
  directory: string;
  worktree: string;
  serverUrl: URL;
  project: { id: string; worktree: string; time: { created: number } };
  client: unknown;
  $: unknown;
};

function createStubShell(): unknown {
  const fn = ((..._args: unknown[]) => {
    throw new Error('shell not available in this test');
  }) as unknown as Record<string, unknown>;

  return Object.assign(fn, {
    braces(pattern: string) {
      return [pattern];
    },
    escape(input: string) {
      return input;
    },
    env() {
      return fn;
    },
    cwd() {
      return fn;
    },
    nothrow() {
      return fn;
    },
    throws() {
      return fn;
    },
  });
}

function createStubClient(): unknown {
  return {
    session: {
      create: async () => ({ data: { id: 'test-session' } }),
      prompt: async () => ({ data: {} }),
      get: async () => ({ data: { status: 'idle' } }),
      messages: async () => ({ data: [] }),
      abort: async () => {},
    },
    app: {
      agents: async () => ({ data: [] }),
      log: async () => {},
    },
    config: {
      get: async () => ({ data: {} }),
    },
  };
}

type AgentConfig = {
  permission?: Record<string, string>;
  tools?: Record<string, boolean>;
  prompt?: string;
};

describe('Agent permissions', () => {
  afterEach(() => {
    mock.restore();
  });

  it('registers hive-master, scout, forager, and hygienic in unified mode', async () => {
    // Mock ConfigService to return unified mode
    spyOn(ConfigService.prototype, 'get').mockReturnValue({
      agentMode: 'unified',
      agents: {
        'hive-master': {},
      }
    } as any);

    const repoRoot = path.resolve(import.meta.dir, '..', '..', '..', '..');

    const ctx: PluginInput = {
      directory: repoRoot,
      worktree: repoRoot,
      serverUrl: new URL('http://localhost:1'),
      project: { id: 'test', worktree: repoRoot, time: { created: Date.now() } },
      client: createStubClient(),
      $: createStubShell(),
    };

    const hooks = await plugin(ctx as any);
    
    const opencodeConfig: { 
      agent?: Record<string, AgentConfig>,
      default_agent?: string 
    } = {};
    await hooks.config?.(opencodeConfig);

    expect(opencodeConfig.agent?.['hive-master']).toBeTruthy();
    expect(opencodeConfig.agent?.['swarm-orchestrator']).toBeUndefined();
    expect(opencodeConfig.agent?.['architect-planner']).toBeUndefined();
    expect(opencodeConfig.agent?.['scout-researcher']).toBeTruthy();
    expect(opencodeConfig.agent?.['forager-worker']).toBeTruthy();
    expect(opencodeConfig.agent?.['hygienic-reviewer']).toBeTruthy();
    expect(opencodeConfig.default_agent).toBe('hive-master');

    const hivePerm = opencodeConfig.agent?.['hive-master']?.permission;
    expect(hivePerm).toBeTruthy();
  });

  it('registers dedicated agents in dedicated mode', async () => {
    // Mock ConfigService to return dedicated mode
    spyOn(ConfigService.prototype, 'get').mockReturnValue({
      agentMode: 'dedicated',
      agents: {
        'architect-planner': {},
        'swarm-orchestrator': {},
      }
    } as any);

    const repoRoot = path.resolve(import.meta.dir, '..', '..', '..', '..');

    const ctx: PluginInput = {
      directory: repoRoot,
      worktree: repoRoot,
      serverUrl: new URL('http://localhost:1'),
      project: { id: 'test', worktree: repoRoot, time: { created: Date.now() } },
      client: createStubClient(),
      $: createStubShell(),
    };

    const hooks = await plugin(ctx as any);
    
    const opencodeConfig: { 
      agent?: Record<string, AgentConfig>,
      default_agent?: string 
    } = {};
    await hooks.config?.(opencodeConfig);

    expect(opencodeConfig.agent?.['hive-master']).toBeUndefined();
    expect(opencodeConfig.agent?.['swarm-orchestrator']).toBeTruthy();
    expect(opencodeConfig.agent?.['architect-planner']).toBeTruthy();
    expect(opencodeConfig.agent?.['scout-researcher']).toBeTruthy();
    expect(opencodeConfig.agent?.['forager-worker']).toBeTruthy();
    expect(opencodeConfig.agent?.['hygienic-reviewer']).toBeTruthy();
    expect(opencodeConfig.default_agent).toBe('architect-planner');

    const swarmPerm = opencodeConfig.agent?.['swarm-orchestrator']?.permission;
    const architectPerm = opencodeConfig.agent?.['architect-planner']?.permission;

    expect(swarmPerm).toBeTruthy();
    expect(architectPerm).toBeTruthy();

    expect(architectPerm!.edit).toBe('deny');
    expect(architectPerm!.task).toBe('allow');
  });

  it('explicitly denies delegation tools for subagents', async () => {
    spyOn(ConfigService.prototype, 'get').mockReturnValue({
      agentMode: 'unified',
      agents: {
        'hive-master': {},
      },
    } as any);

    const repoRoot = path.resolve(import.meta.dir, '..', '..', '..', '..');

    const ctx: PluginInput = {
      directory: repoRoot,
      worktree: repoRoot,
      serverUrl: new URL('http://localhost:1'),
      project: { id: 'test', worktree: repoRoot, time: { created: Date.now() } },
      client: createStubClient(),
      $: createStubShell(),
    };

    const hooks = await plugin(ctx as any);
    const opencodeConfig: {
      agent?: Record<string, AgentConfig>;
      default_agent?: string;
    } = {};
    await hooks.config?.(opencodeConfig);

    const subagentNames = ['scout-researcher', 'forager-worker', 'hygienic-reviewer'] as const;
    for (const name of subagentNames) {
      const perm = opencodeConfig.agent?.[name]?.permission;
      expect(perm).toBeTruthy();
      expect(perm!.task).toBe('deny');
      expect(perm!.delegate).toBe('deny');
    }
  });
});

describe('Per-agent tool filtering', () => {
  afterEach(() => {
    mock.restore();
  });

  async function buildConfig(agentMode: string) {
    spyOn(ConfigService.prototype, 'get').mockReturnValue({
      agentMode,
      agents: {},
    } as any);

    const repoRoot = path.resolve(import.meta.dir, '..', '..', '..', '..');
    const ctx: PluginInput = {
      directory: repoRoot,
      worktree: repoRoot,
      serverUrl: new URL('http://localhost:1'),
      project: { id: 'test', worktree: repoRoot, time: { created: Date.now() } },
      client: createStubClient(),
      $: createStubShell(),
    };
    const hooks = await plugin(ctx as any);
    const opencodeConfig: { agent?: Record<string, AgentConfig>; default_agent?: string } = {};
    await hooks.config?.(opencodeConfig);
    return opencodeConfig.agent ?? {};
  }

  it('forager has hive_worktree_commit allowed and hive_merge disabled', async () => {
    const agents = await buildConfig('unified');
    const foragerTools = agents['forager-worker']?.tools;
    expect(foragerTools).toBeTruthy();
    expect(foragerTools!['hive_worktree_commit']).toBeUndefined();
    expect(foragerTools!['hive_merge']).toBe(false);
    expect(foragerTools!['hive_tasks_sync']).toBe(false);
    expect(foragerTools!['hive_worktree_create']).toBe(false);
  });

  it('scout has only read-only hive tools (no worktree_commit, no merge)', async () => {
    const agents = await buildConfig('unified');
    const scoutTools = agents['scout-researcher']?.tools;
    expect(scoutTools).toBeTruthy();
    expect(scoutTools!['hive_worktree_commit']).toBe(false);
    expect(scoutTools!['hive_merge']).toBe(false);
    expect(scoutTools!['hive_plan_read']).toBeUndefined();
    expect(scoutTools!['hive_context_write']).toBeUndefined();
  });

  it('hygienic has same tool set as scout', async () => {
    const agents = await buildConfig('unified');
    const hygienicTools = agents['hygienic-reviewer']?.tools;
    const scoutTools = agents['scout-researcher']?.tools;
    expect(hygienicTools).toEqual(scoutTools);
  });

  it('architect has planning tools but no worktree tools', async () => {
    const agents = await buildConfig('dedicated');
    const architectTools = agents['architect-planner']?.tools;
    expect(architectTools).toBeTruthy();
    expect(architectTools!['hive_plan_write']).toBeUndefined();
    expect(architectTools!['hive_worktree_create']).toBe(false);
    expect(architectTools!['hive_worktree_commit']).toBe(false);
    expect(architectTools!['hive_merge']).toBe(false);
  });

  it('swarm has orchestration tools but no plan_write or worktree_commit', async () => {
    const agents = await buildConfig('dedicated');
    const swarmTools = agents['swarm-orchestrator']?.tools;
    expect(swarmTools).toBeTruthy();
    expect(swarmTools!['hive_worktree_create']).toBeUndefined();
    expect(swarmTools!['hive_plan_write']).toBe(false);
    expect(swarmTools!['hive_worktree_commit']).toBe(false);
    expect(swarmTools!['hive_plan_approve']).toBeUndefined();
  });

  it('hive-master has no tools filter (all tools allowed)', async () => {
    const agents = await buildConfig('unified');
    const hiveTools = agents['hive-master']?.tools;
    expect(hiveTools).toBeUndefined();
  });
});
