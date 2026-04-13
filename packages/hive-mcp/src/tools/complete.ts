/**
 * hive_complete — Feature lifecycle end gate.
 * GATE: All tasks must be done.
 */
import type { ToolDefinition } from '../server.js';
import { getServices, resolveFeature } from '../services.js';

export const completeTools: ToolDefinition[] = [
  {
    name: 'hive_complete',
    description:
      'Mark a feature as complete. GATE: All tasks must be in "done" status. ' +
      'Transitions the feature to completed state.',
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
        return JSON.stringify({ success: false, error: 'No active feature.' });
      }

      const tasks = services.taskService.list(feature);
      const notDone = tasks.filter((t) => t.status !== 'done');

      if (notDone.length > 0) {
        return JSON.stringify({
          success: false,
          error: `Cannot complete — ${notDone.length} task(s) not done.`,
          notDone: notDone.map((t) => ({
            folder: t.folder,
            status: t.status,
          })),
        });
      }

      services.featureService.complete(feature);

      return JSON.stringify({
        success: true,
        feature,
        message: `Feature "${feature}" marked complete.`,
      });
    },
  },
];
