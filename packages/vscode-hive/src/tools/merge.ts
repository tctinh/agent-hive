import * as path from 'path';
import { WorktreeService } from 'hive-core';
import type { ToolRegistration } from './base';

export function getMergeTools(workspaceRoot: string): ToolRegistration[] {
  const worktreeService = new WorktreeService({
    baseDir: workspaceRoot,
    hiveDir: path.join(workspaceRoot, '.hive'),
  });

  return [
    {
      name: 'hive_merge',
      displayName: 'Merge Task Branch',
      modelDescription: 'Merge a completed task branch into current branch. Supports merge, squash, or rebase strategies. Use after hive_exec_complete to integrate changes.',
      inputSchema: {
        type: 'object',
        properties: {
          feature: { type: 'string', description: 'Feature name' },
          task: { type: 'string', description: 'Task folder name' },
          strategy: {
            type: 'string',
            enum: ['merge', 'squash', 'rebase'],
            description: 'Merge strategy (default: merge)',
          },
        },
        required: ['feature', 'task'],
      },
      invoke: async (input) => {
        const { feature, task, strategy = 'merge' } = input as { feature: string; task: string; strategy?: string };
        const result = await worktreeService.merge(feature, task, strategy as any);
        return JSON.stringify({
          success: true,
          strategy,
          message: result.message,
        });
      },
    },
    {
      name: 'hive_worktree_list',
      displayName: 'List Worktrees',
      modelDescription: 'List all worktrees for a feature. Shows which tasks have active worktrees for concurrent work.',
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
        const worktrees = await worktreeService.list(feature);
        return JSON.stringify({ worktrees });
      },
    },
  ];
}
