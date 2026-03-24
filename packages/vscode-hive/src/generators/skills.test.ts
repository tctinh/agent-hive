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

    expect(parallelExploration).toContain('Invoke the @scout agent via the agent tool');
    expect(parallelExploration).not.toContain('task(');
    expect(parallelExploration).not.toContain('subagent_type');

    expect(writingPlans).toContain('Refer to the skill at .github/skills/executing-plans/SKILL.md');
    expect(writingPlans).not.toContain('hive_skill:executing-plans');

    expect(executingPlans).toContain('ask the user directly in chat');
    expect(executingPlans).toContain('Refer to the skill at .github/skills/verification-before-completion/SKILL.md');
    expect(executingPlans).not.toContain('question()');
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
