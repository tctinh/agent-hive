/**
 * Worker prompt templates for delegated task execution.
 * These prompts are injected when spawning workers via OMO-Slim's background_task.
 */

// Agent types available in oh-my-opencode-slim
export type OmoSlimAgent =
  | 'general'
  | 'explore'
  | 'librarian'
  | 'oracle'
  | 'frontend-ui-ux-engineer'
  | 'document-writer'
  | 'multimodal-looker'
  | 'code-simplicity-reviewer';

export interface WorkerPromptParams {
  // Feature context
  feature: string;
  task: string;
  worktreePath: string;
  branch: string;

  // Content context
  plan: string;
  contextFiles: string;
  spec: string;

  // Execution context
  agent: OmoSlimAgent;
}

/**
 * Build the full worker prompt with all context injected.
 */
export function buildWorkerPrompt(params: WorkerPromptParams): string {
  const {
    feature,
    task,
    worktreePath,
    branch,
    plan,
    contextFiles,
    spec,
    agent,
  } = params;

  return `# Hive Worker Task

You are executing task "${task}" for feature "${feature}".

## Execution Environment

- **Worktree Path**: \`${worktreePath}\`
- **Branch**: \`${branch}\`
- **Agent Type**: ${agent}

**CRITICAL**: All file operations MUST be within the worktree path above.
You are working in an isolated git worktree, not the main repository.

---

## Plan Context

${plan || '_No plan content available_'}

---

## Context Files

${contextFiles || '_No context files_'}

---

## Task Specification

${spec}

---

## Human-in-the-Loop Protocol

You have access to the \`question\` tool. **USE IT** when you need:

1. **Clarification** on requirements or ambiguous specs
2. **Decision between approaches** when multiple valid options exist
3. **Approval before destructive actions** (deleting files, major refactors)
4. **Design input** for UI, API, or architecture choices

### Example usage:

\`\`\`typescript
question({
  questions: [{
    header: "Implementation Approach",
    question: "Should I use Context API or Zustand for state management?",
    options: [
      { label: "Context API", description: "Built-in, simpler, good for small state" },
      { label: "Zustand", description: "External lib, more features, better for complex state" }
    ]
  }]
})
\`\`\`

**DO NOT GUESS** - ask the user instead!

---

## Checkpoint Protocol

For **major milestones**, write a CHECKPOINT file and pause:

1. Before committing changes
2. After completing significant implementation
3. When blocked or need human review

Write checkpoint:
\`\`\`bash
cat > "${worktreePath}/.hive/CHECKPOINT" << 'EOF'
REASON: <why pausing>
STATUS: <what's been done>
NEXT: <what's planned next>
DECISION_NEEDED: <yes/no>
EOF
\`\`\`

Then **STOP** and wait for human to review in tmux pane.

---

## Completion Protocol

When task is **fully complete**:

\`\`\`typescript
hive_exec_complete({
  task: "${task}",
  summary: "<1-2 sentence summary of what was accomplished>"
})
\`\`\`

If **blocked or failed**:

\`\`\`typescript
hive_exec_abort({
  task: "${task}"
})
\`\`\`

---

## Tool Restrictions

You have access to most tools, but CANNOT use:
- \`hive_exec_start\` - No spawning sub-workers
- \`hive_merge\` - Only orchestrator merges
- \`hive_feature_create/complete\` - Only orchestrator manages features
- \`background_task\` - No recursive delegation

---

## Begin Task

Review the spec above and start working. Remember:
1. Ask questions when unsure (use \`question\` tool)
2. Write CHECKPOINT before major commits
3. Call \`hive_exec_complete\` when done
`;
}

/**
 * Build a minimal prompt for simple tasks.
 */
export function buildMinimalWorkerPrompt(params: Pick<WorkerPromptParams, 'feature' | 'task' | 'worktreePath' | 'spec'>): string {
  const { feature, task, worktreePath, spec } = params;

  return `# Hive Worker: ${task}

Working in: \`${worktreePath}\`
Feature: ${feature}

## Task
${spec}

## When Done
\`\`\`
hive_exec_complete({ task: "${task}", summary: "..." })
\`\`\`

Use \`question\` tool if you need clarification.
`;
}

/**
 * Build context summary from context files.
 */
export function formatContextFiles(contextFiles: Array<{ name: string; content: string }>): string {
  if (!contextFiles.length) {
    return '_No context files_';
  }

  return contextFiles
    .map(({ name, content }) => `### ${name}\n\n${content}`)
    .join('\n\n---\n\n');
}
