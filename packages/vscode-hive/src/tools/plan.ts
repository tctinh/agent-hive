import { PlanService } from 'hive-core';
import type { ToolRegistration } from './base';

export function getPlanTools(workspaceRoot: string): ToolRegistration[] {
  const planService = new PlanService(workspaceRoot);

  return [
    {
      name: 'hive_plan_write',
      displayName: 'Write Hive Plan',
      modelDescription: 'Write or update the plan.md for a feature. The plan defines tasks to execute. Use markdown with ### numbered headers for tasks. Clears existing comments when plan is rewritten.',
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
          message: `Plan written. User can review and add comments. When ready, use hive_plan_approve.`,
        });
      },
    },
    {
      name: 'hive_plan_read',
      displayName: 'Read Hive Plan',
      modelDescription: 'Read the plan.md and any user comments for a feature. Use to check plan content, status, and user feedback before making changes.',
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
    },
    {
      name: 'hive_plan_approve',
      displayName: 'Approve Hive Plan',
      modelDescription: 'Approve a plan for execution. Use after user has reviewed the plan and resolved any comments. Changes feature status to approved.',
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
        planService.approve(feature);
        return JSON.stringify({
          success: true,
          message: `Plan approved. Use hive_tasks_sync to generate tasks from the plan.`,
        });
      },
    },
  ];
}
