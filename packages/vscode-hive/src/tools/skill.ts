import * as fs from 'fs';
import * as path from 'path';
import type { ToolRegistration } from './base';

export function getSkillTools(workspaceRoot: string): ToolRegistration[] {
  return [
    {
      name: 'hive_skill',
      displayName: 'Load Hive Skill',
      modelDescription: 'Load a skill by name. Returns the SKILL.md content with instructions for the specified workflow skill.',
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Skill name (e.g. writing-plans, brainstorming)',
          },
        },
        required: ['name'],
      },
      invoke: async (input) => {
        const { name } = input as { name: string };
        const searchPaths = [
          path.join(workspaceRoot, '.github', 'skills', name, 'SKILL.md'),
          path.join(workspaceRoot, '.claude', 'skills', name, 'SKILL.md'),
          path.join(workspaceRoot, '.opencode', 'skill', name, 'SKILL.md'),
        ];

        for (const skillPath of searchPaths) {
          if (fs.existsSync(skillPath)) {
            return fs.readFileSync(skillPath, 'utf-8');
          }
        }

        return JSON.stringify({
          error: `Skill not found: ${name}`,
          searchedPaths: searchPaths,
        });
      },
    },
  ];
}
