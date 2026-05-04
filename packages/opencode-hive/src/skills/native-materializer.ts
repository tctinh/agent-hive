import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const PARSER_VERSION = 'native-skill-parser-v1';
const GENERATED_SKILLS_SEGMENTS = ['.hive', 'generated', 'opencode-skills'] as const;
const DEFAULT_URL_FETCH_TIMEOUT_MS = 1500;

export interface ParsedNativeSkill {
  name: string;
  description: string;
  content: string;
}

export interface PreparedHiveSkill {
  name: string;
  description: string;
  content: string;
  sourceDir: string;
  materializedDir: string;
}

export interface PreparedNativeHiveSkills {
  materializedPath?: string;
  skillsByName: Map<string, PreparedHiveSkill>;
  skillPaths: string[];
  skipped: Array<{ name: string; reason: 'disabled' | 'conflict' | 'url-scan-incomplete'; source?: string }>;
  urlScanComplete: boolean;
}

export interface PrepareNativeHiveSkillsInput {
  directory: string;
  worktree: string;
  packagedSkillsDir?: string;
  moduleUrl?: string | URL;
  disableSkills?: string[];
  opencodeConfig?: {
    skills?: {
      paths?: string[];
      urls?: string[];
    };
  };
  env?: Record<string, string | undefined>;
  homeDir?: string;
  fetchImpl?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
  urlFetchTimeoutMs?: number;
  logger?: {
    warn: (message: string) => void;
  };
}

type Logger = {
  warn: (message: string) => void;
};

type BundledSkillSource = {
  directoryName: string;
  sourceDir: string;
  skillPath: string;
  parsed: ParsedNativeSkill;
};

function fallbackSanitization(content: string): string {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return content;
  }

  const frontmatter = match[1];
  const lines = frontmatter.split(/\r?\n/);
  const result: string[] = [];

  for (const line of lines) {
    if (line.trim().startsWith('#') || line.trim() === '') {
      result.push(line);
      continue;
    }

    if (/^\s+/.test(line)) {
      result.push(line);
      continue;
    }

    const kvMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (!kvMatch) {
      result.push(line);
      continue;
    }

    const key = kvMatch[1];
    const value = kvMatch[2].trim();

    if (
      value === '' ||
      value === '>' ||
      value === '|' ||
      value.startsWith('"') ||
      value.startsWith("'")
    ) {
      result.push(line);
      continue;
    }

    if (value.includes(':')) {
      result.push(`${key}: |-`);
      result.push(`  ${value}`);
      continue;
    }

    result.push(line);
  }

  const processed = result.join('\n');
  return content.replace(frontmatter, () => processed);
}

export function parseNativeSkillMarkdown(
  filePath: string,
  content: string,
  logger: Logger = console,
): ParsedNativeSkill | undefined {
  let parsed: matter.GrayMatterFile<string>;

  try {
    parsed = matter(content);
  } catch {
    try {
      parsed = matter(fallbackSanitization(content));
    } catch (error) {
      logger.warn(
        `[hive] Skipping native skill ${filePath}: failed to parse YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`,
      );
      return undefined;
    }
  }

  if (typeof parsed.data?.name !== 'string' || typeof parsed.data?.description !== 'string') {
    logger.warn(`[hive] Skipping native skill ${filePath}: missing string name/description frontmatter.`);
    return undefined;
  }

  return {
    name: parsed.data.name,
    description: parsed.data.description,
    content: parsed.content,
  };
}

