import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, '..');
const repoSkillReferencePattern = /\.github\/skills\/[^/\s)]+\/SKILL\.md/g;

function requireFile(relativePath) {
  const absolutePath = path.join(packageDir, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return absolutePath;
}

function collectMarkdownFiles(directory) {
  const markdownFiles = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      markdownFiles.push(...collectMarkdownFiles(entryPath));
      continue;
    }
    if (entry.name.endsWith('.md')) {
      markdownFiles.push(entryPath);
    }
  }

  return markdownFiles;
}

const requiredFiles = [
  '.claude-plugin/plugin.json',
  'agents/hive.md',
  'agents/forager.md',
  'agents/hygienic.md',
  'commands/hive.md',
  'instructions/hive-workflow.md',
  'hooks/hooks.json',
  'hooks/scripts/inject-context.sh',
  'scripts/generate-plugin-assets.mjs',
  'scripts/verify-plugin-assets.mjs',
  'README.md',
];

for (const relativePath of requiredFiles) {
  requireFile(relativePath);
}

const plugin = JSON.parse(readFileSync(requireFile('.claude-plugin/plugin.json'), 'utf8'));

if (plugin.name !== 'hive') {
  throw new Error(`Expected plugin.name to be hive, received ${plugin.name}`);
}

if (plugin.hooks !== './hooks/hooks.json') {
  throw new Error(`Expected plugin.hooks to be ./hooks/hooks.json, received ${plugin.hooks}`);
}

if (plugin.mcpServers?.hive?.command !== 'npx') {
  throw new Error(`Expected plugin.mcpServers.hive.command to be npx, received ${plugin.mcpServers?.hive?.command}`);
}

const mcpArgs = plugin.mcpServers?.hive?.args ?? [];
if (!mcpArgs.includes('@tctinh/agent-hive-mcp@latest') || mcpArgs[mcpArgs.length - 1] !== 'hive-mcp') {
  throw new Error(`Expected plugin.mcpServers.hive.args to invoke hive-mcp via @tctinh/agent-hive-mcp@latest, received ${JSON.stringify(mcpArgs)}`);
}

for (const explicitField of ['agents', 'skills', 'commands']) {
  if (explicitField in plugin) {
    throw new Error(`plugin.${explicitField} should be omitted so Claude Code auto-discovers ./${explicitField}`);
  }
}

for (const agentFile of ['agents/hive.md', 'agents/forager.md', 'agents/hygienic.md']) {
  const content = readFileSync(path.join(packageDir, agentFile), 'utf8');
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    throw new Error(`${agentFile} is missing YAML frontmatter`);
  }
  const frontmatter = frontmatterMatch[1];
  if (!/^name:\s*\S/m.test(frontmatter)) {
    throw new Error(`${agentFile} frontmatter must include a 'name:' field for Claude Code agent discovery`);
  }
  if (!/^description:\s*\S/m.test(frontmatter)) {
    throw new Error(`${agentFile} frontmatter must include a 'description:' field`);
  }
}

const hooksConfig = JSON.parse(readFileSync(requireFile('hooks/hooks.json'), 'utf8'));
const sessionStartHooks = hooksConfig.hooks?.SessionStart;

if (!Array.isArray(sessionStartHooks) || sessionStartHooks.length === 0) {
  throw new Error('Expected at least one SessionStart hook');
}

const hookHandler = sessionStartHooks[0]?.handler;
if (hookHandler !== './scripts/inject-context.sh') {
  throw new Error(`Expected SessionStart hook handler to be ./scripts/inject-context.sh, received ${hookHandler}`);
}

const skillsDir = requireFile('skills');
const skillDirs = readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

if (skillDirs.length === 0) {
  throw new Error('Expected generated skills to be present under ./skills');
}

for (const skillName of skillDirs) {
  requireFile(path.join('skills', skillName, 'SKILL.md'));
}

const markdownAssetPaths = [
  requireFile('README.md'),
  ...collectMarkdownFiles(requireFile('agents')),
  ...collectMarkdownFiles(requireFile('commands')),
  ...collectMarkdownFiles(requireFile('instructions')),
  ...collectMarkdownFiles(skillsDir),
];

for (const absolutePath of markdownAssetPaths) {
  const content = readFileSync(absolutePath, 'utf8');
  const match = content.match(repoSkillReferencePattern);

  if (match) {
    const relativePath = path.relative(packageDir, absolutePath);
    throw new Error(`Shipped asset ${relativePath} still points at repo-local skill path ${match[0]}`);
  }
}

console.log(`Verified Claude plugin assets (${skillDirs.length} skills)`);
