import { describe, expect, it } from 'bun:test';
import type { ResolvedCustomAgentConfig } from 'hive-core';
import { FORAGER_BEE_PROMPT } from './forager';
import { HYGIENIC_BEE_PROMPT } from './hygienic';
import { buildCustomSubagents } from './custom-agents';

describe('buildCustomSubagents', () => {
  it('builds derived subagents for forager and hygienic bases', () => {
    const foragerPermission = {
      task: 'deny',
      delegate: 'deny',
      skill: 'allow',
    };
    const hygienicPermission = {
      edit: 'deny',
      task: 'deny',
      delegate: 'deny',
      skill: 'allow',
    };

    const baseAgents = {
      'forager-worker': {
        model: 'base/forager-model',
        temperature: 0.3,
        variant: 'medium',
        mode: 'subagent' as const,
        prompt: FORAGER_BEE_PROMPT,
        tools: {
          hive_merge: false,
          hive_status: false,
        },
        permission: foragerPermission,
      },
      'hygienic-reviewer': {
        model: 'base/hygienic-model',
        temperature: 0.3,
        variant: 'low',
        mode: 'subagent' as const,
        prompt: HYGIENIC_BEE_PROMPT,
        tools: {
          hive_merge: false,
          hive_status: false,
        },
        permission: hygienicPermission,
      },
    };

    const customAgents: Record<string, ResolvedCustomAgentConfig> = {
      'forager-ui': {
        baseAgent: 'forager-worker',
        description: 'Use for UI-heavy implementation tasks.',
        model: 'custom/model',
        temperature: 0.2,
        variant: 'high',
        autoLoadSkills: ['test-driven-development'],
      },
      'reviewer-security': {
        baseAgent: 'hygienic-reviewer',
        description: 'Use for security-focused review passes.',
        model: 'base/hygienic-model',
        temperature: 0.3,
        variant: 'low',
        autoLoadSkills: [],
      },
    };

    const derived = buildCustomSubagents({
      customAgents,
      baseAgents,
      autoLoadedSkills: {
        'forager-ui': '\n\n# forager-ui auto skills',
      },
    });

    expect(derived['forager-ui'].mode).toBe('subagent');
    expect(derived['forager-ui'].prompt).toContain(FORAGER_BEE_PROMPT);
    expect(derived['forager-ui'].prompt).toContain('# forager-ui auto skills');
    expect(derived['forager-ui'].permission).toEqual(baseAgents['forager-worker'].permission);
    expect(derived['forager-ui'].tools).toEqual(baseAgents['forager-worker'].tools);
    expect(derived['forager-ui'].description).toBe('Use for UI-heavy implementation tasks.');
    expect(derived['forager-ui'].model).toBe('custom/model');
    expect(derived['forager-ui'].temperature).toBe(0.2);
    expect(derived['forager-ui'].variant).toBe('high');

    expect(derived['reviewer-security'].mode).toBe('subagent');
    expect(derived['reviewer-security'].prompt).toContain(HYGIENIC_BEE_PROMPT);
    expect(derived['reviewer-security'].permission).toEqual(baseAgents['hygienic-reviewer'].permission);
    expect(derived['reviewer-security'].tools).toEqual(baseAgents['hygienic-reviewer'].tools);
    expect(derived['reviewer-security'].description).toBe('Use for security-focused review passes.');
    expect(derived['reviewer-security'].model).toBe('base/hygienic-model');
  });
});
