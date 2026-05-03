import { describe, expect, it } from 'bun:test';
import type { ResolvedCustomAgentConfig } from 'hive-core';
import { FORAGER_BEE_PROMPT } from './forager';
import { HYGIENIC_BEE_PROMPT } from './hygienic';
import { SCOUT_BEE_PROMPT } from './scout';
import { buildCustomSubagents } from './custom-agents';

describe('buildCustomSubagents', () => {
  it('builds derived subagents for scout, forager, and hygienic bases', () => {
    const scoutPermission = {
      edit: 'deny',
      task: 'deny',
      delegate: 'deny',
      skill: 'allow',
      webfetch: 'allow',
    };
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
      'scout-researcher': {
        model: 'base/scout-model',
        temperature: 0.5,
        variant: 'low',
        mode: 'subagent' as const,
        description: 'Base Scout',
        prompt: SCOUT_BEE_PROMPT,
        tools: {
          hive_network_query: false,
        },
        permission: scoutPermission,
      },
      'forager-worker': {
        model: 'base/forager-model',
        temperature: 0.3,
        variant: 'medium',
        mode: 'subagent' as const,
        description: 'Base Forager',
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
        description: 'Base Hygienic',
        prompt: HYGIENIC_BEE_PROMPT,
        tools: {
          hive_merge: false,
          hive_status: false,
        },
        permission: hygienicPermission,
      },
    };

    const customAgents: Record<string, ResolvedCustomAgentConfig> = {
      'scout-docs': {
        baseAgent: 'scout-researcher',
        description: 'Use for documentation-heavy research tasks.',
        model: 'custom/scout-model',
        temperature: 0.4,
        variant: 'medium',
        autoLoadSkills: [],
      },
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
        'scout-docs': '\n\n# scout-docs auto skills',
        'forager-ui': '\n\n# forager-ui auto skills',
      },
    });

    expect(derived['scout-docs'].mode).toBe('subagent');
    expect(derived['scout-docs'].prompt).toContain(SCOUT_BEE_PROMPT);
    expect(derived['scout-docs'].prompt).toContain('# scout-docs auto skills');
    expect(derived['scout-docs'].permission).toEqual(baseAgents['scout-researcher'].permission);
    expect(derived['scout-docs'].tools).toEqual(baseAgents['scout-researcher'].tools);
    expect(derived['scout-docs'].description).toBe('Use for documentation-heavy research tasks.');
    expect(derived['scout-docs'].model).toBe('custom/scout-model');
    expect(derived['scout-docs'].temperature).toBe(0.4);
    expect(derived['scout-docs'].variant).toBe('medium');

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
