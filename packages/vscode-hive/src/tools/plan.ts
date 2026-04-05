import { FeatureService, PlanService, ContextService } from 'hive-core';
import type { ToolRegistration } from './base';

export function getPlanTools(workspaceRoot: string): ToolRegistration[] {
  const featureService = new FeatureService(workspaceRoot);
  const planService = new PlanService(workspaceRoot);
  const contextService = new ContextService(workspaceRoot);

  return [
    {
      name: 'hive_plan_write',
      displayName: 'Write Hive Plan',
      modelDescription: 'Write or update the plan.md for a feature. Review context/overview.md first as the human-facing summary/history surface on this branch, while plan.md remains execution truth. Include a concise design summary before ## Tasks, and optionally include a Mermaid dependency or sequence overview in that pre-task summary only. Use markdown with ### numbered headers for tasks. Clears existing plan review comments when plan is rewritten.',
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
            contextWarning += '\n\n⚠️ WARNING: No context files created yet. If workers will need durable notes, use hive_context_write to document research findings, user decisions, architecture constraints, or references to existing code.';
          }
        } catch {
          contextWarning = '\n\n⚠️ WARNING: Could not check context files. If needed, use hive_context_write to document durable findings for workers.';
        }
        
        return JSON.stringify({
          success: true,
          path: planPath,
          message: `Plan written. Review context/overview.md first as the human-facing summary/history surface; plan.md remains execution truth. When ready, use hive_plan_approve.${contextWarning}`,
        });
      },
    },
    {
      name: 'hive_plan_read',
      displayName: 'Read Hive Plan',
      modelDescription: 'Read the plan.md and related review comments for a feature. Use to inspect the plan.md execution contract, task structure, status, and review feedback while keeping context/overview.md as the human-facing summary/history surface on this branch.',
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
      modelDescription: 'Approve a plan for execution. Use after reviewers have checked context/overview.md first, confirmed plan.md as the execution contract, and resolved any comments. Changes feature status to approved.',
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
        let contexts: Array<{ name: string }> = [];
        
        let contextWarning = '';
        try {
          contexts = contextService.list(feature);
          if (contexts.length === 0) {
            contextWarning += '\n\n⚠️ Note: No context files found. Consider using hive_context_write during execution to document findings for future reference.';
          }
        } catch { /* continue without warning */ }
        
        try {
          planService.approve(feature);
        } catch (error) {
          if (error instanceof Error && /unresolved review comments/i.test(error.message)) {
            const hasOverview = contexts.some(context => context.name === 'overview');
            const reviewCounts = featureService.getInfo(feature)?.reviewCounts ?? { plan: 0, overview: 0 };
            const planComments = reviewCounts.plan;
            const overviewComments = hasOverview ? reviewCounts.overview : 0;
            const unresolvedTotal = planComments + overviewComments;
            const documents = [
              planComments > 0 ? `plan (${planComments})` : null,
              overviewComments > 0 ? `overview (${overviewComments})` : null,
            ].filter(Boolean).join(', ');

            return JSON.stringify({
              success: false,
              message: `Cannot approve - ${unresolvedTotal} unresolved review comment(s) remain across ${documents}. Address them first.`,
            });
          }

          throw error;
        }
        return JSON.stringify({
          success: true,
          message: `Plan approved. Use hive_tasks_sync to generate tasks from plan.md as the execution contract. Refresh context/overview.md if the human-facing summary/history should change.${contextWarning}`,
        });
      },
    },
  ];
}
