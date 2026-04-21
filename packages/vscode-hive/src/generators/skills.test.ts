import { describe, expect, it } from 'bun:test';
import { generateSkillFile, getBuiltinSkills } from './skills.js';

function getFrontmatter(content: string): string {
  const parts = content.split(/^---$/m);
  return parts[1] ?? '';
}

describe('skills generator', () => {
  const skills = getBuiltinSkills();

  it('returns all 11 builtin skills with frontmatter content under 30000 chars', () => {
    expect(skills).toHaveLength(11);

    for (const skill of skills) {
      expect(skill.content.startsWith('---\n')).toBe(true);
      expect(skill.content.length).toBeLessThanOrEqual(30000);
    }
  });

  it('ports tool and skill references to github skills format', () => {
    const byName = new Map(skills.map((skill) => [skill.name, skill.content]));
    const parallelExploration = byName.get('parallel-exploration');
    const writingPlans = byName.get('writing-plans');
    const executingPlans = byName.get('executing-plans');
    const dispatchingParallelAgents = byName.get('dispatching-parallel-agents');

    expect(parallelExploration).toContain('Invoke the @scout agent via the agent tool');
    expect(parallelExploration).not.toContain('task(');
    expect(parallelExploration).not.toContain('subagent_type');
    expect(parallelExploration).not.toContain('hive_worktree_start');
    expect(parallelExploration).not.toContain('hive_context_write');

    expect(writingPlans).toContain('Refer to the skill at .github/skills/executing-plans/SKILL.md');
    expect(writingPlans).toContain('Treat `plan.md` as the human-facing review surface and execution truth');
    expect(writingPlans).toContain('overview/design summary before `## Tasks`');
    expect(writingPlans).not.toContain('context/overview.md');
    expect(writingPlans).not.toContain('hive_skill:executing-plans');

    expect(executingPlans).toContain('Prefer `vscode/askQuestions` for a structured choice');
    expect(executingPlans).toContain('Fall back to asking directly in chat only when `vscode/askQuestions` is unavailable');
    expect(executingPlans).toContain('prefer `vscode/askQuestions` to ask whether the user wants a Hygienic code review');
    expect(executingPlans).toContain('Refer to the skill at .github/skills/verification-before-completion/SKILL.md');
    expect(executingPlans).toContain('@forager');
    expect(executingPlans).toContain('hive_task_update');
    expect(executingPlans).not.toContain('hive_worktree_start');
    expect(executingPlans).not.toContain('hive_merge');
    expect(executingPlans).not.toContain('hive_context_write');
    expect(executingPlans).not.toContain('question()');

    expect(dispatchingParallelAgents).toContain('Prefer `vscode/askQuestions` for the approval prompt');
    expect(dispatchingParallelAgents).toContain('Fall back to asking directly in chat only when `vscode/askQuestions` is unavailable');
    expect(dispatchingParallelAgents).not.toContain('hive_worktree_start');
    expect(dispatchingParallelAgents).not.toContain('hive_merge');
    expect(dispatchingParallelAgents).not.toContain('hive_context_write');
    expect(dispatchingParallelAgents).not.toContain('question()');
  });

  it('adds tool-aware task lookup, research, debugging, and verification guidance to the task 2 skills', () => {
    const byName = new Map(skills.map((skill) => [skill.name, skill.content]));
    const writingPlans = byName.get('writing-plans');
    const executingPlans = byName.get('executing-plans');
    const parallelExploration = byName.get('parallel-exploration');
    const dispatchingParallelAgents = byName.get('dispatching-parallel-agents');
    const systematicDebugging = byName.get('systematic-debugging');
    const testDrivenDevelopment = byName.get('test-driven-development');
    const verificationBeforeCompletion = byName.get('verification-before-completion');

    expect(writingPlans).toContain('start from `hive_status()` to confirm the active feature, current task IDs, and any blocked or runnable work');
    expect(writingPlans).toContain('Use `todo` only when shaping a multi-task plan or review response needs an active checklist');
    expect(writingPlans).toContain('Use `vscode/memory` only for durable planning decisions or blocker history that future turns need');

    expect(executingPlans).toContain('Create a short checklist in `todo` or your working notes only when the batch has enough moving parts to justify active tracking');
    expect(executingPlans).toContain('Use `vscode/memory` only for durable execution decisions or blocker history that future turns need');

    expect(parallelExploration).toContain('Load this skill before any multi-domain, read-only investigation that benefits from Scout fan-out');
    expect(parallelExploration).toContain('use `browser` as one of the read-only slices');
    expect(parallelExploration).toContain('use `web` or `io.github.upstash/context7/*` for the docs/OSS slice');
    expect(parallelExploration).toContain('Use `todo` only when you need to track multiple questions and evidence coverage during synthesis');
    expect(parallelExploration).toContain('Use `vscode/memory` only for findings the parent agent or a later turn will need after synthesis');

    expect(dispatchingParallelAgents).toContain('Load this skill when `hive_status()` shows 2+ runnable independent tasks');
    expect(dispatchingParallelAgents).toContain('refer to the skill at .github/skills/parallel-exploration/SKILL.md instead');
    expect(dispatchingParallelAgents).toContain('Use `todo` only when the batch needs a live checklist for task ownership, integration, or follow-up');
    expect(dispatchingParallelAgents).toContain('Use `vscode/memory` only for durable coordination decisions or blocker history that future turns need');

    expect(systematicDebugging).toContain('reproduce it with `browser` before changing code');
    expect(systematicDebugging).toContain('Use `playwright/*` when you need a repeatable browser repro or end-to-end trace');
    expect(systematicDebugging).toContain('Use `todo` only when tracking multiple hypotheses, component boundaries, or repro attempts');
    expect(systematicDebugging).toContain('Use `vscode/memory` only for durable root-cause findings or blocker history another turn will need');

    expect(testDrivenDevelopment).toContain('refer to the skill at .github/skills/systematic-debugging/SKILL.md first to confirm root cause');
    expect(testDrivenDevelopment).toContain('use `browser` for quick inspection and `playwright/*` for repeatable failing and passing coverage');
    expect(testDrivenDevelopment).toContain('Use `todo` only when the red-green-refactor cycle spans multiple cases that need active tracking');
    expect(testDrivenDevelopment).toContain('Use `vscode/memory` only for durable test decisions, flaky-environment notes, or blocker history that later turns need');

    expect(verificationBeforeCompletion).toContain('use `browser` to gather direct evidence');
    expect(verificationBeforeCompletion).toContain('use `playwright/*` to run the proving sequence');
    expect(verificationBeforeCompletion).toContain('Use `todo` only when the verification plan has multiple independent checks');
    expect(verificationBeforeCompletion).toContain('Use `vscode/memory` only for durable verification gaps or recurring environment caveats that later turns need');
  });

  it('keeps writing-plans aligned to the single-document plan workflow', () => {
    const byName = new Map(skills.map((skill) => [skill.name, skill.content]));
    const writingPlans = byName.get('writing-plans');

    expect(writingPlans).toContain('Treat `plan.md` as the human-facing review surface and execution truth');
    expect(writingPlans).toContain('overview/design summary before `## Tasks`');
    expect(writingPlans).toContain('Design Summary');
    expect(writingPlans).not.toContain('context/overview.md');
  });

  it('removes deprecated tools from the named generated skills', () => {
    const byName = new Map(skills.map((skill) => [skill.name, skill.content]));
    const parallelExploration = byName.get('parallel-exploration');
    const agentsMdMastery = byName.get('agents-md-mastery');

    expect(parallelExploration).not.toContain('hive_worktree_start');
    expect(parallelExploration).not.toContain('hive_context_write');
    expect(agentsMdMastery).toContain('AGENTS.md');
    expect(agentsMdMastery).not.toContain('hive_agents_md');
    expect(agentsMdMastery).not.toContain('hive_context_write');
  });

  it('generates skill files with normalized required frontmatter', () => {
    const content = generateSkillFile({
      name: 'example-skill',
      description: 'This is a valid example description for generated skills.',
      content: '# Heading\n\nBody',
    });

    const frontmatter = getFrontmatter(content);

    expect(content.startsWith('---\n')).toBe(true);
    expect(frontmatter).toContain('name: example-skill');
    expect(frontmatter).toContain('description: This is a valid example description for generated skills.');
    expect(content).toContain('# Heading');
  });
});
