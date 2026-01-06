import { z } from 'zod';
import { FeatureService } from '../services/featureService.js';
import type { TaskInfo } from '../types.js';

export function createFeatureTools(projectRoot: string) {
  const featureService = new FeatureService(projectRoot);

  return {
    hive_feature_create: {
      description: 'Create a new feature and set it as active.',
      parameters: z.object({
        name: z.string().describe('Feature name (will be used as folder name)'),
        ticket: z.string().optional().describe('Ticket/issue reference'),
      }),
      execute: async ({ name, ticket }: { name: string; ticket?: string }) => {
        const feature = featureService.create(name, ticket);
        return {
          name: feature.name,
          status: feature.status,
          path: `.hive/features/${name}`,
          message: `Feature '${name}' created and set as active. Write a plan with hive_plan_write.`,
        };
      },
    },

    hive_feature_list: {
      description: 'List all features.',
      parameters: z.object({}),
      execute: async () => {
        const features = featureService.list();
        const active = featureService.getActive();
        
        const details = features.map(name => {
          const info = featureService.getInfo(name);
          return {
            name,
            status: info?.status || 'unknown',
            taskCount: info?.tasks.length || 0,
            isActive: name === active,
          };
        });

        return { features: details, active };
      },
    },

    hive_feature_switch: {
      description: 'Switch to a different feature.',
      parameters: z.object({
        name: z.string().describe('Feature name to switch to'),
      }),
      execute: async ({ name }: { name: string }) => {
        featureService.setActive(name);
        const info = featureService.getInfo(name);
        return {
          switched: true,
          name,
          status: info?.status,
          message: `Switched to feature '${name}'`,
        };
      },
    },

    hive_feature_complete: {
      description: 'Mark feature as completed (irreversible)',
      parameters: z.object({
        _placeholder: z.boolean().describe('Placeholder. Always pass true.'),
        name: z.string().optional(),
      }),
      execute: async ({ name }: { name?: string }) => {
        const feature = name || featureService.getActive();
        if (!feature) {
          return { error: 'No active feature.' };
        }

        const info = featureService.getInfo(feature);
        const pendingTasks = info?.tasks.filter((t: TaskInfo) => t.status === 'pending' || t.status === 'in_progress') || [];
        
        if (pendingTasks.length > 0) {
          return {
            error: `Cannot complete: ${pendingTasks.length} task(s) still pending or in progress`,
            pendingTasks: pendingTasks.map((t: TaskInfo) => t.folder),
          };
        }

        featureService.complete(feature);
        return {
          completed: true,
          name: feature,
          message: `Feature '${feature}' marked as completed.`,
        };
      },
    },

    hive_status: {
      description: 'Get overview of active feature',
      parameters: z.object({
        _placeholder: z.boolean().describe('Placeholder. Always pass true.'),
        name: z.string().optional(),
      }),
      execute: async ({ name }: { name?: string }) => {
        const feature = name || featureService.getActive();
        if (!feature) {
          return { error: 'No active feature. Create one with hive_feature_create.' };
        }
        const info = featureService.getInfo(feature);
        if (!info) {
          return { error: `Feature '${name}' not found` };
        }

        const tasksByStatus = {
          pending: info.tasks.filter((t: TaskInfo) => t.status === 'pending').length,
          in_progress: info.tasks.filter((t: TaskInfo) => t.status === 'in_progress').length,
          done: info.tasks.filter((t: TaskInfo) => t.status === 'done').length,
          cancelled: info.tasks.filter((t: TaskInfo) => t.status === 'cancelled').length,
        };

        return {
          feature: info.name,
          status: info.status,
          hasPlan: info.hasPlan,
          commentCount: info.commentCount,
          tasks: info.tasks,
          taskSummary: tasksByStatus,
        };
      },
    },
  };
}
