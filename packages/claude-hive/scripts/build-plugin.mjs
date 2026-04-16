import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(packageRoot, 'dist');
const runtimeRoot = path.join(distRoot, 'runtime');
const pluginRoot = path.join(distRoot, 'plugin');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyIfExists(fromPath, toPath) {
  if (!fs.existsSync(fromPath)) {
    return;
  }

  ensureDir(path.dirname(toPath));
  fs.copyFileSync(fromPath, toPath);
}

function copyDirectory(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) {
    return;
  }

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      ensureDir(targetPath);
      copyDirectory(sourcePath, targetPath);
      continue;
    }

    ensureDir(path.dirname(targetPath));
    fs.copyFileSync(sourcePath, targetPath);
  }
}

function readPackageVersion() {
  const packageJsonPath = path.join(packageRoot, 'package.json');
  const raw = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  if (typeof raw.version !== 'string' || !raw.version.trim()) {
    throw new Error(`Expected a string version in ${packageJsonPath}`);
  }
  return raw.version;
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

function resolveRuntimeServerPath() {
  const candidates = [
    path.join(runtimeRoot, 'mcp', 'server.js'),
    path.join(runtimeRoot, 'server.js'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Unable to find bundled MCP runtime. Checked: ${candidates.join(', ')}`);
}

function buildPlugin() {
  const version = readPackageVersion();
  const pluginSourceRoot = path.join(packageRoot, 'plugin');
  const runtimeServerPath = resolveRuntimeServerPath();

  fs.rmSync(pluginRoot, { recursive: true, force: true });

  ensureDir(path.join(pluginRoot, '.claude-plugin'));
  ensureDir(path.join(pluginRoot, 'commands'));
  ensureDir(path.join(pluginRoot, 'skills'));
  ensureDir(path.join(pluginRoot, 'agents'));
  ensureDir(path.join(pluginRoot, 'hooks'));
  ensureDir(path.join(pluginRoot, 'bin'));

  copyDirectory(pluginSourceRoot, pluginRoot);

  writeJson(path.join(pluginRoot, '.claude-plugin', 'plugin.json'), {
    name: 'hive',
    version,
    description: 'Claude-native Agent Hive plugin for plan-first development',
    author: {
      name: 'tctinh',
    },
  });

  writeJson(path.join(pluginRoot, '.mcp.json'), {
    mcpServers: {
      hive: {
        command: 'node',
        args: ['${CLAUDE_PLUGIN_ROOT}/bin/claude-hive-mcp.js'],
      },
    },
  });

  writeJson(path.join(pluginRoot, 'hooks', 'hooks.json'), { hooks: {} });
  copyIfExists(path.join(packageRoot, 'README.md'), path.join(pluginRoot, 'README.md'));
  copyIfExists(runtimeServerPath, path.join(pluginRoot, 'bin', 'claude-hive-mcp.js'));
}

buildPlugin();