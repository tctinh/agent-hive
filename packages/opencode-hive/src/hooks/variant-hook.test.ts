import { describe, it, expect } from 'bun:test';
import { normalizeVariant, createVariantHook } from './variant-hook.js';

describe('normalizeVariant', () => {
  it('returns trimmed string for valid variant', () => {
    expect(normalizeVariant('high')).toBe('high');
    expect(normalizeVariant('  medium  ')).toBe('medium');
    expect(normalizeVariant('\tlow\n')).toBe('low');
  });

  it('returns undefined for empty string', () => {
    expect(normalizeVariant('')).toBeUndefined();
    expect(normalizeVariant('   ')).toBeUndefined();
    expect(normalizeVariant('\t\n')).toBeUndefined();
  });

  it('returns undefined for undefined input', () => {
    expect(normalizeVariant(undefined)).toBeUndefined();
  });
});

describe('createVariantHook', () => {
  const createMockConfigService = (
    agentVariants: Record<string, string | undefined>,
    configuredAgents: string[] = Object.keys(agentVariants),
  ) => ({
    hasConfiguredAgent: (agent: string) => configuredAgents.includes(agent),
    getAgentConfig: (agent: string) => ({
      variant: agentVariants[agent],
    }),
  });

  const createOutput = (variant?: string) => ({
    message: { variant },
    parts: [],
  });

  describe('applies variant to configured agents', () => {
    it('sets variant when message has no variant and agent has configured variant', async () => {
      const configService = createMockConfigService({
        'forager-worker': 'high',
      });

      const hook = createVariantHook(configService as any);

      const input = {
        sessionID: 'session-123',
        agent: 'forager-worker',
        model: { providerID: 'anthropic', modelID: 'claude-sonnet' },
        messageID: 'msg-1',
        variant: undefined,
      };

      const output = createOutput(undefined);

      await hook(input, output);

      expect(output.message.variant).toBe('high');
    });

    it('applies variant to each configured built-in agent', async () => {
      const agentVariants = {
        'hive-master': 'max',
        'architect-planner': 'high',
        'swarm-orchestrator': 'medium',
        'scout-researcher': 'low',
        'forager-worker': 'high',
        'hygienic-reviewer': 'medium',
      };

      const hook = createVariantHook(createMockConfigService(agentVariants) as any);

      for (const agentName of Object.keys(agentVariants)) {
        const output = createOutput(undefined);

        await hook(
          { sessionID: 'session-123', agent: agentName },
          output,
        );

        expect(output.message.variant).toBeDefined();
      }
    });

    it('applies variant to accepted custom forager-derived agent', async () => {
      const configService = createMockConfigService(
        {
          'forager-ui': 'high',
        },
        ['forager-ui'],
      );

      const hook = createVariantHook(configService as any);
      const output = createOutput(undefined);

      await hook(
        { sessionID: 'session-123', agent: 'forager-ui' },
        output,
      );

      expect(output.message.variant).toBe('high');
    });

    it('applies variant to accepted custom hygienic-derived agent', async () => {
      const configService = createMockConfigService(
        {
          'reviewer-security': 'medium',
        },
        ['reviewer-security'],
      );

      const hook = createVariantHook(configService as any);
      const output = createOutput(undefined);

      await hook(
        { sessionID: 'session-123', agent: 'reviewer-security' },
        output,
      );

      expect(output.message.variant).toBe('medium');
    });
  });

  describe('respects explicit variant', () => {
    it('does not override already-set variant', async () => {
      const configService = createMockConfigService({
        'forager-worker': 'high',
      });

      const hook = createVariantHook(configService as any);

      const output = createOutput('low'); // Already set

      await hook(
        { sessionID: 'session-123', agent: 'forager-worker', variant: 'low' },
        output,
      );

      expect(output.message.variant).toBe('low');
    });
  });

  describe('does not apply to non-Hive agents', () => {
    it('does not set variant for unknown agent', async () => {
      const configService = createMockConfigService({
        'forager-worker': 'high',
      });

      const hook = createVariantHook(configService as any);

      const output = createOutput(undefined);

      await hook(
        { sessionID: 'session-123', agent: 'some-other-agent' },
        output,
      );

      expect(output.message.variant).toBeUndefined();
    });

    it('does not set variant for built-in OpenCode agents', async () => {
      const configService = createMockConfigService({
        'forager-worker': 'high',
      });

      const hook = createVariantHook(configService as any);

      const builtinAgents = ['build', 'plan', 'code'];

      for (const agentName of builtinAgents) {
        const output = createOutput(undefined);

        await hook(
          { sessionID: 'session-123', agent: agentName },
          output,
        );

        expect(output.message.variant).toBeUndefined();
      }
    });
  });

  describe('handles edge cases', () => {
    it('handles missing agent in input', async () => {
      const configService = createMockConfigService({
        'forager-worker': 'high',
      });

      const hook = createVariantHook(configService as any);

      const output = createOutput(undefined);

      await hook(
        { sessionID: 'session-123', agent: undefined },
        output,
      );

      expect(output.message.variant).toBeUndefined();
    });

    for (const variant of ['', '   ', undefined]) {
      it(`treats ${String(variant)} as unset`, async () => {
        const hook = createVariantHook(createMockConfigService({
          'forager-worker': variant,
        }) as any);

        const output = createOutput(undefined);

        await hook(
          { sessionID: 'session-123', agent: 'forager-worker' },
          output,
        );

        expect(output.message.variant).toBeUndefined();
      });
    }

    it('trims variant before applying', async () => {
      const configService = createMockConfigService({
        'forager-worker': '  high  ',
      });

      const hook = createVariantHook(configService as any);

      const output = createOutput(undefined);

      await hook(
        { sessionID: 'session-123', agent: 'forager-worker' },
        output,
      );

      expect(output.message.variant).toBe('high');
    });
  });
});
