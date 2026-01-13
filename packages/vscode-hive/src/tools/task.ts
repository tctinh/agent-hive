import { TaskService, TaskStatusType } from 'hive-core';
import type { ToolRegistration } from './base';
import { createToolResult } from './base';

export function getTaskTools(workspaceRoot: string): ToolRegistration[] {
  const taskService = new TaskService(workspaceRoot);

  return [
    {
      name: 'hive_tasks_sync',
      displayName: 'Sync Hive Tasks',
      modelDescription: 'Generate tasks from approved plan.md by parsing ### numbered headers. Creates task folders with status.json. Returns summary of created/removed/kept tasks. Use after hive_plan_approve.',
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
      invoke: async (input, _token) => {
        const { feature } = input as { feature: string };
        const result = taskService.sync(feature);
        return JSON.stringify({
          created: result.created.length,
          removed: result.removed.length,
          kept: result.kept.length,
          manual: result.manual.length,
          message: `${result.created.length} tasks created, ${result.removed.length} removed, ${result.kept.length} kept, ${result.manual.length} manual`,
          hints: [
            'Use hive_exec_start to begin work on a task.',
            'Tasks should be executed in order unless explicitly parallelizable.',
            'Read context files before starting implementation.',
            'Call hive_session_refresh periodically to check for user steering.'
          ]
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
      invoke: async (input, _token) => {
        const { feature, name, order } = input as { feature: string; name: string; order?: number };
        const folder = taskService.create(feature, name, order);
        return `Created task "${folder}" with status: pending\nReminder: run hive_exec_start to work in its worktree, and ensure any subagents work in that worktree too.`;
      },
    },
    {
      name: 'hive_task_update',
      displayName: 'Update Hive Task',
      modelDescription: 'Update a task status (pending/in_progress/done/cancelled) or add a work summary. Returns plain text confirmation. Does NOT merge - use hive_merge for integration.',
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
      invoke: async (input, _token) => {
        const { feature, task, status, summary } = input as {
          feature: string;
          task: string;
          status?: TaskStatusType;
          summary?: string;
        };
        const updates: { status?: TaskStatusType; summary?: string } = {};
        if (status) updates.status = status;
        if (summary) updates.summary = summary;
        const updated = taskService.update(feature, task, updates);
        const statusMsg = summary ? `. Summary: ${summary}` : '';
        return `Task "${task}" updated to ${updated.status}${statusMsg}`;
      },
    },
  ];
}
