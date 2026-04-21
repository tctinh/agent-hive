export interface InstructionFile {
  filename: string;
  description: string;
  applyTo: string;
  body: string;
}

function buildFrontmatter(frontmatter: string, content: string): string {
  return `---\n${frontmatter}\n---\n\n${content.trim()}\n`;
}

function buildInstructionBody(description: string, applyTo: string, content: string): string {
  return buildFrontmatter(`description: "${description}"\napplyTo: "${applyTo}"`, content);
}

function createInstructionFile(filename: string, description: string, applyTo: string, content: string): InstructionFile {
  return {
    filename,
    description,
    applyTo,
    body: buildInstructionBody(description, applyTo, content),
  };
}

export function generateHiveWorkflowInstructions(): InstructionFile {
  return createInstructionFile(
    'hive-workflow.instructions.md',
    'Hive plan-first development workflow',
    '**',
    'This project uses Hive plan-first development. Before making changes, check for an active feature with hive_status. Follow: Plan → Review → Approve → Execute. plan.md is the only required human-review and execution document. Use Copilot memory or normal file edits for working notes when needed. Never execute code without an approved plan.',
  );
}

export function generateCodingStandardsTemplate(): InstructionFile {
  return createInstructionFile(
    'coding-standards.instructions.md',
    'Project coding standards template',
    '**/*.ts',
    `## Imports

<!-- TODO: customize -->
- Prefer explicit imports and keep local import style consistent.

## Naming

<!-- TODO: customize -->
- Document naming conventions for files, types, functions, and constants.

## Error Handling

<!-- TODO: customize -->
- Define how errors should be surfaced, wrapped, or logged.

## Testing

<!-- TODO: customize -->
- Describe required test coverage, frameworks, and verification expectations.`,
  );
}

export function generateCopilotInstructions(): string {
  return buildFrontmatter(
    'description: "Repository-wide GitHub Copilot steering for Hive workflows"',
    `Use AGENTS.md for the full Hive operating model and non-negotiable plan-first guardrails.

Use .github/instructions/ for path-specific coding and workflow guidance, and .github/prompts/ for reusable entry points such as plan creation, plan review, execution, review handoff, and completion verification.

Use .github/skills/ directly when a task benefits from a documented skill, and use Copilot memory for durable notes instead of extension-specific note-writing helpers.

Use vscode/askQuestions for practical structured decision checkpoints wherever Copilot supports it. Use plain chat only as a fallback when the tool is unavailable or a truly lightweight clarification is better.

When web research, browser inspection, or end-to-end verification is needed, prefer built-in browser tools and MCP integrations such as Playwright MCP over extension-specific substitutes.`,
  );
}

export function generateAllInstructions(): InstructionFile[] {
  return [generateHiveWorkflowInstructions(), generateCodingStandardsTemplate()];
}
