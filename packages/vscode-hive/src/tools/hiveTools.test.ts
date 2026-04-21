import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('Hive LM tool registrations', () => {
  it('contributes only the retained Copilot-facing Hive tools', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
    ) as {
      contributes?: {
        languageModelTools?: Array<{ name?: string }>;
      };
    };

    const contributedToolNames = (packageJson.contributes?.languageModelTools ?? [])
      .map((tool) => tool.name)
      .filter((toolName): toolName is string => Boolean(toolName) && toolName.startsWith('hive_'))
      .sort();

    assert.deepEqual(contributedToolNames, [
      'hive_feature_complete',
      'hive_feature_create',
      'hive_plan_approve',
      'hive_plan_read',
      'hive_plan_write',
      'hive_status',
      'hive_task_create',
      'hive_task_update',
      'hive_tasks_sync',
    ]);
    assert.equal(contributedToolNames.includes('hive_context_write'), false);
    assert.equal(contributedToolNames.includes('hive_worktree_start'), false);
    assert.equal(contributedToolNames.includes('hive_worktree_commit'), false);
    assert.equal(contributedToolNames.includes('hive_merge'), false);
    assert.equal(contributedToolNames.includes('hive_agents_md'), false);
    assert.equal(contributedToolNames.includes('hive_skill'), false);
  });

  it('keeps the tools index focused on feature, plan, task, and status groups', () => {
    const source = fs.readFileSync(path.join(packageRoot, 'src', 'tools', 'index.ts'), 'utf8');

    assert.match(source, /getFeatureTools/);
    assert.match(source, /getPlanTools/);
    assert.match(source, /getTaskTools/);
    assert.match(source, /getStatusTools/);
    assert.doesNotMatch(source, /getExecTools/);
    assert.doesNotMatch(source, /getMergeTools/);
    assert.doesNotMatch(source, /getContextTools/);
    assert.doesNotMatch(source, /getAgentsMdTools/);
    assert.doesNotMatch(source, /getSkillTools/);
  });
});
