import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { initNest } from './initNest.ts';

const tempDirs = new Set<string>();

function createTempProject(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'init-nest-'));
  tempDirs.add(tempDir);
  return tempDir;
}

function readFile(projectRoot: string, relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function createMockVscode(): {
  progressCalls: Array<{ options: unknown; reports: unknown[] }>;
  infoMessages: string[];
  vscodeApi: {
    ProgressLocation: { Notification: number };
    window: {
      withProgress: <T>(options: unknown, task: (progress: { report: (value: unknown) => void }) => Promise<T> | T) => Promise<T>;
      showInformationMessage: (message: string) => Promise<string>;
    };
  };
} {
  const progressCalls: Array<{ options: unknown; reports: unknown[] }> = [];
  const infoMessages: string[] = [];

  return {
    progressCalls,
    infoMessages,
    vscodeApi: {
      ProgressLocation: { Notification: 15 },
      window: {
        async withProgress<T>(options: unknown, task: (progress: { report: (value: unknown) => void }) => Promise<T> | T): Promise<T> {
          const reports: unknown[] = [];
          progressCalls.push({ options, reports });
          return await task({
            report(value: unknown): void {
              reports.push(value);
            },
          });
        },
        async showInformationMessage(message: string): Promise<string> {
          infoMessages.push(message);
          return message;
        },
      },
    },
  };
}

afterEach(() => {
  for (const tempDir of tempDirs) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  tempDirs.clear();
});

describe('initNest', () => {
  it('creates the bootstrap scaffolding and backward-compatible hive skills', async () => {
    const projectRoot = createTempProject();
    const mock = createMockVscode();

    await initNest(projectRoot, { vscodeApi: mock.vscodeApi });

    assert.equal(mock.progressCalls.length, 1);
    assert.deepEqual(mock.progressCalls[0]?.reports, [
      { message: 'Creating Hive directories...' },
      { message: 'Generating GitHub agent files...' },
      { message: 'Generating builtin skills...' },
      { message: 'Generating hooks...' },
      { message: 'Generating instructions...' },
      { message: 'Generating plugin manifest...' },
    ]);
    assert.equal(mock.infoMessages[0], 'Hive Nest initialized! Created bootstrap files for agents, skills, hooks, and instructions.');

    assert.ok(fs.existsSync(path.join(projectRoot, '.hive', 'features')));
    assert.ok(fs.existsSync(path.join(projectRoot, '.hive', 'skills')));

    const agentFiles = fs.readdirSync(path.join(projectRoot, '.github', 'agents')).sort();
    assert.deepEqual(agentFiles, ['forager.agent.md', 'hive.agent.md', 'hygienic.agent.md', 'scout.agent.md']);

    const skillDirs = fs.readdirSync(path.join(projectRoot, '.github', 'skills')).sort();
    assert.equal(skillDirs.length, 11);
    assert.ok(skillDirs.includes('executing-plans'));
    assert.ok(skillDirs.includes('verification-before-completion'));

    assert.ok(fs.existsSync(path.join(projectRoot, '.github', 'hooks', 'scripts', 'check-plan.sh')));
    assert.ok(fs.existsSync(path.join(projectRoot, '.github', 'hooks', 'scripts', 'inject-context.sh')));
    assert.ok(fs.existsSync(path.join(projectRoot, '.github', 'hooks', 'hive-plan-enforcement.json')));
    assert.ok(fs.existsSync(path.join(projectRoot, '.github', 'hooks', 'hive-context-injection.json')));
    assert.ok(fs.existsSync(path.join(projectRoot, '.github', 'instructions', 'hive-workflow.instructions.md')));
    assert.ok(fs.existsSync(path.join(projectRoot, '.github', 'instructions', 'coding-standards.instructions.md')));

    const plugin = JSON.parse(readFile(projectRoot, 'plugin.json')) as { agents: string[]; hooks: string[]; instructions: string[] };
    assert.deepEqual(plugin.agents, ['.github/agents']);
    assert.deepEqual(plugin.hooks, ['.github/hooks/*']);
    assert.deepEqual(plugin.instructions, ['.github/instructions']);

    const backwardCompatSkill = readFile(projectRoot, '.claude/skills/hive/SKILL.md');
    assert.equal(backwardCompatSkill, readFile(projectRoot, '.opencode/skill/hive/SKILL.md'));
    assert.match(backwardCompatSkill, /^---\nname: hive\ndescription: Hive plan-first development workflow\n---\n\n/m);
    assert.match(backwardCompatSkill, /This project uses Hive plan-first development\./);
    assert.doesNotMatch(backwardCompatSkill, /applyTo:/);

    const planScriptMode = fs.statSync(path.join(projectRoot, '.github', 'hooks', 'scripts', 'check-plan.sh')).mode & 0o777;
    const contextScriptMode = fs.statSync(path.join(projectRoot, '.github', 'hooks', 'scripts', 'inject-context.sh')).mode & 0o777;
    assert.equal(planScriptMode, 0o755);
    assert.equal(contextScriptMode, 0o755);
  });
});
