import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { ContextService, FeatureService, PlanService, getFeaturePath } from 'hive-core';
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
    const featurePath = getFeaturePath(testRoot, featureName);

    fs.mkdirSync(path.join(featurePath, 'comments'), { recursive: true });
    fs.writeFileSync(
      path.join(featurePath, 'comments', 'plan.json'),
      JSON.stringify({
        threads: [
          { id: 'plan-thread', line: 1, body: 'Plan review', replies: [] },
        ],
      }, null, 2)
    );
    fs.writeFileSync(
      path.join(featurePath, 'comments', 'overview.json'),
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

  it('reports logical feature names in hive_status even when storage is indexed', async () => {
    const featureName = 'logical-name-status-feature';
    const featureService = new FeatureService(testRoot);
    const planService = new PlanService(testRoot);

    featureService.create(featureName);
    planService.write(featureName, '# Plan\n');

    const status = await invokeStatus(testRoot, { feature: featureName });

    expect(status.feature.name).toBe(featureName);
    expect(status.overview.path).toBe(`.hive/features/${featureName}/context/overview.md`);
  });

  it('suggests plan work when plan exists but overview is missing', async () => {
    const featureName = 'missing-overview-feature';
    const featureService = new FeatureService(testRoot);
    const planService = new PlanService(testRoot);

    featureService.create(featureName);
    planService.write(featureName, '# Plan\n');
    featureService.updateStatus(featureName, 'approved');

    const status = await invokeStatus(testRoot, { feature: featureName });

    expect(status.plan.exists).toBe(true);
    expect(status.overview).toMatchObject({
      exists: false,
      path: `.hive/features/${featureName}/context/overview.md`,
    });
    expect(status.nextAction).toBe('Generate tasks from plan with hive_tasks_sync');
  });

  it('tells planners that plan md is the human-facing review artifact', async () => {
    const featureName = 'refresh-overview-feature';
    const featureService = new FeatureService(testRoot);
    const planService = new PlanService(testRoot);
    const contextService = new ContextService(testRoot);

    featureService.create(featureName);
    planService.write(featureName, '# Plan\n');
    contextService.write(featureName, 'overview', '# Overview\n');
    featureService.updateStatus(featureName, 'approved');

    const status = await invokeStatus(testRoot, { feature: featureName });

    expect(status.nextAction).toBe('Generate tasks from plan with hive_tasks_sync');
  });

  it('registers hive_status for VS Code language model tools', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'packages', 'vscode-hive', 'package.json'), 'utf-8')
    ) as {
      contributes?: {
        languageModelTools?: Array<{ name?: string; toolReferenceName?: string }>;
      };
    };

    const toolNames = packageJson.contributes?.languageModelTools?.map(tool => tool.name) ?? [];
    const statusTool = packageJson.contributes?.languageModelTools?.find(tool => tool.name === 'hive_status');

    expect(toolNames).toContain('hive_status');
    expect(statusTool?.toolReferenceName).toBe('hiveStatus');
  });
});

async function invokeStatus(workspaceRoot: string, input: { feature: string }): Promise<any> {
  const tool = getStatusTools(workspaceRoot).find(candidate => candidate.name === 'hive_status');
  if (!tool) {
    throw new Error('hive_status tool not found');
  }

  return JSON.parse(await tool.invoke(input, {} as any));
}
