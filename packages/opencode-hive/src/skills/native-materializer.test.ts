import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  parseNativeSkillMarkdown,
  prepareNativeHiveSkills,
  resolvePackagedSkillsDir,
} from './native-materializer.js';

const VALID_SKILL = `---
name: sample-skill
description: Sample description
---
# Sample Skill

Body content.
`;

const FALLBACK_SKILL = `---
name: fallback-skill
description: Value: with colon
---
# Fallback Skill
`;

const INVALID_SKILL = `---
name:
  - broken
description:
---
# Broken
`;

let tempDirs: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'native-materializer-test-'));
  tempDirs.push(dir);
  return dir;
}

function createSkillFile(baseDir: string, relativePath: string, content: string): string {
  const fullPath = path.join(baseDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
  return fullPath;
}

function createBundledSkillDir(
  bundledSkillsDir: string,
  directoryName: string,
  frontmatterName = directoryName,
  description = `${frontmatterName} description`,
): string {
  const skillDir = path.join(bundledSkillsDir, directoryName);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, 'SKILL.md'),
    `---
name: ${frontmatterName}
description: ${description}
---
# ${frontmatterName}

Template for ${frontmatterName}.
`,
    'utf8',
  );
  return skillDir;
}

function createNativeSkill(rootDir: string, relativePath: string, frontmatterName: string): string {
  return createSkillFile(
    rootDir,
    relativePath,
    `---
name: ${frontmatterName}
description: Native ${frontmatterName}
---
# ${frontmatterName}
`,
  );
}

function listRelativeFiles(rootDir: string): string[] {
  const results: string[] = [];

  function walk(currentDir: string): void {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      results.push(path.relative(rootDir, fullPath));
    }
  }

  if (fs.existsSync(rootDir)) {
    walk(rootDir);
  }

  return results.sort();
}

type WarningRecorder = {
  logger: { warn: (message: string) => void };
  warnings: string[];
};

function createWarningRecorder(): WarningRecorder {
  const warnings: string[] = [];
  return {
    warnings,
    logger: {
      warn(message: string) {
        warnings.push(message);
      },
    },
  };
}

beforeEach(() => {
  tempDirs = [];
});

afterEach(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tempDirs = [];
});

describe('parseNativeSkillMarkdown', () => {
  it('returns name, description, and body for valid frontmatter', () => {
    const parsed = parseNativeSkillMarkdown('/tmp/sample/SKILL.md', VALID_SKILL);

    expect(parsed).toBeDefined();
    expect(parsed!.name).toBe('sample-skill');
    expect(parsed!.description).toBe('Sample description');
    expect(parsed!.content).toContain('# Sample Skill');
    expect(parsed!.content).toContain('Body content.');
  });

  it('accepts an unquoted colon value through fallback sanitization', () => {
    const parsed = parseNativeSkillMarkdown('/tmp/fallback/SKILL.md', FALLBACK_SKILL);

    expect(parsed).toBeDefined();
    expect(parsed!.name).toBe('fallback-skill');
    expect(parsed!.description).toBe('Value: with colon');
  });

  it('returns undefined and warns when frontmatter is invalid', () => {
    const recorder = createWarningRecorder();
    const parsed = parseNativeSkillMarkdown('/tmp/broken/SKILL.md', INVALID_SKILL, recorder.logger);

    expect(parsed).toBeUndefined();
    expect(recorder.warnings).toHaveLength(1);
    expect(recorder.warnings[0]).toContain('Skipping native skill');
    expect(recorder.warnings[0]).toContain('/tmp/broken/SKILL.md');
  });

  it('uses the parsed frontmatter name instead of the directory name', () => {
    const parsed = parseNativeSkillMarkdown(
      '/tmp/directory-name/SKILL.md',
      `---
name: parsed-name
description: Parsed description
---
# Parsed
`,
    );

    expect(parsed).toBeDefined();
    expect(parsed!.name).toBe('parsed-name');
  });
});

