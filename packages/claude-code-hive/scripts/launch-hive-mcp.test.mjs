import assert from 'node:assert/strict';
import { it } from 'node:test';
import { launchHiveMcp } from './launch-hive-mcp.mjs';

it('prepares the linked workspace runtime before spawning hive-mcp', () => {
  const calls = [];
  const handlers = new Map();
  const child = {
    on(eventName, handler) {
      handlers.set(eventName, handler);
      return child;
    },
  };

  const result = launchHiveMcp({
    argv: ['serve'],
    env: { HIVE_PROJECT_ROOT: '/tmp/project' },
    execPath: '/node-bin',
    prepare() {
      calls.push('prepare');
    },
    resolveEntry() {
      calls.push('resolve');
      return '/tmp/hive-mcp/dist/index.js';
    },
    spawnFn(command, args, options) {
      calls.push(['spawn', command, args, options]);
      return child;
    },
    onError(...args) {
      calls.push(['error', ...args]);
    },
    exit(code) {
      calls.push(['exit', code]);
    },
  });

  assert.equal(result, child);
  assert.deepEqual(calls.slice(0, 3), [
    'prepare',
    'resolve',
    ['spawn', '/node-bin', ['/tmp/hive-mcp/dist/index.js', 'serve'], {
      stdio: 'inherit',
      env: { HIVE_PROJECT_ROOT: '/tmp/project' },
    }],
  ]);

  handlers.get('exit')(0);
  assert.deepEqual(calls.at(-1), ['exit', 0]);
});