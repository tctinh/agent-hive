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

    expect(writingPlans).toContain('Refer to the skill at .github/skills/executing-plans/SKILL.md');
    expect(writingPlans).not.toContain('hive_skill:executing-plans');

    expect(executingPlans).toContain('Prefer `vscode/askQuestions` for a structured choice');
    expect(executingPlans).toContain('Fall back to asking directly in chat only when `vscode/askQuestions` is unavailable');
    expect(executingPlans).toContain('prefer `vscode/askQuestions` to ask whether the user wants a Hygienic code review');
    expect(executingPlans).toContain('Refer to the skill at .github/skills/verification-before-completion/SKILL.md');
    expect(executingPlans).not.toContain('question()');

    expect(dispatchingParallelAgents).toContain('Prefer `vscode/askQuestions` for the approval prompt');
    expect(dispatchingParallelAgents).toContain('Fall back to asking directly in chat only when `vscode/askQuestions` is unavailable');
    expect(dispatchingParallelAgents).not.toContain('question()');
  });

  it('includes overview-first context guidance in writing-plans', () => {
    const byName = new Map(skills.map((skill) => [skill.name, skill.content]));
    const writingPlans = byName.get('writing-plans');

    expect(writingPlans).toContain('context/overview.md');
    expect(writingPlans).toContain('human-facing review surface');
    expect(writingPlans).toContain('plan.md` remains execution truth');
    expect(writingPlans).toContain('Design Summary');
    expect(writingPlans).not.toContain('Treat `plan.md` as the human-facing review surface and execution truth');
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
