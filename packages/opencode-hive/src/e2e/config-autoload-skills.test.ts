import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { createOpencodeClient } from '@opencode-ai/sdk';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import plugin from '../index';
import { BUILTIN_SKILLS } from '../skills/registry.generated.js';

function createFileSkill(
  skillDir: string,
  skillId: string,
  description: string,
  body: string,
): void {
  const skillPath = path.join(skillDir, skillId, 'SKILL.md');
  fs.mkdirSync(path.dirname(skillPath), { recursive: true });
  const content = `---
name: ${skillId}
description: ${description}
---
${body}`;
  fs.writeFileSync(skillPath, content, 'utf8');
}

function countOccurrences(haystack: string, needle: string): number {
  if (needle.length === 0) {
    return 0;
  }

  return haystack.split(needle).length - 1;
}

function createProject(worktree: string) {
  return {
    id: 'test',
    worktree,
    time: { created: Date.now() },
  };
}

function writeHiveConfig(testRoot: string, config: Record<string, unknown>): void {
  const configPath = path.join(testRoot, '.config', 'opencode', 'agent_hive.json');
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config), 'utf8');
}

function createCtx(testRoot: string): any {
  return {
    directory: testRoot,
    worktree: testRoot,
    serverUrl: new URL('http://localhost:1'),
    project: createProject(testRoot),
    client: OPENCODE_CLIENT,
  };
}

async function applyConfigHook(
  testRoot: string,
  opencodeConfig: Record<string, unknown> = { agent: {} },
): Promise<Record<string, unknown>> {
  const hooks = await plugin(createCtx(testRoot));
  await hooks.config!(opencodeConfig);
  return opencodeConfig;
}

async function captureWarnings<T>(run: () => Promise<T>): Promise<{ result: T; warnings: string[] }> {
  const warnings: string[] = [];
  const originalWarn = console.warn;

  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(' '));
  };

  try {
    return {
      result: await run(),
      warnings,
    };
  } finally {
    console.warn = originalWarn;
  }
}

function requireBuiltinSkill(name: string): { name: string; template: string } {
  const skill = BUILTIN_SKILLS.find((entry) => entry.name === name);
  expect(skill).toBeDefined();
  return skill!;
}

function getAgentPrompt(opencodeConfig: Record<string, unknown>, agentName: string): string {
  const agentConfig = (opencodeConfig.agent as Record<string, { prompt?: string }> | undefined)?.[agentName];
  expect(agentConfig?.prompt).toBeDefined();
  return agentConfig!.prompt!;
}

function getSkillPaths(opencodeConfig: Record<string, unknown>): string[] {
  const skills = opencodeConfig.skills as { paths?: string[] } | undefined;
  return skills?.paths ?? [];
}

function getSkillUrls(opencodeConfig: Record<string, unknown>): string[] {
  const skills = opencodeConfig.skills as { urls?: string[] } | undefined;
  return skills?.urls ?? [];
}

function getHiveManagedPaths(skillPaths: string[]): string[] {
  return skillPaths.filter((skillPath) => skillPath.includes(HIVE_GENERATED_SEGMENT));
}

function getCurrentHiveManagedPath(opencodeConfig: Record<string, unknown>): string | undefined {
  return getHiveManagedPaths(getSkillPaths(opencodeConfig))[0];
}

const OPENCODE_CLIENT = createOpencodeClient({ baseUrl: 'http://localhost:1' });
const TEST_ROOT_BASE = '/tmp/hive-config-autoload-skills-test';
const HIVE_GENERATED_SEGMENT = path.join('.hive', 'generated', 'opencode-skills');
const PACKAGED_SKILLS_DIR = fileURLToPath(new URL('../../skills', import.meta.url));

