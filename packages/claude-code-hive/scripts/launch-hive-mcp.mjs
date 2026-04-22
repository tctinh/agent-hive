#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureWorkspaceHiveMcpReady } from './prepare-workspace-hive-mcp.mjs';

const require = createRequire(import.meta.url);
const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

export function resolveHiveMcpEntry({ requireFn = require } = {}) {
  return requireFn.resolve('@tctinh/agent-hive-mcp/dist/index.js');
}

export function launchHiveMcp({
  argv = process.argv.slice(2),
  env = process.env,
  execPath = process.execPath,
  spawnFn = spawn,
  prepare = ensureWorkspaceHiveMcpReady,
  resolveEntry = resolveHiveMcpEntry,
  onError = console.error,
  exit = process.exit,
} = {}) {
  prepare();

  const child = spawnFn(execPath, [resolveEntry(), ...argv], {
    stdio: 'inherit',
    env,
  });

  child.on('error', (error) => {
    onError('Failed to launch hive-mcp:', error);
    exit(1);
  });

  child.on('exit', (code) => {
    exit(code ?? 0);
  });

  return child;
}

if (isMainModule) {
  launchHiveMcp();
}