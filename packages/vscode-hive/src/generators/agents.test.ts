import { describe, expect, it } from 'bun:test';
import { generateAllAgents } from './agents.js';

function getBody(content: string): string {
  const parts = content.split(/^---$/m);
  return parts.slice(2).join('---').trimStart();
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

describe('generateAllAgents', () => {
  const agents = generateAllAgents({ extensionId: 'tctinh.vscode-hive' });
  const byFilename = new Map(agents.map((agent) => [agent.filename, agent.content]));

  it('returns the 4 unified-mode agent files', () => {
    expect(agents.map((agent) => agent.filename)).toEqual([
      'hive.agent.md',
      'scout.agent.md',
      'forager.agent.md',
      'hygienic.agent.md',
    ]);
  });

  it('includes frontmatter and keeps each body under 30000 chars', () => {
    for (const agent of agents) {
      expect(agent.content.startsWith('---\n')).toBe(true);
      expect(agent.content.split(/^---$/m).length).toBeGreaterThanOrEqual(3);
      expect(getBody(agent.content).length).toBeLessThanOrEqual(30000);
    }
  });

  it('maps tool names and removes opencode-specific references from the hive agent', () => {
    const hive = byFilename.get('hive.agent.md');
    const body = getBody(hive ?? '');

    expect(hive).toContain("- tctinh.vscode-hive/*");
    expect(hive).toContain('- vscode/askQuestions');
    expect(hive).toContain('use the agent tool to invoke @scout');
    expect(hive).toContain('refer to the skill at .github/skills/parallel-exploration/');
    expect(hive).toContain('.github/prompts/');
    expect(hive).toContain('.github/copilot-instructions.md');
    expect(hive).toContain('AGENTS.md');
    expect(hive).toContain('vscode/askQuestions');
    expect(hive).toContain('Playwright MCP');
    expect(hive).toContain('browser tools');
    expect(body).toContain('Use `vscode/askQuestions` for structured decision checkpoints');
    expect(body).toContain('Plain chat is allowed only for lightweight clarification or when `vscode/askQuestions` is unavailable');
    expect(body).not.toContain('hive_context_write');
    expect(body).not.toContain('context/overview.md');
    expect(body).not.toContain('hive_worktree_create');
    expect(body).not.toContain('hive_merge');

    expect(hive).not.toContain('question()');
    expect(hive).not.toContain('task({ subagent_type: "scout-researcher" })');
    expect(hive).not.toContain('hive_skill(');
    expect(body).not.toContain('Ask the user directly in chat');
    expect(body).not.toContain('ask the user directly in chat');
    // Check OpenCode-specific tool names as tool references (backticked), not as English prose
    expect(hive).not.toContain('`Bash`');
    expect(hive).not.toContain('`Read`');
    expect(hive).not.toContain('`Edit`');
    expect(hive).not.toContain('`Grep`');
    expect(hive).not.toContain('Docker sandbox');
    expect(hive).not.toContain('SDK');
    expect(hive).not.toContain('variant');
    expect(hive).not.toContain('config hook');
  });

  it('uses plan.md as the only required review surface in the hive agent', () => {
    const hive = byFilename.get('hive.agent.md');

    expect(hive).toContain('Design Summary');
    expect(hive).toContain('plan.md');
    expect(hive).not.toContain('`overview` = human-facing summary/history');
    expect(hive).not.toContain('Refresh `context/overview.md`');
    expect(hive).not.toContain('hive_context_write');
  });

  it('uses the required tool allowlists for the subagents', () => {
    const scout = byFilename.get('scout.agent.md');
    const forager = byFilename.get('forager.agent.md');
    const hygienic = byFilename.get('hygienic.agent.md');

    expect(getFrontmatterTools(scout ?? '')).toEqual([
      'read',
      'search',
      'search/codebase',
      'search/usages',
      'web/fetch',
    ]);
    expect(scout).toContain('user-invocable: false');

    expect(getFrontmatterTools(forager ?? '')).toEqual([
      'execute',
      'read',
      'edit',
      'search',
      'browser',
      'playwright/*',
      'vscode/memory',
      'vscode/newWorkspace',
      'vscode/getProjectSetupInfo',
      'tctinh.vscode-hive/hivePlanRead',
      'tctinh.vscode-hive/hiveTaskUpdate',
    ]);
    expect(forager).toContain('user-invocable: false');
    expect(forager).not.toContain('Docker Sandbox');

    expect(getFrontmatterTools(hygienic ?? '')).toEqual([
      'read',
      'search',
      'search/codebase',
      'search/usages',
    ]);
    expect(hygienic).toContain('user-invocable: false');
  });
});
