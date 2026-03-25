import type { ConfigService, SessionService, SessionKind } from 'hive-core';

export function normalizeVariant(variant: string | undefined): string | undefined {
  if (variant === undefined) return undefined;
  const trimmed = variant.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const BUILT_IN_AGENTS: Record<string, { sessionKind: SessionKind; baseAgent: string }> = {
  'hive-master': { sessionKind: 'primary', baseAgent: 'hive-master' },
  'architect-planner': { sessionKind: 'primary', baseAgent: 'architect-planner' },
  'swarm-orchestrator': { sessionKind: 'primary', baseAgent: 'swarm-orchestrator' },
  'forager-worker': { sessionKind: 'task-worker', baseAgent: 'forager-worker' },
  'scout-researcher': { sessionKind: 'subagent', baseAgent: 'scout-researcher' },
  'hygienic-reviewer': { sessionKind: 'subagent', baseAgent: 'hygienic-reviewer' },
};

const BASE_AGENT_KIND: Record<string, SessionKind> = {
  'forager-worker': 'task-worker',
  'hygienic-reviewer': 'subagent',
};

export function classifySession(
  agent: string,
  customAgents: Record<string, { baseAgent: string }> = {},
): { sessionKind: SessionKind; baseAgent?: string } {
  const builtIn = BUILT_IN_AGENTS[agent];
  if (builtIn) {
    return { sessionKind: builtIn.sessionKind, baseAgent: builtIn.baseAgent };
  }

  const custom = customAgents[agent];
  if (custom) {
    const kind = BASE_AGENT_KIND[custom.baseAgent];
    if (kind) {
      return { sessionKind: kind, baseAgent: custom.baseAgent };
    }
  }

  return { sessionKind: 'unknown', baseAgent: undefined };
}

export function createVariantHook(
  configService: ConfigService,
  sessionService?: SessionService,
  customAgents?: Record<string, { baseAgent: string }>,
) {
  return async (
    input: {
      sessionID: string;
      agent?: string;
      model?: { providerID: string; modelID: string };
      messageID?: string;
      variant?: string;
    },
    output: {
      message: { variant?: string };
      parts: unknown[];
    },
  ): Promise<void> => {
    const { agent } = input;

    if (agent && sessionService) {
      const { sessionKind, baseAgent } = classifySession(agent, customAgents);
      const patch: Record<string, unknown> = { agent, sessionKind };
      if (baseAgent) {
        patch.baseAgent = baseAgent;
      }
      sessionService.trackGlobal(input.sessionID, patch as any);
    }

    if (!agent) return;
    if (!configService.hasConfiguredAgent(agent)) return;
    if (output.message.variant !== undefined) return;

    const agentConfig = configService.getAgentConfig(agent);
    const configuredVariant = normalizeVariant(agentConfig.variant);

    if (configuredVariant !== undefined) {
      output.message.variant = configuredVariant;
    }
  };
}
