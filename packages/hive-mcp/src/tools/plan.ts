/**
 * hive_plan_write — Plan authoring.
 * hive_plan_approve — State transition gate.
 */
import type { ToolDefinition } from '../server.js';
import { getServices, resolveFeature } from '../services.js';

export const planTools: ToolDefinition[] = [
  {
    name: 'hive_plan_write',
    description:
      'Write or update the feature plan. The plan should remain the single execution ' +
      'contract for the feature and include a concise overview before the task list.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Full plan markdown content. For substantial changes, include discovery notes and a concise overview before the task list.',
        },
        feature: {
          type: 'string',
          description: 'Feature name. Defaults to active feature.',
        },
      },
      required: ['content'],
    },
    handler: async (args) => {
      const content = args.content as string;
      const { planService } = getServices();
      const services = getServices();
      const feature = resolveFeature(services, args.feature as string | undefined);

      if (!feature) {
        return 'Error: No active feature. Call hive_feature_create first.';
      }

      const planPath = planService.write(feature, content);
      return `Plan written to ${planPath}. Ready for review — call hive_plan_approve when the user approves.`;
    },
  },

  {
    name: 'hive_plan_approve',
    description:
      'Mark the feature plan as approved. GATE: Plan must exist and have no unresolved ' +
      'review comments. This transitions the feature to execution-ready state.',
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
        return 'Error: No active feature. Call hive_feature_create first.';
      }

      const info = services.featureService.getInfo(feature);
      if (!info) {
        return `Error: Feature "${feature}" not found.`;
      }

      if (!info.hasPlan) {
        return 'Error: No plan exists. Call hive_plan_write first.';
      }

      // Gate: check for unresolved review comments
      const unresolvedTotal =
        (info.reviewCounts?.plan ?? 0) + (info.reviewCounts?.overview ?? 0);
      if (unresolvedTotal > 0) {
        return `Cannot approve — ${unresolvedTotal} unresolved review comment(s) remain. Address them first.`;
      }

      services.planService.approve(feature);
      return 'Plan approved. Call hive_tasks_sync to generate the task DAG.';
    },
  },
];
