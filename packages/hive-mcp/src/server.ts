import { initTools } from './tools/init.js';
import { planTools } from './tools/plan.js';
import { tasksTools } from './tools/tasks.js';
import { statusTools } from './tools/status.js';
import { mergeTools } from './tools/merge.js';
import { completeTools } from './tools/complete.js';
import { worktreeTools } from './tools/worktree.js';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (args: Record<string, unknown>) => Promise<string>;
}

export function getAllTools(): ToolDefinition[] {
  return [
    ...initTools,
    ...planTools,
    ...tasksTools,
    ...statusTools,
    ...mergeTools,
    ...completeTools,
    ...worktreeTools,
  ];
}
