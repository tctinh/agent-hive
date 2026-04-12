import { describe, expect, it } from 'bun:test';
import * as generators from './index.js';

function getBody(content: string): string {
  const parts = content.split(/^---$/m);
  return parts.slice(2).join('---').trim();
}

describe('instructions generator', () => {
  it('exports both generators and returns the two instruction files', () => {
    expect(generators.generateAllInstructions).toBeDefined();
    expect(generators.generateCopilotInstructions).toBeDefined();
    expect(generators.generateHiveWorkflowInstructions).toBeDefined();
    expect(generators.generateCodingStandardsTemplate).toBeDefined();

    const instructions = generators.generateAllInstructions();

    expect(instructions.map((instruction) => instruction.filename)).toEqual([
      'hive-workflow.instructions.md',
      'coding-standards.instructions.md',
    ]);
    expect(instructions).toHaveLength(2);
  });

  it('builds the workflow instructions with frontmatter and short always-on body', () => {
    const instruction = generators.generateHiveWorkflowInstructions();
    const body = getBody(instruction.body);

    expect(instruction.filename).toBe('hive-workflow.instructions.md');
    expect(instruction.applyTo).toBe('**');
    expect(instruction.description).toBe('Hive plan-first development workflow');
    expect(instruction.body.startsWith('---\n')).toBe(true);
    expect(instruction.body).toContain('description: "Hive plan-first development workflow"');
    expect(instruction.body).toContain('applyTo: "**"');
    expect(body).toContain('Hive plan-first development');
    expect(body).toContain('hive_status');
    expect(body).toContain('hive_context_write');
    expect(body.length).toBeLessThanOrEqual(1000);
  });

  it('builds the coding standards template with TODO markers and ts applyTo glob', () => {
    const instruction = generators.generateCodingStandardsTemplate();

    expect(instruction.filename).toBe('coding-standards.instructions.md');
    expect(instruction.applyTo).toBe('**/*.ts');
    expect(instruction.description).toBe('Project coding standards template');
    expect(instruction.body.startsWith('---\n')).toBe(true);
    expect(instruction.body).toContain('description: "Project coding standards template"');
    expect(instruction.body).toContain('applyTo: "**/*.ts"');
    expect(instruction.body).toContain('## Imports');
    expect(instruction.body).toContain('## Naming');
    expect(instruction.body).toContain('## Error Handling');
    expect(instruction.body).toContain('## Testing');
    expect(instruction.body).toContain('<!-- TODO: customize -->');
  });

  it('builds repository-wide copilot instructions without duplicating AGENTS.md', () => {
    const content = generators.generateCopilotInstructions();
    const body = getBody(content);

    expect(content.startsWith('---\n')).toBe(true);
    expect(content).toContain('description: "Repository-wide GitHub Copilot steering for Hive workflows"');
    expect(body).toContain('AGENTS.md');
    expect(body).toContain('.github/instructions/');
    expect(body).toContain('.github/prompts/');
    expect(body).toContain('vscode/askQuestions');
    expect(body).toContain('plain chat only as a fallback');
    expect(body).toContain('built-in browser tools');
    expect(body).toContain('MCP');
    expect(body).not.toContain('inside prompt files only');
    expect(body).not.toContain('question()');
    expect(body.length).toBeLessThanOrEqual(1000);
  });
});
