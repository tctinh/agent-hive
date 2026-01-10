import { SubtaskService } from 'hive-core';
import type { ToolRegistration } from './base';

export function getSubtaskTools(workspaceRoot: string): ToolRegistration[] {
  const subtaskService = new SubtaskService(workspaceRoot);

  return [
    {
      name: 'hive_subtask_create',
      displayName: 'Create Subtask',
      modelDescription: 'Create a subtask within a task. Use for TDD workflows: create test subtask, then implement subtask, then verify subtask. Types: test, implement, review, verify, research, debug, custom.',
      inputSchema: {
        type: 'object',
        properties: {
          feature: { type: 'string', description: 'Feature name' },
          task: { type: 'string', description: 'Task folder name' },
          name: { type: 'string', description: 'Subtask name' },
          type: {
            type: 'string',
            enum: ['test', 'implement', 'review', 'verify', 'research', 'debug', 'custom'],
            description: 'Subtask type for categorization',
          },
        },
        required: ['feature', 'task', 'name'],
      },
      invoke: async (input) => {
        const { feature, task, name, type } = input as { feature: string; task: string; name: string; type?: string };
        const subtask = subtaskService.create(feature, task, name, type as any);
        return JSON.stringify({ success: true, subtask });
      },
    },
    {
      name: 'hive_subtask_update',
      displayName: 'Update Subtask',
      modelDescription: 'Update subtask status. Use to track progress through TDD cycle: pending -> in_progress -> done.',
      inputSchema: {
        type: 'object',
        properties: {
          feature: { type: 'string', description: 'Feature name' },
          task: { type: 'string', description: 'Task folder name' },
          subtask: { type: 'string', description: 'Subtask ID (e.g., 1.1)' },
          status: {
            type: 'string',
            enum: ['pending', 'in_progress', 'done', 'cancelled'],
            description: 'New status',
          },
        },
        required: ['feature', 'task', 'subtask', 'status'],
      },
      invoke: async (input) => {
        const { feature, task, subtask, status } = input as { feature: string; task: string; subtask: string; status: string };
        const updated = subtaskService.update(feature, task, subtask, status as any);
        return JSON.stringify({ success: true, subtask: updated });
      },
    },
    {
      name: 'hive_subtask_list',
      displayName: 'List Subtasks',
      modelDescription: 'List all subtasks for a task. Use to check TDD progress or see what work remains.',
      readOnly: true,
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
        const subtasks = subtaskService.list(feature, task);
        return JSON.stringify({ subtasks });
      },
    },
    {
      name: 'hive_subtask_spec_write',
      displayName: 'Write Subtask Spec',
      modelDescription: 'Write detailed instructions for a subtask in spec.md. Use to define what the subtask should accomplish.',
      inputSchema: {
        type: 'object',
        properties: {
          feature: { type: 'string', description: 'Feature name' },
          task: { type: 'string', description: 'Task folder name' },
          subtask: { type: 'string', description: 'Subtask ID (e.g., 1.1)' },
          content: { type: 'string', description: 'Spec content in markdown' },
        },
        required: ['feature', 'task', 'subtask', 'content'],
      },
      invoke: async (input) => {
        const { feature, task, subtask, content } = input as { feature: string; task: string; subtask: string; content: string };
        const path = subtaskService.writeSpec(feature, task, subtask, content);
        return JSON.stringify({ success: true, path });
      },
    },
    {
      name: 'hive_subtask_report_write',
      displayName: 'Write Subtask Report',
      modelDescription: 'Write completion report for a subtask in report.md. Use to document what was done and any findings.',
      inputSchema: {
        type: 'object',
        properties: {
          feature: { type: 'string', description: 'Feature name' },
          task: { type: 'string', description: 'Task folder name' },
          subtask: { type: 'string', description: 'Subtask ID (e.g., 1.1)' },
          content: { type: 'string', description: 'Report content in markdown' },
        },
        required: ['feature', 'task', 'subtask', 'content'],
      },
      invoke: async (input) => {
        const { feature, task, subtask, content } = input as { feature: string; task: string; subtask: string; content: string };
        const path = subtaskService.writeReport(feature, task, subtask, content);
        return JSON.stringify({ success: true, path });
      },
    },
  ];
}
