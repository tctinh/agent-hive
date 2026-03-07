import type { CustomAgentBase, ResolvedCustomAgentConfig } from 'hive-core';

export type RuntimeSubagentConfig = {
  model?: string;
  variant?: string;
  temperature?: number;
  mode: 'subagent';
  description: string;
  prompt: string;
  tools?: Record<string, boolean>;
  permission?: Record<string, string>;
};

type BuildCustomSubagentsInput = {
  customAgents: Record<string, ResolvedCustomAgentConfig>;
  baseAgents: Record<CustomAgentBase, RuntimeSubagentConfig>;
  autoLoadedSkills?: Record<string, string>;
};

export function buildCustomSubagents({
  customAgents,
  baseAgents,
  autoLoadedSkills = {},
}: BuildCustomSubagentsInput): Record<string, RuntimeSubagentConfig> {
  const derived: Record<string, RuntimeSubagentConfig> = {};

  for (const [agentName, customConfig] of Object.entries(customAgents)) {
    const baseAgent = baseAgents[customConfig.baseAgent];
    if (!baseAgent) {
      continue;
    }

    const autoLoadedSkillsContent = autoLoadedSkills[agentName] ?? '';
    derived[agentName] = {
      model: customConfig.model ?? baseAgent.model,
      variant: customConfig.variant ?? baseAgent.variant,
      temperature: customConfig.temperature ?? baseAgent.temperature,
      mode: 'subagent',
      description: customConfig.description,
      prompt: baseAgent.prompt + autoLoadedSkillsContent,
      tools: baseAgent.tools,
      permission: baseAgent.permission,
    };
  }

  return derived;
}
