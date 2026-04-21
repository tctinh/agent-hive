import { TaskService, TaskStatusType } from 'hive-core';
import type { ManualTaskMetadata } from 'hive-core';
import type { ToolRegistration } from './base';
import { defineTool } from './base';

export function getTaskTools(workspaceRoot: string): ToolRegistration[] {
  const taskService = new TaskService(workspaceRoot);
  const foragerGuidance = 'Delegate runnable execution directly to @forager and use hive_task_update to record progress or completion.';

  return [
    defineTool({
      name: 'hive_tasks_sync',
      toolReferenceName: 'hiveTasksSync',
      displayName: 'Sync Hive Tasks',
      modelDescription: 'Generate tasks from approved plan.md by parsing ### numbered headers. Creates task folders with status.json. When refreshPending is true, rewrites pending plan tasks from current plan (updates dependsOn, planTitle, spec.md) and deletes pending tasks removed from plan. Preserves manual tasks and tasks with execution history. Returns summary of created/removed/kept tasks.',
      userDescription: 'Generate or refresh Hive tasks from an approved plan.',
      canBeReferencedInPrompt: true,
      inputSchema: {
        type: 'object',
        properties: {
          feature: {
            type: 'string',
            description: 'Feature name',
          },
          refreshPending: {
            type: 'boolean',
            description: 'When true, refresh pending plan tasks from current plan.md (rewrite dependsOn, planTitle, spec.md) and delete pending tasks removed from plan. Manual tasks and tasks with execution history are preserved.',
          },
        },
        required: ['feature'],
      },
      invoke: async (input, _token) => {
        const { feature, refreshPending } = input as { feature: string; refreshPending?: boolean };
        const result = taskService.sync(feature, { refreshPending });
        return JSON.stringify({
          created: result.created.length,
          removed: result.removed.length,
          kept: result.kept.length,
          manual: result.manual.length,
          message: `${result.created.length} tasks created, ${result.removed.length} removed, ${result.kept.length} kept, ${result.manual.length} manual`,
          hints: [
            'Check task dependencies with hive_status to find runnable tasks.',
            'A task is runnable when all its dependsOn tasks have status done.',
            foragerGuidance,
          ]
        });
      },
    }),
    defineTool({
      name: 'hive_task_create',
      toolReferenceName: 'hiveTaskCreate',
      displayName: 'Create Manual Task',
      modelDescription: 'Create a task manually, not from the plan. Use for ad-hoc work or tasks discovered during execution. Manual tasks always have explicit dependsOn (default: []) to avoid accidental implicit sequential dependencies. Provide structured metadata for a useful spec.md and worker prompt.',
      userDescription: 'Create a manual Hive task that is not sourced from the plan.',
      canBeReferencedInPrompt: true,
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
          description: {
            type: 'string',
            description: 'What the worker needs to achieve',
          },
          goal: {
            type: 'string',
            description: 'Why this task exists and what done means',
          },
          acceptanceCriteria: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific observable outcomes',
          },
          references: {
            type: 'array',
            items: { type: 'string' },
            description: 'File paths or line ranges relevant to this task',
          },
          files: {
            type: 'array',
            items: { type: 'string' },
            description: 'Files likely to be modified',
          },
          dependsOn: {
            type: 'array',
            items: { type: 'string' },
            description: 'Task folder names this task depends on (default: [] for no dependencies)',
          },
          reason: {
            type: 'string',
            description: 'Why this task was created (e.g., "Required by Hygienic review")',
          },
          source: {
            type: 'string',
            enum: ['review', 'operator', 'ad_hoc'],
            description: 'Origin of this task',
          },
        },
        required: ['feature', 'name'],
      },
      invoke: async (input, _token) => {
        const { feature, name, order, ...metadataFields } = input as {
          feature: string;
          name: string;
          order?: number;
          description?: string;
          goal?: string;
          acceptanceCriteria?: string[];
          references?: string[];
          files?: string[];
          dependsOn?: string[];
          reason?: string;
          source?: 'review' | 'operator' | 'ad_hoc';
        };
        const metadata: ManualTaskMetadata = {};
        if (metadataFields.description) metadata.description = metadataFields.description;
        if (metadataFields.goal) metadata.goal = metadataFields.goal;
        if (metadataFields.acceptanceCriteria) metadata.acceptanceCriteria = metadataFields.acceptanceCriteria;
        if (metadataFields.references) metadata.references = metadataFields.references;
        if (metadataFields.files) metadata.files = metadataFields.files;
        if (metadataFields.dependsOn) metadata.dependsOn = metadataFields.dependsOn;
        if (metadataFields.reason) metadata.reason = metadataFields.reason;
        if (metadataFields.source) metadata.source = metadataFields.source;
        const folder = taskService.create(feature, name, order, Object.keys(metadata).length > 0 ? metadata : undefined);
        return `Created task "${folder}" with status: pending, dependsOn: [${(metadata.dependsOn ?? []).join(', ')}]\nReminder: ${foragerGuidance}`;
      },
    }),
    defineTool({
      name: 'hive_task_update',
      toolReferenceName: 'hiveTaskUpdate',
      displayName: 'Update Hive Task',
      modelDescription: 'Update a task status (pending/in_progress/done/cancelled) or add a work summary. Use during direct @forager execution to record progress or completion.',
      userDescription: 'Update a Hive task status or summary.',
      canBeReferencedInPrompt: true,
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
    }),
  ];
}
