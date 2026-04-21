import { PlanService } from 'hive-core';
import type { ToolRegistration } from './base';
import { defineTool } from './base';

export function getPlanTools(workspaceRoot: string): ToolRegistration[] {
  const planService = new PlanService(workspaceRoot);

  return [
    defineTool({
      name: 'hive_plan_write',
      toolReferenceName: 'hivePlanWrite',
      displayName: 'Write Hive Plan',
      modelDescription: 'Write or update the plan.md for a feature. plan.md is the only required human-review and execution document. Include a concise overview/design summary before ## Tasks, and optionally include a Mermaid dependency or sequence overview in that pre-task summary only. Use markdown with ### numbered headers for tasks. Clears existing plan review comments when plan is rewritten.',
      userDescription: 'Write or rewrite a feature plan.md file.',
      canBeReferencedInPrompt: true,
      inputSchema: {
        type: 'object',
        properties: {
          feature: {
            type: 'string',
            description: 'Feature name',
          },
          content: {
            type: 'string',
            description: 'Plan content in markdown. Use ### 1. Task Name format for tasks.',
          },
        },
        required: ['feature', 'content'],
      },
      invoke: async (input) => {
        const { feature, content } = input as { feature: string; content: string };
        const planPath = planService.write(feature, content);

        return JSON.stringify({
          success: true,
          path: planPath,
          message: 'Plan written. plan.md is the only required review document and execution contract. Keep an overview/design summary before ## Tasks. When ready, use hive_plan_approve.',
        });
      },
    }),
    defineTool({
      name: 'hive_plan_read',
      toolReferenceName: 'hivePlanRead',
      displayName: 'Read Hive Plan',
      modelDescription: 'Read the plan.md and related review comments for a feature. Use to inspect the single execution contract, task structure, status, and review feedback in the only required review document.',
      userDescription: 'Read a feature plan and its review comments.',
      canBeReferencedInPrompt: true,
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {
          feature: {
            type: 'string',
            description: 'Feature name',
          },
        },
        required: ['feature'],
      },
      invoke: async (input) => {
        const { feature } = input as { feature: string };
        const result = planService.read(feature);
        if (!result) {
          return JSON.stringify({ error: `No plan found for feature '${feature}'` });
        }
        return JSON.stringify({
          content: result.content,
          status: result.status,
          comments: result.comments,
          commentCount: result.comments.length,
        });
      },
    }),
    defineTool({
      name: 'hive_plan_approve',
      toolReferenceName: 'hivePlanApprove',
      displayName: 'Approve Hive Plan',
      modelDescription: 'Approve a plan for execution. Use after reviewers have checked plan.md as the only required review document and resolved any plan comments. Changes feature status to approved.',
      userDescription: 'Approve a Hive feature plan for execution.',
      canBeReferencedInPrompt: true,
      inputSchema: {
        type: 'object',
        properties: {
          feature: {
            type: 'string',
            description: 'Feature name',
          },
        },
        required: ['feature'],
      },
      invoke: async (input) => {
        const { feature } = input as { feature: string };
        try {
          planService.approve(feature);
        } catch (error) {
          if (error instanceof Error && /unresolved review comments/i.test(error.message)) {
            const unresolvedTotal = planService.read(feature)?.comments.length ?? 0;

            return JSON.stringify({
              success: false,
              message: `Cannot approve - ${unresolvedTotal} unresolved plan review comment(s) remain. Address them first.`,
            });
          }

          throw error;
        }
        return JSON.stringify({
          success: true,
          message: 'Plan approved. plan.md is the only required review document. Use hive_tasks_sync to generate tasks from the execution contract.',
        });
      },
    }),
  ];
}
