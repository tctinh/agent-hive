import * as path from 'path';
import * as fs from 'fs';
import { getHivePath, getFeaturesPath, getFeaturePath, readJson } from './paths.js';
import { FeatureJson } from '../types.js';

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

  const worktreeMatch = cwd.match(/(.+)\/\.hive\/\.worktrees\/([^/]+)\/([^/]+)/);
  if (worktreeMatch) {
    result.mainProjectRoot = worktreeMatch[1];
    result.feature = worktreeMatch[2];
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
        const worktreePathMatch = gitdir.match(/(.+)\/\.git\/worktrees\/(.+)/);
        if (worktreePathMatch) {
          const mainRepo = worktreePathMatch[1];
          const cwdWorktreeMatch = cwd.match(/\.hive\/\.worktrees\/([^/]+)\/([^/]+)/);
          if (cwdWorktreeMatch) {
            result.mainProjectRoot = mainRepo;
            result.feature = cwdWorktreeMatch[1];
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

  return fs.readdirSync(featuresPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
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
