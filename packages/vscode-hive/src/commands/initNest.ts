import * as fs from 'fs';
import * as path from 'path';

import { generateAllAgents } from '../generators/agents.js';
import { generateAllHooks } from '../generators/hooks.js';
import { generateAllInstructions, generateHiveWorkflowInstructions } from '../generators/instructions.js';
import { generatePluginManifest } from '../generators/plugin.js';
import { getBuiltinSkills } from '../generators/skills.js';

const EXTENSION_ID = 'tctinh.vscode-hive';

const BACKWARD_COMPAT_SKILL = `---
name: hive
description: Hive plan-first development workflow
---

${generateHiveWorkflowInstructions().body.split(/^---$/m).slice(2).join('---').trim()}
`;

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath: string, content: string): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}

async function loadVscode(): Promise<typeof import('vscode')> {
  return await import('vscode');
}

export function generateAgents(): Array<{ filename: string; content: string }> {
  return generateAllAgents({ extensionId: EXTENSION_ID });
}

export function generateBuiltinSkills(): ReturnType<typeof getBuiltinSkills> {
  return getBuiltinSkills();
}

export { generateAllHooks };

export function generateInstructions(): ReturnType<typeof generateAllInstructions> {
  return generateAllInstructions();
}

export function generatePlugin(): ReturnType<typeof generatePluginManifest> {
  return generatePluginManifest();
}

export async function initNest(projectRoot: string): Promise<void> {
  const vscode = await loadVscode();

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Initializing Hive Nest',
    },
    async (progress) => {
      progress.report({ message: 'Creating Hive directories...' });

      ensureDir(path.join(projectRoot, '.hive'));
      ensureDir(path.join(projectRoot, '.hive', 'features'));
      ensureDir(path.join(projectRoot, '.hive', 'skills'));
      ensureDir(path.join(projectRoot, '.claude', 'skills'));
      ensureDir(path.join(projectRoot, '.opencode', 'skill'));

      progress.report({ message: 'Generating Copilot agents...' });

      for (const agent of generateAgents()) {
        writeFile(path.join(projectRoot, '.github', 'agents', agent.filename), agent.content);
      }

      progress.report({ message: 'Generating builtin skills...' });

      for (const skill of generateBuiltinSkills()) {
        writeFile(path.join(projectRoot, '.github', 'skills', skill.name, 'SKILL.md'), skill.content);
      }

      progress.report({ message: 'Generating hooks...' });

      for (const hook of generateAllHooks()) {
        writeFile(path.join(projectRoot, '.github', 'hooks', hook.configFilename), `${JSON.stringify(hook.config, null, 2)}\n`);

        for (const script of hook.scripts) {
          const scriptPath = path.join(projectRoot, '.github', 'hooks', 'scripts', script.filename);
          writeFile(scriptPath, script.content);
          fs.chmodSync(scriptPath, 0o755);
        }
      }

      progress.report({ message: 'Generating instructions...' });

      for (const instruction of generateInstructions()) {
        writeFile(path.join(projectRoot, '.github', 'instructions', instruction.filename), instruction.body);
      }

      progress.report({ message: 'Generating plugin manifest...' });

      writeFile(path.join(projectRoot, 'plugin.json'), `${JSON.stringify(generatePlugin(), null, 2)}\n`);
      writeFile(path.join(projectRoot, '.claude', 'skills', 'hive', 'SKILL.md'), BACKWARD_COMPAT_SKILL);
      writeFile(path.join(projectRoot, '.opencode', 'skill', 'hive', 'SKILL.md'), BACKWARD_COMPAT_SKILL);
    },
  );

  await vscode.window.showInformationMessage('Hive Nest initialized! Created 4 agents, 11 skills, 2 hooks, 2 instructions.');
}
