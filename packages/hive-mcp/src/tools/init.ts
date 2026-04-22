/**
 * hive_feature_create — Feature lifecycle start.
 * Creates .hive/features/<name>/, sets active feature, scaffolds structure.
 */
import type { ToolDefinition } from '../server.js';
import { getServices } from '../services.js';

export const initTools: ToolDefinition[] = [
  {
    name: 'hive_feature_create',
    description:
      'Create a new Hive feature. Creates the .hive/features/<name>/ directory structure, ' +
      'sets it as the active feature, and returns the next planning step.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Feature name (kebab-case recommended, e.g. "user-auth")',
        },
        ticket: {
          type: 'string',
          description: 'Optional ticket reference (e.g. "PROJ-123")',
        },
      },
      required: ['name'],
    },
    handler: async (args) => {
      const name = args.name as string;
      const ticket = args.ticket as string | undefined;
      const { featureService } = getServices();

      const feature = featureService.create(name, ticket);
      featureService.setActive(name);

      return [
        `Feature "${feature.name}" created and set as active.`,
        '',
        '## Next Step',
        '',
        'Do discovery before planning:',
        '',
        '1. **Ask questions** — one at a time, understand the user\'s intent',
        '2. **Research the codebase** — Read/Grep/Glob to understand current state',
        '3. **Document findings** — include discovery notes in the plan',
        '',
        'When ready, call `hive_plan_write` with the full plan.',
      ].join('\n');
    },
  },
];
