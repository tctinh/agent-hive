import { describe, expect, it } from 'bun:test';
import * as generators from './index.js';

describe('plugin manifest generator', () => {
  it('exports the plugin generator and returns the root plugin manifest metadata', () => {
    expect(generators.generatePluginManifest).toBeDefined();

    const manifest = generators.generatePluginManifest();

    expect(manifest).toEqual({
      name: 'agent-hive',
      description: 'Plan-first AI development with isolated worktrees and human review',
      version: '1.0.0',
      author: { name: 'tctinh' },
      repository: 'https://github.com/tctinh/agent-hive',
      license: 'MIT',
      keywords: ['planning', 'orchestration', 'multi-agent', 'worktree', 'hive'],
      agents: ['.github/agents'],
      skills: ['.github/skills/*'],
      hooks: ['.github/hooks/*'],
      instructions: ['.github/instructions'],
    });
  });

  it('supports overriding only the manifest version', () => {
    const manifest = generators.generatePluginManifest({ version: '2.4.0-beta.1' });

    expect(manifest.version).toBe('2.4.0-beta.1');
    expect(manifest.name).toBe('agent-hive');
    expect(manifest.skills).toEqual(['.github/skills/*']);
    expect(manifest.hooks).toEqual(['.github/hooks/*']);
  });
});
