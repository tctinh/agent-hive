import * as path from 'path';
import * as fs from 'fs';
import { getFeaturesPath, getFeaturePath, getActiveFeaturePath, listFeatureDirectories, readJson, normalizePath } from './paths.js';
import type { FeatureJson } from '../types.js';

function toLogicalFeatureName(featureName: string): string {
  const match = featureName.match(/^\d+[_-](.+)$/);
  return match ? match[1] : featureName;
}

export interface DetectionResult {
  projectRoot: string;
  feature: string | null;
  task: string | null;
  isWorktree: boolean;
  mainProjectRoot: string | null;
}

export function detectContext(cwd: string): DetectionResult {
  const result: DetectionResult = {
    projectRoot: cwd,
    feature: null,
    task: null,
    isWorktree: false,
    mainProjectRoot: null,
  };

  const normalizedCwd = normalizePath(cwd);
  const worktreeMatch = normalizedCwd.match(/(.+)\/\.hive\/\.worktrees\/([^/]+)\/([^/]+)/);
  if (worktreeMatch) {
    result.mainProjectRoot = worktreeMatch[1];
    result.feature = toLogicalFeatureName(worktreeMatch[2]);
    result.task = worktreeMatch[3];
    result.isWorktree = true;
    result.projectRoot = worktreeMatch[1];
    return result;
  }

  const gitPath = path.join(cwd, '.git');
  if (fs.existsSync(gitPath)) {
    const stat = fs.statSync(gitPath);
    if (stat.isFile()) {
      const gitContent = fs.readFileSync(gitPath, 'utf-8').trim();
      const gitdirMatch = gitContent.match(/gitdir:\s*(.+)/);
      if (gitdirMatch) {
        const gitdir = gitdirMatch[1];
        const normalizedGitdir = normalizePath(gitdir);
        const worktreePathMatch = normalizedGitdir.match(/(.+)\/\.git\/worktrees\/(.+)/);
        if (worktreePathMatch) {
          const mainRepo = worktreePathMatch[1];
          const cwdWorktreeMatch = normalizedCwd.match(/\.hive\/\.worktrees\/([^/]+)\/([^/]+)/);
          if (cwdWorktreeMatch) {
            result.mainProjectRoot = mainRepo;
            result.feature = toLogicalFeatureName(cwdWorktreeMatch[1]);
            result.task = cwdWorktreeMatch[2];
            result.isWorktree = true;
            result.projectRoot = mainRepo;
            return result;
          }
        }
      }
    }
  }

  return result;
}

export function listFeatures(projectRoot: string): string[] {
  const featuresPath = getFeaturesPath(projectRoot);
  if (!fs.existsSync(featuresPath)) return [];

  return listFeatureDirectories(projectRoot)
    .map((feature) => feature.logicalName)
    .sort((left, right) => left.localeCompare(right));
}

export function getActiveFeatureName(projectRoot: string): string | null {
  const activeFeaturePath = getActiveFeaturePath(projectRoot);
  if (!fs.existsSync(activeFeaturePath)) {
    return null;
  }

  const activeFeatureName = fs.readFileSync(activeFeaturePath, 'utf-8').trim();
  if (!activeFeatureName) {
    return null;
  }

  const feature = getFeatureData(projectRoot, activeFeatureName);
  if (!feature || feature.status === 'completed') {
    return null;
  }

  return activeFeatureName;
}

export function resolveActiveFeatureName(projectRoot: string): string | null {
  const activeFeatureName = getActiveFeatureName(projectRoot);
  if (activeFeatureName) {
    return activeFeatureName;
  }

  return listFeatures(projectRoot).find((featureName) => getFeatureData(projectRoot, featureName)?.status !== 'completed') ?? null;
}

export function getFeatureData(projectRoot: string, featureName: string): FeatureJson | null {
  const featurePath = getFeaturePath(projectRoot, featureName);
  const featureJsonPath = path.join(featurePath, 'feature.json');
  return readJson<FeatureJson>(featureJsonPath);
}

export function findProjectRoot(startDir: string): string | null {
  let current = startDir;
  const root = path.parse(current).root;

  while (current !== root) {
    if (fs.existsSync(path.join(current, '.hive'))) {
      return current;
    }
    if (fs.existsSync(path.join(current, '.git'))) {
      return current;
    }
    current = path.dirname(current);
  }

  return null;
}
