import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { FeatureService, PlanService } from 'hive-core';

mock.module('vscode', () => {
  class TreeItem {
    label: string;
    collapsibleState: number;
    description?: string;
    contextValue?: string;
    iconPath?: unknown;
    command?: unknown;
    resourceUri?: unknown;
    tooltip?: unknown;

    constructor(label: string, collapsibleState: number) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  }

  class ThemeIcon {
    constructor(public readonly id: string) {}
  }

  class MarkdownString {
    value = '';

    appendMarkdown(text: string): void {
      this.value += text;
    }
  }

  class EventEmitter<T> {
    readonly event = (_listener: (value: T | undefined) => void) => ({ dispose() {} });
    fire(_value: T | undefined): void {}
  }

  return {
    TreeItem,
    ThemeIcon,
    MarkdownString,
    EventEmitter,
    TreeItemCollapsibleState: {
      None: 0,
      Collapsed: 1,
      Expanded: 2,
    },
    Uri: {
      file(targetPath: string) {
        return { fsPath: targetPath };
      },
      parse(value: string) {
        return { value };
      },
    },
  };
});

const { HiveSidebarProvider } = await import('./sidebarProvider');

const TEST_ROOT_BASE = `/tmp/vscode-hive-sidebar-test-${process.pid}`;

