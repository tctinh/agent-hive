import * as vscode from 'vscode';
import { FeatureService } from 'hive-core';
import type { ToolRegistration } from './base';

export function getFeatureTools(workspaceRoot: string): ToolRegistration[] {
  const featureService = new FeatureService(workspaceRoot);

  return [
    {
      name: 'hive_feature_create',
      displayName: 'Create Hive Feature',
      modelDescription: 'Create a new Hive feature for plan-first development. Use at the start of any new work to establish a planning workspace with context, plan, and task tracking.',
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
    },
    {
      name: 'hive_feature_list',
      displayName: 'List Hive Features',
      modelDescription: 'List all Hive features in the workspace with their status. Use to see available features before switching context or checking progress.',
      readOnly: true,
      inputSchema: {
        type: 'object',
        properties: {},
      },
      invoke: async () => {
        const names = featureService.list();
        const features = names.map(name => {
          const info = featureService.getInfo(name);
          return {
            name,
            status: info?.status || 'unknown',
            taskCount: info?.tasks.length || 0,
            hasPlan: info?.hasPlan || false,
          };
        });
        return JSON.stringify({ features });
      },
    },
    {
      name: 'hive_feature_complete',
      displayName: 'Complete Hive Feature',
      modelDescription: 'Mark a feature as completed. Use when all tasks are done and the feature is ready for final integration. This is irreversible.',
      destructive: true,
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
    },
  ];
}
