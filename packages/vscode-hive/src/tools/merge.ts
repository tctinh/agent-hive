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
      modelDescription: 'Merge a completed task branch into current branch. Supports merge, squash, or rebase strategies. Use after hive_worktree_commit to integrate changes.',
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
          success: result.success,
          strategy,
          message: result.success
            ? 'Merge completed.'
            : result.error || 'Merge failed.',
        });
      },
    },
  ];
}
