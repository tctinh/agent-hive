import { PlanService, ContextService } from 'hive-core';
import type { ToolRegistration } from './base';

export function getPlanTools(workspaceRoot: string): ToolRegistration[] {
  const planService = new PlanService(workspaceRoot);
  const contextService = new ContextService(workspaceRoot);

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
        
        let contextWarning = '';
        try {
          const contexts = contextService.list(feature);
          if (contexts.length === 0) {
            contextWarning = '\n\n⚠️ WARNING: No context files created yet! Workers need context to execute well. Use hive_context_write to document:\n- Research findings and patterns\n- User preferences and decisions\n- Architecture constraints\n- References to existing code';
          }
        } catch {
          contextWarning = '\n\n⚠️ WARNING: Could not check context files. Consider using hive_context_write to document findings for workers.';
        }
        
        return JSON.stringify({
          success: true,
          path: planPath,
          message: `Plan written. User can review and add comments. When ready, use hive_plan_approve.${contextWarning}`,
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
        
        let contextWarning = '';
        try {
          const contexts = contextService.list(feature);
          if (contexts.length === 0) {
            contextWarning = '\n\n⚠️ Note: No context files found. Consider using hive_context_write during execution to document findings for future reference.';
          }
        } catch { /* continue without warning */ }
        
        planService.approve(feature);
        return JSON.stringify({
          success: true,
          message: `Plan approved. Use hive_tasks_sync to generate tasks from the plan.${contextWarning}`,
        });
      },
    },
  ];
}
