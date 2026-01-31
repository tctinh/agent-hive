import { FeatureService, TaskService, PlanService, ContextService, buildEffectiveDependencies, computeRunnableAndBlocked } from 'hive-core';
import type { TaskWithDeps } from 'hive-core';
import type { ToolRegistration } from './base';

export function getStatusTools(workspaceRoot: string): ToolRegistration[] {
  const featureService = new FeatureService(workspaceRoot);
  const taskService = new TaskService(workspaceRoot);
  const planService = new PlanService(workspaceRoot);
  const contextService = new ContextService(workspaceRoot);

  const invokeStatus = async (input: unknown) => {
    const { feature: explicitFeature } = input as { feature?: string };

    const feature = explicitFeature || featureService.getActive()?.name;
    if (!feature) {
      return JSON.stringify({
        error: 'No feature specified and no active feature found',
        hint: 'Use hive_feature_create to create a new feature',
      });
    }

    const featureData = featureService.get(feature);
    if (!featureData) {
      return JSON.stringify({
        error: `Feature '${feature}' not found`,
        availableFeatures: featureService.list(),
      });
    }

    const plan = planService.read(feature);
    const tasks = taskService.list(feature);
    const contextFiles = contextService.list(feature);

    // Build task summaries with dependency info from raw status
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

    // Compute runnable and blocked tasks for orchestrators (apply legacy fallback)
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
        exists: !!plan,
        status: planStatus,
        approved: planStatus === 'approved' || planStatus === 'locked',
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
      nextAction: getNextAction(planStatus, tasksSummary, runnable),
    });
  };

  const baseStatusTool: Omit<ToolRegistration, 'name'> = {
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
    invoke: invokeStatus,
  };

  return [
    {
      name: 'hive_status',
      ...baseStatusTool,
    },
    {
      name: 'hiveStatus',
      ...baseStatusTool,
    },
  ];
}

function getNextAction(planStatus: string | null, tasks: Array<{ status: string; folder: string }>, runnable: string[]): string {
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
  // Use runnable list to suggest tasks that can actually start
  if (runnable.length > 1) {
    return `${runnable.length} tasks are ready to start in parallel: ${runnable.join(', ')}`;
  }
  if (runnable.length === 1) {
    return `Start next task with hive_exec_start: ${runnable[0]}`;
  }
  const pending = tasks.find(t => t.status === 'pending');
  if (pending) {
    return `Pending tasks exist but are blocked by dependencies. Check blockedBy for details.`;
  }
  return 'All tasks complete. Review and merge or complete feature.';
}
