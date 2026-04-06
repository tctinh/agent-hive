import { describe, expect, it } from 'bun:test';
import { generateAllAgents } from './agents.js';

function getBody(content: string): string {
  const parts = content.split(/^---$/m);
  return parts.slice(2).join('---').trimStart();
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

    expect(hive).toContain("- tctinh.vscode-hive/*");
    expect(hive).toContain('use the agent tool to invoke @scout');
    expect(hive).toContain('refer to the skill at .github/skills/parallel-exploration/');
    expect(hive).toContain('ask the user directly in chat');

    expect(hive).not.toContain('question()');
    expect(hive).not.toContain('task({ subagent_type: "scout-researcher" })');
    expect(hive).not.toContain('hive_skill(');
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

  it('includes clarified context model in the hive agent', () => {
    const hive = byFilename.get('hive.agent.md');

    expect(hive).toContain('`overview` = human-facing summary/history');
    expect(hive).toContain('`draft` = planner scratchpad');
    expect(hive).toContain('`execution-decisions` = orchestration log');
    expect(hive).toContain('all other names');
    expect(hive).toContain('durable');
    expect(hive).not.toContain('plan.md is the primary human-facing summary');
  });

  it('uses the required tool allowlists for the subagents', () => {
    const scout = byFilename.get('scout.agent.md');
    const forager = byFilename.get('forager.agent.md');
    const hygienic = byFilename.get('hygienic.agent.md');

    expect(scout).toContain('- tctinh.vscode-hive/hiveContextWrite');
    expect(scout).toContain('- tctinh.vscode-hive/hivePlanRead');
    expect(scout).toContain('- tctinh.vscode-hive/hiveStatus');
    expect(scout).toContain('user-invocable: false');

    expect(forager).toContain('- tctinh.vscode-hive/hivePlanRead');
    expect(forager).toContain('- tctinh.vscode-hive/hiveWorktreeCommit');
    expect(forager).toContain('- tctinh.vscode-hive/hiveContextWrite');
    expect(forager).toContain('user-invocable: false');
    expect(forager).not.toContain('Docker Sandbox');

    expect(hygienic).toContain('- tctinh.vscode-hive/hivePlanRead');
    expect(hygienic).toContain('- tctinh.vscode-hive/hiveContextWrite');
    expect(hygienic).toContain('- tctinh.vscode-hive/hiveStatus');
    expect(hygienic).toContain('user-invocable: false');
  });
});
