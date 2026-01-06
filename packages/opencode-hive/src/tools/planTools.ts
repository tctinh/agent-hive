import { z } from 'zod';
import { PlanService } from '../services/planService.js';
import { FeatureService } from '../services/featureService.js';

export function createPlanTools(projectRoot: string) {
  const planService = new PlanService(projectRoot);
  const featureService = new FeatureService(projectRoot);

  return {
    hive_plan_write: {
      description: 'Write plan.md (clears existing comments)',
      parameters: z.object({
        content: z.string().describe('The markdown content for the plan'),
      }),
      execute: async ({ content }: { content: string }) => {
        const feature = featureService.getActive();
        if (!feature) {
          return { error: 'No active feature. Create one with hive_feature_create first.' };
        }

        const path = planService.write(feature, content);
        return { path, message: `Plan written to ${path}. Comments cleared for fresh review.` };
      },
    },

    hive_plan_read: {
      description: 'Read plan.md and user comments',
      parameters: z.object({}),
      execute: async () => {
        const feature = featureService.getActive();
        if (!feature) {
          return { error: 'No active feature.' };
        }

        const result = planService.read(feature);
        if (!result) {
          return { error: `No plan.md found for feature '${feature}'` };
        }

        return result;
      },
    },

    hive_plan_approve: {
      description: 'Approve plan for execution',
      parameters: z.object({}),
      execute: async () => {
        const feature = featureService.getActive();
        if (!feature) {
          return { error: 'No active feature.' };
        }

        const comments = planService.getComments(feature);
        if (comments.length > 0) {
          return { 
            error: `Cannot approve: ${comments.length} unresolved comment(s). Address comments and rewrite plan first.`,
            comments,
          };
        }

        planService.approve(feature);
        return { 
          approved: true, 
          message: 'Plan approved. Run hive_tasks_sync to generate tasks from the plan.',
        };
      },
    },
  };
}
