/**
 * hive_init — Feature lifecycle gate.
 * Creates .hive/features/<name>/, sets active feature, scaffolds structure.
 */
import type { ToolDefinition } from '../server.js';
import { getServices } from '../services.js';

export const initTools: ToolDefinition[] = [
  {
    name: 'hive_init',
    description:
      'Initialize a new Hive feature. Creates the .hive/features/<name>/ directory structure, ' +
      'sets it as the active feature, and returns guidance for the discovery phase. ' +
      'This is the entry point for the plan-first workflow.',
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
        '## Discovery Phase Required',
        '',
        'Before writing a plan, complete discovery:',
        '',
        '1. **Ask questions** — one at a time, understand the user\'s intent',
        '2. **Research the codebase** — Read/Grep/Glob to understand current state',
        '3. **Document findings** — your plan must include a `## Discovery` section',
        '',
        'The `## Discovery` section must contain:',
        '- Original request summary',
        '- Interview Q&A (questions asked and answers received)',
        '- Research findings with file:line references',
        '',
        'When ready, call `hive_plan_save` with the full plan.',
      ].join('\n');
    },
  },
];