describe('resolvePackagedSkillsDir', () => {
  it('finds packages/opencode-hive/skills from a source module URL', () => {
    const root = createTempDir();
    const modulePath = path.join(root, 'packages', 'opencode-hive', 'src', 'skills', 'native-materializer.ts');
    const skillsDir = path.join(root, 'packages', 'opencode-hive', 'skills');

    fs.mkdirSync(path.dirname(modulePath), { recursive: true });
    fs.writeFileSync(modulePath, '', 'utf8');
    fs.mkdirSync(skillsDir, { recursive: true });

    expect(resolvePackagedSkillsDir(new URL(`file://${modulePath}`))).toBe(skillsDir);
  });

  it('finds sibling skills from a bundled dist index.js URL', () => {
    const root = createTempDir();
    const modulePath = path.join(root, 'packages', 'opencode-hive', 'dist', 'index.js');
    const skillsDir = path.join(root, 'packages', 'opencode-hive', 'skills');

    fs.mkdirSync(path.dirname(modulePath), { recursive: true });
    fs.writeFileSync(modulePath, '', 'utf8');
    fs.mkdirSync(skillsDir, { recursive: true });

    expect(resolvePackagedSkillsDir(new URL(`file://${modulePath}`))).toBe(skillsDir);
  });
});

describe('prepareNativeHiveSkills - materialization behavior', () => {
  it('copies whole eligible skill directories, including support files', async () => {
    const worktree = createTempDir();
    const directory = worktree;
    const bundledSkillsDir = path.join(worktree, 'fixtures', 'bundled-skills');
    const skillDir = createBundledSkillDir(bundledSkillsDir, 'copy-me');

    createSkillFile(skillDir, 'reference/example.md', '# Reference\n');

    const result = await prepareNativeHiveSkills({
      directory,
      worktree,
      packagedSkillsDir: bundledSkillsDir,
      env: { HOME: worktree },
    });

    expect(result.urlScanComplete).toBe(true);
    expect(result.materializedPath).toBeDefined();
    expect(result.skillsByName.has('copy-me')).toBe(true);
    expect(listRelativeFiles(result.materializedPath!)).toEqual([
      'copy-me/SKILL.md',
      'copy-me/reference/example.md',
    ]);
  });

  it('excludes disabled Hive skills without affecting native path permissions', async () => {
    const worktree = createTempDir();
    const bundledSkillsDir = path.join(worktree, 'fixtures', 'bundled-skills');
    const userSkillRoot = path.join(worktree, 'user-skills');

    createBundledSkillDir(bundledSkillsDir, 'disabled-skill');
    createBundledSkillDir(bundledSkillsDir, 'enabled-skill');
    createNativeSkill(userSkillRoot, 'native-skill/SKILL.md', 'native-skill');

    const result = await prepareNativeHiveSkills({
      directory: worktree,
      worktree,
      packagedSkillsDir: bundledSkillsDir,
      disableSkills: ['disabled-skill'],
      env: { HOME: worktree },
      opencodeConfig: {
        skills: {
          paths: [userSkillRoot],
        },
      },
    });

    expect(result.materializedPath).toBeDefined();
    expect(result.skillsByName.has('enabled-skill')).toBe(true);
    expect(result.skillsByName.has('disabled-skill')).toBe(false);
    expect(result.skipped).toContainEqual({ name: 'disabled-skill', reason: 'disabled' });
    expect(result.skillPaths).toContain(userSkillRoot);
    expect(fs.readdirSync(result.materializedPath!)).toEqual(['enabled-skill']);
  });

  it('preserves user skill paths, removes stale Hive paths, and prepends the current generated path', async () => {
    const worktree = createTempDir();
    const bundledSkillsDir = path.join(worktree, 'fixtures', 'bundled-skills');
    const userPathOne = path.join(worktree, 'user-path-one');
    const userPathTwo = path.join(worktree, 'user-path-two');
    const staleHivePath = path.join(worktree, '.hive', 'generated', 'opencode-skills', 'old-hash');

    createBundledSkillDir(bundledSkillsDir, 'new-skill');
    fs.mkdirSync(userPathOne, { recursive: true });
    fs.mkdirSync(userPathTwo, { recursive: true });
    fs.mkdirSync(staleHivePath, { recursive: true });

    const result = await prepareNativeHiveSkills({
      directory: worktree,
      worktree,
      packagedSkillsDir: bundledSkillsDir,
      env: { HOME: worktree },
      opencodeConfig: {
        skills: {
          paths: [staleHivePath, userPathOne, userPathTwo],
        },
      },
    });

    expect(result.materializedPath).toBeDefined();
    expect(result.skillPaths).toEqual([result.materializedPath!, userPathOne, userPathTwo]);
  });
});

