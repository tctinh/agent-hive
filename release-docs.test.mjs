import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const workspaceRoot = path.resolve(import.meta.dirname);

function readText(relativePath) {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

describe('release 1.3.6 documentation contract', () => {
  it('records a v1.3.6 philosophy note for worker replay and DAG-aware manual tasks', () => {
    const philosophy = readText('PHILOSOPHY.md');

    assert.match(philosophy, /### v1\.3\.6/i);
    assert.match(philosophy, /worker replay|worker-specific synthetic replay|bounded worker replay/i);
    assert.match(philosophy, /manual task|dependsOn|refreshPending/i);
  });

  it('updates design docs for the shipped #67 and #69 behavior', () => {
    const design = readText('docs/DESIGN.md');

    assert.match(design, /worker-prompt\.md/i);
    assert.match(design, /do not merge/i);
    assert.match(design, /do not start the next task/i);
    assert.match(design, /manual task/i);
    assert.match(design, /dependsOn/i);
    assert.match(design, /refreshPending/i);
  });

  it('updates plugin docs for bounded worker replay and DAG-aware manual tasks', () => {
    const pluginReadme = readText('packages/opencode-hive/README.md');
    const toolDocs = readText('packages/opencode-hive/docs/HIVE-TOOLS.md');

    assert.match(pluginReadme, /do not merge/i);
    assert.match(pluginReadme, /do not start the next task/i);
    assert.match(pluginReadme, /refreshPending/i);
    assert.match(pluginReadme, /manual task/i);

    assert.match(toolDocs, /refreshPending/i);
    assert.match(toolDocs, /manual task/i);
    assert.match(toolDocs, /dependsOn/i);
  });

  it('rewrites release guidance to the manual 1.3.6 flow', () => {
    const releasing = readText('docs/RELEASING.md');
    const agents = readText('AGENTS.md');

    assert.doesNotMatch(releasing, /release:prepare/);
    assert.match(releasing, /manual/i);
    assert.match(releasing, /workflow_dispatch/i);
    assert.match(releasing, /1\.3\.6/);

    assert.doesNotMatch(agents, /bun run release:prepare/);
    assert.match(agents, /release:check/);
  });
});
