/**
 * hive_tasks_sync — Plan approval gate (P7).
 * Parses approved plan → task DAG with dependencies and batch ordering.
 */
import type { ToolDefinition } from '../server.js';
import {
  getServices,
  resolveFeature,
  buildEffectiveDependencies,
  computeRunnableAndBlocked,
} from '../services.js';

export const tasksTools: ToolDefinition[] = [
  {
    name: 'hive_tasks_sync',
    description:
      'Generate task DAG from the approved plan. GATE: Plan must be approved first. ' +
      'Parses plan.md for task definitions, resolves dependencies, computes batch ordering. ' +
      'Returns the task list with dependency graph and which tasks are immediately runnable.',
    inputSchema: {
      type: 'object',
      properties: {
        feature: {
          type: 'string',
          description: 'Feature name. Defaults to active feature.',
        },
        refreshPending: {
          type: 'boolean',
          description:
            'When true, refresh pending tasks from current plan. Deleted pending tasks are removed.',
        },
      },
    },
    handler: async (args) => {
      const services = getServices();
      const feature = resolveFeature(services, args.feature as string | undefined);
      const refreshPending = args.refreshPending as boolean | undefined;

      if (!feature) {
        return 'Error: No active feature. Call hive_feature_create first.';
      }

      // P7 Gate: Plan must be approved
      if (!services.planService.isApproved(feature)) {
        return 'Error: Plan must be approved first. Call hive_plan_approve.';
      }

      const featureData = services.featureService.get(feature);
      if (featureData?.status === 'approved') {
        services.featureService.updateStatus(feature, 'executing');
      }

      const result = services.taskService.sync(feature, { refreshPending });
      const tasks = services.taskService.list(feature);

      // Compute runnable tasks from dependency graph
      const tasksWithDeps = tasks.map((t) => {
        const raw = services.taskService.getRawStatus(feature, t.folder);
        return {
          folder: t.folder,
          name: t.name,
          status: t.status,
          dependsOn: raw?.dependsOn ?? [],
        };
      });

      const normalized = buildEffectiveDependencies(
        tasksWithDeps.map((t) => ({
          folder: t.folder,
          status: t.status,
          dependsOn: t.dependsOn,
        })),
      );

      const { runnable, blockedBy } = computeRunnableAndBlocked(normalized);

      const taskList = tasksWithDeps.map((t) => ({
        folder: t.folder,
        name: t.name,
        status: t.status,
        dependsOn: t.dependsOn.length > 0 ? t.dependsOn : undefined,
        runnable: runnable.includes(t.folder),
        blockedBy: blockedBy[t.folder] ?? undefined,
      }));

      return JSON.stringify(
        {
          synced: {
            created: result.created,
            removed: result.removed,
            kept: result.kept,
            manual: result.manual,
          },
          tasks: taskList,
          runnable,
          totalTasks: tasks.length,
          nextAction:
            runnable.length > 0
              ? `${runnable.length} task(s) ready to start: ${runnable.join(', ')}. Spawn Forager agents for each.`
              : 'No tasks are currently runnable. Check dependency graph.',
        },
        null,
        2,
      );
    },
  },
];
