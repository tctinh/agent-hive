import * as vscode from 'vscode';
import { FeatureService } from 'hive-core';
import type { ToolRegistration } from './base';
import { defineTool } from './base';

export function getFeatureTools(workspaceRoot: string): ToolRegistration[] {
  const featureService = new FeatureService(workspaceRoot);

  return [
    defineTool({
      name: 'hive_feature_create',
      toolReferenceName: 'hiveFeatureCreate',
      displayName: 'Create Hive Feature',
      modelDescription: 'Create a new Hive feature for plan-first development. Use at the start of any new work to establish a planning workspace with plan.md and task tracking.',
      userDescription: 'Create a new Hive feature and initialize its planning workspace.',
      canBeReferencedInPrompt: true,
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Feature name (kebab-case recommended)',
          },
          ticket: {
            type: 'string',
            description: 'Optional ticket/issue reference',
          },
        },
        required: ['name'],
      },
      invoke: async (input) => {
        const { name, ticket } = input as { name: string; ticket?: string };
        const feature = featureService.create(name, ticket);
        return JSON.stringify({
          success: true,
          feature: feature.name,
          status: feature.status,
          message: `Feature '${name}' created. Next: write a plan with hive_plan_write.`,
        });
      },
    }),
    defineTool({
      name: 'hive_feature_complete',
      toolReferenceName: 'hiveFeatureComplete',
      displayName: 'Complete Hive Feature',
      modelDescription: 'Mark a feature as completed. Use when all tasks are done and the feature is ready for final integration. This is irreversible.',
      userDescription: 'Mark a Hive feature as completed.',
      canBeReferencedInPrompt: true,
      destructive: true,
      confirmation: {
        title: 'Complete Hive feature',
        message: 'Mark this Hive feature as completed? This is intended for final wrap-up after all task work is done.',
        invocationMessage: 'Completing Hive feature',
      },
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Feature name to mark as completed',
          },
        },
        required: ['name'],
      },
      invoke: async (input) => {
        const { name } = input as { name: string };
        const feature = featureService.complete(name);
        return JSON.stringify({
          success: true,
          feature: feature.name,
          status: feature.status,
          completedAt: feature.completedAt,
        });
      },
    }),
  ];
}
