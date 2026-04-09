import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

export interface PluginCommandManifestEntry {
  key: string;
  name: string;
  description: string;
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  dataPath: string;
  commands: Array<Pick<PluginCommandManifestEntry, 'name' | 'description'>>;
  tools: string[];
}

export const HIVE_PLUGIN_NAME = 'hive';
export const HIVE_PLUGIN_DESCRIPTION = 'Context-Driven Development';
export const HIVE_PLUGIN_DATA_PATH = '../../.hive';

export const HIVE_COMMANDS: PluginCommandManifestEntry[] = [
  {
    key: 'hive',
    name: '/hive',
    description: 'Create a new feature: /hive <feature-name>',
  },
];

export const HIVE_TOOL_NAMES = [
  'hive_feature_create',
  'hive_feature_complete',
  'hive_plan_write',
  'hive_plan_read',
  'hive_plan_approve',
  'hive_tasks_sync',
  'hive_task_create',
  'hive_task_update',
  'hive_worktree_start',
  'hive_worktree_create',
  'hive_worktree_commit',
  'hive_worktree_discard',
  'hive_merge',
  'hive_context_write',
  'hive_network_query',
  'hive_status',
  'hive_skill',
  'hive_agents_md',
] as const;

export const SUPPORTED_PLUGIN_HOOKS = [
  'event',
  'config',
  'chat.message',
  'experimental.chat.messages.transform',
  'tool.execute.before',
] as const;

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function getPluginPackageJsonPath(): string {
  return path.join(packageRoot, 'package.json');
}

export function getPluginManifestPath(): string {
  return path.join(packageRoot, 'plugin.json');
}

export function readPluginPackageVersion(packageJsonPath = getPluginPackageJsonPath()): string {
  const raw = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as { version?: unknown };
  if (typeof raw.version !== 'string' || !raw.version.trim()) {
    throw new Error(`Expected a string version in ${packageJsonPath}`);
  }
  return raw.version;
}

export function buildPluginManifest(version = readPluginPackageVersion()): PluginManifest {
  return {
    name: HIVE_PLUGIN_NAME,
    version,
    description: HIVE_PLUGIN_DESCRIPTION,
    dataPath: HIVE_PLUGIN_DATA_PATH,
    commands: HIVE_COMMANDS.map(({ name, description }) => ({ name, description })),
    tools: [...HIVE_TOOL_NAMES],
  };
}

export function stringifyPluginManifest(manifest: PluginManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
