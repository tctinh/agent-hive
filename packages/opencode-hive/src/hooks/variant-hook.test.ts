/**
 * Unit tests for the chat.message hook variant injection.
 * 
 * Tests:
 * - Applies configured variant to Hive agents
 * - Does not override already-set variant
 * - Does not apply variants to non-Hive agents
 * - Handles empty/whitespace-only variants
 */

import { describe, it, expect } from 'bun:test';
import { normalizeVariant, createVariantHook, HIVE_AGENT_NAMES } from './variant-hook.js';

// ============================================================================
// normalizeVariant tests
// ============================================================================

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

// ============================================================================
// HIVE_AGENT_NAMES tests
// ============================================================================

describe('HIVE_AGENT_NAMES', () => {
  it('contains all expected Hive agent names', () => {
    expect(HIVE_AGENT_NAMES).toContain('hive-master');
    expect(HIVE_AGENT_NAMES).toContain('architect-planner');
    expect(HIVE_AGENT_NAMES).toContain('swarm-orchestrator');
    expect(HIVE_AGENT_NAMES).toContain('scout-researcher');
    expect(HIVE_AGENT_NAMES).toContain('forager-worker');
    expect(HIVE_AGENT_NAMES).toContain('hygienic-reviewer');
  });

  it('has exactly 6 agents', () => {
    expect(HIVE_AGENT_NAMES.length).toBe(6);
  });
});

// ============================================================================
// createVariantHook tests
// ============================================================================

describe('createVariantHook', () => {
  // Mock ConfigService
  const createMockConfigService = (
    agentVariants: Record<string, string | undefined>,
    configuredAgents: string[] = Object.keys(agentVariants),
  ) => ({
    hasConfiguredAgent: (agent: string) => configuredAgents.includes(agent),
    getAgentConfig: (agent: string) => ({
      variant: agentVariants[agent],
    }),
  });

  // Helper to create a minimal output object for testing
  const createOutput = (variant?: string) => ({
    message: { variant },
    parts: [],
  });

  describe('applies variant to Hive agents', () => {
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

    it('applies variant to all Hive agents', async () => {
      const configService = createMockConfigService({
        'hive-master': 'max',
        'architect-planner': 'high',
        'swarm-orchestrator': 'medium',
        'scout-researcher': 'low',
        'forager-worker': 'high',
        'hygienic-reviewer': 'medium',
      });

      const hook = createVariantHook(configService as any);

      for (const agentName of HIVE_AGENT_NAMES) {
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

      // Should remain 'low', not overridden to 'high'
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

      // Should not crash, should not set variant (no agent to look up)
      expect(output.message.variant).toBeUndefined();
    });

    it('handles empty variant config', async () => {
      const configService = createMockConfigService({
        'forager-worker': '', // Empty string
      });

      const hook = createVariantHook(configService as any);

      const output = createOutput(undefined);

      await hook(
        { sessionID: 'session-123', agent: 'forager-worker' },
        output,
      );

      // Empty string should be treated as unset
      expect(output.message.variant).toBeUndefined();
    });

    it('handles whitespace-only variant config', async () => {
      const configService = createMockConfigService({
        'forager-worker': '   ', // Whitespace only
      });

      const hook = createVariantHook(configService as any);

      const output = createOutput(undefined);

      await hook(
        { sessionID: 'session-123', agent: 'forager-worker' },
        output,
      );

      // Whitespace-only should be treated as unset
      expect(output.message.variant).toBeUndefined();
    });

    it('handles undefined variant config', async () => {
      const configService = createMockConfigService({
        'forager-worker': undefined,
      });

      const hook = createVariantHook(configService as any);

      const output = createOutput(undefined);

      await hook(
        { sessionID: 'session-123', agent: 'forager-worker' },
        output,
      );

      // Undefined should be treated as unset
      expect(output.message.variant).toBeUndefined();
    });

    it('trims variant before applying', async () => {
      const configService = createMockConfigService({
        'forager-worker': '  high  ', // Has whitespace
      });

      const hook = createVariantHook(configService as any);

      const output = createOutput(undefined);

      await hook(
        { sessionID: 'session-123', agent: 'forager-worker' },
        output,
      );

      // Should be trimmed
      expect(output.message.variant).toBe('high');
    });
  });
});
