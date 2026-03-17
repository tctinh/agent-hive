import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const tempDirs = new Set<string>();

function createTempProject(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-hive-tools-'));
  tempDirs.add(tempDir);
  return tempDir;
}

async function loadToolModules(): Promise<{
  getAgentsMdTools: (workspaceRoot: string) => Array<{
    name: string;
    invoke: (input: Record<string, unknown>) => Promise<string>;
  }>;
  getSkillTools: (workspaceRoot: string) => Array<{
    name: string;
    invoke: (input: Record<string, unknown>) => Promise<string>;
  }>;
}> {
  const agentsMdUrl = pathToFileURL(path.join(process.cwd(), 'src', 'tools', 'agentsMd.ts')).href;
  const skillUrl = pathToFileURL(path.join(process.cwd(), 'src', 'tools', 'skill.ts')).href;

  try {
    const agentsMdModule = await import(agentsMdUrl) as {
      getAgentsMdTools: (workspaceRoot: string) => Array<{
        name: string;
        invoke: (input: Record<string, unknown>) => Promise<string>;
      }>;
    };
    const skillModule = await import(skillUrl) as {
      getSkillTools: (workspaceRoot: string) => Array<{
        name: string;
        invoke: (input: Record<string, unknown>) => Promise<string>;
      }>;
    };

    return {
      getAgentsMdTools: agentsMdModule.getAgentsMdTools,
      getSkillTools: skillModule.getSkillTools,
    };
  } catch (error) {
    assert.fail(`Expected hive tool modules to exist: ${error}`);
  }
}

afterEach(() => {
  for (const tempDir of tempDirs) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  tempDirs.clear();
});

describe('Hive LM tool registrations', () => {
  it('initializes, syncs, and applies AGENTS.md content', async () => {
    const projectRoot = createTempProject();
    fs.writeFileSync(path.join(projectRoot, 'package.json'), JSON.stringify({
      scripts: {
        build: 'tsc -b',
        test: 'bun test',
        dev: 'vite',
      },
      workspaces: ['packages/*'],
      devDependencies: {
        vitest: '^1.0.0',
      },
    }));
    fs.mkdirSync(path.join(projectRoot, '.hive', 'features', 'demo', 'context'), { recursive: true });
    fs.writeFileSync(
      path.join(projectRoot, '.hive', 'features', 'demo', 'context', 'learnings.md'),
      '# Learnings\nwe use bun workspaces\nprefer bun over npm\n'
    );

    const { getAgentsMdTools } = await loadToolModules();
    const tool = getAgentsMdTools(projectRoot).find((registration) => registration.name === 'hive_agents_md');

    assert.ok(tool, 'expected hive_agents_md registration');

    const initResult = JSON.parse(await tool.invoke({ action: 'init' })) as { existed: boolean; content: string };
    assert.equal(initResult.existed, false);
    assert.match(initResult.content, /# Agent Guidelines/);
    assert.equal(fs.existsSync(path.join(projectRoot, 'AGENTS.md')), false);

    const missingSyncResult = JSON.parse(await tool.invoke({ action: 'sync' })) as { error: string };
    assert.equal(missingSyncResult.error, 'Feature name required for sync');

    fs.writeFileSync(path.join(projectRoot, 'AGENTS.md'), '# Agent Guidelines\n\n## Existing\n');
    const syncResult = JSON.parse(await tool.invoke({ action: 'sync', feature: 'demo' })) as { proposals: string[]; diff: string };
    assert.deepEqual(syncResult.proposals, ['we use bun workspaces', 'prefer bun over npm']);
    assert.match(syncResult.diff, /^\+ we use bun workspaces/m);

    const missingApplyResult = JSON.parse(await tool.invoke({ action: 'apply' })) as { error: string };
    assert.equal(missingApplyResult.error, 'Content required for apply');

    const applyResult = JSON.parse(await tool.invoke({ action: 'apply', content: '# Applied' })) as { chars: number; isNew: boolean; path: string };
    assert.equal(applyResult.isNew, false);
    assert.equal(applyResult.chars, '# Applied'.length);
    assert.equal(fs.readFileSync(path.join(projectRoot, 'AGENTS.md'), 'utf8'), '# Applied');
    assert.equal(applyResult.path, path.join(projectRoot, 'AGENTS.md'));
  });

  it('loads a skill from supported folders and reports missing skills', async () => {
    const projectRoot = createTempProject();
    const skillPath = path.join(projectRoot, '.github', 'skills', 'writing-plans');
    fs.mkdirSync(skillPath, { recursive: true });
    fs.writeFileSync(path.join(skillPath, 'SKILL.md'), '# Writing Plans');

    const { getSkillTools } = await loadToolModules();
    const tool = getSkillTools(projectRoot).find((registration) => registration.name === 'hive_skill');

    assert.ok(tool, 'expected hive_skill registration');
    assert.equal(await tool.invoke({ name: 'writing-plans' }), '# Writing Plans');

    const missingResult = JSON.parse(await tool.invoke({ name: 'missing-skill' })) as {
      error: string;
      searchedPaths: string[];
    };
    assert.equal(missingResult.error, 'Skill not found: missing-skill');
    assert.deepEqual(missingResult.searchedPaths, [
      path.join(projectRoot, '.github', 'skills', 'missing-skill', 'SKILL.md'),
      path.join(projectRoot, '.claude', 'skills', 'missing-skill', 'SKILL.md'),
      path.join(projectRoot, '.opencode', 'skill', 'missing-skill', 'SKILL.md'),
    ]);
  });
});
