import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const workspaceRoot = path.resolve(import.meta.dirname);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

describe('release 1.3.6 artifact contract on main', () => {
  it('bumps root and workspace manifests to 1.3.6', () => {
    for (const file of [
      'package.json',
      'packages/hive-core/package.json',
      'packages/opencode-hive/package.json',
      'packages/vscode-hive/package.json',
    ]) {
      assert.equal(readJson(file).version, '1.3.6', `${file} should be 1.3.6`);
    }
  });

  it('refreshes tracked workspace lockfile version markers to 1.3.6', () => {
    const packageLock = readJson('package-lock.json');
    const bunLock = readText('bun.lock');

    assert.equal(packageLock.version, '1.3.6', 'package-lock.json root version should be 1.3.6');
    assert.equal(packageLock.packages[''].version, '1.3.6', 'package-lock.json workspace root should be 1.3.6');
    assert.equal(packageLock.packages['packages/hive-core'].version, '1.3.6', 'package-lock.json hive-core version should be 1.3.6');
    assert.equal(packageLock.packages['packages/opencode-hive'].version, '1.3.6', 'package-lock.json opencode-hive version should be 1.3.6');
    assert.equal(packageLock.packages['packages/vscode-hive'].version, '1.3.6', 'package-lock.json vscode-hive version should be 1.3.6');

    assert.match(bunLock, /"name": "hive-core",\s+"version": "1\.3\.6"/s);
    assert.match(bunLock, /"name": "opencode-hive",\s+"version": "1\.3\.6"/s);
    assert.match(bunLock, /"name": "vscode-hive",\s+"version": "1\.3\.6"/s);
  });

  it('publishes 1.3.6 release notes and changelog entries in descending order', () => {
    assert.equal(
      fs.existsSync(path.join(workspaceRoot, 'docs/releases/v1.3.6.md')),
      true,
      'docs/releases/v1.3.6.md should exist'
    );

    const changelog = readText('CHANGELOG.md');
    const changelog136Header = '## [1.3.6]';
    const changelog135Header = '## [1.3.5]';

    assert.notEqual(
      changelog.indexOf(changelog136Header),
      -1,
      'CHANGELOG.md should include a 1.3.6 entry'
    );
    assert.notEqual(
      changelog.indexOf(changelog135Header),
      -1,
      'CHANGELOG.md should include a 1.3.5 entry'
    );
    assert.ok(
      changelog.indexOf(changelog136Header) < changelog.indexOf(changelog135Header),
      'CHANGELOG.md should list 1.3.6 before 1.3.5'
    );
  });

  it('removes the broken release:prepare helper from the root package scripts', () => {
    const packageJson = readJson('package.json');

    assert.equal(packageJson.scripts['release:prepare'], undefined, 'package.json should not advertise release:prepare');
    assert.equal(typeof packageJson.scripts['release:check'], 'string', 'package.json should keep release:check');
  });
});
