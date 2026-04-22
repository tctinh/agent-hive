import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { describe, it } from 'node:test';

const workspaceRoot = path.resolve(import.meta.dirname);
const releaseVersion = readJson('package.json').version;
const opencodeHiveRoot = path.join(workspaceRoot, 'packages', 'opencode-hive');
const hiveMcpRoot = path.join(workspaceRoot, 'packages', 'hive-mcp');
const claudeCodeHiveRoot = path.join(workspaceRoot, 'packages', 'claude-code-hive');
const bunBinary = resolveBunBinary();

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

function resolveBunBinary() {
  const homeDirectory = os.homedir();
  const candidates = [
    process.env.BUN_BINARY,
    process.env.BUN_INSTALL ? path.join(process.env.BUN_INSTALL, 'bin', process.platform === 'win32' ? 'bun.exe' : 'bun') : null,
    homeDirectory ? path.join(homeDirectory, '.bun', 'bin', process.platform === 'win32' ? 'bun.exe' : 'bun') : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  try {
    const command = process.platform === 'win32' ? 'where' : 'which';
    return execFileSync(command, ['bun'], {
      encoding: 'utf8',
    }).trim().split(/\r?\n/, 1)[0];
  } catch {
    return null;
  }
}

function getCommandEnv() {
  if (!bunBinary) {
    return process.env;
  }

  return {
    ...process.env,
    PATH: `${path.dirname(bunBinary)}${path.delimiter}${process.env.PATH ?? ''}`,
  };
}

function runPackageCommand(packageRoot, command, args) {
  return execFileSync(command, args, {
    cwd: packageRoot,
    encoding: 'utf8',
    env: getCommandEnv(),
  });
}

function ensurePackageBuilt(packageRoot) {
  runPackageCommand(packageRoot, 'npm', ['run', 'build']);
}

function listPackedFiles(packageRoot) {
  ensurePackageBuilt(packageRoot);

  const stdout = runPackageCommand(packageRoot, 'npm', ['pack', '--dry-run', '--json']);

  const [packResult] = JSON.parse(stdout);

  return new Set(packResult.files.map((file) => file.path));
}

function assertPackedFile(fileSet, relativePath, packageName) {
  assert.equal(
    fileSet.has(relativePath),
    true,
    `${packageName} asset missing from npm pack dry run: ${relativePath}`
  );
}

describe(`release ${releaseVersion} artifact contract on main`, () => {
  it(`bumps root and workspace manifests to ${releaseVersion}`, () => {
    for (const file of [
      'package.json',
      'packages/hive-core/package.json',
      'packages/opencode-hive/package.json',
      'packages/hive-mcp/package.json',
      'packages/claude-code-hive/package.json',
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
    assert.equal(packageLock.packages['packages/hive-mcp'].version, releaseVersion, `package-lock.json hive-mcp version should be ${releaseVersion}`);
    assert.equal(packageLock.packages['packages/claude-code-hive'].version, releaseVersion, `package-lock.json claude-code-hive version should be ${releaseVersion}`);
    assert.equal(packageLock.packages['packages/vscode-hive'].version, releaseVersion, `package-lock.json vscode-hive version should be ${releaseVersion}`);

    assert.match(bunLock, new RegExp(`"name": "hive-core",\\s+"version": "${escapedReleaseVersion}"`, 's'));
    assert.match(bunLock, new RegExp(`"name": "opencode-hive",\\s+"version": "${escapedReleaseVersion}"`, 's'));
    assert.match(bunLock, new RegExp(`"name": "@tctinh/agent-hive-mcp",\\s+"version": "${escapedReleaseVersion}"`, 's'));
    assert.match(bunLock, new RegExp(`"name": "claude-code-hive",\\s+"version": "${escapedReleaseVersion}"`, 's'));
    assert.match(bunLock, new RegExp(`"name": "vscode-hive",\\s+"version": "${escapedReleaseVersion}"`, 's'));
  });

  it(`refreshes plugin manifests, dependency pins, runtime version, and philosophy history to ${releaseVersion}`, () => {
    const hiveMcpPackageJson = readJson('packages/hive-mcp/package.json');
    const vscodeHivePackageJson = readJson('packages/vscode-hive/package.json');
    const opencodePluginJson = readJson('packages/opencode-hive/plugin.json');
    const claudePluginJson = readJson('packages/claude-code-hive/.claude-plugin/plugin.json');
    const hiveMcpEntry = readText('packages/hive-mcp/src/index.ts');
    const philosophy = readText('PHILOSOPHY.md');

    assert.equal(opencodePluginJson.version, releaseVersion, `packages/opencode-hive/plugin.json should be ${releaseVersion}`);
    assert.equal(claudePluginJson.version, releaseVersion, `packages/claude-code-hive/.claude-plugin/plugin.json should be ${releaseVersion}`);
    assert.equal(hiveMcpPackageJson.devDependencies['hive-core'], releaseVersion, `packages/hive-mcp/package.json should pin hive-core to ${releaseVersion}`);
    assert.equal(vscodeHivePackageJson.dependencies['hive-core'], releaseVersion, `packages/vscode-hive/package.json should pin hive-core to ${releaseVersion}`);
    assert.match(hiveMcpEntry, new RegExp(`version: '${releaseVersion.replaceAll('.', '\\.')}'`), 'packages/hive-mcp/src/index.ts should advertise the release version');
    assert.match(philosophy, new RegExp(`### v${releaseVersion.replaceAll('.', '\\.')}`), `PHILOSOPHY.md should include a v${releaseVersion} entry`);
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
    const packedFiles = listPackedFiles(opencodeHiveRoot);

    assertPackedFile(packedFiles, 'dist/index.js', 'opencode-hive');
    assert.ok(
      [...packedFiles].some((filePath) => filePath.startsWith('skills/')),
      'README-promised opencode-hive asset missing from npm pack dry run: skills/'
    );
    assertPackedFile(packedFiles, 'templates/mcp-servers.json', 'opencode-hive');
    assertPackedFile(packedFiles, 'templates/context/tools.md', 'opencode-hive');
  });

  it('packs the hive-mcp runtime entry for npm publishing', () => {
    const packedFiles = listPackedFiles(hiveMcpRoot);

    assertPackedFile(packedFiles, 'dist/index.js', 'hive-mcp');
  });

  it('packs the self-contained claude-code-hive plugin assets', () => {
    const packedFiles = listPackedFiles(claudeCodeHiveRoot);

    assertPackedFile(packedFiles, '.claude-plugin/plugin.json', 'claude-code-hive');
    assertPackedFile(packedFiles, 'agents/hive.md', 'claude-code-hive');
    assertPackedFile(packedFiles, 'agents/forager.md', 'claude-code-hive');
    assertPackedFile(packedFiles, 'agents/hygienic.md', 'claude-code-hive');
    assertPackedFile(packedFiles, 'commands/hive.md', 'claude-code-hive');
    assertPackedFile(packedFiles, 'instructions/hive-workflow.md', 'claude-code-hive');
    assertPackedFile(packedFiles, 'hooks/hooks.json', 'claude-code-hive');
    assertPackedFile(packedFiles, 'hooks/scripts/inject-context.sh', 'claude-code-hive');
    assertPackedFile(packedFiles, 'scripts/verify-plugin-assets.mjs', 'claude-code-hive');
    assert.ok(
      [...packedFiles].some((filePath) => filePath.startsWith('skills/') && filePath.endsWith('/SKILL.md')),
      'claude-code-hive asset missing from npm pack dry run: skills/**/SKILL.md'
    );
  });

  it('claude-code-hive plugin.json invokes the MCP runtime via npx without requiring a local dependency', () => {
    const pluginManifest = readJson('packages/claude-code-hive/.claude-plugin/plugin.json');
    const server = pluginManifest.mcpServers?.hive;

    assert.equal(server?.command, 'npx', 'plugin.mcpServers.hive.command must be npx so the MCP runs without a global install');
    assert.ok(Array.isArray(server?.args), 'plugin.mcpServers.hive.args must be an array');
    assert.ok(server.args.includes('@tctinh/agent-hive-mcp@latest'), 'MCP args must pin @tctinh/agent-hive-mcp@latest so npx fetches the right package');
    assert.equal(server.args.at(-1), 'hive-mcp', 'MCP args must end with the hive-mcp bin name so npx invokes the correct entry');
    const claudeCodeHivePackageJson = readJson('packages/claude-code-hive/package.json');
    assert.equal(
      claudeCodeHivePackageJson.dependencies?.['@tctinh/agent-hive-mcp'],
      undefined,
      'claude-code-hive should not depend on @tctinh/agent-hive-mcp — npx fetches it at runtime'
    );
  });
});
