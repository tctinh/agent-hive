import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { ContextService, FeatureService, PlanService } from 'hive-core';
import { getStatusTools } from './status';

const TEST_ROOT_BASE = `/tmp/vscode-hive-status-test-${process.pid}`;

describe('getStatusTools', () => {
  let testRoot: string;

  beforeEach(() => {
    fs.rmSync(TEST_ROOT_BASE, { recursive: true, force: true });
    fs.mkdirSync(TEST_ROOT_BASE, { recursive: true });
    testRoot = fs.mkdtempSync(path.join(TEST_ROOT_BASE, 'workspace-'));
  });

  afterEach(() => {
    fs.rmSync(TEST_ROOT_BASE, { recursive: true, force: true });
  });

  it('reports overview metadata and review counts', async () => {
    const featureName = 'status-overview-feature';
    const featureService = new FeatureService(testRoot);
    const planService = new PlanService(testRoot);
    const contextService = new ContextService(testRoot);

    featureService.create(featureName);
    planService.write(featureName, '# Plan\n');
    contextService.write(featureName, 'overview', '# Overview\n');
    fs.mkdirSync(path.join(testRoot, '.hive', 'features', featureName, 'comments'), { recursive: true });
    fs.writeFileSync(
      path.join(testRoot, '.hive', 'features', featureName, 'comments', 'plan.json'),
      JSON.stringify({
        threads: [
          { id: 'plan-thread', line: 1, body: 'Plan review', replies: [] },
        ],
      }, null, 2)
    );
    fs.writeFileSync(
      path.join(testRoot, '.hive', 'features', featureName, 'comments', 'overview.json'),
      JSON.stringify({
        threads: [
          { id: 'overview-thread', line: 2, body: 'Overview review', replies: [] },
        ],
      }, null, 2)
    );

    const status = await invokeStatus(testRoot, { feature: featureName });

    expect(status.overview).toMatchObject({
      exists: true,
      path: `.hive/features/${featureName}/context/overview.md`,
      primaryReview: true,
    });
    expect(typeof status.overview.updatedAt).toBe('string');
    expect(status.review).toEqual({
      unresolvedTotal: 2,
      byDocument: {
        overview: 1,
        plan: 1,
      },
    });
  });

  it('suggests writing overview when plan exists but overview is missing', async () => {
    const featureName = 'missing-overview-feature';
    const featureService = new FeatureService(testRoot);
    const planService = new PlanService(testRoot);

    featureService.create(featureName);
    planService.write(featureName, '# Plan\n');

    const status = await invokeStatus(testRoot, { feature: featureName });

    expect(status.plan.exists).toBe(true);
    expect(status.overview).toMatchObject({
      exists: false,
      path: `.hive/features/${featureName}/context/overview.md`,
      primaryReview: true,
    });
    expect(status.nextAction).toContain('hive_context_write');
    expect(status.nextAction).toContain('overview');
  });

  it('tells planners to refresh overview after significant plan changes', async () => {
    const featureName = 'refresh-overview-feature';
    const featureService = new FeatureService(testRoot);
    const planService = new PlanService(testRoot);
    const contextService = new ContextService(testRoot);

    featureService.create(featureName);
    planService.write(featureName, '# Plan\n');
    contextService.write(featureName, 'overview', '# Overview\n');

    const status = await invokeStatus(testRoot, { feature: featureName });

    expect(status.nextAction).toContain('Refresh overview');
    expect(status.nextAction).toContain('significant plan changes');
    expect(status.nextAction).toContain('hive_context_write');
    expect(status.nextAction).toContain('At a Glance');
    expect(status.nextAction).toContain('Workstreams');
    expect(status.nextAction).toContain('Revision History');
  });
});

async function invokeStatus(workspaceRoot: string, input: { feature: string }): Promise<any> {
  const tool = getStatusTools(workspaceRoot).find(candidate => candidate.name === 'hive_status');
  if (!tool) {
    throw new Error('hive_status tool not found');
  }

  return JSON.parse(await tool.invoke(input, {} as any));
}
