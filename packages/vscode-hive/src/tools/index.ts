import type { ToolRegistration } from './base';
import { toLanguageModelToolContribution } from './base';
import { getFeatureTools } from './feature';
import { getPlanTools } from './plan';
import { getStatusTools } from './status';
import { getTaskTools } from './task';

export { createToolResult, defineTool, toLanguageModelToolContribution } from './base';
export type { LanguageModelToolContribution, ToolConfirmation, ToolInput, ToolRegistration } from './base';
export { getFeatureTools } from './feature';
export { getPlanTools } from './plan';
export { getTaskTools } from './task';
export { getStatusTools } from './status';

export function getAllToolRegistrations(workspaceRoot: string): ToolRegistration[] {
  return [
    ...getFeatureTools(workspaceRoot),
    ...getPlanTools(workspaceRoot),
    ...getTaskTools(workspaceRoot),
    ...getStatusTools(workspaceRoot),
  ];
}

export function getContributedLanguageModelTools(workspaceRoot: string) {
  return getAllToolRegistrations(workspaceRoot)
    .map((registration) => toLanguageModelToolContribution(registration))
    .filter((registration) => registration !== null);
}
