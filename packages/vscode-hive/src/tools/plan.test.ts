import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { ContextService, FeatureService, PlanService, getFeaturePath } from 'hive-core';
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

  it('describes overview-first review and plan execution truth', async () => {
    const featureName = 'overview-first-plan-description-feature';
    const featureService = new FeatureService(testRoot);

    featureService.create(featureName);

    const tools = getPlanTools(testRoot);
    const writeTool = tools.find(candidate => candidate.name === 'hive_plan_write');
    const readTool = tools.find(candidate => candidate.name === 'hive_plan_read');
    const approveTool = tools.find(candidate => candidate.name === 'hive_plan_approve');

    if (!writeTool || !readTool || !approveTool) {
      throw new Error('Expected plan tools not found');
    }

    expect(writeTool.modelDescription).toContain('context/overview.md');
    expect(writeTool.modelDescription).toContain('plan.md remains execution truth');
    expect(writeTool.modelDescription).not.toContain('plan.md is the human-facing review surface');

    expect(readTool.modelDescription).toContain('context/overview.md');
    expect(readTool.modelDescription).toContain('plan.md execution contract');
    expect(readTool.modelDescription).not.toContain('in-plan human-facing summary');

    expect(approveTool.modelDescription).toContain('context/overview.md first');
    expect(approveTool.modelDescription).toContain('plan.md as the execution contract');
    expect(approveTool.modelDescription).not.toContain('user has reviewed plan.md');

    const writeOutput = JSON.parse(await writeTool.invoke({
      feature: featureName,
      content: '# Plan\n\n## Tasks\n',
    }, {} as any)) as { message?: string };

    expect(writeOutput.message).toContain('Review context/overview.md first');
    expect(writeOutput.message).toContain('plan.md remains execution truth');
    expect(writeOutput.message).not.toContain('plan.md as the human-facing surface');
  });

  it('blocks approval when overview review comments remain', async () => {
    const featureName = 'overview-approval-blocked-feature';
    const featureService = new FeatureService(testRoot);
    const planService = new PlanService(testRoot);
    const contextService = new ContextService(testRoot);

    featureService.create(featureName);
    planService.write(featureName, '# Plan\n');
    contextService.write(featureName, 'overview', '# Overview\n');

    const featurePath = getFeaturePath(testRoot, featureName);

    fs.mkdirSync(path.join(featurePath, 'comments'), { recursive: true });
    fs.writeFileSync(
      path.join(featurePath, 'comments', 'overview.json'),
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
