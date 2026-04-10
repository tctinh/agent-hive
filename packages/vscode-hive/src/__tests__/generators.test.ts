import { describe, expect, test } from 'bun:test';
import {
  generateAllAgents,
  generateForagerAgent,
  generateHiveAgent,
  generateHygienicAgent,
  generateScoutAgent,
} from '../generators/agents.js';
import { generateAllHooks, generateContextInjectionHook, generatePlanEnforcementHook } from '../generators/hooks.js';
import {
  generateAllInstructions,
  generateCodingStandardsTemplate,
  generateCopilotInstructions,
  generateHiveWorkflowInstructions,
} from '../generators/instructions.js';
import { generatePluginManifest } from '../generators/plugin.js';
import { generateAllPrompts } from '../generators/prompts.js';
import { generateSkillFile, getBuiltinSkills } from '../generators/skills.js';

function extractFrontmatter(content: string): string {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1] : '';
}

function getBody(content: string): string {
  const parts = content.split(/^---$/m);
  return parts.length >= 3 ? parts.slice(2).join('---').trim() : '';
}

describe('Agent Generators', () => {
  const opts = { extensionId: 'tctinh.vscode-hive' };

  test('returns 4 unified agents', () => {
    const agents = generateAllAgents(opts);
    expect(agents).toHaveLength(4);
    expect(agents.map((agent) => agent.filename).sort()).toEqual([
      'forager.agent.md',
      'hive.agent.md',
      'hygienic.agent.md',
      'scout.agent.md',
    ]);
  });

  test('all agents have valid frontmatter', () => {
    const agents = generateAllAgents(opts);
    for (const agent of agents) {
      const frontmatter = extractFrontmatter(agent.content);
      expect(frontmatter).toBeTruthy();
      expect(frontmatter).toContain('description:');
      expect(frontmatter).toContain('tools:');
    }
  });

  test('no agent body exceeds 30000 chars', () => {
    const agents = generateAllAgents(opts);
    for (const agent of agents) {
      const body = getBody(agent.content);
      expect(body.length).toBeLessThanOrEqual(30000);
    }
  });

  test('subagents have user-invocable: false', () => {
    const agents = generateAllAgents(opts);
    for (const agent of agents) {
      if (agent.filename !== 'hive.agent.md') {
        expect(extractFrontmatter(agent.content)).toContain('user-invocable: false');
      }
    }
  });

  test('hive agent has agent tool and agents list', () => {
    const hive = generateHiveAgent(opts);
    const frontmatter = extractFrontmatter(hive);
    expect(frontmatter).toContain('- agent');
    expect(frontmatter).toContain('agents:');
  });

  test('individual agent generators return content', () => {
    expect(generateScoutAgent(opts)).toContain('description:');
    expect(generateForagerAgent(opts)).toContain('description:');
    expect(generateHygienicAgent(opts)).toContain('description:');
  });
});

describe('Skill Generators', () => {
  test('returns 11 builtin skills', () => {
    expect(getBuiltinSkills()).toHaveLength(11);
  });

  test('each skill has valid frontmatter', () => {
    for (const skill of getBuiltinSkills()) {
      const frontmatter = extractFrontmatter(skill.content);
      expect(frontmatter).toContain('name:');
      expect(frontmatter).toContain('description:');
      expect(skill.name.length).toBeLessThanOrEqual(64);
      expect(skill.description.length).toBeGreaterThanOrEqual(10);
      expect(skill.description.length).toBeLessThanOrEqual(1024);
    }
  });

  test('no OpenCode-specific references', () => {
    for (const skill of getBuiltinSkills()) {
      expect(skill.content).not.toContain('subagent_type');
      expect(skill.content).not.toContain('task({');
    }
  });

  test('generateSkillFile returns frontmatter-wrapped content', () => {
    const content = generateSkillFile({
      name: 'sample-skill',
      description: 'Sample skill description',
      content: '# Heading\n\nBody',
    });

    expect(extractFrontmatter(content)).toContain('name: sample-skill');
    expect(getBody(content)).toContain('# Heading');
  });

  test('copilot skill output prefers askQuestions for runnable-task and approval checkpoints', () => {
    const byName = new Map(getBuiltinSkills().map((skill) => [skill.name, getBody(skill.content)]));
    const executingPlans = byName.get('executing-plans') ?? '';
    const dispatchingParallelAgents = byName.get('dispatching-parallel-agents') ?? '';

    expect(executingPlans).toContain('Prefer `vscode/askQuestions` for a structured choice');
    expect(executingPlans).toContain('prefer `vscode/askQuestions` to ask whether the user wants a Hygienic code review');
    expect(dispatchingParallelAgents).toContain('Prefer `vscode/askQuestions` for the approval prompt');
    expect(executingPlans).not.toContain('question()');
    expect(dispatchingParallelAgents).not.toContain('question()');
  });
});

