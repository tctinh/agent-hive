import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempPaths = new Set<string>();

function createTempPath(prefix: string): string {
  const tempPath = path.join(
    os.tmpdir(),
    `${prefix}-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
  tempPaths.add(tempPath);
  return tempPath;
}

function createFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

async function bundleModule(entryPoint: string, prefix: string): Promise<any> {
  const outfile = `${createTempPath(prefix)}.mjs`;
  execFileSync(
    'npx',
    [
      'esbuild',
      entryPoint,
      '--bundle',
      `--outfile=${outfile}`,
      '--format=esm',
      '--platform=node',
      '--alias:vscode=./src/test/vscodeTree.ts',
    ],
    { cwd: packageRoot, stdio: 'pipe' }
  );

  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}

function createWorkspace(): string {
  const workspaceRoot = createTempPath('sidebar-artifacts-workspace');
  fs.mkdirSync(workspaceRoot, { recursive: true });
  createFile(path.join(workspaceRoot, '.github', 'agents', 'hive.agent.md'), '# agent');
  createFile(path.join(workspaceRoot, '.github', 'skills', 'executing-plans', 'SKILL.md'), '# skill');
  createFile(path.join(workspaceRoot, '.github', 'hooks', 'hive-plan-enforcement.json'), '{}');
  createFile(path.join(workspaceRoot, '.github', 'instructions', 'hive.instructions.md'), '# instruction');
  createFile(path.join(workspaceRoot, 'plugin.json'), '{"name":"hive"}');
  return workspaceRoot;
}

afterEach(() => {
  for (const tempPath of tempPaths) {
    fs.rmSync(tempPath, { recursive: true, force: true });
  }

  tempPaths.clear();
});

describe('copilot artifacts sidebar integration', () => {
  test('shows copilot artifacts and exposes artifact classes', async () => {
    const workspaceRoot = createWorkspace();
    const sidebarModule = await bundleModule('src/test/sidebarProvider.bundle.ts', 'sidebar-provider');
    const provider = new sidebarModule.HiveSidebarProvider(workspaceRoot);

    assert.equal(typeof sidebarModule.CopilotArtifactsGroupItem, 'function');
    assert.equal(typeof sidebarModule.ArtifactCategoryItem, 'function');
    assert.equal(typeof sidebarModule.ArtifactFileItem, 'function');

    const rootItems = await provider.getChildren();
    assert.deepEqual(rootItems.map((item: { label: string }) => item.label), ['Init Skills', 'Copilot Artifacts']);

    const artifactsGroup = rootItems[1];
    const artifactItems = await provider.getChildren(artifactsGroup);
    assert.deepEqual(
      artifactItems.map((item: { label: string }) => item.label),
      ['Agents', 'Skills', 'Hooks', 'Instructions', 'Plugin Manifest']
    );

    assert.equal(artifactItems[0].description, '1');
    assert.equal(artifactItems[1].description, '1');
    assert.equal(artifactItems[2].description, '1');
    assert.equal(artifactItems[3].description, '1');
    assert.equal(artifactItems[0].iconPath.id, 'person');
    assert.equal(artifactItems[1].iconPath.id, 'book');
    assert.equal(artifactItems[2].iconPath.id, 'zap');
    assert.equal(artifactItems[3].iconPath.id, 'note');
    assert.equal(artifactItems[4].iconPath.id, 'package');

    const agentFiles = await provider.getChildren(artifactItems[0]);
    assert.equal(agentFiles.length, 1);
    assert.equal(agentFiles[0].label, 'hive.agent.md');
    assert.equal(agentFiles[0].command.command, 'vscode.open');
    assert.equal(agentFiles[0].command.arguments[0].fsPath, path.join(workspaceRoot, '.github', 'agents', 'hive.agent.md'));

    assert.equal(artifactItems[4].command.command, 'vscode.open');
    assert.equal(artifactItems[4].command.arguments[0].fsPath, path.join(workspaceRoot, 'plugin.json'));
  });

  test('watches hive, github, and plugin artifacts', async () => {
    const watcherModule = await bundleModule('src/test/watcher.bundle.ts', 'watcher');
    watcherModule.resetWatcherState();

    const watcher = new watcherModule.HiveWatcher('/tmp/project', () => {});

    assert.deepEqual(watcherModule.getWatcherPatterns(), ['.hive/**/*', '.github/**/*', 'plugin.json']);
    assert.deepEqual(watcherModule.getWatcherStates(), [
      {
        pattern: '.hive/**/*',
        createListeners: 1,
        changeListeners: 1,
        deleteListeners: 1,
        disposed: false,
      },
      {
        pattern: '.github/**/*',
        createListeners: 1,
        changeListeners: 1,
        deleteListeners: 1,
        disposed: false,
      },
      {
        pattern: 'plugin.json',
        createListeners: 1,
        changeListeners: 1,
        deleteListeners: 1,
        disposed: false,
      },
    ]);

    watcher.dispose();

    assert.deepEqual(
      watcherModule.getWatcherStates().map((state: { disposed: boolean }) => state.disposed),
      [true, true, true]
    );
  });
});
