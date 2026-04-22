import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

export function getLatestModifiedTime(directory) {
  let latest = 0;

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      latest = Math.max(latest, getLatestModifiedTime(entryPath));
      continue;
    }
    latest = Math.max(latest, statSync(entryPath).mtimeMs);
  }

  return latest;
}

export function isWorkspacePackage(packageJsonPath, packageName) {
  return packageJsonPath.includes(`${path.sep}packages${path.sep}${packageName}${path.sep}package.json`);
}

export function shouldRefreshOutput({ outputPath, inputFiles = [], inputDirectories = [] }) {
  const outputMtime = existsSync(outputPath) ? statSync(outputPath).mtimeMs : 0;
  const latestInputMtime = Math.max(
    0,
    ...inputFiles.map((filePath) => statSync(filePath).mtimeMs),
    ...inputDirectories.map((directoryPath) => getLatestModifiedTime(directoryPath)),
  );

  return outputMtime < latestInputMtime;
}

export function ensureWorkspaceHiveMcpReady({ requireFn = require, exec = execFileSync } = {}) {
  const hiveMcpPackageJsonPath = requireFn.resolve('hive-mcp/package.json');

  if (!isWorkspacePackage(hiveMcpPackageJsonPath, 'hive-mcp')) {
    return { workspace: false, builtHiveCore: false, builtHiveMcp: false };
  }

  const hiveMcpDir = path.dirname(hiveMcpPackageJsonPath);
  const hiveMcpDistEntry = path.join(hiveMcpDir, 'dist', 'index.js');
  const hiveMcpSrcDir = path.join(hiveMcpDir, 'src');
  let hiveCoreDistEntry;
  let builtHiveCore = false;

  try {
    const hiveCorePackageJsonPath = requireFn.resolve('hive-core/package.json');

    if (isWorkspacePackage(hiveCorePackageJsonPath, 'hive-core')) {
      const hiveCoreDir = path.dirname(hiveCorePackageJsonPath);
      hiveCoreDistEntry = path.join(hiveCoreDir, 'dist', 'index.js');
      const hiveCoreSrcDir = path.join(hiveCoreDir, 'src');

      if (shouldRefreshOutput({
        outputPath: hiveCoreDistEntry,
        inputFiles: [hiveCorePackageJsonPath],
        inputDirectories: [hiveCoreSrcDir],
      })) {
        exec('npm', ['run', 'build'], {
          cwd: hiveCoreDir,
          stdio: 'inherit',
        });
        builtHiveCore = true;
      }
    }
  } catch {
    hiveCoreDistEntry = undefined;
  }

  const hiveMcpInputFiles = [hiveMcpPackageJsonPath];
  if (hiveCoreDistEntry && existsSync(hiveCoreDistEntry)) {
    hiveMcpInputFiles.push(hiveCoreDistEntry);
  }

  const builtHiveMcp = shouldRefreshOutput({
    outputPath: hiveMcpDistEntry,
    inputFiles: hiveMcpInputFiles,
    inputDirectories: [hiveMcpSrcDir],
  });

  if (builtHiveMcp) {
    exec('npm', ['run', 'build'], {
      cwd: hiveMcpDir,
      stdio: 'inherit',
    });
  }

  return { workspace: true, builtHiveCore, builtHiveMcp };
}


if (import.meta.main) {
  ensureWorkspaceHiveMcpReady();
}