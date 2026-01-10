import { TaskService } from 'hive-core';
import type { ToolRegistration } from './base';

export function getTaskTools(workspaceRoot: string): ToolRegistration[] {
  const taskService = new TaskService(workspaceRoot);

  return [
    {
      name: 'hive_tasks_sync',
      displayName: 'Sync Hive Tasks',
      modelDescription: 'Generate tasks from an approved plan. Parses ### numbered headers and creates task folders. Use after hive_plan_approve to create executable tasks.',
      inputSchema: {
        type: 'object',
        properties: {
          feature: {
            type: 'string',
            description: 'Feature name',
          },
        },
        required: ['feature'],
      },
      invoke: async (input) => {
        const { feature } = input as { feature: string };
        const result = taskService.sync(feature);
        return JSON.stringify({
          success: true,
          created: result.created,
          removed: result.removed,
          kept: result.kept,
          manual: result.manual,
          message: `${result.created.length} tasks created. Use hive_exec_start to begin work on a task.`,
        });
      },
    },
    {
      name: 'hive_task_create',
      displayName: 'Create Manual Task',
      modelDescription: 'Create a task manually, not from the plan. Use for ad-hoc work or tasks discovered during execution.',
      inputSchema: {
        type: 'object',
        properties: {
          feature: {
            type: 'string',
            description: 'Feature name',
          },
          name: {
            type: 'string',
            description: 'Task name',
          },
          order: {
            type: 'number',
            description: 'Optional order number for the task',
          },
        },
        required: ['feature', 'name'],
      },
      invoke: async (input) => {
        const { feature, name, order } = input as { feature: string; name: string; order?: number };
        const task = taskService.create(feature, name, order);
        return JSON.stringify({
          success: true,
          task: task.folder,
          name: task.name,
          status: task.status,
        });
      },
    },
    {
      name: 'hive_task_update',
      displayName: 'Update Hive Task',
      modelDescription: 'Update a task status or summary. Use to track progress or add notes about completed work.',
      inputSchema: {
        type: 'object',
        properties: {
          feature: {
            type: 'string',
            description: 'Feature name',
          },
          task: {
            type: 'string',
            description: 'Task folder name',
          },
          status: {
            type: 'string',
            enum: ['pending', 'in_progress', 'done', 'cancelled'],
            description: 'New status',
          },
          summary: {
            type: 'string',
            description: 'Summary of what was done',
          },
        },
        required: ['feature', 'task'],
      },
      invoke: async (input) => {
        const { feature, task, status, summary } = input as {
          feature: string;
          task: string;
          status?: string;
          summary?: string;
        };
        const updated = taskService.update(feature, task, status as any, summary);
        return JSON.stringify({
          success: true,
          task: updated.folder,
          status: updated.status,
          summary: updated.summary,
        });
      },
    },
  ];
}
