import { describe, expect, it } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { generateAllAgents } from './agents.ts';
import { generateAllPrompts } from './prompts.ts';
import { generateAllInstructions, generateCopilotInstructions } from './instructions.ts';
import { generateAllHooks } from './hooks.ts';
import { getBuiltinSkills } from './skills.ts';

const EXTENSION_ID = 'tctinh.vscode-hive';
const generatorsDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(generatorsDir, '..', '..');
const repoRoot = path.resolve(packageRoot, '..', '..');

function readRepoFile(...segments: string[]): string {
  return fs.readFileSync(path.join(repoRoot, ...segments), 'utf8');
}

describe('committed generated artifact parity', () => {
  it('keeps committed agents aligned with the current generators', () => {
    for (const agent of generateAllAgents({ extensionId: EXTENSION_ID })) {
      expect(readRepoFile('.github', 'agents', agent.filename)).toBe(agent.content);
    }
  });

  it('keeps committed prompts aligned with the current generators', () => {
    for (const prompt of generateAllPrompts()) {
      expect(readRepoFile('.github', 'prompts', prompt.filename)).toBe(prompt.body);
    }
  });

  it('keeps committed instructions aligned with the current generators', () => {
    for (const instruction of generateAllInstructions()) {
      expect(readRepoFile('.github', 'instructions', instruction.filename)).toBe(instruction.body);
    }

    expect(readRepoFile('.github', 'copilot-instructions.md')).toBe(generateCopilotInstructions());
  });

  it('keeps committed skills aligned with the current generators', () => {
    for (const skill of getBuiltinSkills()) {
      expect(readRepoFile('.github', 'skills', skill.name, 'SKILL.md')).toBe(skill.content);
    }
  });

  it('keeps committed hooks aligned with the current generators', () => {
    for (const hook of generateAllHooks()) {
      expect(readRepoFile('.github', 'hooks', hook.configFilename)).toBe(`${JSON.stringify(hook.config, null, 2)}\n`);

      for (const script of hook.scripts) {
        expect(readRepoFile('.github', 'hooks', 'scripts', script.filename)).toBe(script.content);
      }
    }
  });
});