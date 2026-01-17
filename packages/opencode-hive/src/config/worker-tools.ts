/**
 * Worker tool access configuration for delegated execution.
 * Defines which tools workers can and cannot use.
 */

/**
 * Tools that workers are ALLOWED to use.
 */
export const WORKER_ALLOWED_TOOLS = [
  // Human-in-the-loop
  'question',           // Ask user for decisions - KEY for hybrid mode
  
  // Hive task management
  'hive_exec_complete', // Signal task done
  'hive_exec_abort',    // Bail out on error
  'hive_plan_read',     // Understand context
  'hive_context_write', // Save learnings
  'hive_context_read',  // Read context files
  'hive_status',        // Check feature status
  
  // Standard file operations
  'read',               // Read files
  'write',              // Write files
  'edit',               // Edit files
  'glob',               // Find files
  'grep',               // Search content
  'bash',               // Run commands
  
  // OMO-Slim tools (if available)
  'lsp_goto_definition',   // LSP navigation
  'lsp_find_references',   // LSP references
  'lsp_diagnostics',       // LSP errors/warnings
  'lsp_rename',            // LSP rename
  'grep_app_searchGitHub', // GitHub code search
  'ast_grep_search',       // AST search
  'ast_grep_replace',      // AST replace
  
  // Web/docs tools
  'webfetch',           // Fetch URLs
  'websearch_web_search_exa', // Web search
  'context7_resolve-library-id', // Context7 library lookup
  'context7_query-docs',  // Context7 docs query
] as const;

/**
 * Tools that workers are DENIED from using.
 * These prevent recursion and unauthorized escalation.
 */
export const WORKER_DENIED_TOOLS = [
  // Prevent recursive worker spawning
  'hive_exec_start',    // No spawning sub-workers
  'background_task',    // No recursive delegation
  'task',               // No spawning agents
  
  // Only orchestrator can merge/manage features
  'hive_merge',           // Only orchestrator merges
  'hive_feature_create',  // Only orchestrator creates features
  'hive_feature_complete',// Only orchestrator completes features
  'hive_plan_write',      // Only orchestrator writes plans
  'hive_plan_approve',    // Only orchestrator approves
  'hive_tasks_sync',      // Only orchestrator syncs tasks
  'hive_task_create',     // Only orchestrator creates tasks
  'hive_worktree_list',   // Only orchestrator lists worktrees
] as const;

export type WorkerAllowedTool = typeof WORKER_ALLOWED_TOOLS[number];
export type WorkerDeniedTool = typeof WORKER_DENIED_TOOLS[number];

/**
 * Check if a tool is allowed for workers.
 */
export function isToolAllowedForWorker(toolName: string): boolean {
  // Explicitly denied tools
  if ((WORKER_DENIED_TOOLS as readonly string[]).includes(toolName)) {
    return false;
  }
  
  // Allow anything not explicitly denied
  // (more permissive approach - workers can use most tools)
  return true;
}

/**
 * Get tool access configuration for background_task.
 * Returns an object mapping tool names to boolean (enabled/disabled).
 */
export function getWorkerToolConfig(): Record<string, boolean> {
  const config: Record<string, boolean> = {};
  
  // Disable denied tools
  for (const tool of WORKER_DENIED_TOOLS) {
    config[tool] = false;
  }
  
  return config;
}

/**
 * Generate tool access documentation for worker prompts.
 */
export function generateToolAccessDoc(): string {
  return `## Tool Access

### Allowed Tools
You can use all standard tools (read, write, edit, bash, glob, grep) plus:
- \`question\` - Ask user for decisions (USE THIS for clarification!)
- \`hive_exec_complete\` - Signal task completion
- \`hive_exec_abort\` - Signal task failure/blocked
- \`hive_plan_read\` - Read the feature plan
- \`hive_context_write/read\` - Save/read context
- LSP tools (goto_definition, find_references, diagnostics, rename)
- Search tools (ast_grep, grep_app, websearch, context7)

### Denied Tools (DO NOT USE)
- \`hive_exec_start\` - Cannot spawn sub-workers
- \`background_task\` / \`task\` - Cannot delegate to other agents
- \`hive_merge\` - Cannot merge branches
- \`hive_feature_*\` - Cannot manage features
- \`hive_plan_write/approve\` - Cannot modify plans
`;
}
