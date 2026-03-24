import { describe, expect, it } from 'bun:test';
import * as generators from './index.js';

describe('hooks generator', () => {
  it('exports the hooks generators and returns both hook configs', () => {
    expect(generators.generateAllHooks).toBeDefined();

    const hooks = generators.generateAllHooks();

    expect(hooks.map((hook) => hook.configFilename)).toEqual([
      'hive-plan-enforcement.json',
      'hive-context-injection.json',
    ]);
    expect(hooks).toHaveLength(2);

    for (const hook of hooks) {
      expect(hook.config.version).toBe(1);

      for (const script of hook.scripts) {
        expect(script.content.startsWith('#!/usr/bin/env bash')).toBe(true);
        expect(script.content).toContain('set -e');
      }
    }
  });

  it('builds the plan enforcement hook with preToolUse deny logic for editFiles and execute', () => {
    expect(generators.generatePlanEnforcementHook).toBeDefined();

    const hook = generators.generatePlanEnforcementHook();
    const step = hook.config.hooks.preToolUse?.[0];
    const script = hook.scripts[0]?.content;

    expect(hook.configFilename).toBe('hive-plan-enforcement.json');
    expect(step).toEqual({
      type: 'command',
      command: { bash: '.github/hooks/scripts/check-plan.sh' },
      timeoutSec: 5,
    });
    expect(script).toContain('permissionDecision');
    expect(script).toContain('editFiles');
    expect(script).toContain('execute');
    expect(script).toContain('approved');
  });

  it('builds the context injection hook with sessionStart context aggregation logic', () => {
    expect(generators.generateContextInjectionHook).toBeDefined();

    const hook = generators.generateContextInjectionHook();
    const step = hook.config.hooks.sessionStart?.[0];
    const script = hook.scripts[0]?.content;

    expect(hook.configFilename).toBe('hive-context-injection.json');
    expect(step).toEqual({
      type: 'command',
      command: { bash: '.github/hooks/scripts/inject-context.sh' },
      timeoutSec: 10,
    });
    expect(script).toContain('additionalContext');
    expect(script).toContain('status');
    expect(script).toContain('completed');
    expect(script).toContain('context');
  });
});