describe('prepareNativeHiveSkills - native discovery parity', () => {
  it('detects conflicts in project .opencode/skills and .opencode/skill using parsed skill names', async () => {
    const worktree = createTempDir();
    const directory = path.join(worktree, 'apps', 'nested');
    const bundledSkillsDir = path.join(worktree, 'fixtures', 'bundled-skills');

    fs.mkdirSync(directory, { recursive: true });
    createBundledSkillDir(bundledSkillsDir, 'bundled-directory', 'frontmatter-conflict');
    createNativeSkill(worktree, '.opencode/skills/alpha/SKILL.md', 'frontmatter-conflict');
    createNativeSkill(worktree, '.opencode/skill/beta/SKILL.md', 'other-conflict');

    const result = await prepareNativeHiveSkills({
      directory,
      worktree,
      packagedSkillsDir: bundledSkillsDir,
      env: { HOME: worktree },
    });

    expect(result.skillsByName.has('frontmatter-conflict')).toBe(false);
    expect(result.skipped).toContainEqual({
      name: 'frontmatter-conflict',
      reason: 'conflict',
      source: path.join(worktree, '.opencode', 'skills', 'alpha', 'SKILL.md'),
    });
  });

  it('scans the OpenCode config directory from OPENCODE_CONFIG_DIR', async () => {
    const worktree = createTempDir();
    const bundledSkillsDir = path.join(worktree, 'fixtures', 'bundled-skills');
    const configDir = path.join(worktree, 'config-dir');

    createBundledSkillDir(bundledSkillsDir, 'config-conflict');
    createNativeSkill(configDir, 'skills/config-conflict/SKILL.md', 'config-conflict');

    const result = await prepareNativeHiveSkills({
      directory: worktree,
      worktree,
      packagedSkillsDir: bundledSkillsDir,
      env: {
        HOME: worktree,
        OPENCODE_CONFIG_DIR: configDir,
      },
    });

    expect(result.skillsByName.has('config-conflict')).toBe(false);
    expect(result.skipped).toContainEqual({
      name: 'config-conflict',
      reason: 'conflict',
      source: path.join(configDir, 'skills', 'config-conflict', 'SKILL.md'),
    });
  });

  it('scans the XDG or default global OpenCode config directory', async () => {
    const worktree = createTempDir();
    const bundledSkillsDir = path.join(worktree, 'fixtures', 'bundled-skills');
    const xdgRoot = path.join(worktree, 'xdg-home');
    const configRoot = path.join(xdgRoot, 'opencode');

    createBundledSkillDir(bundledSkillsDir, 'xdg-conflict');
    createNativeSkill(configRoot, 'skills/xdg-conflict/SKILL.md', 'xdg-conflict');

    const result = await prepareNativeHiveSkills({
      directory: worktree,
      worktree,
      packagedSkillsDir: bundledSkillsDir,
      env: {
        HOME: path.join(worktree, 'home'),
        XDG_CONFIG_HOME: xdgRoot,
      },
    });

    expect(result.skillsByName.has('xdg-conflict')).toBe(false);
  });

  it('walks project .claude and .agents skill directories from directory to worktree', async () => {
    const worktree = createTempDir();
    const directory = path.join(worktree, 'packages', 'feature', 'src');
    const bundledSkillsDir = path.join(worktree, 'fixtures', 'bundled-skills');

    fs.mkdirSync(directory, { recursive: true });
    createBundledSkillDir(bundledSkillsDir, 'claude-conflict');
    createBundledSkillDir(bundledSkillsDir, 'agents-conflict');
    createNativeSkill(path.join(worktree, 'packages', 'feature', '.claude'), 'skills/claude-conflict/SKILL.md', 'claude-conflict');
    createNativeSkill(path.join(worktree, '.agents'), 'skills/agents-conflict/SKILL.md', 'agents-conflict');

    const result = await prepareNativeHiveSkills({
      directory,
      worktree,
      packagedSkillsDir: bundledSkillsDir,
      env: { HOME: worktree },
    });

    expect(result.skillsByName.has('claude-conflict')).toBe(false);
    expect(result.skillsByName.has('agents-conflict')).toBe(false);
  });

  it('scans global ~/.claude and ~/.agents skill directories', async () => {
    const worktree = createTempDir();
    const homeDir = path.join(worktree, 'home');
    const bundledSkillsDir = path.join(worktree, 'fixtures', 'bundled-skills');

    createBundledSkillDir(bundledSkillsDir, 'global-claude');
    createBundledSkillDir(bundledSkillsDir, 'global-agents');
    createNativeSkill(homeDir, '.claude/skills/global-claude/SKILL.md', 'global-claude');
    createNativeSkill(homeDir, '.agents/skills/global-agents/SKILL.md', 'global-agents');

    const result = await prepareNativeHiveSkills({
      directory: worktree,
      worktree,
      packagedSkillsDir: bundledSkillsDir,
      env: { HOME: homeDir },
    });

    expect(result.skillsByName.has('global-claude')).toBe(false);
    expect(result.skillsByName.has('global-agents')).toBe(false);
  });

  it('disables both .claude and .agents scans with OPENCODE_DISABLE_EXTERNAL_SKILLS', async () => {
    const worktree = createTempDir();
    const homeDir = path.join(worktree, 'home');
    const bundledSkillsDir = path.join(worktree, 'fixtures', 'bundled-skills');

    createBundledSkillDir(bundledSkillsDir, 'external-conflict');
    createNativeSkill(homeDir, '.claude/skills/external-conflict/SKILL.md', 'external-conflict');
    createNativeSkill(homeDir, '.agents/skills/external-conflict/SKILL.md', 'external-conflict');

    const result = await prepareNativeHiveSkills({
      directory: worktree,
      worktree,
      packagedSkillsDir: bundledSkillsDir,
      env: {
        HOME: homeDir,
        OPENCODE_DISABLE_EXTERNAL_SKILLS: '1',
      },
    });

    expect(result.skillsByName.has('external-conflict')).toBe(true);
  });

  it('disables only .claude scans when the Claude external flags are set', async () => {
    const worktree = createTempDir();
    const homeDir = path.join(worktree, 'home');
    const bundledSkillsDir = path.join(worktree, 'fixtures', 'bundled-skills');

    createBundledSkillDir(bundledSkillsDir, 'claude-only-conflict');
    createBundledSkillDir(bundledSkillsDir, 'agents-only-conflict');
    createNativeSkill(homeDir, '.claude/skills/claude-only-conflict/SKILL.md', 'claude-only-conflict');
    createNativeSkill(homeDir, '.agents/skills/agents-only-conflict/SKILL.md', 'agents-only-conflict');

    const result = await prepareNativeHiveSkills({
      directory: worktree,
      worktree,
      packagedSkillsDir: bundledSkillsDir,
      env: {
        HOME: homeDir,
        OPENCODE_DISABLE_CLAUDE_CODE_SKILLS: '1',
      },
    });

    expect(result.skillsByName.has('claude-only-conflict')).toBe(true);
    expect(result.skillsByName.has('agents-only-conflict')).toBe(false);
  });

  it('expands ~/ paths and resolves relative config skill paths from directory', async () => {
    const worktree = createTempDir();
    const directory = path.join(worktree, 'packages', 'app');
    const homeDir = path.join(worktree, 'home');
    const bundledSkillsDir = path.join(worktree, 'fixtures', 'bundled-skills');

    fs.mkdirSync(directory, { recursive: true });
    createBundledSkillDir(bundledSkillsDir, 'home-conflict');
    createBundledSkillDir(bundledSkillsDir, 'relative-conflict');
    createNativeSkill(homeDir, 'custom-skills/home-conflict/SKILL.md', 'home-conflict');
    createNativeSkill(directory, 'relative-skills/relative-conflict/SKILL.md', 'relative-conflict');

    const result = await prepareNativeHiveSkills({
      directory,
      worktree,
      packagedSkillsDir: bundledSkillsDir,
      env: { HOME: homeDir },
      opencodeConfig: {
        skills: {
          paths: ['~/custom-skills', './relative-skills'],
        },
      },
    });

    expect(result.skillsByName.has('home-conflict')).toBe(false);
    expect(result.skillsByName.has('relative-conflict')).toBe(false);
    expect(result.skillPaths).toContain(path.join(homeDir, 'custom-skills'));
    expect(result.skillPaths).toContain(path.join(directory, 'relative-skills'));
  });

  it('ignores stale Hive generated paths during conflict scanning and removes them from returned paths', async () => {
    const worktree = createTempDir();
    const bundledSkillsDir = path.join(worktree, 'fixtures', 'bundled-skills');
    const staleHivePath = path.join(worktree, '.hive', 'generated', 'opencode-skills', 'stale-hash');

    createBundledSkillDir(bundledSkillsDir, 'stale-conflict');
    createNativeSkill(staleHivePath, 'stale-conflict/SKILL.md', 'stale-conflict');

    const result = await prepareNativeHiveSkills({
      directory: worktree,
      worktree,
      packagedSkillsDir: bundledSkillsDir,
      env: { HOME: worktree },
      opencodeConfig: {
        skills: {
          paths: [staleHivePath],
        },
      },
    });

    expect(result.skillsByName.has('stale-conflict')).toBe(true);
    expect(result.skillPaths).not.toContain(staleHivePath);
  });
});