describe('config hook autoLoadSkills injection', () => {
  let testRoot: string;
  let originalHome: string | undefined;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalHome = process.env.HOME;
    originalFetch = globalThis.fetch;
    fs.rmSync(TEST_ROOT_BASE, { recursive: true, force: true });
    fs.mkdirSync(TEST_ROOT_BASE, { recursive: true });
    testRoot = fs.mkdtempSync(path.join(TEST_ROOT_BASE, 'project-'));
    process.env.HOME = testRoot;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    fs.rmSync(TEST_ROOT_BASE, { recursive: true, force: true });
    if (originalHome === undefined) {
      delete process.env.HOME;
      return;
    }
    process.env.HOME = originalHome;
  });

  it('injects default autoLoadSkills and materializes Hive bundled skills in unified mode', async () => {
    writeHiveConfig(testRoot, { agentMode: 'unified' });

    const opencodeConfig = await applyConfigHook(testRoot);
    const hiveMasterPrompt = getAgentPrompt(opencodeConfig, 'hive-master');
    const scoutPrompt = getAgentPrompt(opencodeConfig, 'scout-researcher');
    const foragerPrompt = getAgentPrompt(opencodeConfig, 'forager-worker');
    const parallelExplorationSkill = requireBuiltinSkill('parallel-exploration');
    const tddSkill = requireBuiltinSkill('test-driven-development');
    const verificationSkill = requireBuiltinSkill('verification-before-completion');

    expect(hiveMasterPrompt).toContain(parallelExplorationSkill.template);
    expect(scoutPrompt).not.toContain(parallelExplorationSkill.template);
    expect(foragerPrompt).toContain(tddSkill.template);
    expect(foragerPrompt).toContain(verificationSkill.template);
    expect(foragerPrompt).not.toContain(parallelExplorationSkill.template);

    const skillPaths = getSkillPaths(opencodeConfig);
    expect(skillPaths).toHaveLength(1);
    expect(skillPaths[0]).toContain(HIVE_GENERATED_SEGMENT);
    expect(fs.existsSync(skillPaths[0])).toBe(true);
    expect(fs.existsSync(path.join(skillPaths[0], 'parallel-exploration', 'SKILL.md'))).toBe(true);
    expect(skillPaths).not.toContain(PACKAGED_SKILLS_DIR);
  });

  it('registers custom subagents and injects only eligible delta autoload skills without duplicating inherited base skills', async () => {
    createFileSkill(
      path.join(testRoot, '.opencode', 'skills'),
      'native-file-skill',
      'A native project skill that Hive should not inject into custom subagents',
      '# Native File Skill\n\nThis must stay out of the prompt.',
    );
    writeHiveConfig(testRoot, {
      agentMode: 'unified',
      agents: {
        'forager-worker': {
          autoLoadSkills: ['brainstorming'],
        },
      },
      customAgents: {
        'forager-ui': {
          baseAgent: 'forager-worker',
          description: 'Use for UI-heavy implementation tasks.',
          autoLoadSkills: ['brainstorming', 'parallel-exploration', 'native-file-skill'],
        },
        'reviewer-security': {
          baseAgent: 'hygienic-reviewer',
          description: 'Use for security-focused review passes.',
          autoLoadSkills: [],
        },
      },
    });

    const { result: opencodeConfig, warnings } = await captureWarnings(async () => applyConfigHook(testRoot));
    const hivePrompt = getAgentPrompt(opencodeConfig, 'hive-master');
    const foragerUiPrompt = getAgentPrompt(opencodeConfig, 'forager-ui');
    const brainstormingSkill = requireBuiltinSkill('brainstorming');
    const parallelExplorationSkill = requireBuiltinSkill('parallel-exploration');
    const tddSkill = requireBuiltinSkill('test-driven-development');

    expect((opencodeConfig.agent as Record<string, unknown>)['forager-ui']).toBeDefined();
    expect((opencodeConfig.agent as Record<string, unknown>)['reviewer-security']).toBeDefined();
    expect(hivePrompt).toContain('## Configured Custom Subagents');
    expect(hivePrompt).toContain('forager-ui');
    expect(hivePrompt).toContain('reviewer-security');
    expect(countOccurrences(foragerUiPrompt, brainstormingSkill.template)).toBe(1);
    expect(countOccurrences(foragerUiPrompt, parallelExplorationSkill.template)).toBe(1);
    expect(countOccurrences(foragerUiPrompt, tddSkill.template)).toBe(1);
    expect(foragerUiPrompt).not.toContain('# Native File Skill');
    expect(warnings.some((message) => message.includes('native-file-skill'))).toBe(true);
  });

  it('injects user-configured bundled autoLoadSkills on top of defaults', async () => {
    writeHiveConfig(testRoot, {
      agentMode: 'unified',
      agents: {
        'forager-worker': {
          autoLoadSkills: ['brainstorming'],
        },
      },
    });

    const opencodeConfig = await applyConfigHook(testRoot);
    const foragerPrompt = getAgentPrompt(opencodeConfig, 'forager-worker');
    const brainstormingSkill = requireBuiltinSkill('brainstorming');
    const tddSkill = requireBuiltinSkill('test-driven-development');
    const verificationSkill = requireBuiltinSkill('verification-before-completion');

    expect(foragerPrompt).toContain(brainstormingSkill.template);
    expect(foragerPrompt).toContain(tddSkill.template);
    expect(foragerPrompt).toContain(verificationSkill.template);
  });

  it('respects disableSkills for prompt injection and generated skill directories', async () => {
    writeHiveConfig(testRoot, {
      agentMode: 'unified',
      disableSkills: ['parallel-exploration'],
    });

    const opencodeConfig = await applyConfigHook(testRoot);
    const hiveMasterPrompt = getAgentPrompt(opencodeConfig, 'hive-master');
    const parallelExplorationSkill = requireBuiltinSkill('parallel-exploration');
    const generatedPath = getSkillPaths(opencodeConfig)[0];

    expect(hiveMasterPrompt).not.toContain(parallelExplorationSkill.template);
    expect(fs.existsSync(path.join(generatedPath, 'parallel-exploration'))).toBe(false);
  });

  it('warns on unknown custom file skills and does not inject or materialize their content', async () => {
    createFileSkill(
      path.join(testRoot, '.opencode', 'skills'),
      'nonexistent-skill',
      'A native project skill that Hive should not autoload',
      '# Native Skill\n\nThis must stay out of the prompt.',
    );
    writeHiveConfig(testRoot, {
      agentMode: 'unified',
      agents: {
        'hive-master': {
          autoLoadSkills: ['nonexistent-skill'],
        },
      },
    });

    const { result: opencodeConfig, warnings } = await captureWarnings(async () => applyConfigHook(testRoot));
    const hiveMasterPrompt = getAgentPrompt(opencodeConfig, 'hive-master');
    const generatedPath = getCurrentHiveManagedPath(opencodeConfig);

    expect((opencodeConfig.agent as Record<string, unknown>)['hive-master']).toBeDefined();
    expect(generatedPath).toBeDefined();
    expect(fs.existsSync(path.join(generatedPath!, 'nonexistent-skill'))).toBe(false);
    expect(hiveMasterPrompt).not.toContain('# Native Skill');
    expect(warnings.some((message) => message.includes('nonexistent-skill'))).toBe(true);
    expect(warnings.some((message) => message.includes('native skill tool'))).toBe(true);
  });

  it('injects autoLoadSkills for dedicated-mode agents', async () => {
    writeHiveConfig(testRoot, { agentMode: 'dedicated' });

    const opencodeConfig = await applyConfigHook(testRoot);
    const architectPrompt = getAgentPrompt(opencodeConfig, 'architect-planner');
    const swarmPrompt = getAgentPrompt(opencodeConfig, 'swarm-orchestrator');
    const parallelExplorationSkill = requireBuiltinSkill('parallel-exploration');

    expect(architectPrompt).toContain(parallelExplorationSkill.template);
    expect(swarmPrompt).not.toContain(parallelExplorationSkill.template);
  });

  it('injects bundled skill bodies directly into config-hook prompts', async () => {
    writeHiveConfig(testRoot, {
      agentMode: 'unified',
      agents: {
        'hive-master': {
          autoLoadSkills: ['brainstorming'],
        },
      },
    });

    const opencodeConfig = await applyConfigHook(testRoot);
    const hiveMasterPrompt = getAgentPrompt(opencodeConfig, 'hive-master');
    const brainstormingSkill = requireBuiltinSkill('brainstorming');
    const parallelExplorationSkill = requireBuiltinSkill('parallel-exploration');

    expect(hiveMasterPrompt).toContain(brainstormingSkill.template);
    expect(hiveMasterPrompt).toContain(parallelExplorationSkill.template);
  });

  it('does not use the removed system.transform autoload path', async () => {
    writeHiveConfig(testRoot, {
      agentMode: 'unified',
      agents: {
        'hive-master': {
          autoLoadSkills: ['brainstorming', 'parallel-exploration'],
        },
      },
    });

    const hooks = await plugin(createCtx(testRoot));
    expect(hooks['experimental.chat.system.transform' as keyof typeof hooks]).toBeUndefined();

    const opencodeConfig: Record<string, unknown> = { agent: {} };
    await hooks.config!(opencodeConfig);
    const hiveMasterPrompt = getAgentPrompt(opencodeConfig, 'hive-master');

    expect(hiveMasterPrompt).toContain('## Hive — Active Session');
    expect(hiveMasterPrompt).toContain(requireBuiltinSkill('brainstorming').template);
    expect(hiveMasterPrompt).toContain(requireBuiltinSkill('parallel-exploration').template);
  });
});

