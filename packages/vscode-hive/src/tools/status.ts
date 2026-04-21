import { FeatureService, TaskService, ContextService, buildEffectiveDependencies, computeRunnableAndBlocked } from 'hive-core';
import type { TaskWithDeps } from 'hive-core';
import type { ToolRegistration } from './base';
import { defineTool } from './base';

export function getStatusTools(workspaceRoot: string): ToolRegistration[] {
  const featureService = new FeatureService(workspaceRoot);
  const taskService = new TaskService(workspaceRoot);
  const contextService = new ContextService(workspaceRoot);

  const invokeStatus = async (input: unknown) => {
    const { feature: explicitFeature } = input as { feature?: string };

    const feature = explicitFeature || featureService.getActive()?.name;
    if (!feature) {
      return JSON.stringify({
        success: false,
        terminal: true,
        reason: 'feature_required',
        error: 'No feature specified and no active feature found',
        hint: 'Use hive_feature_create to create a new feature',
      });
    }

    const featureData = featureService.get(feature);
    if (!featureData) {
      return JSON.stringify({
        success: false,
        terminal: true,
        reason: 'feature_not_found',
        error: `Feature '${feature}' not found`,
        availableFeatures: featureService.list(),
      });
    }

    const featureInfo = featureService.getInfo(feature);
    const tasks = taskService.list(feature);
    const contextFiles = contextService.list(feature);
    const reviewCounts = featureInfo?.reviewCounts ?? { plan: 0 };
    const hasPlan = featureInfo?.hasPlan ?? false;

    const tasksSummary = tasks.map(t => {
      const rawStatus = taskService.getRawStatus(feature, t.folder);
      return {
        folder: t.folder,
        name: t.folder.replace(/^\d+-/, ''),
        status: t.status,
        summary: t.summary || null,
        origin: t.origin,
        dependsOn: rawStatus?.dependsOn ?? null,
      };
    });

    const tasksWithDeps: TaskWithDeps[] = tasksSummary.map(t => ({
      folder: t.folder,
      status: t.status,
      dependsOn: t.dependsOn ?? undefined,
    }));
    const effectiveDeps = buildEffectiveDependencies(tasksWithDeps);
    const normalizedTasks: TaskWithDeps[] = tasksWithDeps.map(task => ({
      ...task,
      dependsOn: effectiveDeps.get(task.folder),
    }));
    const { runnable, blocked } = computeRunnableAndBlocked(normalizedTasks);

    const contextSummary = contextFiles.map(c => ({
      name: c.name,
      chars: c.content.length,
      updatedAt: c.updatedAt,
      role: c.role,
      includeInExecution: c.includeInExecution,
      includeInAgentsMdSync: c.includeInAgentsMdSync,
    }));

    const pendingTasks = tasksSummary.filter(t => t.status === 'pending');
    const inProgressTasks = tasksSummary.filter(t => t.status === 'in_progress');
    const doneTasks = tasksSummary.filter(t => t.status === 'done');

    const planStatus = featureData.status === 'planning' ? 'draft' :
      featureData.status === 'approved' ? 'approved' :
        featureData.status === 'executing' ? 'locked' : 'none';

    return JSON.stringify({
      feature: {
        name: feature,
        status: featureData.status,
        ticket: featureData.ticket || null,
        createdAt: featureData.createdAt,
      },
      plan: {
        exists: hasPlan,
        status: planStatus,
        approved: planStatus === 'approved' || planStatus === 'locked',
        reviewDocument: 'plan.md is the only required review document',
      },
      review: {
        unresolvedTotal: reviewCounts.plan,
        byDocument: {
          plan: reviewCounts.plan,
        },
      },
      tasks: {
        total: tasks.length,
        pending: pendingTasks.length,
        inProgress: inProgressTasks.length,
        done: doneTasks.length,
        list: tasksSummary,
        runnable,
        blockedBy: blocked,
      },
      context: {
        fileCount: contextFiles.length,
        files: contextSummary,
      },
      nextAction: getNextAction(planStatus, tasksSummary, runnable, hasPlan),
    });
  };

  const baseStatusTool: Omit<ToolRegistration, 'name' | 'toolReferenceName'> = {
    displayName: 'Get Hive Status',
    modelDescription: 'Get comprehensive status of a feature including plan.md, tasks, and context. plan.md is the only required review document. Returns JSON with all relevant state for resuming work.',
    userDescription: 'Get comprehensive Hive feature status.',
    canBeReferencedInPrompt: true,
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
    invoke: invokeStatus,
  };

  return [
    defineTool({
      name: 'hive_status',
      toolReferenceName: 'hiveStatus',
      ...baseStatusTool,
    }),
    defineTool({
      name: 'hiveStatus',
      toolReferenceName: 'hiveStatus',
      ...baseStatusTool,
    }),
  ];
}

function getNextAction(
  planStatus: string | null,
  tasks: Array<{ status: string; folder: string }>,
  runnable: string[],
  hasPlan: boolean,
): string {
  if (planStatus === 'review') {
    return 'Wait for plan approval or revise based on comments';
  }
  if (!hasPlan || planStatus === 'draft') {
    return 'Write or revise plan with hive_plan_write. plan.md is the only required review document and execution contract. Keep an overview/design summary before ## Tasks.';
  }
  if (tasks.length === 0) {
    return 'Generate tasks from plan with hive_tasks_sync';
  }
  const inProgress = tasks.find(t => t.status === 'in_progress');
  if (inProgress) {
    return `Continue direct @forager execution on task: ${inProgress.folder}. Use hive_task_update to record progress.`;
  }
  if (runnable.length > 1) {
    return `${runnable.length} tasks are ready for direct @forager delegation in parallel: ${runnable.join(', ')}. Use hive_task_update to record progress.`;
  }
  if (runnable.length === 1) {
    return `Delegate next runnable task directly to @forager: ${runnable[0]}. Use hive_task_update to record progress or completion.`;
  }
  const pending = tasks.find(t => t.status === 'pending');
  if (pending) {
    return `Pending tasks exist but are blocked by dependencies. Check blockedBy for details.`;
  }
  return 'All tasks complete. Review plan.md and complete the feature when ready.';
}
