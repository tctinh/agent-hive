/**
 * hive-core - Shared services and types for Agent Hive
 * Used by: opencode-hive, vscode-hive, hive-mcp
 */

export * from "./types.js";

export * from "./utils/paths.js";
export * from "./utils/detection.js";

export { FeatureService } from "./services/featureService.js";
export { PlanService } from "./services/planService.js";
export { TaskService } from "./services/taskService.js";
export { SubtaskService } from "./services/subtaskService.js";
export { WorktreeService } from "./services/worktreeService.js";
export { ContextService } from "./services/contextService.js";
export { SessionService } from "./services/sessionService.js";
