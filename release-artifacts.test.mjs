import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { describe, it } from 'node:test';

const workspaceRoot = path.resolve(import.meta.dirname);
const releaseVersion = readJson('package.json').version;
const opencodeHiveRoot = path.join(workspaceRoot, 'packages', 'opencode-hive');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

function listPackedOpencodeHiveFiles() {
  execFileSync('npm', ['run', 'build'], {
    cwd: opencodeHiveRoot,
    encoding: 'utf8',
  });

  const stdout = execFileSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: opencodeHiveRoot,
    encoding: 'utf8',
  });

  const [packResult] = JSON.parse(stdout);

  return new Set(packResult.files.map((file) => file.path));
}

function assertPackedFile(fileSet, relativePath) {
  assert.equal(
    fileSet.has(relativePath),
    true,
    `README-promised opencode-hive asset missing from npm pack dry run: ${relativePath}`
  );
}

describe(`release ${releaseVersion} artifact contract on main`, () => {
  it(`bumps root and workspace manifests to ${releaseVersion}`, () => {
    for (const file of [
      'package.json',
      'packages/hive-core/package.json',
      'packages/opencode-hive/package.json',
      'packages/vscode-hive/package.json',
    ]) {
      assert.equal(readJson(file).version, releaseVersion, `${file} should be ${releaseVersion}`);
    }
  });

  it(`refreshes tracked workspace lockfile version markers to ${releaseVersion}`, () => {
    const packageLock = readJson('package-lock.json');
    const bunLock = readText('bun.lock');
    const escapedReleaseVersion = releaseVersion.replaceAll('.', '\\.');

    assert.equal(packageLock.version, releaseVersion, `package-lock.json root version should be ${releaseVersion}`);
    assert.equal(packageLock.packages[''].version, releaseVersion, `package-lock.json workspace root should be ${releaseVersion}`);
    assert.equal(packageLock.packages['packages/hive-core'].version, releaseVersion, `package-lock.json hive-core version should be ${releaseVersion}`);
    assert.equal(packageLock.packages['packages/opencode-hive'].version, releaseVersion, `package-lock.json opencode-hive version should be ${releaseVersion}`);
    assert.equal(packageLock.packages['packages/vscode-hive'].version, releaseVersion, `package-lock.json vscode-hive version should be ${releaseVersion}`);

    assert.match(bunLock, new RegExp(`"name": "hive-core",\\s+"version": "${escapedReleaseVersion}"`, 's'));
    assert.match(bunLock, new RegExp(`"name": "opencode-hive",\\s+"version": "${escapedReleaseVersion}"`, 's'));
    assert.match(bunLock, new RegExp(`"name": "vscode-hive",\\s+"version": "${escapedReleaseVersion}"`, 's'));
  });

  it(`publishes ${releaseVersion} release notes and changelog entries in descending order`, () => {
    assert.equal(
      fs.existsSync(path.join(workspaceRoot, `docs/releases/v${releaseVersion}.md`)),
      true,
      `docs/releases/v${releaseVersion}.md should exist`
    );

    const changelog = readText('CHANGELOG.md');
    const changelogCurrentHeader = `## [${releaseVersion}]`;
    const previousVersionMatch = changelog.match(/^## \[(?!Unreleased\])([^\]]+)\]/m);
    const previousVersionHeader = previousVersionMatch ? `## [${previousVersionMatch[1]}]` : null;

    assert.notEqual(
      changelog.indexOf(changelogCurrentHeader),
      -1,
      `CHANGELOG.md should include a ${releaseVersion} entry`
    );

    if (previousVersionHeader !== null && previousVersionHeader !== changelogCurrentHeader) {
      assert.notEqual(
        changelog.indexOf(previousVersionHeader),
        -1,
        `CHANGELOG.md should include a ${previousVersionHeader} entry`
      );
      assert.ok(
        changelog.indexOf(changelogCurrentHeader) < changelog.indexOf(previousVersionHeader),
        `CHANGELOG.md should list ${releaseVersion} before ${previousVersionHeader.replace('## [', '').replace(']', '')}`
      );
    }
  });

  it('removes the broken release:prepare helper and runs the release artifact contract from release:check', () => {
    const packageJson = readJson('package.json');

    assert.equal(packageJson.scripts['release:prepare'], undefined, 'package.json should not advertise release:prepare');
    assert.equal(typeof packageJson.scripts['release:check'], 'string', 'package.json should keep release:check');
    assert.match(
      packageJson.scripts['release:check'],
      /node --test release-artifacts\.test\.mjs/,
      'package.json should run the release artifact contract from release:check'
    );
  });

  it('packs every opencode-hive asset promised by the README install contract', () => {
    const packedFiles = listPackedOpencodeHiveFiles();

    assertPackedFile(packedFiles, 'dist/index.js');
    assert.ok(
      [...packedFiles].some((filePath) => filePath.startsWith('skills/')),
      'README-promised opencode-hive asset missing from npm pack dry run: skills/'
    );
    assertPackedFile(packedFiles, 'templates/mcp-servers.json');
    assertPackedFile(packedFiles, 'templates/context/tools.md');
  });
});
