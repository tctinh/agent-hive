import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import plugin from '../index';
import { ConfigService } from 'hive-core';

const TEST_ROOT_BASE = '/tmp/hive-config-source-resolution-test';

type ToolContext = {
  sessionID: string;
  messageID: string;
  agent: string;
  abort: AbortSignal;
};

function createToolContext(sessionID: string): ToolContext {
  return {
    sessionID,
    messageID: 'msg_test',
    agent: 'test',
    abort: new AbortController().signal,
  };
}

function createProject(worktree: string) {
  return {
    id: 'test',
    worktree,
    time: { created: Date.now() },
  };
}

describe('plugin config source resolution', () => {
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
    fs.writeFileSync(path.join(testRoot, 'README.md'), 'config source test');
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

  it('warns once and exposes fallback warning in hive_status when project config is invalid', async () => {
    const projectConfigPath = path.join(testRoot, '.hive', 'agent-hive.json');
    const globalConfigPath = path.join(testRoot, '.config', 'opencode', 'agent_hive.json');
    const warningMessage = `Failed to read project config at ${projectConfigPath}; using global config at ${globalConfigPath}`;

    fs.mkdirSync(path.dirname(projectConfigPath), { recursive: true });
    fs.writeFileSync(projectConfigPath, JSON.stringify(['invalid-config-shape']));

    fs.mkdirSync(path.dirname(globalConfigPath), { recursive: true });
    fs.writeFileSync(globalConfigPath, JSON.stringify({ sandbox: 'none' }));

    const notifications: Array<{ message: string }> = [];

    const ctx: any = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL('http://localhost:1'),
      project: createProject(testRoot),
      client: {
        notify(payload: { message: string }) {
          notifications.push({ message: payload.message });
          return true;
        },
      },
    };

    const hooks = await plugin(ctx);

    const toolContext = createToolContext('sess_config_resolution');
    await hooks.tool!.hive_feature_create.execute({ name: 'warning-feature' }, toolContext);

    const firstStatusRaw = await hooks.tool!.hive_status.execute({ feature: 'warning-feature' }, toolContext);
    const secondStatusRaw = await hooks.tool!.hive_status.execute({ feature: 'warning-feature' }, toolContext);

    const hiveStatus = JSON.parse(firstStatusRaw as string) as { warning?: string };
    const hiveStatusAgain = JSON.parse(secondStatusRaw as string) as { warning?: string };

    expect(notifications.length).toBe(1);
    expect(notifications[0].message).toContain('[hive:config]');
    expect(hiveStatus.warning).toBe(warningMessage);
    expect(hiveStatusAgain.warning).toBe(hiveStatus.warning);
  });

  it('surfaces an accurate defaults warning when both project and global configs are invalid', async () => {
    const projectConfigPath = path.join(testRoot, '.opencode', 'agent_hive.json');
    const globalConfigPath = path.join(testRoot, '.config', 'opencode', 'agent_hive.json');
    const warningMessage = `Failed to read project config at ${projectConfigPath}; global config at ${globalConfigPath} is also invalid; using defaults`;

    fs.mkdirSync(path.dirname(projectConfigPath), { recursive: true });
    fs.writeFileSync(
      projectConfigPath,
      JSON.stringify({
        agents: {
          'forager-worker': {
            autoLoadSkills: 'bad-skill-shape',
          },
        },
      }),
    );

    fs.mkdirSync(path.dirname(globalConfigPath), { recursive: true });
    fs.writeFileSync(globalConfigPath, JSON.stringify({ sandbox: 123 }));

    const notifications: Array<{ message: string }> = [];

    const ctx: any = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL('http://localhost:1'),
      project: createProject(testRoot),
      client: {
        notify(payload: { message: string }) {
          notifications.push({ message: payload.message });
          return true;
        },
      },
    };

    const hooks = await plugin(ctx);

    const toolContext = createToolContext('sess_config_resolution_defaults');
    await hooks.tool!.hive_feature_create.execute({ name: 'warning-defaults-feature' }, toolContext);

    const statusRaw = await hooks.tool!.hive_status.execute({ feature: 'warning-defaults-feature' }, toolContext);
    const hiveStatus = JSON.parse(statusRaw as string) as { warning?: string };

    expect(notifications.length).toBe(1);
    expect(notifications[0].message).toContain('[hive:config]');
    expect(hiveStatus.warning).toBe(warningMessage);
  });

  it('surfaces an accurate defaults warning when project config is invalid and global config is missing', async () => {
    const projectConfigPath = path.join(testRoot, '.opencode', 'agent_hive.json');
    const globalConfigPath = path.join(testRoot, '.config', 'opencode', 'agent_hive.json');
    const warningMessage = `Failed to read project config at ${projectConfigPath}; global config at ${globalConfigPath} is missing; using defaults`;

    fs.mkdirSync(path.dirname(projectConfigPath), { recursive: true });
    fs.writeFileSync(
      projectConfigPath,
      JSON.stringify({
        agents: {
          'forager-worker': {
            autoLoadSkills: 'bad-skill-shape',
          },
        },
      }),
    );

    const notifications: Array<{ message: string }> = [];

    const ctx: any = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL('http://localhost:1'),
      project: createProject(testRoot),
      client: {
        notify(payload: { message: string }) {
          notifications.push({ message: payload.message });
          return true;
        },
      },
    };

    const hooks = await plugin(ctx);

    const toolContext = createToolContext('sess_config_resolution_missing_global');
    await hooks.tool!.hive_feature_create.execute({ name: 'warning-missing-global-feature' }, toolContext);

    const statusRaw = await hooks.tool!.hive_status.execute({ feature: 'warning-missing-global-feature' }, toolContext);
    const hiveStatus = JSON.parse(statusRaw as string) as { warning?: string };

    expect(notifications.length).toBe(1);
    expect(notifications[0].message).toContain('[hive:config]');
    expect(hiveStatus.warning).toBe(warningMessage);
  });
});
