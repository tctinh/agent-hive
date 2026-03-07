import type { ConfigService } from 'hive-core';

export function normalizeVariant(variant: string | undefined): string | undefined {
  if (variant === undefined) return undefined;
  const trimmed = variant.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

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
