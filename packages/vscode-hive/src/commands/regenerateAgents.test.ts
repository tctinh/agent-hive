import { afterEach, describe, it } from 'bun:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const tempDirs = new Set<string>();
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function createTempProject(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'regenerate-agents-'));
  tempDirs.add(tempDir);
  return tempDir;
}

async function loadCommandModule(): Promise<{
  regenerateAgents: (
    workspaceRoot: string,
    deps?: {
      vscodeApi?: {
        window: {
          showQuickPick: (items: Array<{ label: string; description?: string }>, options: { title: string }) => Promise<{ label: string; description?: string } | undefined>;
          showInformationMessage: (message: string) => Promise<unknown>;
        };
      };
      generateAgents?: () => Array<{ filename: string; content: string }>;
    },
  ) => Promise<void>;
}> {
  const moduleUrl = pathToFileURL(path.join(packageRoot, 'src', 'commands', 'regenerateAgents.ts')).href;

  try {
    return await import(moduleUrl) as {
      regenerateAgents: (
        workspaceRoot: string,
        deps?: {
          vscodeApi?: {
            window: {
              showQuickPick: (items: Array<{ label: string; description?: string }>, options: { title: string }) => Promise<{ label: string; description?: string } | undefined>;
              showInformationMessage: (message: string) => Promise<unknown>;
            };
          };
          generateAgents?: () => Array<{ filename: string; content: string }>;
        },
      ) => Promise<void>;
    };
  } catch (error) {
    assert.fail(`Expected regenerateAgents command module to exist: ${error}`);
  }
}

afterEach(() => {
  for (const tempDir of tempDirs) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  tempDirs.clear();
});

describe('regenerateAgents', () => {
  it('exports a regenerateAgents command function', async () => {
    const commandModule = await loadCommandModule();

    assert.equal(typeof commandModule.regenerateAgents, 'function');
  });

  it('does nothing when the user cancels confirmation', async () => {
    const projectRoot = createTempProject();
    const agentsDir = path.join(projectRoot, '.github', 'agents');
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.writeFileSync(path.join(agentsDir, 'existing.agent.md'), 'keep me');

    const quickPickCalls: Array<{ title: string; labels: string[] }> = [];
    const infoMessages: string[] = [];
    const { regenerateAgents } = await loadCommandModule();

    await regenerateAgents(projectRoot, {
      vscodeApi: {
        window: {
          async showQuickPick(items, options) {
            quickPickCalls.push({ title: options.title, labels: items.map((item) => item.label) });
            return { label: 'Cancel', description: 'Do nothing' };
          },
          async showInformationMessage(message) {
            infoMessages.push(message);
            return message;
          },
        },
      },
      generateAgents: () => [{ filename: 'hive.agent.md', content: 'new content' }],
    });

    assert.deepEqual(quickPickCalls, [
      {
        title: 'Regenerate Hive Agents',
        labels: ['Regenerate agents', 'Cancel'],
      },
    ]);
    assert.equal(fs.readFileSync(path.join(agentsDir, 'existing.agent.md'), 'utf8'), 'keep me');
    assert.deepEqual(infoMessages, []);
  });

  it('replaces existing agent files after confirmation and preserves non-agent files', async () => {
    const projectRoot = createTempProject();
    const agentsDir = path.join(projectRoot, '.github', 'agents');
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.writeFileSync(path.join(agentsDir, 'old.agent.md'), 'old agent');
    fs.writeFileSync(path.join(agentsDir, 'notes.txt'), 'keep notes');

    const infoMessages: string[] = [];
    const generatedAgents = [
      { filename: 'hive.agent.md', content: 'hive content' },
      { filename: 'forager.agent.md', content: 'forager content' },
    ];
    const { regenerateAgents } = await loadCommandModule();

    await regenerateAgents(projectRoot, {
      vscodeApi: {
        window: {
          async showQuickPick(items) {
            return items[0];
          },
          async showInformationMessage(message) {
            infoMessages.push(message);
            return message;
          },
        },
      },
      generateAgents: () => generatedAgents,
    });

    assert.equal(fs.existsSync(path.join(agentsDir, 'old.agent.md')), false);
    assert.equal(fs.readFileSync(path.join(agentsDir, 'notes.txt'), 'utf8'), 'keep notes');
    assert.equal(fs.readFileSync(path.join(agentsDir, 'hive.agent.md'), 'utf8'), 'hive content');
    assert.equal(fs.readFileSync(path.join(agentsDir, 'forager.agent.md'), 'utf8'), 'forager content');
    assert.deepEqual(infoMessages, ['Hive: Regenerated 2 agents']);
  });
});
