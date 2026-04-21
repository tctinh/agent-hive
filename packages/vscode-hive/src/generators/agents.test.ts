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

function getFrontmatterList(content: string, key: string): string[] {
  const lines = getFrontmatter(content).split('\n');
  const sectionIndex = lines.indexOf(`${key}:`);
  if (sectionIndex === -1) {
    return [];
  }

  const values: string[] = [];
  for (const line of lines.slice(sectionIndex + 1)) {
    if (!line.startsWith('  - ')) {
      break;
    }

    values.push(line.replace(/^  - /, '').replace(/^"|"$/g, ''));
  }

  return values;
}

function getFrontmatterTools(content: string): string[] {
  return getFrontmatterList(content, 'tools');
}

function getFrontmatterModels(content: string): string[] {
  return getFrontmatterList(content, 'model');
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

    expect(getFrontmatterTools(hive ?? '')).toEqual([]);
    expect(hive).toContain('use the agent tool to invoke @scout');
    expect(hive).toContain('refer to the skill at .github/skills/parallel-exploration/');
    expect(hive).toContain('.github/prompts/');
    expect(hive).toContain('.github/copilot-instructions.md');
    expect(hive).toContain('AGENTS.md');
    expect(hive).toContain('vscode/askQuestions');
    expect(hive).toContain('Playwright MCP');
    expect(hive).toContain('browser tools');
    expect(body).toContain('Before any multi-domain, read-only investigation, refer to .github/skills/parallel-exploration/');
    expect(body).toContain('When the work is a bug, failing test, or unexpected behavior, refer to .github/skills/systematic-debugging/');
    expect(body).toContain('When implementing a feature, fix, or refactor, refer to .github/skills/test-driven-development/ before editing production code');
    expect(body).toContain('Before any completion claim, handoff, or PR/update that says work is done or passing, refer to .github/skills/verification-before-completion/');
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
    const hive = byFilename.get('hive.agent.md');
    const scout = byFilename.get('scout.agent.md');
    const forager = byFilename.get('forager.agent.md');
    const hygienic = byFilename.get('hygienic.agent.md');
    const scoutBody = getBody(scout ?? '');
    const foragerBody = getBody(forager ?? '');
    const hygienicBody = getBody(hygienic ?? '');

    expect(getFrontmatterTools(hive ?? '')).toEqual([]);
    expect(getFrontmatterModels(hive ?? '')).toEqual(['GPT-5.4 (copilot)']);

    expect(getFrontmatterTools(scout ?? '')).toEqual([
      'read',
      'search',
      'search/codebase',
      'search/usages',
      'web',
      'browser',
      'io.github.upstash/context7/*',
      'todo',
      'vscode/memory',
    ]);
    expect(getFrontmatterModels(scout ?? '')).toEqual(['Claude Sonnet 4.6 (copilot)']);
    expect(scout).toContain('user-invocable: false');
    expect(scoutBody).toContain('When the answer depends on rendered UI, browser state, console output, or network traffic, use `browser`');
    expect(scoutBody).toContain('Use `todo` only when the investigation spans multiple independent questions or sources');
    expect(scoutBody).toContain('Use `vscode/memory` only for findings the parent agent or a later turn will need');

    expect(getFrontmatterTools(forager ?? '')).toEqual([
      'execute',
      'read',
      'edit',
      'search',
      'web',
      'browser',
      'playwright/*',
      'io.github.upstash/context7/*',
      'todo',
      'vscode/memory',
      'vscode/newWorkspace',
      'vscode/getProjectSetupInfo',
      'tctinh.vscode-hive/hivePlanRead',
      'tctinh.vscode-hive/hiveTaskUpdate',
    ]);
    expect(getFrontmatterModels(forager ?? '')).toEqual([
      'GPT-5.4 (copilot)',
      'Claude Sonnet 4.6 (copilot)',
    ]);
    expect(forager).toContain('user-invocable: false');
    expect(forager).not.toContain('Docker Sandbox');
    expect(forager).toContain('still send one short natural-language handoff');
    expect(foragerBody).toContain('When a task depends on browser behavior, use `browser` for quick inspection and `playwright/*` for repeatable automation or end-to-end verification');
    expect(foragerBody).toContain('Use `todo` only when the assigned task has enough moving pieces that a live checklist prevents misses');
    expect(foragerBody).toContain('Use `vscode/memory` only for durable context that must survive the current task handoff');

    expect(getFrontmatterTools(hygienic ?? '')).toEqual([
      'read',
      'search',
      'search/codebase',
      'search/usages',
      'web',
      'browser',
      'io.github.upstash/context7/*',
      'playwright/*',
      'todo',
      'vscode/memory',
    ]);
    expect(getFrontmatterModels(hygienic ?? '')).toEqual(['Claude Sonnet 4.6 (copilot)']);
    expect(hygienic).toContain('user-invocable: false');
    expect(hygienicBody).toContain('When a finding depends on rendered UI, browser state, console output, or network activity, use `browser`');
    expect(hygienicBody).toContain('Use `playwright/*` when the review needs a repeatable browser repro or verification sequence');
    expect(hygienicBody).toContain('Use `todo` only when tracking several independent review checks');
    expect(hygienicBody).toContain('Use `vscode/memory` only for durable review findings or recurring repo risks');
  });
});
