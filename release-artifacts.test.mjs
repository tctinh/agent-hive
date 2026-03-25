import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = path.resolve(import.meta.dirname);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

describe('release 1.3.3 recovery artifacts', () => {
  it('bumps root and workspace manifests to 1.3.3', () => {
    for (const file of [
      'package.json',
      'packages/hive-core/package.json',
      'packages/opencode-hive/package.json',
      'packages/vscode-hive/package.json',
    ]) {
      assert.equal(readJson(file).version, '1.3.3', `${file} should be 1.3.3`);
    }
  });

  it('keeps the lockfile versions aligned and repairs the once entry', () => {
    const lock = readJson('package-lock.json');

    assert.equal(lock.version, '1.3.3');
    assert.equal(lock.packages[''].version, '1.3.3');
    assert.equal(lock.packages['packages/opencode-hive'].version, '1.3.3');
    assert.equal(lock.packages['packages/vscode-hive'].version, '1.3.3');

    assert.deepEqual(
      {
        version: lock.packages['node_modules/once']?.version,
        resolved: lock.packages['node_modules/once']?.resolved,
      },
      {
        version: '1.4.0',
        resolved: 'https://registry.npmjs.org/once/-/once-1.4.0.tgz',
      }
    );
  });

  it('keeps 1.3.2 notes historically accurate and adds 1.3.3 recovery notes', () => {
    const changelog = readText('CHANGELOG.md');
    const oldNotes = readText('docs/releases/v1.3.2.md');
    const newNotesPath = path.join(workspaceRoot, 'docs/releases/v1.3.3.md');

    assert.ok(fs.existsSync(newNotesPath), 'docs/releases/v1.3.3.md should exist');
    const newNotes = fs.readFileSync(newNotesPath, 'utf8');

    assert.match(changelog, /## \[1\.3\.3\] - 2026-03-24/);
    assert.match(changelog, /## \[1\.3\.2\] - 2026-03-21/);
    assert.doesNotMatch(oldNotes, /PR #57|Copilot rewrite/i);
    assert.doesNotMatch(oldNotes, /intentionally not run yet/i);
    assert.match(oldNotes, /6a2d870|status manifest test/i);
    assert.match(newNotes, /PR #57|Copilot rewrite/i);
    assert.match(newNotes, /lockfile|once/i);
    assert.match(newNotes, /v1\.3\.2\.\.\.v1\.3\.3/);
  });

  it('does not restore the stale 1.4.0 release draft', () => {
    assert.equal(fs.existsSync(path.join(workspaceRoot, 'docs/releases/v1.4.0.md')), false);
  });
});
