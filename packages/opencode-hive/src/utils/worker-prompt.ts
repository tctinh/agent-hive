/**
 * Worker prompt builder for Hive delegated execution.
 * Builds context-rich prompts for worker agents with all Hive context.
 */

export interface ContextFile {
  name: string;
  content: string;
}

export interface CompletedTask {
  name: string;
  summary: string;
}

export interface ContinueFromBlocked {
  status: 'blocked';
  previousSummary: string;
  decision: string;
}

export interface WorkerPromptParams {
  feature: string;
  task: string;
  taskOrder: number;
  worktreePath: string;
  branch: string;
  plan: string;
  contextFiles: ContextFile[];
  spec: string;
  previousTasks?: CompletedTask[];
  continueFrom?: ContinueFromBlocked;
}

/**
 * Build a context-rich prompt for a worker agent.
 * 
 * Includes:
 * - Assignment details (feature, task, worktree, branch)
 * - Plan context
 * - Context files (royal jelly)
 * - Previous task summaries
 * - Mission (spec)
 * - Blocker protocol (NOT question tool)
 * - Completion protocol
 */
export function buildWorkerPrompt(params: WorkerPromptParams): string {
  const {
    feature,
    task,
    taskOrder,
    worktreePath,
    branch,
    plan,
    contextFiles,
    spec,
    previousTasks,
    continueFrom,
  } = params;

  // Build context files section
  const contextSection = contextFiles.length > 0
    ? contextFiles.map(f => `### ${f.name}\n${f.content}`).join('\n\n')
    : '_No context files available._';

  // Build previous tasks section
  const previousSection = previousTasks?.length
    ? previousTasks.map(t => `- **${t.name}**: ${t.summary}`).join('\n')
    : '_This is the first task._';

  // Build continuation section if resuming from blocked
  const continuationSection = continueFrom ? `
## Continuation from Blocked State

Previous worker was blocked and exited. Here's the context:

**Previous Progress**: ${continueFrom.previousSummary}

**User Decision**: ${continueFrom.decision}

Continue from where the previous worker left off, incorporating the user's decision.
The worktree already contains the previous worker's progress.
` : '';

  return `# Hive Worker Assignment

You are a worker agent executing a task in an isolated git worktree.

## Assignment Details

| Field | Value |
|-------|-------|
| Feature | ${feature} |
| Task | ${task} |
| Task # | ${taskOrder} |
| Branch | ${branch} |
| Worktree | ${worktreePath} |

**CRITICAL**: All file operations MUST be within this worktree path:
\`${worktreePath}\`

Do NOT modify files outside this directory.
${continuationSection}
---

## Plan Context

${plan}

---

## Context Files (Royal Jelly)

${contextSection}

---

## Previous Tasks Completed

${previousSection}

---

## Your Mission

${spec}

---

## Blocker Protocol

If you hit a blocker requiring human decision, **DO NOT** use the question tool directly.
Instead, escalate via the blocker protocol:

1. **Save your progress** to the worktree (commit if appropriate)
2. **Call hive_exec_complete** with blocker info:

\`\`\`
hive_exec_complete({
  task: "${task}",
  status: "blocked",
  summary: "What you accomplished so far",
  blocker: {
    reason: "Why you're blocked - be specific",
    options: ["Option A", "Option B", "Option C"],
    recommendation: "Your suggested choice with reasoning",
    context: "Relevant background the user needs to decide"
  }
})
\`\`\`

The Hive Master will:
1. Receive your blocker info
2. Ask the user via question()
3. Spawn a NEW worker to continue with the decision

This keeps the user focused on ONE conversation (Hive Master) instead of multiple worker panes.

---

## Completion Protocol

When your task is **fully complete**:

\`\`\`
hive_exec_complete({
  task: "${task}",
  status: "completed",
  summary: "Concise summary of what you accomplished"
})
\`\`\`

If you encounter an **unrecoverable error**:

\`\`\`
hive_exec_complete({
  task: "${task}",
  status: "failed",
  summary: "What went wrong and what was attempted"
})
\`\`\`

If you made **partial progress** but can't continue:

\`\`\`
hive_exec_complete({
  task: "${task}",
  status: "partial",
  summary: "What was completed and what remains"
})
\`\`\`

---

## TDD Protocol (Required)

1. **Red**: Write failing test first
2. **Green**: Minimal code to pass
3. **Refactor**: Clean up, keep tests green

Never write implementation before test exists.
Exception: Pure refactoring of existing tested code.

## Debugging Protocol (When stuck)

1. **Reproduce**: Get consistent failure
2. **Isolate**: Binary search to find cause
3. **Hypothesize**: Form theory, test it
4. **Fix**: Minimal change that resolves

After 3 failed attempts at same fix: STOP and report blocker.

---

## Tool Access

**You have access to:**
- All standard tools (read, write, edit, bash, glob, grep)
- \`hive_exec_complete\` - Signal task done/blocked/failed
- \`hive_exec_abort\` - Abort and discard changes
- \`hive_plan_read\` - Re-read plan if needed
- \`hive_context_write\` - Save learnings for future tasks

**You do NOT have access to (or should not use):**
- \`question\` - Escalate via blocker protocol instead
- \`hive_exec_start\` - No spawning sub-workers
- \`hive_merge\` - Only Hive Master merges
- \`background_task\` - No recursive delegation

---

## Guidelines

1. **Work methodically** - Break down the mission into steps
2. **Stay in scope** - Only do what the spec asks
3. **Escalate blockers** - Don't guess on important decisions
4. **Save context** - Use hive_context_write for discoveries
5. **Complete cleanly** - Always call hive_exec_complete when done

---

Begin your task now.
`;
}
