import { AgentsMdService, ContextService } from 'hive-core';
import type { ToolRegistration } from './base';

export function getAgentsMdTools(workspaceRoot: string): ToolRegistration[] {
  return [
    {
      name: 'hive_agents_md',
      displayName: 'Manage AGENTS.md',
      modelDescription: 'Initialize, sync, or apply changes to AGENTS.md. init: scan codebase and generate. sync: propose updates from feature contexts. apply: write approved content.',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['init', 'sync', 'apply'],
            description: 'Action to perform',
          },
          feature: {
            type: 'string',
            description: 'Feature name (required for sync)',
          },
          content: {
            type: 'string',
            description: 'Content to apply (required for apply)',
          },
        },
        required: ['action'],
      },
      invoke: async (input) => {
        const contextService = new ContextService(workspaceRoot);
        const service = new AgentsMdService(workspaceRoot, contextService);
        const { action, feature, content } = input as {
          action: string;
          feature?: string;
          content?: string;
        };

        if (action === 'init') {
          return JSON.stringify(await service.init());
        }

        if (action === 'sync') {
          if (!feature) {
            return JSON.stringify({ error: 'Feature name required for sync' });
          }

          return JSON.stringify(await service.sync(feature));
        }

        if (action === 'apply') {
          if (!content) {
            return JSON.stringify({ error: 'Content required for apply' });
          }

          return JSON.stringify(service.apply(content));
        }

        return JSON.stringify({ error: `Unknown action: ${action}` });
      },
    },
  ];
}
