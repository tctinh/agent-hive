import { describe, it, expect } from 'bun:test';
import { BUILTIN_SKILLS } from './registry.generated.js';

describe('skill content', () => {
  it('bundles the ast-grep skill with the upstream tool surface', () => {
    const skill = BUILTIN_SKILLS.find((entry) => entry.name === 'ast-grep');

    expect(skill).toBeDefined();
    expect(skill!.template).toContain('ast_grep_dump_syntax_tree');
    expect(skill!.template).toContain('ast_grep_test_match_code_rule');
    expect(skill!.template).toContain('ast_grep_find_code');
    expect(skill!.template).toContain('ast_grep_find_code_by_rule');
    expect(skill!.template).not.toContain('ast_grep_search');
    expect(skill!.template).not.toContain('ast_grep_replace');
  });

  it('documents overview-first execution truth in writing-plans', () => {
    const skill = BUILTIN_SKILLS.find((entry) => entry.name === 'writing-plans');

    expect(skill).toBeDefined();
    expect(skill!.template).toContain('context/overview.md');
    expect(skill!.template).toContain('human-facing review surface');
    expect(skill!.template).toContain('plan.md` remains execution truth');
    expect(skill!.template).toContain('Design Summary');
    expect(skill!.template).not.toContain('Treat `plan.md` as the human-facing review surface and execution truth');
  });

  it('documents task() fan-out paths for parallel-exploration', () => {
    const skill = BUILTIN_SKILLS.find((entry) => entry.name === 'parallel-exploration');

    expect(skill).toBeDefined();
    expect(skill!.template).toContain('task({');
    expect(skill!.template).toContain(
      'Parallelize by issuing multiple task() calls in the same assistant message.'
    );
    expect(skill!.template).toContain('fit in one context window');
    expect(skill!.template).toContain('return to Hive');
    expect(skill!.template).toContain('one more fan-out would broaden scope too far');
  });

  it('includes task() parallel guidance for dispatching-parallel-agents', () => {
    const skill = BUILTIN_SKILLS.find((entry) => entry.name === 'dispatching-parallel-agents');

    expect(skill).toBeDefined();
    expect(skill!.template).toContain('task({');
    expect(skill!.template).toContain(
      'Parallelize by issuing multiple task() calls in the same assistant message.'
    );
  });

  it('bundled skill content does not contain hive_skill references', () => {
    for (const entry of BUILTIN_SKILLS) {
      expect(entry.template).not.toContain('hive_skill');
    }
  });
});
