import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ensureWorkspaceHiveMcpReady,
  shouldRefreshOutput,
} from './prepare-workspace-hive-mcp.mjs';

const tempDirs = [];

function makeTempDir() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-code-hive-prepare-'));
  tempDirs.push(directory);
  return directory;
}

function writeFile(filePath, content, mtimeMs) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  const time = new Date(mtimeMs);
  fs.utimesSync(filePath, time, time);
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const directory = tempDirs.pop();
    if (directory && fs.existsSync(directory)) {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }
});

describe('prepare-workspace-hive-mcp', () => {
  it('treats hive-core output as an input to hive-mcp freshness', () => {
    const root = makeTempDir();
    const hiveMcpDist = path.join(root, 'packages', 'hive-mcp', 'dist', 'index.js');
    const hiveMcpPackageJson = path.join(root, 'packages', 'hive-mcp', 'package.json');
    const hiveMcpSrc = path.join(root, 'packages', 'hive-mcp', 'src', 'index.ts');
    const hiveCoreDist = path.join(root, 'packages', 'hive-core', 'dist', 'index.js');

    writeFile(hiveMcpPackageJson, '{}', 1000);
    writeFile(hiveMcpSrc, 'export {};\n', 1000);
    writeFile(hiveMcpDist, 'compiled', 2000);
    writeFile(hiveCoreDist, 'compiled core', 3000);

    assert.equal(
      shouldRefreshOutput({
        outputPath: hiveMcpDist,
        inputFiles: [hiveMcpPackageJson, hiveCoreDist],
        inputDirectories: [path.dirname(hiveMcpSrc)],
      }),
      true,
    );
  });

  it('rebuilds hive-core before hive-mcp when linked workspace inputs are stale', () => {
    const root = makeTempDir();
    const hiveCorePackageJson = path.join(root, 'packages', 'hive-core', 'package.json');
    const hiveCoreSrc = path.join(root, 'packages', 'hive-core', 'src', 'index.ts');
    const hiveCoreDist = path.join(root, 'packages', 'hive-core', 'dist', 'index.js');
    const hiveMcpPackageJson = path.join(root, 'packages', 'hive-mcp', 'package.json');
    const hiveMcpSrc = path.join(root, 'packages', 'hive-mcp', 'src', 'index.ts');
    const hiveMcpDist = path.join(root, 'packages', 'hive-mcp', 'dist', 'index.js');

    writeFile(hiveCorePackageJson, '{}', 1000);
    writeFile(hiveCoreSrc, 'export {};\n', 3000);
    writeFile(hiveCoreDist, 'stale core build', 2000);
    writeFile(hiveMcpPackageJson, '{}', 1000);
    writeFile(hiveMcpSrc, 'export {};\n', 1000);
    writeFile(hiveMcpDist, 'stale mcp build', 2500);

    const commands = [];
    const requireFn = {
      resolve(specifier) {
        if (specifier === 'hive-core/package.json') {
          return hiveCorePackageJson;
        }
        if (specifier === '@tctinh/agent-hive-mcp/package.json') {
          return hiveMcpPackageJson;
        }
        throw new Error(`Unexpected resolve: ${specifier}`);
      },
    };

    const exec = (command, args, options) => {
      commands.push(`${command} ${args.join(' ')} @ ${options.cwd}`);
      if (options.cwd.endsWith(path.join('packages', 'hive-core'))) {
        writeFile(hiveCoreDist, 'fresh core build', 4000);
      }
      if (options.cwd.endsWith(path.join('packages', 'hive-mcp'))) {
        writeFile(hiveMcpDist, 'fresh mcp build', 5000);
      }
      return Buffer.from('');
    };

    const result = ensureWorkspaceHiveMcpReady({ requireFn, exec });

    assert.deepEqual(result, { workspace: true, builtHiveCore: true, builtHiveMcp: true });
    assert.deepEqual(commands, [
      `npm run build @ ${path.join(root, 'packages', 'hive-core')}`,
      `npm run build @ ${path.join(root, 'packages', 'hive-mcp')}`,
    ]);
  });
});