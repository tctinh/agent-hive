const EXTENSION_ID = 'tctinh.vscode-hive';

export interface PromptFile {
  filename: string;
  name: string;
  description: string;
  agent: string;
  model: string;
  tools: string[];
  body: string;
}

function buildPrompt(prompt: Omit<PromptFile, 'body'>, content: string): PromptFile {
  const frontmatter = [
    `name: "${prompt.name}"`,
    `description: "${prompt.description}"`,
    `agent: "${prompt.agent}"`,
    `model: "${prompt.model}"`,
    'tools:',
    ...prompt.tools.map((tool) => `  - "${tool}"`),
  ].join('\n');

  return {
    ...prompt,
    body: `---\n${frontmatter}\n---\n\n${content.trim()}\n`,
  };
}

export function generatePlanFeaturePrompt(): PromptFile {
  return buildPrompt(
    {
      filename: 'plan-feature.prompt.md',
      name: 'Plan Hive Feature',
      description: 'Create or revise a Hive feature plan with plan-first guardrails.',
      agent: 'hive',
      model: 'gpt-5.4',
      tools: ['read', 'search', 'codebase', 'usages', 'vscode/askQuestions', `${EXTENSION_ID}/hiveStatus`, `${EXTENSION_ID}/hivePlanWrite`],
    },
    `Start by checking AGENTS.md, .github/copilot-instructions.md, and any relevant .github/instructions/ files. Use read-only exploration first, then write or revise the plan with hive_plan_write.

If key requirements are missing, use vscode/askQuestions as the normal structured clarification path for the minimum practical decision checkpoints. Use plain chat only as a fallback when the tool is unavailable or a truly lightweight clarification is better.

Keep Hive's plan-first contract intact: no implementation edits, explicit task dependencies, exact file references, and concrete verification commands.`,
  );
}

export function generateReviewPlanPrompt(): PromptFile {
  return buildPrompt(
    {
      filename: 'review-plan.prompt.md',
      name: 'Review Hive Plan',
      description: 'Inspect a Hive plan and prepare approval or revision guidance.',
      agent: 'hive',
      model: 'gpt-5.4',
      tools: ['read', 'search', `${EXTENSION_ID}/hivePlanRead`, `${EXTENSION_ID}/hiveStatus`],
    },
    `Read the current plan and any review comments with hive_plan_read. Summarize whether the plan is ready for approval, what revisions are required, and which task-level verification details are missing.

Keep the response focused on approval and revision guidance rather than implementation. Respect Hive's plan-first workflow and call out missing dependencies, vague acceptance criteria, or unclear references.`,
  );
}

export function generateExecuteApprovedPlanPrompt(): PromptFile {
  return buildPrompt(
    {
      filename: 'execute-approved-plan.prompt.md',
      name: 'Execute Approved Hive Plan',
      description: 'Sync tasks from an approved plan and begin execution.',
      agent: 'hive',
      model: 'gpt-5.4',
      tools: ['read', 'search', `${EXTENSION_ID}/hiveStatus`, `${EXTENSION_ID}/hiveTasksSync`, `${EXTENSION_ID}/hiveWorktreeStart`],
    },
    `Confirm the plan is approved, sync tasks with hive_tasks_sync, then start the next runnable task with hive_worktree_start.

Preserve Hive guardrails: follow task dependencies, keep planning and execution separate, and delegate implementation to workers rather than doing it inline.

If the work involves browser behavior, web flows, or end-to-end validation, prefer built-in browser tools and Playwright MCP where available instead of inventing extension-only browser helpers.`,
  );
}

export function generateRequestReviewPrompt(): PromptFile {
  return buildPrompt(
    {
      filename: 'request-review.prompt.md',
      name: 'Request Hive Review',
      description: 'Hand completed implementation to Hygienic for code review readiness.',
      agent: 'hive',
      model: 'gpt-5.4',
      tools: ['read', 'search', `${EXTENSION_ID}/hiveStatus`],
    },
    `Prepare a concise code review handoff for Hygienic. Summarize the completed implementation batch, the relevant files or commits, and the verification already run.

Keep this focused on review readiness and code review context so Hygienic can assess the implementation without re-planning the feature.`,
  );
}

export function generateVerifyCompletionPrompt(): PromptFile {
  return buildPrompt(
    {
      filename: 'verify-completion.prompt.md',
      name: 'Verify Hive Completion',
      description: 'Run final verification and summarize completion readiness.',
      agent: 'hive',
      model: 'gpt-5.4',
      tools: ['read', 'search', 'execute', `${EXTENSION_ID}/hiveStatus`],
    },
    `Apply the verification-before-completion standard: gather fresh verification evidence before claiming the work is complete.

Run the relevant checks, summarize the observed results, and state whether the batch is ready for merge or needs follow-up. Use AGENTS.md and existing verification commands as the source of truth for required checks.`,
  );
}

export function generateAllPrompts(): PromptFile[] {
  return [
    generatePlanFeaturePrompt(),
    generateReviewPlanPrompt(),
    generateExecuteApprovedPlanPrompt(),
    generateRequestReviewPrompt(),
    generateVerifyCompletionPrompt(),
  ];
}
