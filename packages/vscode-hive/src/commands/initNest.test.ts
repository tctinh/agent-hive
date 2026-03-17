import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { initNest } from './initNest.ts';
import { infoMessages, progressCalls, resetVscodeTestState } from '../test/vscode.ts';

const tempDirs = new Set<string>();

function createTempProject(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'init-nest-'));
  tempDirs.add(tempDir);
  return tempDir;
}

function readFile(projectRoot: string, relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

afterEach(() => {
  resetVscodeTestState();

  for (const tempDir of tempDirs) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  tempDirs.clear();
});

describe('initNest', () => {
  it('creates the full Copilot scaffolding and backward-compatible hive skills', async () => {
    const projectRoot = createTempProject();

    await initNest(projectRoot);

    assert.equal(progressCalls.length, 1);
    assert.equal(infoMessages[0], 'Hive Nest initialized! Created 4 agents, 11 skills, 2 hooks, 2 instructions.');

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
