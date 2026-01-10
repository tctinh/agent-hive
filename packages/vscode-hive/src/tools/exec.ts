import * as path from 'path';
import { WorktreeService } from 'hive-core';
import type { ToolRegistration } from './base';

export function getExecTools(workspaceRoot: string): ToolRegistration[] {
  const worktreeService = new WorktreeService({
    baseDir: workspaceRoot,
    hiveDir: path.join(workspaceRoot, '.hive'),
  });

  return [
    {
      name: 'hive_exec_start',
      displayName: 'Start Task Execution',
      modelDescription: 'Create a git worktree and begin work on a task. Isolates changes in a separate directory. Use when ready to implement a task.',
      inputSchema: {
        type: 'object',
        properties: {
          feature: { type: 'string', description: 'Feature name' },
          task: { type: 'string', description: 'Task folder name' },
        },
        required: ['feature', 'task'],
      },
      invoke: async (input) => {
        const { feature, task } = input as { feature: string; task: string };
        const worktree = await worktreeService.create(feature, task);
        return JSON.stringify({
          success: true,
          worktreePath: worktree.path,
          branch: worktree.branch,
          message: `Worktree created. Work in ${worktree.path}. When done, use hive_exec_complete.`,
        });
      },
    },
    {
      name: 'hive_exec_complete',
      displayName: 'Complete Task Execution',
      modelDescription: 'Commit changes in worktree and mark task done. Does NOT merge - use hive_merge for that. Use when task implementation is finished.',
      inputSchema: {
        type: 'object',
        properties: {
          feature: { type: 'string', description: 'Feature name' },
          task: { type: 'string', description: 'Task folder name' },
          summary: { type: 'string', description: 'Summary of what was done' },
        },
        required: ['feature', 'task', 'summary'],
      },
      invoke: async (input) => {
        const { feature, task, summary } = input as { feature: string; task: string; summary: string };
        const result = await worktreeService.commit(feature, task, summary);
        return JSON.stringify({
          success: true,
          commitHash: result.hash,
          branch: result.branch,
          message: `Changes committed. Use hive_merge to integrate into main branch.`,
        });
      },
    },
    {
      name: 'hive_exec_abort',
      displayName: 'Abort Task Execution',
      modelDescription: 'Discard all changes and remove worktree. Use when task approach is wrong and needs restart. This is destructive and irreversible.',
      destructive: true,
      inputSchema: {
        type: 'object',
        properties: {
          feature: { type: 'string', description: 'Feature name' },
          task: { type: 'string', description: 'Task folder name' },
        },
        required: ['feature', 'task'],
      },
      invoke: async (input) => {
        const { feature, task } = input as { feature: string; task: string };
        await worktreeService.remove(feature, task);
        return JSON.stringify({
          success: true,
          message: `Worktree removed. Task status reset to pending. Can restart with hive_exec_start.`,
        });
      },
    },
  ];
}
