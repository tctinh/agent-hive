/**
 * hive_plan_save — Discovery gate (P7).
 * hive_plan_approve — State transition gate.
 */
import type { ToolDefinition } from '../server.js';
import { getServices, resolveFeature } from '../services.js';

const DISCOVERY_HEADING = /^##\s+discovery/im;
const NEXT_HEADING = /^##\s+/m;

function extractDiscoveryContent(plan: string): string | null {
  const match = DISCOVERY_HEADING.exec(plan);
  if (!match) return null;

  const afterHeading = plan.slice(match.index + match[0].length);
  const nextSection = NEXT_HEADING.exec(afterHeading);
  const content = nextSection
    ? afterHeading.slice(0, nextSection.index)
    : afterHeading;

  return content.trim();
}

export const planTools: ToolDefinition[] = [
  {
    name: 'hive_plan_save',
    description:
      'Write or update the feature plan. GATE: Rejects if the plan lacks a substantive ' +
      '## Discovery section (must be ≥100 chars with Q&A and research findings). ' +
      'This enforces the plan-first workflow — no planning without discovery.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Full plan markdown content. Must include a ## Discovery section.',
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
        return 'Error: No active feature. Call hive_init first.';
      }

      // P7 Hard Gate: Discovery section required
      const discoveryContent = extractDiscoveryContent(content);
      if (discoveryContent === null) {
        return [
          'BLOCKED: Plan must include a ## Discovery section.',
          '',
          'The Discovery section documents your research before planning:',
          '- Original request summary',
          '- Interview Q&A with the user',
          '- Research findings with file:line references',
          '',
          'Add ## Discovery to your plan and try again.',
        ].join('\n');
      }

      if (discoveryContent.length < 100) {
        return [
          `BLOCKED: Discovery section too thin (${discoveryContent.length} chars, minimum 100).`,
          '',
          'A substantive Discovery section must include:',
          '- Original request summary',
          '- Interview Q&A (questions asked and answers received)',
          '- Research findings with file:line references',
          '',
          'Flesh out your discovery and try again.',
        ].join('\n');
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
        return 'Error: No active feature. Call hive_init first.';
      }

      const info = services.featureService.getInfo(feature);
      if (!info) {
        return `Error: Feature "${feature}" not found.`;
      }

      if (!info.hasPlan) {
        return 'Error: No plan exists. Call hive_plan_save first.';
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