describe('HiveSidebarProvider', () => {
  let testRoot: string;

  beforeEach(() => {
    fs.rmSync(TEST_ROOT_BASE, { recursive: true, force: true });
    fs.mkdirSync(TEST_ROOT_BASE, { recursive: true });
    testRoot = fs.mkdtempSync(path.join(TEST_ROOT_BASE, 'workspace-'));
  });

  afterEach(() => {
    fs.rmSync(TEST_ROOT_BASE, { recursive: true, force: true });
  });

  it('shows status and task progress for all features and keeps active feature first', async () => {
    const featureService = new FeatureService(testRoot);
    const planService = new PlanService(testRoot);

    featureService.create('beta-feature');
    featureService.create('alpha-feature');
    featureService.create('gamma-feature');
    featureService.create('executing-feature');
    featureService.create('completed-feature');

    planService.write('beta-feature', '# Plan\n');
    planService.write('alpha-feature', '# Plan\n');
    planService.write('gamma-feature', '# Plan\n');
    planService.write('executing-feature', '# Plan\n');
    planService.write('completed-feature', '# Plan\n');

    const betaPath = path.join(testRoot, '.hive', 'features', '01_beta-feature');
    const alphaPath = path.join(testRoot, '.hive', 'features', '02_alpha-feature');
    const gammaPath = path.join(testRoot, '.hive', 'features', '03_gamma-feature');
    const executingPath = path.join(testRoot, '.hive', 'features', '04_executing-feature');
    const completedPath = path.join(testRoot, '.hive', 'features', '05_completed-feature');

    setFeatureStatus(gammaPath, 'planning');
    setFeatureStatus(executingPath, 'executing');
    setFeatureStatus(completedPath, 'completed');

    fs.mkdirSync(path.join(betaPath, 'tasks', '01-beta-task'), { recursive: true });
    fs.writeFileSync(
      path.join(betaPath, 'tasks', '01-beta-task', 'status.json'),
      JSON.stringify({ status: 'pending', origin: 'plan' }, null, 2)
    );

    fs.mkdirSync(path.join(alphaPath, 'tasks', '01-alpha-done'), { recursive: true });
    fs.writeFileSync(
      path.join(alphaPath, 'tasks', '01-alpha-done', 'status.json'),
      JSON.stringify({ status: 'done', origin: 'plan' }, null, 2)
    );
    fs.mkdirSync(path.join(alphaPath, 'tasks', '02-alpha-pending'), { recursive: true });
    fs.writeFileSync(
      path.join(alphaPath, 'tasks', '02-alpha-pending', 'status.json'),
      JSON.stringify({ status: 'pending', origin: 'plan' }, null, 2)
    );

    fs.mkdirSync(path.join(gammaPath, 'tasks', '01-gamma-task'), { recursive: true });
    fs.writeFileSync(
      path.join(gammaPath, 'tasks', '01-gamma-task', 'status.json'),
      JSON.stringify({ status: 'pending', origin: 'plan' }, null, 2)
    );

    fs.mkdirSync(path.join(executingPath, 'tasks', '01-executing-task'), { recursive: true });
    fs.writeFileSync(
      path.join(executingPath, 'tasks', '01-executing-task', 'status.json'),
      JSON.stringify({ status: 'in_progress', origin: 'plan' }, null, 2)
    );

    fs.mkdirSync(path.join(completedPath, 'tasks', '01-completed-task'), { recursive: true });
    fs.writeFileSync(
      path.join(completedPath, 'tasks', '01-completed-task', 'status.json'),
      JSON.stringify({ status: 'done', origin: 'plan' }, null, 2)
    );

    fs.writeFileSync(path.join(testRoot, '.hive', 'active-feature'), 'gamma-feature\n');

    const provider = new HiveSidebarProvider(testRoot);
    const groups = await provider.getChildren();
    const statusGroups = groups.filter(item => 'groupName' in item);

    expect(statusGroups).toHaveLength(3);

    const pendingGroup = statusGroups.find(item => item.groupName === 'Pending');
    const inProgressGroup = statusGroups.find(item => item.groupName === 'In Progress');
    const completedGroup = statusGroups.find(item => item.groupName === 'Completed');

    expect(pendingGroup?.features.map(feature => feature.name)).toEqual([
      'gamma-feature',
      'alpha-feature',
      'beta-feature',
    ]);
    expect(pendingGroup?.features.map(feature => feature.description)).toEqual([
      'Planning · 0/1',
      'Planning · 1/2',
      'Planning · 0/1',
    ]);
    expect((pendingGroup?.features[0] as any)?.resourceUri?.value).toBe('hive:active');
    expect(inProgressGroup?.features.map(feature => feature.name)).toEqual(['executing-feature']);
    expect(inProgressGroup?.features[0]?.description).toBe('Executing · 0/1');
    expect(completedGroup?.features.map(feature => feature.name)).toEqual(['completed-feature']);
    expect(completedGroup?.features[0]?.description).toBe('Completed · 1/1');
  });

  it('shows reserved overview ahead of context and tasks for a feature', async () => {
    const featureName = 'overview-sidebar-feature';
    const featureService = new FeatureService(testRoot);
    const planService = new PlanService(testRoot);

    featureService.create(featureName);
    planService.write(featureName, '# Plan\n');

    const featurePath = path.join(testRoot, '.hive', 'features', '01_overview-sidebar-feature');
    fs.mkdirSync(path.join(featurePath, 'context'), { recursive: true });
    fs.writeFileSync(path.join(featurePath, 'context', 'overview.md'), '# Overview\n');
    fs.writeFileSync(path.join(featurePath, 'context', 'notes.md'), '# Notes\n');
    fs.mkdirSync(path.join(featurePath, 'comments'), { recursive: true });
    fs.writeFileSync(
      path.join(featurePath, 'comments', 'overview.json'),
      JSON.stringify({
        threads: [
          { id: 'overview-thread', line: 1, body: 'Clarify overview', replies: [] },
        ],
      }, null, 2)
    );

    const provider = new HiveSidebarProvider(testRoot);
    const rootItems = await provider.getChildren();
    const pendingGroup = rootItems.find(item => 'groupName' in item && item.groupName === 'Pending');
    if (!pendingGroup || !('features' in pendingGroup)) {
      throw new Error('Pending group not found');
    }

    const featureItem = pendingGroup.features.find(feature => feature.name === featureName);
    if (!featureItem) {
      throw new Error('Feature item not found');
    }

    const children = await provider.getChildren(featureItem);

    expect(children.map(child => child.label)).toEqual(['Plan', 'Overview', 'Context', 'Tasks']);
    expect((children[1] as any).description).toBe('1 comment(s)');
    expect((children[1] as any).contextValue).toBe('overview-file');
    expect((children[2] as any).description).toBe('1 file(s)');
  });
});

function setFeatureStatus(featurePath: string, status: 'planning' | 'executing' | 'completed'): void {
  const featureJsonPath = path.join(featurePath, 'feature.json');
  const feature = JSON.parse(fs.readFileSync(featureJsonPath, 'utf-8')) as { status: string };
  feature.status = status;
  fs.writeFileSync(featureJsonPath, JSON.stringify(feature, null, 2));
}
