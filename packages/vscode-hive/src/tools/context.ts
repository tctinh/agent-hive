import { ContextService } from 'hive-core';
import type { ToolRegistration } from './base';

export function getContextTools(workspaceRoot: string): ToolRegistration[] {
  const contextService = new ContextService(workspaceRoot);

  return [
    {
      name: 'hive_context_write',
      displayName: 'Write Context File',
      modelDescription: 'Write a context file to store research findings, decisions, or reference material. Use name: "overview" for the canonical human-facing summary/history file at context/overview.md; refresh it after major planning or execution milestones while plan.md remains execution truth.',
      inputSchema: {
        type: 'object',
        properties: {
          feature: { type: 'string', description: 'Feature name' },
          name: { type: 'string', description: 'Context file name (without .md). Use "overview" for the primary human-facing summary/history file.' },
          content: { type: 'string', description: 'Context content in markdown' },
        },
        required: ['feature', 'name', 'content'],
      },
      invoke: async (input) => {
        const { feature, name, content } = input as { feature: string; name: string; content: string };
        const path = contextService.write(feature, name, content);
        return JSON.stringify({
          success: true,
          path,
          message: name === 'overview'
            ? 'Overview written as the primary human-facing summary/history file. Keep sections ## At a Glance, ## Workstreams, and ## Revision History current.'
            : 'Context file written.',
        });
      },
    },

  ];
}
