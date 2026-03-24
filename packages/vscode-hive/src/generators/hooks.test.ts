import { afterEach, describe, expect, it } from 'bun:test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as generators from './index.js';

const tempPaths = new Set<string>();

function createTempPath(prefix: string): string {
  const tempPath = path.join(
    os.tmpdir(),
    `${prefix}-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
  tempPaths.add(tempPath);
  return tempPath;
}

function createFeature(workspaceRoot: string, dirName: string, status: string, context?: Record<string, string>): void {
  const featureDir = path.join(workspaceRoot, '.hive', 'features', dirName);
  fs.mkdirSync(featureDir, { recursive: true });
  fs.writeFileSync(path.join(featureDir, 'feature.json'), JSON.stringify({ status }, null, 2));

  if (!context) {
    return;
  }

  const contextDir = path.join(featureDir, 'context');
  fs.mkdirSync(contextDir, { recursive: true });

  for (const [name, content] of Object.entries(context)) {
    fs.writeFileSync(path.join(contextDir, name), content);
  }
}

function runHookScript(scriptContent: string, inputJson: string, workspaceRoot: string): string {
  const scriptPath = `${createTempPath('hook-script')}.sh`;
  fs.writeFileSync(scriptPath, scriptContent, 'utf8');

  return execFileSync('bash', [scriptPath], {
    cwd: workspaceRoot,
    input: inputJson,
    encoding: 'utf8',
  });
}

afterEach(() => {
  for (const tempPath of tempPaths) {
    fs.rmSync(tempPath, { recursive: true, force: true });
  }

  tempPaths.clear();
});

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

  it('allows edit and execute tools when a feature is executing', () => {
    const workspaceRoot = createTempPath('plan-hook-workspace');
    fs.mkdirSync(path.join(workspaceRoot, '.hive', 'features'), { recursive: true });
    createFeature(workspaceRoot, '01_release-feature', 'executing');

    const script = generators.generatePlanEnforcementHook().scripts[0]?.content;

    const output = runHookScript(script ?? '', JSON.stringify({ toolName: 'execute' }), workspaceRoot);

    expect(output).toBe('');
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

  it('prefers the active feature file over the first non-completed feature for context injection', () => {
    const workspaceRoot = createTempPath('context-hook-workspace');
    fs.mkdirSync(path.join(workspaceRoot, '.hive', 'features'), { recursive: true });
    createFeature(workspaceRoot, '01_alpha-feature', 'approved', { 'notes.md': 'alpha context' });
    createFeature(workspaceRoot, '02_beta-feature', 'executing', { 'overview.md': 'beta context' });
    fs.writeFileSync(path.join(workspaceRoot, '.hive', 'active-feature'), 'beta-feature\n');

    const script = generators.generateContextInjectionHook().scripts[0]?.content;

    const output = runHookScript(script ?? '', '{}', workspaceRoot);
    const parsed = JSON.parse(output) as { additionalContext?: string };

    expect(parsed.additionalContext).toContain('beta context');
    expect(parsed.additionalContext).not.toContain('alpha context');
  });
});
