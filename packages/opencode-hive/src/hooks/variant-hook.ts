/**
 * Variant hook for applying per-agent model variants to OpenCode prompts.
 * 
 * This module provides the `chat.message` hook implementation that:
 * - Reads the target agent name from the message being created
 * - Looks up the configured variant for that Hive agent from ConfigService
 * - If the message has no variant set, applies the configured variant
 * - Never overrides an already-set variant (respects explicit selection)
 */

import type { ConfigService } from 'hive-core';

/**
 * List of Hive agent names that can have variants configured.
 */
export const HIVE_AGENT_NAMES = [
  'hive-master',
  'architect-planner',
  'swarm-orchestrator',
  'scout-researcher',
  'forager-worker',
  'hygienic-reviewer',
] as const;

export type HiveAgentName = typeof HIVE_AGENT_NAMES[number];

/**
 * Check if an agent name is a Hive agent.
 */
export function isHiveAgent(agent: string | undefined): agent is HiveAgentName {
  return agent !== undefined && HIVE_AGENT_NAMES.includes(agent as HiveAgentName);
}

/**
 * Normalize a variant string: trim whitespace and return undefined if empty.
 */
export function normalizeVariant(variant: string | undefined): string | undefined {
  if (variant === undefined) return undefined;
  const trimmed = variant.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Create the chat.message hook for variant injection.
 * 
 * The hook signature matches OpenCode plugin's expected type:
 * - input: { sessionID, agent?, model?, messageID?, variant? }
 * - output: { message: UserMessage, parts: Part[] }
 * 
 * We only access output.message.variant which exists on UserMessage.
 * 
 * @param configService - The ConfigService instance to read agent configs from
 * @returns The chat.message hook function
 */
export function createVariantHook(configService: ConfigService) {
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

    // Skip if no agent specified
    if (!agent) return;

    // Skip if not a configured Hive agent (built-in or accepted custom)
    if (!configService.hasConfiguredAgent(agent)) return;

    // Skip if variant is already set (respect explicit selection)
    if (output.message.variant !== undefined) return;

    // Look up configured variant for this agent
    const agentConfig = configService.getAgentConfig(agent);
    const configuredVariant = normalizeVariant(agentConfig.variant);

    // Apply configured variant if present
    if (configuredVariant !== undefined) {
      output.message.variant = configuredVariant;
    }
  };
}
