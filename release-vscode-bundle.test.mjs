import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const workspaceRoot = path.resolve(import.meta.dirname);
const vscodePackageDir = path.join(workspaceRoot, 'packages', 'vscode-hive');
const bundlePath = path.join(vscodePackageDir, 'dist', 'extension.js');

function run(command, args, cwd = workspaceRoot) {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

describe('vscode release bundle drift', () => {
  it('keeps the VS Code bundle content stable across rebuilds', () => {
    const before = fs.readFileSync(bundlePath, 'utf8');

    run('bun', ['run', 'build'], vscodePackageDir);

    const after = fs.readFileSync(bundlePath, 'utf8');

    assert.equal(after, before, 'packages/vscode-hive/dist/extension.js should not change after rebuild');
  });
});
