import { describe, expect, it } from 'bun:test';
import * as generators from './index.js';

function getBody(content: string): string {
  const parts = content.split(/^---$/m);
  return parts.slice(2).join('---').trim();
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

    expect(planPrompt.body).toContain('  - "vscode/askQuestions"');
    expect(planBody).toContain('vscode/askQuestions');
    expect(planBody).toContain('hive_plan_write');
    expect(planBody).toContain('read-only');
    expect(planBody).toContain('AGENTS.md');
    expect(planBody).toContain('plain chat only as a fallback');
    expect(planBody).not.toContain('prefer Copilot\'s built-in clarification flow in chat');
    expect(planBody).not.toContain('question()');

    expect(getBody(reviewPrompt.body)).toContain('hive_plan_read');
    expect(getBody(reviewPrompt.body)).toContain('approval');
    expect(getBody(reviewPrompt.body)).toContain('revision');
  });

  it('guides execution and verification prompts toward built-in browser and review flows', () => {
    const executePrompt = generators.generateExecuteApprovedPlanPrompt();
    const requestReviewPrompt = generators.generateRequestReviewPrompt();
    const verifyPrompt = generators.generateVerifyCompletionPrompt();

    expect(getBody(executePrompt.body)).toContain('hive_tasks_sync');
    expect(getBody(executePrompt.body)).toContain('hive_worktree_start');
    expect(getBody(executePrompt.body)).toContain('Playwright MCP');
    expect(getBody(executePrompt.body)).toContain('browser tools');

    expect(getBody(requestReviewPrompt.body)).toContain('Hygienic');
    expect(getBody(requestReviewPrompt.body)).toContain('code review');

    expect(getBody(verifyPrompt.body)).toContain('verification-before-completion');
    expect(getBody(verifyPrompt.body)).toContain('fresh verification evidence');
  });
});
