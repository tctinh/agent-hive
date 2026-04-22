/**
 * hive_merge — Task completion gate.
 * Merges a completed task's worktree branch into the feature branch.
 * GATE: Task must have status 'done'.
 */
import type { ToolDefinition } from '../server.js';
import { getServices, resolveFeature } from '../services.js';

export const mergeTools: ToolDefinition[] = [
  {
    name: 'hive_merge',
    description:
      'Merge a completed task branch into the feature branch. GATE: Task must be completed ' +
      '(status "done") before merging. Supports merge, squash, or rebase strategies. ' +
      'Optionally cleans up the worktree after merge.',
    inputSchema: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description: 'Task folder name (e.g. "01-auth-service")',
        },
        feature: {
          type: 'string',
          description: 'Feature name. Defaults to active feature.',
        },
        strategy: {
          type: 'string',
          enum: ['merge', 'squash', 'rebase'],
          description: 'Merge strategy (default: "merge")',
        },
        message: {
          type: 'string',
          description: 'Custom merge commit message. Auto-generated if omitted.',
        },
        cleanup: {
          type: 'string',
          enum: ['none', 'worktree', 'worktree+branch'],
          description:
            'Cleanup after merge: "none" keeps everything, "worktree" removes worktree, ' +
            '"worktree+branch" removes both (default: "none")',
        },
      },
      required: ['task'],
    },
    handler: async (args) => {
      const task = args.task as string;
      const strategy = (args.strategy as 'merge' | 'squash' | 'rebase') ?? 'merge';
      const message = args.message as string | undefined;
      const cleanup = (args.cleanup as 'none' | 'worktree' | 'worktree+branch') ?? 'none';

      const services = getServices();
      const feature = resolveFeature(services, args.feature as string | undefined);

      if (!feature) {
        return JSON.stringify({ success: false, error: 'No active feature.' });
      }

      // P7 Gate: Task must be completed
      const taskInfo = services.taskService.get(feature, task);
      if (!taskInfo) {
        return JSON.stringify({ success: false, error: `Task "${task}" not found.` });
      }

      if (taskInfo.status !== 'done') {
        return JSON.stringify({
          success: false,
          error: `Task "${task}" has status "${taskInfo.status}". Must be "done" before merging.`,
          hint: 'Workers must call hive_worktree_commit with status "completed" first.',
        });
      }

      const result = await services.worktreeService.merge(
        feature,
        task,
        strategy,
        message,
        { cleanup },
      );

      return JSON.stringify(
        {
          success: result.success,
          merged: result.merged,
          strategy: result.strategy,
          filesChanged: result.filesChanged,
          conflicts: result.conflicts ?? [],
          conflictState: result.conflictState ?? 'none',
          cleanup: result.cleanup ?? null,
          error: result.error ?? null,
        },
        null,
        2,
      );
    },
  },
];
