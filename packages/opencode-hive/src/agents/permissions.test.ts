import { describe, expect, it } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
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

describe('Agent permissions for background task delegation', () => {
  it('registers hive_background_* tools as allow for primary agents', async () => {
    const originalHome = process.env.HOME;
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-permissions-'));

    try {
      process.env.HOME = tempHome;

      const opencodeDir = path.join(tempHome, '.config', 'opencode');
      fs.mkdirSync(opencodeDir, { recursive: true });
      const opencodePath = path.join(opencodeDir, 'opencode.json');
      fs.writeFileSync(opencodePath, JSON.stringify({}, null, 2));

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
      const opencodeConfig: any = {};
      await hooks.config?.(opencodeConfig);

      const config = opencodeConfig as {
        agent?: Record<string, { permission?: Record<string, string> }>;
      };

      const hivePerm = config.agent?.['hive-master']?.permission;
      const swarmPerm = config.agent?.['swarm-orchestrator']?.permission;
      const architectPerm = config.agent?.['architect-planner']?.permission;

      expect(hivePerm).toBeTruthy();
      expect(swarmPerm).toBeTruthy();
      expect(architectPerm).toBeTruthy();

      for (const perm of [hivePerm!, swarmPerm!, architectPerm!]) {
        expect(perm.hive_background_task).toBe('allow');
        expect(perm.hive_background_output).toBe('allow');
        expect(perm.hive_background_cancel).toBe('allow');
      }

      expect(architectPerm!.edit).toBe('deny');
      expect(architectPerm!.task).toBe('deny');
    } finally {
      if (originalHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = originalHome;
      }
      fs.rmSync(tempHome, { recursive: true, force: true });
    }
  });
});
