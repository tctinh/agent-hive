import { FeatureService, TaskService, PlanService, ContextService } from 'hive-core';
import type { ToolRegistration } from './base';

export function getStatusTools(workspaceRoot: string): ToolRegistration[] {
  const featureService = new FeatureService(workspaceRoot);
  const taskService = new TaskService(workspaceRoot);
  const planService = new PlanService(workspaceRoot);
  const contextService = new ContextService(workspaceRoot);

  return [
    {
      name: 'hive_status',
      displayName: 'Get Hive Status',
      modelDescription: 'Get comprehensive status of a feature including plan, tasks, and context. Returns JSON with all relevant state for resuming work.',
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {
          feature: {
            type: 'string',
            description: 'Feature name (optional, uses active feature if omitted)',
          },
        },
      },
      invoke: async (input) => {
        const { feature: explicitFeature } = input as { feature?: string };
        
        const feature = explicitFeature || featureService.getActive()?.name;
        if (!feature) {
          return JSON.stringify({
            error: 'No feature specified and no active feature found',
            hint: 'Use hive_feature_create to create a new feature',
          });
        }

        const info = featureService.getInfo(feature);
        if (!info) {
          return JSON.stringify({
            error: `Feature '${feature}' not found`,
            availableFeatures: featureService.list(),
          });
        }

        const plan = planService.read(feature);
        const tasks = taskService.list(feature);
        const contextFiles = contextService.list(feature);

        const tasksSummary = tasks.map(t => ({
          folder: t.folder,
          name: t.folder.replace(/^\d+-/, ''),
          status: t.status.status,
          summary: t.status.summary || null,
          origin: t.status.origin,
        }));

        const contextSummary = contextFiles.map(c => ({
          name: c.name,
          chars: c.content.length,
          updatedAt: c.updatedAt,
        }));

        const pendingTasks = tasksSummary.filter(t => t.status === 'pending');
        const inProgressTasks = tasksSummary.filter(t => t.status === 'in_progress');
        const doneTasks = tasksSummary.filter(t => t.status === 'done');

        return JSON.stringify({
          feature: {
            name: feature,
            status: info.status,
            ticket: info.ticket || null,
            createdAt: info.createdAt,
          },
          plan: {
            exists: !!plan,
            status: info.planStatus || 'none',
            approved: info.planStatus === 'approved' || info.planStatus === 'locked',
          },
          tasks: {
            total: tasks.length,
            pending: pendingTasks.length,
            inProgress: inProgressTasks.length,
            done: doneTasks.length,
            list: tasksSummary,
          },
          context: {
            fileCount: contextFiles.length,
            files: contextSummary,
          },
          nextAction: getNextAction(info.planStatus, tasksSummary),
        });
      },
    },
  ];
}

function getNextAction(planStatus: string | null, tasks: Array<{ status: string; folder: string }>): string {
  if (!planStatus || planStatus === 'draft') {
    return 'Write or revise plan with hive_plan_write, then get approval';
  }
  if (planStatus === 'review') {
    return 'Wait for plan approval or revise based on comments';
  }
  if (tasks.length === 0) {
    return 'Generate tasks from plan with hive_tasks_sync';
  }
  const inProgress = tasks.find(t => t.status === 'in_progress');
  if (inProgress) {
    return `Continue work on task: ${inProgress.folder}`;
  }
  const pending = tasks.find(t => t.status === 'pending');
  if (pending) {
    return `Start next task with hive_exec_start: ${pending.folder}`;
  }
  return 'All tasks complete. Review and merge or complete feature.';
}
