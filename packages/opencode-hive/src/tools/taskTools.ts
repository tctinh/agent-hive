import { z } from 'zod';
import { TaskService } from '../services/taskService.js';
import { FeatureService } from '../services/featureService.js';

export function createTaskTools(projectRoot: string) {
  const taskService = new TaskService(projectRoot);
  const featureService = new FeatureService(projectRoot);

  return {
    hive_tasks_sync: {
      description: 'Generate tasks from approved plan',
      parameters: z.object({}),
      execute: async () => {
        const feature = featureService.getActive();
        if (!feature) {
          return { error: 'No active feature.' };
        }

        const featureData = featureService.get(feature);
        if (!featureData) {
          return { error: `Feature '${feature}' not found` };
        }

        if (featureData.status === 'planning') {
          return { error: 'Plan must be approved before syncing tasks. Run hive_plan_approve first.' };
        }

        const result = taskService.sync(feature);
        
        if (featureData.status === 'approved') {
          featureService.updateStatus(feature, 'executing');
        }

        return {
          ...result,
          message: `Synced tasks: ${result.created.length} created, ${result.removed.length} removed, ${result.kept.length} kept, ${result.manual.length} manual`,
        };
      },
    },

    hive_task_create: {
      description: 'Create manual task (not from plan)',
      parameters: z.object({
        name: z.string().describe('Task name (will be slugified)'),
        order: z.number().optional().describe('Task order number (defaults to next available)'),
      }),
      execute: async ({ name, order }: { name: string; order?: number }) => {
        const feature = featureService.getActive();
        if (!feature) {
          return { error: 'No active feature.' };
        }

        const folder = taskService.create(feature, name, order);
        return { 
          folder, 
          origin: 'manual',
          message: `Created manual task '${folder}'. This task will not be affected by hive_tasks_sync.`,
        };
      },
    },

    hive_task_update: {
      description: 'Update task status or summary',
      parameters: z.object({
        task: z.string().describe('Task folder name (e.g., "01-auth-service")'),
        status: z.enum(['pending', 'in_progress', 'done', 'cancelled']).optional(),
        summary: z.string().optional().describe('Summary of work done'),
      }),
      execute: async ({ task, status, summary }: { task: string; status?: 'pending' | 'in_progress' | 'done' | 'cancelled'; summary?: string }) => {
        const feature = featureService.getActive();
        if (!feature) {
          return { error: 'No active feature.' };
        }

        const updated = taskService.update(feature, task, { status, summary });
        return { updated: true, task, status: updated.status, summary: updated.summary };
      },
    },

    hive_task_list: {
      description: 'List all tasks for the active feature.',
      parameters: z.object({}),
      execute: async () => {
        const feature = featureService.getActive();
        if (!feature) {
          return { error: 'No active feature.' };
        }

        const tasks = taskService.list(feature);
        return { tasks };
      },
    },
  };
}
