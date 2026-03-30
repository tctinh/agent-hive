import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const workspaceRoot = path.resolve(import.meta.dirname);

function readText(relativePath) {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

describe('release 1.3.5 documentation contract', () => {
  it('updates philosophy and design docs for the PR #64 recovery model', () => {
    const philosophy = readText('PHILOSOPHY.md');
    const design = readText('docs/DESIGN.md');

    assert.match(philosophy, /### v1\.3\.5 \(Compaction Recovery\)/i);
    assert.match(philosophy, /\.hive\/sessions\.json/i);
    assert.match(philosophy, /directive replay/i);
    assert.match(philosophy, /worker-prompt\.md/i);

    assert.match(design, /\.hive\/sessions\.json/i);
    assert.match(design, /features\/<feature>\/sessions\.json/i);
    assert.match(design, /`primary`, `subagent`, `task-worker`, and `unknown` sessions\./i);
    assert.match(design, /post-compaction replay|directive replay/i);
    assert.match(design, /worker-prompt\.md/i);
  });

  it('documents session recovery in the user and plugin readmes', () => {
    const rootReadme = readText('README.md');
    const pluginReadme = readText('packages/opencode-hive/README.md');

    assert.match(rootReadme, /Primary sessions are re-anchored/i);
    assert.match(rootReadme, /Scout and Hygienic subagents/i);
    assert.match(rootReadme, /Forager workers? and forager-derived custom agents/i);
    assert.match(rootReadme, /directive/i);
    assert.match(rootReadme, /worker-prompt\.md/i);

    assert.match(pluginReadme, /\.hive\/sessions\.json/i);
    assert.match(pluginReadme, /features\/<feature>\/sessions\.json/i);
    assert.match(pluginReadme, /`primary`, `subagent`, `task-worker`, and `unknown`\./i);
    assert.match(pluginReadme, /post-compaction replay/i);
    assert.match(pluginReadme, /worker-prompt\.md/i);
  });

  it('refreshes releasing guidance for 1.3.5 and current bun workflows', () => {
    const releasing = readText('docs/RELEASING.md');

    assert.doesNotMatch(releasing, /0\.8\.3/);
    assert.doesNotMatch(releasing, /npm run build --workspaces/);
    assert.doesNotMatch(releasing, /npm -ws --if-present run test/);
    assert.match(releasing, /1\.3\.5/);
    assert.match(releasing, /bun run release:prepare -- 1\.3\.5/);
    assert.match(releasing, /bun run release:check/);
    assert.match(releasing, /workflow_dispatch/i);
    assert.match(releasing, /tags? matching `v\*`|publishes \*\*only on tags\*\*/i);
  });
});
