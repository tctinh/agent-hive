import * as vscode from 'vscode';
import { FeatureService, PlanService, TaskService, ContextService } from 'hive-core';
import type { ToolRegistration } from './base';

function getProjectRoot(): string {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    throw new Error('No workspace folder open');
  }
  return workspaceFolders[0].uri.fsPath;
}

interface SessionRefreshInput {
  feature?: string;
}

interface SessionRefreshResult {
  feature: string;
  phase: 'planning' | 'execution' | 'unknown';
  planSummary: string;
  tasks: { id: string; name: string; status: string; summary?: string }[];
  progress: { total: number; done: number; inProgress: number; pending: number };
  contextFiles: string[];
  warnings: string[];
  tips: string[];
}

export function getSessionTools(): ToolRegistration[] {
  return [
    {
      name: 'hiveSessionRefresh',
      displayName: 'Hive Session Refresh',
      modelDescription: 'Get current feature state to stay aligned. Returns plan summary, task progress, context files, and guidance. Call periodically during execution to check for user steering and prevent context drift.',
      inputSchema: {
        type: 'object',
        properties: {
          feature: {
            type: 'string',
            description: 'Feature name (optional, uses active feature if not specified)'
          }
        }
      },
      destructive: false,
      readOnly: true,
      invoke: async (input: SessionRefreshInput): Promise<string> => {
        const projectRoot = getProjectRoot();
        
        const featureService = new FeatureService(projectRoot);
        const planService = new PlanService(projectRoot);
        const taskService = new TaskService(projectRoot);
        const contextService = new ContextService(projectRoot);

        let featureName = input.feature;
        if (!featureName) {
          const active = featureService.getActive();
          if (!active) {
            return 'No active feature. Use hive_feature_create or specify a feature name.';
          }
          featureName = active.name;
        }

        const result: SessionRefreshResult = {
          feature: featureName,
          phase: 'unknown',
          planSummary: '',
          tasks: [],
          progress: { total: 0, done: 0, inProgress: 0, pending: 0 },
          contextFiles: [],
          warnings: [],
          tips: []
        };

        try {
          const planResult = planService.read(featureName);
          if (planResult.content) {
            const lines = planResult.content.split('\n').slice(0, 20);
            result.planSummary = lines.join('\n').substring(0, 500);
            if (planResult.content.length > 500) {
              result.planSummary += '\n... (truncated)';
            }
          }
          result.phase = planResult.status === 'approved' ? 'execution' : 'planning';
        } catch {
          result.warnings.push('Could not read plan');
        }

        try {
          const tasks = taskService.list(featureName);
          result.tasks = tasks.map(t => ({
            id: t.folder,
            name: t.name || t.folder,
            status: t.status,
            summary: t.description
          }));
          
          result.progress.total = tasks.length;
          result.progress.done = tasks.filter(t => t.status === 'done' || t.status === 'completed').length;
          result.progress.inProgress = tasks.filter(t => t.status === 'in_progress' || t.status === 'executing').length;
          result.progress.pending = tasks.filter(t => t.status === 'pending').length;
        } catch {
          result.warnings.push('Could not read tasks');
        }

        try {
          const contexts = contextService.list(featureName);
          result.contextFiles = contexts.map(c => c.name);
        } catch {
          result.warnings.push('Could not read context files');
        }

        if (result.contextFiles.length === 0 && result.phase === 'planning') {
          result.warnings.push('No context files created! Document research, patterns, and decisions using hive_context_write.');
        }

        if (result.phase === 'execution') {
          result.tips.push('Check for user steering comments periodically.');
        } else {
          result.tips.push('Create context files to document findings for workers.');
          result.tips.push('Read existing context before modifying the plan.');
        }

        let output = `# Session Refresh: ${result.feature}\n\n`;
        output += `**Phase:** ${result.phase}\n`;
        output += `**Progress:** ${result.progress.done}/${result.progress.total} tasks done`;
        if (result.progress.inProgress > 0) {
          output += ` (${result.progress.inProgress} in progress)`;
        }
        output += '\n\n';

        if (result.planSummary) {
          output += `## Plan Summary\n\`\`\`\n${result.planSummary}\n\`\`\`\n\n`;
        }

        if (result.tasks.length > 0) {
          output += `## Tasks\n`;
          for (const task of result.tasks) {
            const icon = task.status === 'done' || task.status === 'completed' ? '✓' :
                        task.status === 'in_progress' || task.status === 'executing' ? '→' : '○';
            output += `${icon} ${task.id}: ${task.name} [${task.status}]\n`;
          }
          output += '\n';
        }

        if (result.contextFiles.length > 0) {
          output += `## Context Files\n`;
          for (const file of result.contextFiles) {
            output += `- ${file}\n`;
          }
          output += '\n';
        }

        if (result.warnings.length > 0) {
          output += `## Warnings\n`;
          for (const warning of result.warnings) {
            output += `⚠️ ${warning}\n`;
          }
          output += '\n';
        }

        if (result.tips.length > 0) {
          output += `## Tips\n`;
          for (const tip of result.tips) {
            output += `💡 ${tip}\n`;
          }
        }

        return output;
      }
    }
  ];
}
