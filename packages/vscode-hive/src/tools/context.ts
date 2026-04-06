import { ContextService } from 'hive-core';
import type { ToolRegistration } from './base';

export function getContextTools(workspaceRoot: string): ToolRegistration[] {
  const contextService = new ContextService(workspaceRoot);

  return [
    {
      name: 'hive_context_write',
      displayName: 'Write Context File',
      modelDescription: 'Write a context file to store research findings, decisions, or reference material. System-known names are: "overview" for the human-facing summary/history file at context/overview.md, "draft" for planner scratchpad notes, and "execution-decisions" for the orchestration log. All other names remain durable free-form context while plan.md remains execution truth.',
      inputSchema: {
        type: 'object',
        properties: {
          feature: { type: 'string', description: 'Feature name' },
          name: { type: 'string', description: 'Context file name (without .md). Known names: "overview" = human-facing summary/history, "draft" = planner scratchpad, "execution-decisions" = orchestration log. Other names remain durable free-form context.' },
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
            : name === 'draft'
              ? 'Draft written as planner scratchpad context. It is not part of execution truth.'
              : name === 'execution-decisions'
                ? 'Execution decisions written as orchestration log context. It is not part of execution truth.'
                : 'Context file written as durable free-form context.',
        });
      },
    },

  ];
}
