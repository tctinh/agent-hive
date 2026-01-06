import * as path from 'path';
import { z } from 'zod';
import { TaskService } from '../services/taskService.js';
import { FeatureService } from '../services/featureService.js';
import { WorktreeService } from '../services/worktreeService';

export function createExecTools(projectRoot: string) {
  const taskService = new TaskService(projectRoot);
  const featureService = new FeatureService(projectRoot);
  const worktreeService = new WorktreeService({
    baseDir: projectRoot,
    hiveDir: path.join(projectRoot, '.hive'),
  });

  return {
    hive_exec_start: {
      description: 'Create worktree and begin work on task',
      parameters: z.object({
        task: z.string().describe('Task folder name (e.g., "01-auth-service")'),
      }),
      execute: async ({ task }: { task: string }) => {
        const feature = featureService.getActive();
        if (!feature) {
          return { error: 'No active feature.' };
        }

        const featureData = featureService.get(feature);
        if (!featureData || featureData.status === 'planning') {
          return { error: 'Feature must be approved before starting execution.' };
        }

        const taskInfo = taskService.get(feature, task);
        if (!taskInfo) {
          return { error: `Task '${task}' not found` };
        }

        if (taskInfo.status === 'done') {
          return { error: `Task '${task}' is already completed` };
        }

        if (taskInfo.status === 'in_progress') {
          const existing = await worktreeService.get(feature, task);
          if (existing) {
            return { 
              worktreePath: existing.path,
              branch: existing.branch,
              message: `Task already in progress. Worktree at ${existing.path}`,
            };
          }
        }

        const worktree = await worktreeService.create(feature, task);
        taskService.update(feature, task, { status: 'in_progress' });

        return {
          worktreePath: worktree.path,
          branch: worktree.branch,
          message: `Worktree created at ${worktree.path}. Work on branch ${worktree.branch}.`,
        };
      },
    },

    hive_exec_complete: {
      description: 'Complete task: apply changes, write report',
      parameters: z.object({
        task: z.string().describe('Task folder name'),
        summary: z.string().describe('Summary of what was done'),
        report: z.string().optional().describe('Detailed report (markdown). If not provided, summary is used.'),
      }),
      execute: async ({ task, summary, report }: { task: string; summary: string; report?: string }) => {
        const feature = featureService.getActive();
        if (!feature) {
          return { error: 'No active feature.' };
        }

        const taskInfo = taskService.get(feature, task);
        if (!taskInfo) {
          return { error: `Task '${task}' not found` };
        }

        if (taskInfo.status !== 'in_progress') {
          return { error: `Task '${task}' is not in progress (status: ${taskInfo.status})` };
        }

        const worktree = await worktreeService.get(feature, task);
        if (!worktree) {
          return { error: `No worktree found for task '${task}'` };
        }

        const diff = await worktreeService.getDiff(feature, task);
        if (diff) {
          await worktreeService.applyDiff(feature, task);
        }

        const reportContent = report || `# ${task}\n\n## Summary\n\n${summary}\n`;
        taskService.writeReport(feature, task, reportContent);
        taskService.update(feature, task, { status: 'done', summary });

        await worktreeService.remove(feature, task);

        return {
          completed: true,
          task,
          summary,
          message: `Task '${task}' completed. Changes applied to main branch.`,
        };
      },
    },

    hive_exec_abort: {
      description: 'Abort task: discard changes, reset status',
      parameters: z.object({
        task: z.string().describe('Task folder name'),
      }),
      execute: async ({ task }: { task: string }) => {
        const feature = featureService.getActive();
        if (!feature) {
          return { error: 'No active feature.' };
        }

        const taskInfo = taskService.get(feature, task);
        if (!taskInfo) {
          return { error: `Task '${task}' not found` };
        }

        if (taskInfo.status !== 'in_progress') {
          return { error: `Task '${task}' is not in progress` };
        }

        await worktreeService.remove(feature, task);
        taskService.update(feature, task, { status: 'pending' });

        return {
          aborted: true,
          task,
          message: `Task '${task}' aborted. Worktree removed, status reset to pending.`,
        };
      },
    },
  };
}
