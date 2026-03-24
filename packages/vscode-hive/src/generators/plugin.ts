export interface PluginManifest {
  name: string;
  description: string;
  version: string;
  author: { name: string };
  repository: string;
  license: string;
  keywords: string[];
  agents: string[];
  skills: string[];
  hooks: string[];
  instructions: string[];
}

interface PluginManifestOptions {
  version?: string;
}

const pluginManifestTemplate: Omit<PluginManifest, 'version'> = {
  name: 'agent-hive',
  description: 'Plan-first AI development with isolated worktrees and human review',
  author: { name: 'tctinh' },
  repository: 'https://github.com/tctinh/agent-hive',
  license: 'MIT',
  keywords: ['planning', 'orchestration', 'multi-agent', 'worktree', 'hive'],
  agents: ['.github/agents'],
  skills: ['.github/skills/*'],
  hooks: ['.github/hooks/*'],
  instructions: ['.github/instructions'],
};

export function generatePluginManifest(options: PluginManifestOptions = {}): PluginManifest {
  return {
    ...pluginManifestTemplate,
    version: options.version ?? '1.0.0',
    author: { ...pluginManifestTemplate.author },
    keywords: [...pluginManifestTemplate.keywords],
    agents: [...pluginManifestTemplate.agents],
    skills: [...pluginManifestTemplate.skills],
    hooks: [...pluginManifestTemplate.hooks],
    instructions: [...pluginManifestTemplate.instructions],
  };
}
