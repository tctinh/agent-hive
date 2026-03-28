import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = path.resolve(import.meta.dirname);
const pr62Commit = '488aa29b76a2f10d74e8c9ee640541a53527fe66';
const releaseBranchTip = '6ed0852e3822d6a5739c39c2f7d039794d408f8d';

function git(command) {
  return execSync(command, {
    cwd: workspaceRoot,
    encoding: 'utf8',
  }).trim();
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

function resolveReleaseTree() {
  try {
    return git('git rev-parse v1.3.3^{tree}');
  } catch {
    return git(`git rev-parse ${releaseBranchTip}^{tree}`);
  }
}

describe('release 1.3.4 correction artifacts', () => {
  it('proves the PR #62 tree already matches the shipped 1.3.3 release tree', () => {
    const pr62Tree = git(`git rev-parse ${pr62Commit}^{tree}`);
    const releaseTree = resolveReleaseTree();

    assert.equal(pr62Tree, releaseTree);
  });

  it('bumps root and workspace manifests to 1.3.4', () => {
    for (const file of [
      'package.json',
      'packages/hive-core/package.json',
      'packages/opencode-hive/package.json',
      'packages/vscode-hive/package.json',
    ]) {
      assert.equal(readJson(file).version, '1.3.4', `${file} should be 1.3.4`);
    }
  });

  it('regenerates npm and bun lockfiles for the 1.3.4 patch line', () => {
    const packageLock = readJson('package-lock.json');
    const bunLock = readText('bun.lock');

    assert.equal(packageLock.packages[''].version, '1.3.4');
    assert.equal(packageLock.packages['packages/hive-core'].version, '1.3.4');
    assert.equal(packageLock.packages['packages/opencode-hive'].version, '1.3.4');
    assert.equal(packageLock.packages['packages/vscode-hive'].version, '1.3.4');
    assert.match(bunLock, /"version": "1\.3\.4"/);
  });

  it('rebuilds the tracked vscode release bundle as the packaged extension entrypoint', () => {
    const distPath = path.join(workspaceRoot, 'packages/vscode-hive/dist/extension.js');
    const distBundle = readText('packages/vscode-hive/dist/extension.js');
    const extensionManifest = readJson('packages/vscode-hive/package.json');

    assert.equal(fs.existsSync(distPath), true, 'packages/vscode-hive/dist/extension.js should exist');
    assert.equal(extensionManifest.main, './dist/extension.js');
    assert.match(distBundle, /function activate\(/);
    assert.match(distBundle, /function deactivate\(/);
    assert.match(distBundle, /# sourceMappingURL=extension\.js\.map/);
  });

  it('keeps release-history docs aligned with the 1.3.4 correction', () => {
    const oldNotes = readText('docs/releases/v1.3.2.md');
    const newNotesPath = path.join(workspaceRoot, 'docs/releases/v1.3.4.md');

    assert.equal(fs.existsSync(newNotesPath), true, 'docs/releases/v1.3.4.md should exist');

    assert.doesNotMatch(
      oldNotes,
      /shipped in v1\.3\.2|introduced through PR #62|Preserved PR #62|Human-Facing Overview Workflow Preserved/i
    );
    assert.match(
      oldNotes,
      /corrected historical note|did not yet include PR #62|formal PR #62 history alignment arrives in v1\.3\.4/i
    );
  });

  it('documents the 1.3.4 PR #62 history correction and user-facing scope', () => {
    const changelog = readText('CHANGELOG.md');
    const newNotes = readText('docs/releases/v1.3.4.md');

    assert.match(changelog, /## \[1\.3\.4\] - 2026-03-25/);
    assert.match(newNotes, /PR #62|488aa29/);
    assert.match(
      newNotes,
      /history correction|history alignment|release-branch history/i
    );
    assert.match(
      newNotes,
      /same tree|tree match|tree-equivalent|no source conflict resolution/i
    );
    assert.match(newNotes, /context\/overview\.md/);
    assert.match(newNotes, /plan\.md/);
    assert.match(newNotes, /document-aware review/i);
    assert.match(newNotes, /overview-first status|sidebar/i);
    assert.match(newNotes, /active-feature pointer|\.hive\/active-feature/i);
    assert.match(newNotes, /prompt|planner|orchestrator guidance/i);
    assert.match(newNotes, /worker execution context purity/i);
  });

  it('keeps the release guide aligned with real verification commands', () => {
    const releasingGuide = readText('docs/RELEASING.md');

    assert.doesNotMatch(releasingGuide, /\bbun run test\b/);
    assert.match(releasingGuide, /bun run release:check|bun run --filter hive-core test/);
  });

  it('does not add a new extension activation banner for the 1.3.4 correction patch', () => {
    const extensionSource = readText('packages/vscode-hive/src/extension.ts');

    assert.doesNotMatch(extensionSource, /extension activated/i);
    assert.doesNotMatch(extensionSource, /const extensionVersion = '1\.3\.4'/);
  });
});