describe('prepareNativeHiveSkills - skills.urls parity', () => {
  it('scans URL skills via index.json and uses parsed SKILL.md frontmatter names for conflicts', async () => {
    const worktree = createTempDir();
    const bundledSkillsDir = path.join(worktree, 'fixtures', 'bundled-skills');
    const fetchCalls: string[] = [];

    createBundledSkillDir(bundledSkillsDir, 'url-conflict');

    const result = await prepareNativeHiveSkills({
      directory: worktree,
      worktree,
      packagedSkillsDir: bundledSkillsDir,
      opencodeConfig: {
        skills: {
          urls: ['https://example.test/skills'],
        },
      },
      env: { HOME: worktree },
      fetchImpl: async (input: string | URL | Request) => {
        const url = String(input);
        fetchCalls.push(url);

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
name: url-conflict
description: URL conflict
---
# URL conflict
`,
            { status: 200 },
          );
        }

        return new Response('not found', { status: 404 });
      },
    });

    expect(result.urlScanComplete).toBe(true);
    expect(result.skillsByName.has('url-conflict')).toBe(false);
    expect(result.skipped).toContainEqual({
      name: 'url-conflict',
      reason: 'conflict',
      source: 'https://example.test/skills/index-name-only/SKILL.md',
    });
    expect(fetchCalls).toEqual([
      'https://example.test/skills/index.json',
      'https://example.test/skills/index-name-only/SKILL.md',
    ]);
  });

  it('warns and ignores URL index entries that do not list SKILL.md', async () => {
    const worktree = createTempDir();
    const bundledSkillsDir = path.join(worktree, 'fixtures', 'bundled-skills');
    const recorder = createWarningRecorder();

    createBundledSkillDir(bundledSkillsDir, 'url-skill');

    const result = await prepareNativeHiveSkills({
      directory: worktree,
      worktree,
      packagedSkillsDir: bundledSkillsDir,
      logger: recorder.logger,
      env: { HOME: worktree },
      opencodeConfig: {
        skills: {
          urls: ['https://example.test/skills'],
        },
      },
      fetchImpl: async (input: string | URL | Request) => {
        const url = String(input);
        if (url === 'https://example.test/skills/index.json') {
          return new Response(
            JSON.stringify({
              skills: [{ name: 'missing-md', files: ['README.md'] }],
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }
        return new Response('not found', { status: 404 });
      },
    });

    expect(result.urlScanComplete).toBe(true);
    expect(result.skillsByName.has('url-skill')).toBe(true);
    expect(recorder.warnings.some((message) => message.includes('missing SKILL.md'))).toBe(true);
  });

  it('skips Hive materialization when a configured skills URL cannot be scanned', async () => {
    const worktree = createTempDir();
    const bundledSkillsDir = path.join(worktree, 'fixtures', 'bundled-skills');
    const userPath = path.join(worktree, 'user-skill-path');
    const recorder = createWarningRecorder();
    const originalConfig = {
      skills: {
        paths: [userPath],
        urls: ['https://example.test/skills'],
      },
    };

    createBundledSkillDir(bundledSkillsDir, 'would-be-skipped');
    fs.mkdirSync(userPath, { recursive: true });

    const result = await prepareNativeHiveSkills({
      directory: worktree,
      worktree,
      packagedSkillsDir: bundledSkillsDir,
      logger: recorder.logger,
      env: { HOME: worktree },
      opencodeConfig: originalConfig,
      fetchImpl: async () => {
        throw new Error('network down');
      },
    });

    expect(result.urlScanComplete).toBe(false);
    expect(result.materializedPath).toBeUndefined();
    expect(result.skillsByName.size).toBe(0);
    expect(result.skillPaths).toEqual([userPath]);
    expect(recorder.warnings).toHaveLength(1);
    expect(recorder.warnings[0]).toContain(
      '[hive] Skipping Hive bundled native skill materialization because configured skills URL could not be scanned for conflicts:',
    );
    expect(originalConfig.skills.paths).toEqual([userPath]);
    expect(originalConfig.skills.urls).toEqual(['https://example.test/skills']);
  });

  it('times out never-resolving URL requests with an injected per-request timeout', async () => {
    const worktree = createTempDir();
    const bundledSkillsDir = path.join(worktree, 'fixtures', 'bundled-skills');
    const userPath = path.join(worktree, 'user-skill-path');
    const recorder = createWarningRecorder();
    const originalConfig = {
      skills: {
        paths: [userPath],
        urls: ['https://example.test/skills'],
      },
    };

    createBundledSkillDir(bundledSkillsDir, 'would-time-out');
    fs.mkdirSync(userPath, { recursive: true });

    let result:
      | Awaited<ReturnType<typeof prepareNativeHiveSkills>>
      | undefined;
    const resultPromise = prepareNativeHiveSkills({
      directory: worktree,
      worktree,
      packagedSkillsDir: bundledSkillsDir,
      logger: recorder.logger,
      env: { HOME: worktree },
      opencodeConfig: originalConfig,
      urlFetchTimeoutMs: 10,
      fetchImpl: async (_input: string | URL | Request, init?: RequestInit) => {
        return await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => {
              reject(new Error('request timed out'));
            },
            { once: true },
          );
        });
      },
    });

    const outcome = await Promise.race([
      resultPromise.then((value) => {
        result = value;
        return 'resolved' as const;
      }),
      new Promise<'timed-out'>((resolve) => {
        setTimeout(() => resolve('timed-out'), 100);
      }),
    ]);

    expect(outcome).toBe('resolved');
    expect(result).toBeDefined();
    expect(result!.urlScanComplete).toBe(false);
    expect(result!.materializedPath).toBeUndefined();
    expect(result!.skillsByName.size).toBe(0);
    expect(result!.skillPaths).toEqual([userPath]);
    expect(recorder.warnings).toHaveLength(1);
    expect(recorder.warnings[0]).toContain(
      '[hive] Skipping Hive bundled native skill materialization because configured skills URL could not be scanned for conflicts:',
    );
    expect(originalConfig.skills.paths).toEqual([userPath]);
    expect(originalConfig.skills.urls).toEqual(['https://example.test/skills']);
  });
});
