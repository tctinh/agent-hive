import { describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const templatePath = path.join(packageRoot, 'hive-core', 'templates', 'skills', 'copilot-agent.md');

describe('copilot skill template', () => {
  it('keeps askQuestions as the default structured path with chat-only fallback guidance', () => {
    const template = fs.readFileSync(templatePath, 'utf8');

    expect(template).toContain('prefer `vscode/askQuestions` for the structured parallel/sequential decision');
    expect(template).toContain('Fall back to plain Copilot chat only when `vscode/askQuestions` is unavailable');
    expect(template).toContain('Prefer `vscode/askQuestions` for structured clarification and approval checkpoints.');
    expect(template).not.toContain('use `vscode/askQuestions` only when structured follow-up materially helps');
  });
});
