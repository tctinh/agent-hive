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

  it('reports context handling metadata and review counts', async () => {
    const featureName = 'status-overview-feature';
    const featureService = new FeatureService(testRoot);
    const planService = new PlanService(testRoot);
    const contextService = new ContextService(testRoot);

    featureService.create(featureName);
    planService.write(featureName, '# Plan\n');
    contextService.write(featureName, 'overview', '# Overview\n');
    contextService.write(featureName, 'draft', '# Draft\n');
    contextService.write(featureName, 'execution-decisions', '# Execution Decisions\n');
    contextService.write(featureName, 'learnings', '# Learnings\n');
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
    expect(status.context.files).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: 'draft',
        role: 'scratchpad',
        includeInExecution: false,
        includeInAgentsMdSync: false,
      }),
      expect.objectContaining({
        name: 'execution-decisions',
        role: 'operational',
        includeInExecution: false,
        includeInAgentsMdSync: false,
      }),
      expect.objectContaining({
        name: 'learnings',
        role: 'durable',
        includeInExecution: true,
        includeInAgentsMdSync: true,
      }),
      expect.objectContaining({
        name: 'overview',
        role: 'human',
        includeInExecution: false,
        includeInAgentsMdSync: false,
      }),
    ]));
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

  it('guides planners to overview-first status messaging', async () => {
    const featureName = 'refresh-overview-feature';
    const featureService = new FeatureService(testRoot);

    featureService.create(featureName);
    const status = await invokeStatus(testRoot, { feature: featureName });

    expect(status.nextAction).toBe(
      'Write or revise plan with hive_plan_write. Refresh context/overview.md first for human review; plan.md remains execution truth and pre-task Mermaid overview diagrams are optional.'
    );
  });

  it('contributes prompt-visible LM tool metadata alongside the expanded welcome copy', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf-8')
    ) as {
      contributes?: {
        languageModelTools?: Array<{
          name?: string;
          toolReferenceName?: string;
          canBeReferencedInPrompt?: boolean;
        }>;
        viewsWelcome?: Array<{ view?: string; contents?: string }>;
      };
    };

    const welcome = packageJson.contributes?.viewsWelcome?.find(view => view.view === 'hive.features');
    const languageModelTools = packageJson.contributes?.languageModelTools ?? [];
    const toolNames = new Map(languageModelTools.map(tool => [tool.name, tool]));

    expect(languageModelTools.length).toBeGreaterThan(0);
    expect(toolNames.get('hive_status')).toMatchObject({
      toolReferenceName: 'hiveStatus',
      canBeReferencedInPrompt: true,
    });
    expect(toolNames.get('hive_plan_read')).toMatchObject({
      toolReferenceName: 'hivePlanRead',
      canBeReferencedInPrompt: true,
    });
    expect(toolNames.get('hive_worktree_commit')).toMatchObject({
      toolReferenceName: 'hiveWorktreeCommit',
      canBeReferencedInPrompt: true,
    });
    expect(welcome?.contents).toContain('.github/agents/');
    expect(welcome?.contents).toContain('Prompt files (.github/prompts/)');
    expect(welcome?.contents).toContain('Copilot steering (.github/copilot-instructions.md)');
    expect(welcome?.contents).toContain('Agent skills (.github/skills/)');
    expect(welcome?.contents).not.toContain('Copilot agents');
  });
});

async function invokeStatus(workspaceRoot: string, input: { feature: string }): Promise<any> {
  const tool = getStatusTools(workspaceRoot).find(candidate => candidate.name === 'hive_status');
  if (!tool) {
    throw new Error('hive_status tool not found');
  }

  return JSON.parse(await tool.invoke(input, {} as any));
}