describe('Hook Generators', () => {
  test('returns 2 hooks', () => {
    expect(generateAllHooks()).toHaveLength(2);
  });

  test('hooks produce valid JSON configs', () => {
    for (const hook of generateAllHooks()) {
      expect(() => JSON.stringify(hook.config)).not.toThrow();
      expect(hook.config.version).toBe(1);
      expect(typeof hook.config.hooks).toBe('object');
    }
  });

  test('scripts start with shebang', () => {
    for (const hook of generateAllHooks()) {
      for (const script of hook.scripts) {
        expect(script.content).toMatch(/^#!/);
      }
    }
  });

  test('specific hooks expose expected filenames', () => {
    expect(generatePlanEnforcementHook().configFilename).toBe('hive-plan-enforcement.json');
    expect(generateContextInjectionHook().configFilename).toBe('hive-context-injection.json');
  });
});

describe('Instruction Generators', () => {
  test('returns 2 instructions', () => {
    expect(generateAllInstructions()).toHaveLength(2);
  });

  test('each has valid frontmatter', () => {
    for (const instruction of generateAllInstructions()) {
      const frontmatter = extractFrontmatter(instruction.body);
      expect(frontmatter).toContain('description:');
      expect(frontmatter).toContain('applyTo:');
    }
  });

  test('workflow instruction body is concise', () => {
    const workflow = generateHiveWorkflowInstructions();
    const body = getBody(workflow.body);
    expect(body.length).toBeLessThanOrEqual(1000);
  });

  test('coding standards template exposes expected file metadata', () => {
    const template = generateCodingStandardsTemplate();
    expect(template.filename).toBe('coding-standards.instructions.md');
    expect(template.applyTo).toBe('**/*.ts');
  });

  test('repository copilot instructions stay concise and reference companion artifacts', () => {
    const content = generateCopilotInstructions();
    const body = getBody(content);
    expect(body).toContain('AGENTS.md');
    expect(body).toContain('.github/prompts/');
    expect(body.length).toBeLessThanOrEqual(1000);
  });
});

describe('Prompt Generators', () => {
  test('returns the expected prompt filenames', () => {
    expect(generateAllPrompts().map((prompt) => prompt.filename)).toEqual([
      'plan-feature.prompt.md',
      'review-plan.prompt.md',
      'execute-approved-plan.prompt.md',
      'request-review.prompt.md',
      'verify-completion.prompt.md',
    ]);
  });

  test('all prompts have required frontmatter fields', () => {
    for (const prompt of generateAllPrompts()) {
      const frontmatter = extractFrontmatter(prompt.body);
      expect(frontmatter).toContain('name:');
      expect(frontmatter).toContain('description:');
      expect(frontmatter).toContain('agent:');
      expect(frontmatter).toContain('model:');
      expect(frontmatter).toContain('tools:');
    }
  });
});

describe('Plugin Generator', () => {
  test('produces valid JSON manifest', () => {
    const manifest = generatePluginManifest();
    expect(() => JSON.stringify(manifest)).not.toThrow();
    expect(manifest.name).toBe('agent-hive');
    expect(manifest.agents).toContain('.github/agents');
    expect(manifest.skills).toContain('.github/skills/*');
  });
});
