import { ContextService } from 'hive-core';
import type { ToolRegistration } from './base';

export function getContextTools(workspaceRoot: string): ToolRegistration[] {
  const contextService = new ContextService(workspaceRoot);

  return [
    {
      name: 'hive_context_write',
      displayName: 'Write Context File',
      modelDescription: 'Write a context file to store research findings, decisions, or reference material. Context persists across sessions and helps workers understand background.',
      inputSchema: {
        type: 'object',
        properties: {
          feature: { type: 'string', description: 'Feature name' },
          name: { type: 'string', description: 'Context file name (without .md)' },
          content: { type: 'string', description: 'Context content in markdown' },
        },
        required: ['feature', 'name', 'content'],
      },
      invoke: async (input) => {
        const { feature, name, content } = input as { feature: string; name: string; content: string };
        const path = contextService.write(feature, name, content);
        return JSON.stringify({ success: true, path });
      },
    },
    {
      name: 'hive_context_read',
      displayName: 'Read Context',
      modelDescription: 'Read a specific context file or all context for a feature. Use to understand background before starting work.',
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {
          feature: { type: 'string', description: 'Feature name' },
          name: { type: 'string', description: 'Context file name (optional, omit to read all)' },
        },
        required: ['feature'],
      },
      invoke: async (input) => {
        const { feature, name } = input as { feature: string; name?: string };
        if (name) {
          const content = contextService.read(feature, name);
          return JSON.stringify({ name, content });
        }
        const compiled = contextService.compile(feature);
        return JSON.stringify({ allContext: compiled });
      },
    },
    {
      name: 'hive_context_list',
      displayName: 'List Context Files',
      modelDescription: 'List all context files for a feature. Shows what background information is available.',
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {
          feature: { type: 'string', description: 'Feature name' },
        },
        required: ['feature'],
      },
      invoke: async (input) => {
        const { feature } = input as { feature: string };
        const files = contextService.list(feature);
        return JSON.stringify({
          files: files.map(f => ({ name: f.name, updatedAt: f.updatedAt })),
        });
      },
    },
  ];
}
