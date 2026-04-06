import { describe, it, expect } from 'bun:test';
import { normalizeVariant, createVariantHook, classifySession } from './variant-hook.js';
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
        'hive-helper': 'medium',
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

describe('classifySession', () => {
  const NO_CUSTOM_AGENTS: Record<string, { baseAgent: string }> = {};

  describe('built-in agent classification', () => {
    it('classifies hive-master as primary', () => {
      const result = classifySession('hive-master', NO_CUSTOM_AGENTS);
      expect(result.sessionKind).toBe('primary');
      expect(result.baseAgent).toBe('hive-master');
    });

    it('classifies architect-planner as primary', () => {
      const result = classifySession('architect-planner', NO_CUSTOM_AGENTS);
      expect(result.sessionKind).toBe('primary');
      expect(result.baseAgent).toBe('architect-planner');
    });

    it('classifies swarm-orchestrator as primary', () => {
      const result = classifySession('swarm-orchestrator', NO_CUSTOM_AGENTS);
      expect(result.sessionKind).toBe('primary');
      expect(result.baseAgent).toBe('swarm-orchestrator');
    });

    it('classifies forager-worker as task-worker', () => {
      const result = classifySession('forager-worker', NO_CUSTOM_AGENTS);
      expect(result.sessionKind).toBe('task-worker');
      expect(result.baseAgent).toBe('forager-worker');
    });

    it('classifies scout-researcher as subagent', () => {
      const result = classifySession('scout-researcher', NO_CUSTOM_AGENTS);
      expect(result.sessionKind).toBe('subagent');
      expect(result.baseAgent).toBe('scout-researcher');
    });

    it('classifies hygienic-reviewer as subagent', () => {
      const result = classifySession('hygienic-reviewer', NO_CUSTOM_AGENTS);
      expect(result.sessionKind).toBe('subagent');
      expect(result.baseAgent).toBe('hygienic-reviewer');
    });

    it('classifies hive-helper as subagent', () => {
      const result = classifySession('hive-helper', NO_CUSTOM_AGENTS);
      expect(result.sessionKind).toBe('subagent');
      expect(result.baseAgent).toBe('hive-helper');
    });
  });

  describe('custom agent classification', () => {
    const customAgents: Record<string, { baseAgent: string }> = {
      'forager-ui': { baseAgent: 'forager-worker' },
      'scout-custom': { baseAgent: 'scout-researcher' },
      'reviewer-security': { baseAgent: 'hygienic-reviewer' },
    };

    it('classifies custom forager-derived agent as task-worker', () => {
      const result = classifySession('forager-ui', customAgents);
      expect(result.sessionKind).toBe('task-worker');
      expect(result.baseAgent).toBe('forager-worker');
    });

    it('classifies custom hygienic-derived agent as subagent', () => {
      const result = classifySession('reviewer-security', customAgents);
      expect(result.sessionKind).toBe('subagent');
      expect(result.baseAgent).toBe('hygienic-reviewer');
    });

    it('treats unsupported custom scout-derived agent as unknown', () => {
      const result = classifySession('scout-custom', customAgents);
      expect(result.sessionKind).toBe('unknown');
      expect(result.baseAgent).toBeUndefined();
    });
  });

  describe('unknown agent classification', () => {
    it('classifies unconfigured custom-like agent as unknown', () => {
      const result = classifySession('scout-custom', NO_CUSTOM_AGENTS);
      expect(result.sessionKind).toBe('unknown');
      expect(result.baseAgent).toBeUndefined();
    });

    it('classifies completely unknown agent as unknown', () => {
      const result = classifySession('some-random-agent', NO_CUSTOM_AGENTS);
      expect(result.sessionKind).toBe('unknown');
      expect(result.baseAgent).toBeUndefined();
    });
  });
});