export function resolvePackagedSkillsDir(moduleUrl: string | URL = import.meta.url): string {
  const resolvedUrl = typeof moduleUrl === 'string' ? moduleUrl : moduleUrl.href;
  const modulePath = resolvedUrl.startsWith('file:') ? fileURLToPath(resolvedUrl) : path.resolve(resolvedUrl);
  const baseDir = path.dirname(modulePath);
  const candidates = [
    path.resolve(baseDir, '..', '..', 'skills'),
    path.resolve(baseDir, '..', 'skills'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }

  throw new Error(`Unable to resolve packaged Hive skills directory from ${resolvedUrl}`);
}

function getLogger(logger?: Logger): Logger {
  return logger ?? console;
}

function getHomeDir(input: PrepareNativeHiveSkillsInput): string {
  return input.homeDir ?? input.env?.HOME ?? process.env.HOME ?? os.homedir();
}

function isTruthyEnv(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized !== '' && normalized !== '0' && normalized !== 'false' && normalized !== 'no';
}

function generatedSkillsRoot(worktree: string): string {
  return path.join(worktree, ...GENERATED_SKILLS_SEGMENTS);
}

function isHiveManagedSkillsPath(candidatePath: string, worktree: string): boolean {
  const root = generatedSkillsRoot(path.resolve(worktree));
  const resolved = path.resolve(candidatePath);
  return resolved === root || resolved.startsWith(`${root}${path.sep}`);
}

function resolveConfiguredSkillPath(rawPath: string, directory: string, homeDir: string): string {
  const expanded = rawPath.startsWith('~/') ? path.join(homeDir, rawPath.slice(2)) : rawPath;
  return path.isAbsolute(expanded) ? path.resolve(expanded) : path.resolve(directory, expanded);
}

function walkUpDirectories(start: string, stop: string): string[] {
  const directories: string[] = [];
  let current = path.resolve(start);
  const stopDir = path.resolve(stop);

  while (true) {
    directories.push(current);
    if (current === stopDir) {
      break;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return directories;
}

async function isDirectory(dirPath: string): Promise<boolean> {
  try {
    return (await fsp.stat(dirPath)).isDirectory();
  } catch {
    return false;
  }
}

async function scanSkillMarkdownFiles(rootDir: string): Promise<string[]> {
  if (!(await isDirectory(rootDir))) {
    return [];
  }

  const matches: string[] = [];
  const queue = [rootDir];

  while (queue.length > 0) {
    const currentDir = queue.pop()!;
    const entries = await fsp.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name === 'SKILL.md') {
        matches.push(fullPath);
      }
    }
  }

  return matches.sort();
}

async function scanOpenCodeSkillDirs(opencodeDir: string): Promise<string[]> {
  const matches = await Promise.all([
    scanSkillMarkdownFiles(path.join(opencodeDir, 'skills')),
    scanSkillMarkdownFiles(path.join(opencodeDir, 'skill')),
  ]);
  return matches.flat();
}

async function readBundledSkills(packagedSkillsDir: string, logger: Logger): Promise<BundledSkillSource[]> {
  const entries = await fsp.readdir(packagedSkillsDir, { withFileTypes: true });
  const skills: BundledSkillSource[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const sourceDir = path.join(packagedSkillsDir, entry.name);
    const skillPath = path.join(sourceDir, 'SKILL.md');

    try {
      const content = await fsp.readFile(skillPath, 'utf8');
      const parsed = parseNativeSkillMarkdown(skillPath, content, logger);
      if (!parsed) {
        continue;
      }
      skills.push({
        directoryName: entry.name,
        sourceDir,
        skillPath,
        parsed,
      });
    } catch (error) {
      logger.warn(
        `[hive] Skipping native skill ${skillPath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return skills.sort((left, right) => left.directoryName.localeCompare(right.directoryName));
}

async function addConflict(
  skillPath: string,
  conflicts: Map<string, string>,
  logger: Logger,
): Promise<void> {
  try {
    const content = await fsp.readFile(skillPath, 'utf8');
    const parsed = parseNativeSkillMarkdown(skillPath, content, logger);
    if (!parsed) {
      return;
    }
    if (!conflicts.has(parsed.name)) {
      conflicts.set(parsed.name, skillPath);
    }
  } catch (error) {
    logger.warn(`[hive] Skipping native skill ${skillPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function scanSkillFilesIntoConflicts(
  skillFiles: string[],
  conflicts: Map<string, string>,
  logger: Logger,
): Promise<void> {
  for (const skillFile of skillFiles) {
    await addConflict(skillFile, conflicts, logger);
  }
}

function getExternalDirNames(env: Record<string, string | undefined>): string[] {
  if (isTruthyEnv(env.OPENCODE_DISABLE_EXTERNAL_SKILLS)) {
    return [];
  }

  const disableClaude =
    isTruthyEnv(env.OPENCODE_DISABLE_CLAUDE_CODE_SKILLS) || isTruthyEnv(env.OPENCODE_DISABLE_CLAUDE_CODE);

  return disableClaude ? ['.agents'] : ['.claude', '.agents'];
}

function getGlobalOpenCodeConfigDir(env: Record<string, string | undefined>, homeDir: string): string {
  if (env.OPENCODE_CONFIG_DIR) {
    return path.resolve(env.OPENCODE_CONFIG_DIR);
  }

  if (env.XDG_CONFIG_HOME) {
    return path.resolve(env.XDG_CONFIG_HOME, 'opencode');
  }

  return path.resolve(homeDir, '.config', 'opencode');
}

async function scanLocalNativeConflicts(
  input: PrepareNativeHiveSkillsInput,
  skillPaths: string[],
  logger: Logger,
): Promise<Map<string, string>> {
  const env = { ...process.env, ...input.env };
  const homeDir = getHomeDir(input);
  const conflicts = new Map<string, string>();
  const externalDirNames = getExternalDirNames(env);

  for (const externalDirName of externalDirNames) {
    await scanSkillFilesIntoConflicts(
      await scanSkillMarkdownFiles(path.join(homeDir, externalDirName, 'skills')),
      conflicts,
      logger,
    );
  }

  for (const currentDir of walkUpDirectories(input.directory, input.worktree)) {
    for (const externalDirName of externalDirNames) {
      await scanSkillFilesIntoConflicts(
        await scanSkillMarkdownFiles(path.join(currentDir, externalDirName, 'skills')),
        conflicts,
        logger,
      );
    }
  }

  await scanSkillFilesIntoConflicts(
    await scanOpenCodeSkillDirs(getGlobalOpenCodeConfigDir(env, homeDir)),
    conflicts,
    logger,
  );

  for (const currentDir of walkUpDirectories(input.directory, input.worktree)) {
    await scanSkillFilesIntoConflicts(
      await scanOpenCodeSkillDirs(path.join(currentDir, '.opencode')),
      conflicts,
      logger,
    );
  }

  for (const configuredPath of skillPaths) {
    if (await isDirectory(configuredPath)) {
      await scanSkillFilesIntoConflicts(await scanSkillMarkdownFiles(configuredPath), conflicts, logger);
    }
  }

  return conflicts;
}

type UrlScanResult = {
  urlScanComplete: boolean;
  conflicts: Map<string, string>;
};

async function fetchWithTimeout(
  fetchImpl: (input: string | URL | Request, init?: RequestInit) => Promise<Response>,
  input: string | URL | Request,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`Timed out after ${timeoutMs}ms fetching ${String(input)}`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([fetchImpl(input, { signal: controller.signal }), timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

async function scanUrlConflicts(
  input: PrepareNativeHiveSkillsInput,
  logger: Logger,
): Promise<UrlScanResult> {
  const urls = input.opencodeConfig?.skills?.urls ?? [];
  const fetchImpl = input.fetchImpl ?? fetch;
  const urlFetchTimeoutMs = input.urlFetchTimeoutMs ?? DEFAULT_URL_FETCH_TIMEOUT_MS;
  const conflicts = new Map<string, string>();

  for (const configuredUrl of urls) {
    const base = configuredUrl.endsWith('/') ? configuredUrl : `${configuredUrl}/`;
    const indexUrl = new URL('index.json', base).href;
    const host = base.slice(0, -1);

    try {
      const indexResponse = await fetchWithTimeout(fetchImpl, indexUrl, urlFetchTimeoutMs);
      if (!indexResponse.ok) {
        throw new Error(`HTTP ${indexResponse.status} for ${indexUrl}`);
      }

      const indexData = (await indexResponse.json()) as {
        skills?: Array<{ name?: string; files?: string[] }>;
      };

      const skills = Array.isArray(indexData.skills) ? indexData.skills : [];
      for (const skill of skills) {
        if (!Array.isArray(skill.files) || !skill.files.includes('SKILL.md') || typeof skill.name !== 'string') {
          logger.warn(`[hive] Skipping native skills URL entry missing SKILL.md: ${indexUrl}`);
          continue;
        }

        const skillUrl = new URL('SKILL.md', `${host}/${skill.name}/`).href;
        const skillResponse = await fetchWithTimeout(fetchImpl, skillUrl, urlFetchTimeoutMs);
        if (!skillResponse.ok) {
          throw new Error(`HTTP ${skillResponse.status} for ${skillUrl}`);
        }

        const content = await skillResponse.text();
        const parsed = parseNativeSkillMarkdown(skillUrl, content, logger);
        if (parsed && !conflicts.has(parsed.name)) {
          conflicts.set(parsed.name, skillUrl);
        }
      }
    } catch (error) {
      logger.warn(
        `[hive] Skipping Hive bundled native skill materialization because configured skills URL could not be scanned for conflicts: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        urlScanComplete: false,
        conflicts: new Map<string, string>(),
      };
    }
  }

  return {
    urlScanComplete: true,
    conflicts,
  };
}

function buildGeneratedHash(
  bundledSkills: BundledSkillSource[],
  disabledSkills: Set<string>,
  conflicts: Map<string, string>,
): string {
  const hash = createHash('sha256');
  hash.update(PARSER_VERSION);

  for (const skill of bundledSkills) {
    hash.update(skill.parsed.name);
    hash.update(skill.directoryName);
    hash.update(skill.parsed.description);
    hash.update(skill.parsed.content);
  }

  for (const skillName of [...disabledSkills].sort()) {
    hash.update(`disabled:${skillName}`);
  }

  for (const [skillName, source] of [...conflicts.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    hash.update(`conflict:${skillName}:${source}`);
  }

  return hash.digest('hex').slice(0, 16);
}

async function materializeSkills(
  generatedRoot: string,
  hash: string,
  bundledSkills: BundledSkillSource[],
): Promise<{ materializedPath: string; skillsByName: Map<string, PreparedHiveSkill> }> {
  const materializedPath = path.join(generatedRoot, hash);
  const tempPath = path.join(generatedRoot, `${hash}.tmp-${process.pid}-${Date.now()}`);
  const skillsByName = new Map<string, PreparedHiveSkill>();

  await fsp.rm(tempPath, { recursive: true, force: true });
  await fsp.mkdir(tempPath, { recursive: true });

  for (const skill of bundledSkills) {
    const destinationDir = path.join(tempPath, skill.directoryName);
    await fsp.cp(skill.sourceDir, destinationDir, { recursive: true });
    skillsByName.set(skill.parsed.name, {
      name: skill.parsed.name,
      description: skill.parsed.description,
      content: skill.parsed.content,
      sourceDir: skill.sourceDir,
      materializedDir: path.join(materializedPath, skill.directoryName),
    });
  }

  await fsp.mkdir(generatedRoot, { recursive: true });
  await fsp.rm(materializedPath, { recursive: true, force: true });
  await fsp.rename(tempPath, materializedPath);

  return {
    materializedPath,
    skillsByName,
  };
}

async function cleanupStaleMaterializations(generatedRoot: string, currentHash: string): Promise<void> {
  try {
    const entries = await fsp.readdir(generatedRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      if (entry.name === currentHash || entry.name.startsWith(`${currentHash}.tmp-`)) {
        continue;
      }
      await fsp.rm(path.join(generatedRoot, entry.name), { recursive: true, force: true });
    }
  } catch {
  }
}

export async function prepareNativeHiveSkills(
  input: PrepareNativeHiveSkillsInput,
): Promise<PreparedNativeHiveSkills> {
  const logger = getLogger(input.logger);
  const homeDir = getHomeDir(input);
  const packagedSkillsDir = input.packagedSkillsDir ?? resolvePackagedSkillsDir(input.moduleUrl);
  const bundledSkills = await readBundledSkills(packagedSkillsDir, logger);
  const disabledSkills = new Set(input.disableSkills ?? []);
  const resolvedUserPaths = (input.opencodeConfig?.skills?.paths ?? [])
    .map((skillPath) => resolveConfiguredSkillPath(skillPath, input.directory, homeDir))
    .filter((skillPath) => !isHiveManagedSkillsPath(skillPath, input.worktree));
  const localConflicts = await scanLocalNativeConflicts(input, resolvedUserPaths, logger);
  const urlScan = await scanUrlConflicts(input, logger);

  if (!urlScan.urlScanComplete) {
    return {
      materializedPath: undefined,
      skillsByName: new Map<string, PreparedHiveSkill>(),
      skillPaths: resolvedUserPaths,
      skipped: bundledSkills.map((skill) => ({
        name: skill.parsed.name,
        reason: 'url-scan-incomplete' as const,
      })),
      urlScanComplete: false,
    };
  }

  const allConflicts = new Map<string, string>(localConflicts);
  for (const [name, source] of urlScan.conflicts) {
    if (!allConflicts.has(name)) {
      allConflicts.set(name, source);
    }
  }

  const eligibleSkills: BundledSkillSource[] = [];
  const skipped: PreparedNativeHiveSkills['skipped'] = [];

  for (const skill of bundledSkills) {
    if (disabledSkills.has(skill.parsed.name)) {
      skipped.push({ name: skill.parsed.name, reason: 'disabled' });
      continue;
    }

    const conflictSource = allConflicts.get(skill.parsed.name);
    if (conflictSource) {
      skipped.push({ name: skill.parsed.name, reason: 'conflict', source: conflictSource });
      continue;
    }

    eligibleSkills.push(skill);
  }

  if (eligibleSkills.length === 0) {
    return {
      materializedPath: undefined,
      skillsByName: new Map<string, PreparedHiveSkill>(),
      skillPaths: resolvedUserPaths,
      skipped,
      urlScanComplete: true,
    };
  }

  const hash = buildGeneratedHash(eligibleSkills, disabledSkills, allConflicts);
  const generatedRoot = generatedSkillsRoot(input.worktree);
  const { materializedPath, skillsByName } = await materializeSkills(generatedRoot, hash, eligibleSkills);
  await cleanupStaleMaterializations(generatedRoot, hash);

  return {
    materializedPath,
    skillsByName,
    skillPaths: [materializedPath, ...resolvedUserPaths],
    skipped,
    urlScanComplete: true,
  };
}