describe('config hook native skill registration', () => {
  let testRoot: string;
  let originalHome: string | undefined;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalHome = process.env.HOME;
    originalFetch = globalThis.fetch;
    fs.rmSync(TEST_ROOT_BASE, { recursive: true, force: true });
    fs.mkdirSync(TEST_ROOT_BASE, { recursive: true });
    testRoot = fs.mkdtempSync(path.join(TEST_ROOT_BASE, 'project-'));
    process.env.HOME = testRoot;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    fs.rmSync(TEST_ROOT_BASE, { recursive: true, force: true });
    if (originalHome === undefined) {
      delete process.env.HOME;
      return;
    }
    process.env.HOME = originalHome;
  });

  it('preserves user skill paths after the Hive generated path when URL scans complete and preserves skills.urls exactly', async () => {
    writeHiveConfig(testRoot, { agentMode: 'unified' });
    const userPathOne = path.join(testRoot, 'user-path-one');
    const userPathTwo = path.join(testRoot, 'user-path-two');
    const staleHivePath = path.join(testRoot, '.hive', 'generated', 'opencode-skills', 'old-hash');
    fs.mkdirSync(userPathOne, { recursive: true });
    fs.mkdirSync(userPathTwo, { recursive: true });
    fs.mkdirSync(staleHivePath, { recursive: true });
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url === 'https://example.test/skills/index.json') {
        return new Response(JSON.stringify({ skills: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response('not found', { status: 404 });
    }) as unknown as typeof fetch;

    const opencodeConfig = await applyConfigHook(testRoot, {
      agent: {},
      skills: {
        paths: [staleHivePath, userPathOne, userPathTwo],
        urls: ['https://example.test/skills'],
      },
    });

    const skillPaths = getSkillPaths(opencodeConfig);
    const hiveManagedPaths = getHiveManagedPaths(skillPaths);

    expect(hiveManagedPaths).toHaveLength(1);
    expect(skillPaths).toEqual([hiveManagedPaths[0], userPathOne, userPathTwo]);
    expect(skillPaths).not.toContain(staleHivePath);
    expect(getSkillUrls(opencodeConfig)).toEqual(['https://example.test/skills']);
  });

  it('skips conflicting Hive bundled skills when a native project skill already exists and warns with the native source path', async () => {
    const nativeSkillPath = path.join(testRoot, '.opencode', 'skills', 'parallel-exploration', 'SKILL.md');
    createFileSkill(
      path.join(testRoot, '.opencode', 'skills'),
      'parallel-exploration',
      'Project-native parallel exploration',
      '# Native Parallel Exploration\n\nThis native copy should win.',
    );
    writeHiveConfig(testRoot, { agentMode: 'unified' });

    const { result: opencodeConfig, warnings } = await captureWarnings(async () => applyConfigHook(testRoot));
    const generatedPath = getCurrentHiveManagedPath(opencodeConfig);
    const hiveMasterPrompt = getAgentPrompt(opencodeConfig, 'hive-master');
    const parallelExplorationSkill = requireBuiltinSkill('parallel-exploration');

    expect(generatedPath).toBeDefined();
    expect(fs.existsSync(path.join(generatedPath!, 'parallel-exploration'))).toBe(false);
    expect(hiveMasterPrompt).not.toContain(parallelExplorationSkill.template);
    expect(hiveMasterPrompt).not.toContain('# Native Parallel Exploration');
    expect(warnings.some((message) => message.includes('parallel-exploration'))).toBe(true);
    expect(warnings.some((message) => message.includes(nativeSkillPath))).toBe(true);
  });

  it('does not autoload native project skills and does not copy them into Hive generated paths', async () => {
    createFileSkill(
      path.join(testRoot, '.opencode', 'skills'),
      'my-custom-skill',
      'A native project skill',
      '# My Custom Skill\n\nNative project content.',
    );
    writeHiveConfig(testRoot, {
      agentMode: 'unified',
      agents: {
        'hive-master': {
          autoLoadSkills: ['my-custom-skill'],
        },
      },
    });

    const { result: opencodeConfig, warnings } = await captureWarnings(async () => applyConfigHook(testRoot));
    const generatedPath = getCurrentHiveManagedPath(opencodeConfig);
    const hiveMasterPrompt = getAgentPrompt(opencodeConfig, 'hive-master');

    expect(generatedPath).toBeDefined();
    expect(fs.existsSync(path.join(generatedPath!, 'my-custom-skill'))).toBe(false);
    expect(hiveMasterPrompt).not.toContain('# My Custom Skill');
    expect(warnings.some((message) => message.includes('my-custom-skill'))).toBe(true);
    expect(warnings.some((message) => message.includes('native skill tool'))).toBe(true);
  });

  it('uses the parsed SKILL.md frontmatter name for URL conflicts even when index.json uses a different directory name', async () => {
    writeHiveConfig(testRoot, { agentMode: 'unified' });
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);

      if (url === 'https://example.test/skills/index.json') {
        return new Response(
          JSON.stringify({
            skills: [{ name: 'index-name-only', files: ['SKILL.md'] }],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      if (url === 'https://example.test/skills/index-name-only/SKILL.md') {
        return new Response(
          `---
name: parallel-exploration
description: URL conflict
---
# URL conflict
`,
          { status: 200 },
        );
      }

      return new Response('not found', { status: 404 });
    }) as unknown as typeof fetch;

    const { result: opencodeConfig, warnings } = await captureWarnings(async () => applyConfigHook(testRoot, {
      agent: {},
      skills: {
        urls: ['https://example.test/skills'],
      },
    }));
    const generatedPath = getCurrentHiveManagedPath(opencodeConfig);
    const hiveMasterPrompt = getAgentPrompt(opencodeConfig, 'hive-master');
    const parallelExplorationSkill = requireBuiltinSkill('parallel-exploration');

    expect(generatedPath).toBeDefined();
    expect(fs.existsSync(path.join(generatedPath!, 'parallel-exploration'))).toBe(false);
    expect(hiveMasterPrompt).not.toContain(parallelExplorationSkill.template);
    expect(warnings.some((message) => message.includes('parallel-exploration'))).toBe(true);
  });

  it('preserves user paths and urls but skips Hive materialization when URL conflict scanning is incomplete', async () => {
    writeHiveConfig(testRoot, { agentMode: 'unified' });
    const userPath = path.join(testRoot, 'user-skill-path');
    const staleHivePath = path.join(testRoot, '.hive', 'generated', 'opencode-skills', 'stale-hash');
    fs.mkdirSync(userPath, { recursive: true });
    fs.mkdirSync(staleHivePath, { recursive: true });
    globalThis.fetch = (async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;

    const { result: opencodeConfig, warnings } = await captureWarnings(async () => applyConfigHook(testRoot, {
      agent: {},
      skills: {
        paths: [staleHivePath, userPath],
        urls: ['https://example.test/skills'],
      },
    }));
    const hiveMasterPrompt = getAgentPrompt(opencodeConfig, 'hive-master');

    expect(getHiveManagedPaths(getSkillPaths(opencodeConfig))).toHaveLength(0);
    expect(getSkillPaths(opencodeConfig)).toEqual([userPath]);
    expect(getSkillUrls(opencodeConfig)).toEqual(['https://example.test/skills']);
    expect(hiveMasterPrompt).not.toContain(requireBuiltinSkill('parallel-exploration').template);
    expect(warnings).toContainEqual(
      expect.stringContaining(
        '[hive] Skipping Hive bundled native skill materialization because configured skills URL could not be scanned for conflicts:',
      ),
    );
  });
});
