import * as path from 'path';
import { WorktreeService, TaskService } from 'hive-core';
import type { ToolRegistration } from './base';

export function getExecTools(workspaceRoot: string): ToolRegistration[] {
  const worktreeService = new WorktreeService({
    baseDir: workspaceRoot,
    hiveDir: path.join(workspaceRoot, '.hive'),
  });
  const taskService = new TaskService(workspaceRoot);

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
          hints: [
            'Do all work inside this worktree. Ensure any subagents do the same.',
            'Call hive_session_refresh periodically to check for user steering comments.',
            'Use hive_ask if you need user input to proceed.',
            'Read context files (hive_context_read) before starting implementation.'
          ]
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
        const result = await worktreeService.commitChanges(feature, task, summary);
        
        // Mark task as done and create report if commit succeeded
        if (result.committed) {
          taskService.update(feature, task, { status: 'done', summary });
          
          // Generate report
          const reportContent = `# Task Completion Report\n\n**Task:** ${task}\n**Status:** Done\n**Completed:** ${new Date().toISOString()}\n**Commit:** ${result.sha}\n\n## Summary\n\n${summary}\n`;
          taskService.writeReport(feature, task, reportContent);
        }
        
        return JSON.stringify({
          success: true,
          commitHash: result.sha,
          committed: result.committed,
          message: result.committed 
            ? `Changes committed. Use hive_merge to integrate into main branch.`
            : result.message || 'No changes to commit',
          hints: result.committed ? [
            'Call hive_session_refresh to check progress and pending user questions.',
            'Proceed to next task or use hive_merge to integrate changes.'
          ] : []
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
        // Reset task status to pending
        taskService.update(feature, task, { status: 'pending', summary: '' });
        return JSON.stringify({
          success: true,
          message: `Worktree removed. Task status reset to pending. Can restart with hive_exec_start.`,
        });
      },
    },
  ];
}
