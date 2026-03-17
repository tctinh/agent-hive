export interface InstructionFile {
  filename: string;
  description: string;
  applyTo: string;
  body: string;
}

function buildInstructionBody(description: string, applyTo: string, content: string): string {
  return `---\ndescription: "${description}"\napplyTo: "${applyTo}"\n---\n\n${content.trim()}\n`;
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
    'This project uses Hive plan-first development. Before making changes, check for an active feature with hive_status. Follow: Plan → Review → Approve → Execute → Merge. Save research to context files with hive_context_write. Never execute code without an approved plan.',
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

export function generateAllInstructions(): InstructionFile[] {
  return [generateHiveWorkflowInstructions(), generateCodingStandardsTemplate()];
}
