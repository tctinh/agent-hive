import { describe, expect, it } from 'bun:test';
import * as generators from './index.js';

function getBody(content: string): string {
  const parts = content.split(/^---$/m);
  return parts.slice(2).join('---').trim();
}

function getFrontmatter(content: string): string {
  const parts = content.split(/^---$/m);
  return parts[1] ?? '';
}

function getFrontmatterTools(content: string): string[] {
  const lines = getFrontmatter(content).split('\n');
  const toolsIndex = lines.indexOf('tools:');
  if (toolsIndex === -1) {
    return [];
  }

  const tools: string[] = [];
  for (const line of lines.slice(toolsIndex + 1)) {
    if (!line.startsWith('  - ')) {
      break;
    }

    tools.push(line.replace(/^  - /, '').replace(/^"|"$/g, ''));
  }

  return tools;
}

describe('prompt generator', () => {
  it('exports the prompt generators and returns the 5 workspace prompt files', () => {
    expect(generators.generateAllPrompts).toBeDefined();
    expect(generators.generatePlanFeaturePrompt).toBeDefined();
    expect(generators.generateReviewPlanPrompt).toBeDefined();
    expect(generators.generateExecuteApprovedPlanPrompt).toBeDefined();
    expect(generators.generateRequestReviewPrompt).toBeDefined();
    expect(generators.generateVerifyCompletionPrompt).toBeDefined();

    const prompts = generators.generateAllPrompts();

    expect(prompts.map((prompt) => prompt.filename)).toEqual([
      'plan-feature.prompt.md',
      'review-plan.prompt.md',
      'execute-approved-plan.prompt.md',
      'request-review.prompt.md',
      'verify-completion.prompt.md',
    ]);
  });

  it('builds prompt files with copilot prompt frontmatter', () => {
    for (const prompt of generators.generateAllPrompts()) {
      expect(prompt.body.startsWith('---\n')).toBe(true);
      expect(prompt.body).toContain(`name: "${prompt.name}"`);
      expect(prompt.body).toContain(`description: "${prompt.description}"`);
      expect(prompt.body).toContain(`agent: "${prompt.agent}"`);
      expect(prompt.body).toContain(`model: "${prompt.model}"`);
      expect(prompt.body).toContain('tools:');
    }
  });

  it('guides planning and review prompts toward current Copilot flows', () => {
    const planPrompt = generators.generatePlanFeaturePrompt();
    const reviewPrompt = generators.generateReviewPlanPrompt();
    const planBody = getBody(planPrompt.body);

    expect(getFrontmatterTools(planPrompt.body)).toEqual(expect.arrayContaining([
      'search/codebase',
      'search/usages',
      'vscode/askQuestions',
      'tctinh.vscode-hive/hiveStatus',
      'tctinh.vscode-hive/hivePlanWrite',
    ]));
    expect(planPrompt.body).not.toContain('  - "codebase"');
    expect(planPrompt.body).not.toContain('  - "usages"');
    expect(planBody).toContain('vscode/askQuestions');
    expect(planBody).toContain('hive_plan_write');
    expect(planBody).toContain('overview/design summary before ## Tasks');
    expect(planBody).toContain('read-only');
    expect(planBody).toContain('AGENTS.md');
    expect(planBody).toContain('plain chat only as a fallback');
    expect(planBody).not.toContain('context/overview.md');
    expect(planBody).not.toContain('prefer Copilot\'s built-in clarification flow in chat');
    expect(planBody).not.toContain('question()');

    expect(getFrontmatterTools(reviewPrompt.body)).toEqual(expect.arrayContaining([
      'tctinh.vscode-hive/hivePlanRead',
      'tctinh.vscode-hive/hiveStatus',
    ]));
    expect(getBody(reviewPrompt.body)).toContain('hive_plan_read');
    expect(getBody(reviewPrompt.body)).toContain('approval');
    expect(getBody(reviewPrompt.body)).toContain('revision');
    expect(getBody(reviewPrompt.body)).toContain('plan.md');
    expect(getBody(reviewPrompt.body)).not.toContain('context/overview.md');
  });

  it('guides execution and verification prompts toward built-in browser and review flows', () => {
    const executePrompt = generators.generateExecuteApprovedPlanPrompt();
    const requestReviewPrompt = generators.generateRequestReviewPrompt();
    const verifyPrompt = generators.generateVerifyCompletionPrompt();

    expect(getFrontmatterTools(executePrompt.body)).toEqual(expect.arrayContaining([
      'tctinh.vscode-hive/hivePlanRead',
      'tctinh.vscode-hive/hiveStatus',
      'tctinh.vscode-hive/hiveTasksSync',
    ]));
    expect(executePrompt.body).not.toContain('hiveWorktreeStart');
    expect(getBody(executePrompt.body)).toContain('hive_tasks_sync');
    expect(getBody(executePrompt.body)).toContain('@forager');
    expect(getBody(executePrompt.body)).toContain('hive_task_update');
    expect(getBody(executePrompt.body)).toContain('Playwright MCP');
    expect(getBody(executePrompt.body)).toContain('browser tools');
    expect(getBody(executePrompt.body)).not.toContain('hive_worktree_start');
    expect(getBody(executePrompt.body)).not.toContain('hive_merge');

    expect(getBody(requestReviewPrompt.body)).toContain('Hygienic');
    expect(getBody(requestReviewPrompt.body)).toContain('code review');

    expect(getBody(verifyPrompt.body)).toContain('verification-before-completion');
    expect(getBody(verifyPrompt.body)).toContain('fresh verification evidence');
  });
});
