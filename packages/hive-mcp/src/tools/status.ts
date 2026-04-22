/**
 * hive_status — Feature/task dashboard.
 * Aggregates status from .hive/ state, computes runnable tasks, blocker summary.
 */
import type { ToolDefinition } from '../server.js';
import {
  getServices,
  resolveFeature,
  buildEffectiveDependencies,
  computeRunnableAndBlocked,
} from '../services.js';

export const statusTools: ToolDefinition[] = [
  {
    name: 'hive_status',
    description:
      'Get comprehensive feature status dashboard. Returns feature state, plan status, ' +
      'task DAG with dependency resolution, runnable tasks, context files, and computed ' +
      'next action guidance. Use this to understand current state and decide what to do next.',
    inputSchema: {
      type: 'object',
      properties: {
        feature: {
          type: 'string',
          description: 'Feature name. Defaults to active feature.',
        },
      },
    },
    handler: async (args) => {
      const services = getServices();
      const feature = resolveFeature(services, args.feature as string | undefined);

      if (!feature) {
        const available = services.featureService.list();
        return JSON.stringify({
          success: false,
          error: 'No active feature.',
          availableFeatures: available,
          nextAction: available.length > 0
            ? `Set an active feature or call hive_feature_create to create one.`
            : 'Call hive_feature_create to create a feature.',
        });
      }

      const featureData = services.featureService.get(feature);
      if (!featureData) {
        return JSON.stringify({
          success: false,
          error: `Feature "${feature}" not found.`,
          availableFeatures: services.featureService.list(),
        });
      }

      const plan = services.planService.read(feature);
      const tasks = services.taskService.list(feature);
      const contextFiles = services.contextService.list(feature);

      // Build dependency graph
      const tasksWithDeps = tasks.map((t) => {
        const raw = services.taskService.getRawStatus(feature, t.folder);
        return {
          folder: t.folder,
          name: t.name,
          status: t.status,
          origin: t.origin,
          summary: t.summary,
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

      const pending = tasks.filter((t) => t.status === 'pending').length;
      const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
      const done = tasks.filter((t) => t.status === 'done').length;
      const blocked = tasks.filter((t) => t.status === 'blocked').length;
      const failed = tasks.filter((t) => t.status === 'failed').length;

      // Compute next action
      let nextAction: string;
      if (featureData.status === 'planning') {
        if (!plan) {
          nextAction = 'Write or revise a plan with hive_plan_write.';
        } else if (!services.planService.isApproved(feature)) {
          nextAction = 'Plan exists but not approved. Present to user for approval, then call hive_plan_approve.';
        } else {
          nextAction = 'Plan approved. Call hive_tasks_sync to generate task DAG.';
        }
      } else if (tasks.length === 0) {
        nextAction = 'Call hive_tasks_sync to generate tasks from the approved plan.';
      } else if (runnable.length > 1) {
        nextAction = `${runnable.length} tasks ready for parallel dispatch: ${runnable.join(', ')}. Spawn Forager agents.`;
      } else if (runnable.length === 1) {
        nextAction = `Next task ready: ${runnable[0]}. Spawn a Forager agent.`;
      } else if (inProgress > 0) {
        nextAction = `${inProgress} task(s) in progress. Wait for Forager completion.`;
      } else if (pending > 0) {
        nextAction = 'Pending tasks exist but are blocked by dependencies. Check blockedBy map.';
      } else if (done === tasks.length) {
        nextAction = 'All tasks complete. Run batch verification (build+test), then call hive_feature_complete.';
      } else {
        nextAction = `Review status: ${done} done, ${blocked} blocked, ${failed} failed.`;
      }

      return JSON.stringify(
        {
          feature: {
            name: featureData.name,
            status: featureData.status,
            ticket: featureData.ticket ?? null,
          },
          plan: {
            exists: !!plan,
            approved: services.planService.isApproved(feature),
          },
          tasks: {
            total: tasks.length,
            pending,
            inProgress,
            done,
            blocked,
            failed,
            list: tasksWithDeps.map((t) => ({
              folder: t.folder,
              name: t.name,
              status: t.status,
              origin: t.origin,
              summary: t.summary ?? null,
              dependsOn: t.dependsOn.length > 0 ? t.dependsOn : null,
              blockedBy: blockedBy[t.folder] ?? null,
            })),
            runnable,
          },
          context: {
            fileCount: contextFiles.length,
            files: contextFiles.map((f) => ({
              name: f.name,
              chars: f.content.length,
              role: f.role,
            })),
          },
          nextAction,
        },
        null,
        2,
      );
    },
  },
];
