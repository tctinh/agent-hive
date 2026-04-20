import { describe, expect, it } from 'bun:test';
import * as fs from 'fs';
const source = fs.readFileSync(new URL('./status.ts', import.meta.url), 'utf-8');

describe('getStatusTools', () => {
  it('reports plan-only review metadata and regular context handling', () => {
    expect(source).not.toContain('overview: {');
    expect(source).not.toContain('reviewCounts.overview');
    expect(source).not.toContain('context/overview.md');
    expect(source).toContain('plan.md is the only required review document');
  });

  it('guides runnable tasks without worktree instructions', () => {
    expect(source).toContain('@forager');
    expect(source).toContain('hive_task_update');
    expect(source).not.toContain('hive_worktree_start');
  });

  it('guides planners to plan-only status messaging', () => {
    expect(source).toContain('plan.md is the only required review document');
    expect(source).toContain('overview/design summary before ## Tasks');
  });

  it('contributes only retained LM tool metadata alongside the expanded welcome copy', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf-8')
    ) as {
      contributes?: {
        languageModelTools?: Array<{
          name?: string;
          toolReferenceName?: string;
          canBeReferencedInPrompt?: boolean;
        }>;
        viewsWelcome?: Array<{ view?: string; contents?: string }>;
      };
    };

    const welcome = packageJson.contributes?.viewsWelcome?.find(view => view.view === 'hive.features');
    const languageModelTools = packageJson.contributes?.languageModelTools ?? [];
    const toolNames = new Map(languageModelTools.map(tool => [tool.name, tool]));

    expect(languageModelTools.length).toBeGreaterThan(0);
    expect(toolNames.get('hive_status')).toMatchObject({
      toolReferenceName: 'hiveStatus',
      canBeReferencedInPrompt: true,
    });
    expect(toolNames.get('hive_plan_read')).toMatchObject({
      toolReferenceName: 'hivePlanRead',
      canBeReferencedInPrompt: true,
    });
    expect(toolNames.get('hive_context_write')).toBeUndefined();
    expect(toolNames.get('hive_worktree_commit')).toBeUndefined();
    expect(toolNames.get('hive_agents_md')).toBeUndefined();
    expect(toolNames.get('hive_skill')).toBeUndefined();
    expect(welcome?.contents).toContain('.github/agents/');
    expect(welcome?.contents).toContain('Prompt files (.github/prompts/)');
    expect(welcome?.contents).toContain('Copilot steering (.github/copilot-instructions.md)');
    expect(welcome?.contents).toContain('Agent skills (.github/skills/)');
    expect(welcome?.contents).not.toContain('Copilot agents');
  });
});

