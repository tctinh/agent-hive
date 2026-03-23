import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { ContextService, FeatureService, PlanService } from 'hive-core';
import { getPlanTools } from './plan';

const TEST_ROOT_BASE = `/tmp/vscode-hive-plan-test-${process.pid}`;

describe('getPlanTools', () => {
  let testRoot: string;

  beforeEach(() => {
    fs.rmSync(TEST_ROOT_BASE, { recursive: true, force: true });
    fs.mkdirSync(TEST_ROOT_BASE, { recursive: true });
    testRoot = fs.mkdtempSync(path.join(TEST_ROOT_BASE, 'workspace-'));
  });

  afterEach(() => {
    fs.rmSync(TEST_ROOT_BASE, { recursive: true, force: true });
  });

  it('blocks approval when overview review comments remain', async () => {
    const featureName = 'overview-approval-blocked-feature';
    const featureService = new FeatureService(testRoot);
    const planService = new PlanService(testRoot);
    const contextService = new ContextService(testRoot);

    featureService.create(featureName);
    planService.write(featureName, '# Plan\n');
    contextService.write(featureName, 'overview', '# Overview\n');

    fs.mkdirSync(path.join(testRoot, '.hive', 'features', featureName, 'comments'), { recursive: true });
    fs.writeFileSync(
      path.join(testRoot, '.hive', 'features', featureName, 'comments', 'overview.json'),
      JSON.stringify({
        threads: [
          { id: 'overview-thread', line: 1, body: 'Need clearer overview', replies: [] },
        ],
      }, null, 2)
    );

    const tool = getPlanTools(testRoot).find(candidate => candidate.name === 'hive_plan_approve');
    if (!tool) {
      throw new Error('hive_plan_approve tool not found');
    }

    const output = JSON.parse(await tool.invoke({ feature: featureName }, {} as any)) as {
      success?: boolean;
      message?: string;
    };

    expect(output.success).toBe(false);
    expect(output.message).toContain('Cannot approve');
    expect(output.message).toContain('overview');
  });
});
