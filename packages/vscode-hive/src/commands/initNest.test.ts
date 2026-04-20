import { afterEach, describe, it } from 'bun:test';
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
      { message: 'Generating prompt files...' },
      { message: 'Generating plugin manifest...' },
    ]);
    assert.equal(
      mock.infoMessages[0],
      'Hive Nest initialized! Created GitHub agents, prompts, instructions, Copilot steering, hooks, plugin manifest, and compatibility skills.'
    );

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
    assert.ok(fs.existsSync(path.join(projectRoot, '.github', 'copilot-instructions.md')));
    assert.equal(fs.existsSync(path.join(projectRoot, 'AGENTS.md')), false);

    const promptFiles = fs.readdirSync(path.join(projectRoot, '.github', 'prompts')).sort();
    assert.deepEqual(promptFiles, [
      'execute-approved-plan.prompt.md',
      'plan-feature.prompt.md',
      'request-review.prompt.md',
      'review-plan.prompt.md',
      'verify-completion.prompt.md',
    ]);

    assert.match(readFile(projectRoot, '.github/copilot-instructions.md'), /AGENTS\.md/);
    assert.match(readFile(projectRoot, '.github/copilot-instructions.md'), /vscode\/askQuestions/);
    assert.match(readFile(projectRoot, '.github/copilot-instructions.md'), /plain chat only as a fallback/);
    assert.match(readFile(projectRoot, '.github/prompts/plan-feature.prompt.md'), /search\/codebase/);
    assert.match(readFile(projectRoot, '.github/prompts/plan-feature.prompt.md'), /tctinh\.vscode-hive\/hivePlanWrite/);
    assert.doesNotMatch(readFile(projectRoot, '.github/prompts/plan-feature.prompt.md'), /"codebase"/);
    assert.match(readFile(projectRoot, '.github/prompts/plan-feature.prompt.md'), /vscode\/askQuestions/);

    const executePrompt = readFile(projectRoot, '.github/prompts/execute-approved-plan.prompt.md');
    assert.match(executePrompt, /tctinh\.vscode-hive\/hiveTasksSync/);
    assert.match(executePrompt, /tctinh\.vscode-hive\/hivePlanRead/);
    assert.doesNotMatch(executePrompt, /hiveWorktreeStart|hive_worktree_start|hive_merge/);

    const foragerAgent = readFile(projectRoot, '.github/agents/forager.agent.md');
    assert.match(foragerAgent, /playwright\/\*/);
    assert.match(foragerAgent, /tctinh\.vscode-hive\/hiveTaskUpdate/);
    assert.match(foragerAgent, /GPT-5\.4 \(copilot\)/);
    assert.match(foragerAgent, /Claude Sonnet 4\.6 \(copilot\)/);
    assert.doesNotMatch(foragerAgent, /hiveContextWrite|hiveWorktreeCommit|editFiles/);

    const scoutAgent = readFile(projectRoot, '.github/agents/scout.agent.md');
    assert.match(scoutAgent, /Claude Sonnet 4\.6 \(copilot\)/);
    assert.doesNotMatch(scoutAgent, /\bgpt-5\.4\b|GPT-5\.4 \(copilot\)/);

    const hiveAgent = readFile(projectRoot, '.github/agents/hive.agent.md');
    assert.match(hiveAgent, /model:\n  - GPT-5\.4 \(copilot\)/);
    assert.doesNotMatch(hiveAgent, /^tools:\n/m);

    const executingPlansSkill = readFile(projectRoot, '.github/skills/executing-plans/SKILL.md');
    assert.match(executingPlansSkill, /Prefer `vscode\/askQuestions` for a structured choice/);
    assert.match(executingPlansSkill, /prefer `vscode\/askQuestions` to ask whether the user wants a Hygienic code review/);
    assert.doesNotMatch(executingPlansSkill, /question\(\)/);

    const writingPlansSkill = readFile(projectRoot, '.github/skills/writing-plans/SKILL.md');
    assert.match(writingPlansSkill, /Treat `plan\.md` as the human-facing review surface and execution truth/);
    assert.match(writingPlansSkill, /overview\/design summary before `## Tasks`/);
    assert.doesNotMatch(writingPlansSkill, /context\/overview\.md/);

    const dispatchingParallelAgentsSkill = readFile(projectRoot, '.github/skills/dispatching-parallel-agents/SKILL.md');
    assert.match(dispatchingParallelAgentsSkill, /Prefer `vscode\/askQuestions` for the approval prompt/);
    assert.doesNotMatch(dispatchingParallelAgentsSkill, /question\(\)/);

    const workflowInstructions = readFile(projectRoot, '.github/instructions/hive-workflow.instructions.md');
    assert.match(workflowInstructions, /plan\.md is the only required human-review and execution document/);
    assert.doesNotMatch(workflowInstructions, /hive_context_write|Merge/);

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