describe('createVariantHook with session tracking', () => {
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

  it('records global session with baseAgent and sessionKind on first message', async () => {
    const tracked: Array<{ sessionId: string; patch: Record<string, unknown> }> = [];
    const mockSessionService = {
      trackGlobal: (sessionId: string, patch?: Record<string, unknown>) => {
        tracked.push({ sessionId, patch: patch ?? {} });
        return { sessionId, startedAt: '', lastActiveAt: '' };
      },
    };

    const hook = createVariantHook(
      createMockConfigService({ 'forager-worker': 'high' }) as any,
      mockSessionService as any,
      { 'forager-ui': { baseAgent: 'forager-worker' } },
    );

    const output = createOutput(undefined);
    await hook({ sessionID: 'sess-123', agent: 'forager-ui' }, output);

    expect(tracked.length).toBe(1);
    expect(tracked[0].sessionId).toBe('sess-123');
    expect(tracked[0].patch).toEqual({
      agent: 'forager-ui',
      baseAgent: 'forager-worker',
      sessionKind: 'task-worker',
    });
  });

  it('classifies primary agents on the chat.message path', async () => {
    const tracked: Array<{ sessionId: string; patch: Record<string, unknown> }> = [];
    const mockSessionService = {
      trackGlobal: (sessionId: string, patch?: Record<string, unknown>) => {
        tracked.push({ sessionId, patch: patch ?? {} });
        return { sessionId, startedAt: '', lastActiveAt: '' };
      },
    };

    const hook = createVariantHook(
      createMockConfigService({ 'hive-master': 'max' }) as any,
      mockSessionService as any,
    );

    const output = createOutput(undefined);
    await hook({ sessionID: 'sess-primary', agent: 'hive-master' }, output);

    expect(tracked.length).toBe(1);
    expect(tracked[0].patch).toEqual({
      agent: 'hive-master',
      baseAgent: 'hive-master',
      sessionKind: 'primary',
    });
  });

  it('classifies unknown agents that are not in customAgents', async () => {
    const tracked: Array<{ sessionId: string; patch: Record<string, unknown> }> = [];
    const mockSessionService = {
      trackGlobal: (sessionId: string, patch?: Record<string, unknown>) => {
        tracked.push({ sessionId, patch: patch ?? {} });
        return { sessionId, startedAt: '', lastActiveAt: '' };
      },
    };

    const hook = createVariantHook(
      createMockConfigService({}) as any,
      mockSessionService as any,
    );

    const output = createOutput(undefined);
    await hook({ sessionID: 'sess-unknown', agent: 'scout-custom' }, output);

    expect(tracked.length).toBe(1);
    expect(tracked[0].patch).toEqual({
      agent: 'scout-custom',
      sessionKind: 'unknown',
    });
  });

  it('does not classify unsupported custom scout-derived agents as subagents', async () => {
    const tracked: Array<{ sessionId: string; patch: Record<string, unknown> }> = [];
    const mockSessionService = {
      trackGlobal: (sessionId: string, patch?: Record<string, unknown>) => {
        tracked.push({ sessionId, patch: patch ?? {} });
        return { sessionId, startedAt: '', lastActiveAt: '' };
      },
    };

    const hook = createVariantHook(
      createMockConfigService({ 'scout-custom': 'low' }, ['scout-custom']) as any,
      mockSessionService as any,
      { 'scout-custom': { baseAgent: 'scout-researcher' } },
    );

    const output = createOutput(undefined);
    await hook({ sessionID: 'sess-scout-custom', agent: 'scout-custom' }, output);

    expect(tracked.length).toBe(1);
    expect(tracked[0].patch).toEqual({
      agent: 'scout-custom',
      sessionKind: 'unknown',
    });
  });

  it('skips session tracking when no sessionService provided', async () => {
    const hook = createVariantHook(
      createMockConfigService({ 'forager-worker': 'high' }) as any,
    );

    const output = createOutput(undefined);
    await hook({ sessionID: 'sess-no-svc', agent: 'forager-worker' }, output);

    expect(output.message.variant).toBe('high');
  });

  it('skips session tracking when no agent in input', async () => {
    const tracked: Array<{ sessionId: string; patch: Record<string, unknown> }> = [];
    const mockSessionService = {
      trackGlobal: (sessionId: string, patch?: Record<string, unknown>) => {
        tracked.push({ sessionId, patch: patch ?? {} });
        return { sessionId, startedAt: '', lastActiveAt: '' };
      },
    };

    const hook = createVariantHook(
      createMockConfigService({}) as any,
      mockSessionService as any,
    );

    const output = createOutput(undefined);
    await hook({ sessionID: 'sess-no-agent' }, output);

    expect(tracked.length).toBe(0);
  });
});
