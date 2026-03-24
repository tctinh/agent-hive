import { afterEach, describe, expect, it } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { detectContext, getFeatureData, listFeatures } from './detection';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function createProject(): string {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-core-detection-test-'));
  tempDirs.push(projectRoot);
  fs.mkdirSync(path.join(projectRoot, '.hive', 'features'), { recursive: true });
  return projectRoot;
}

function writeFeature(projectRoot: string, folderName: string, logicalName: string): void {
  const featurePath = path.join(projectRoot, '.hive', 'features', folderName);
  fs.mkdirSync(featurePath, { recursive: true });
  fs.writeFileSync(
    path.join(featurePath, 'feature.json'),
    JSON.stringify({ name: logicalName, status: 'planning', createdAt: new Date().toISOString() })
  );
}

describe('detection', () => {
  it('returns logical feature names for mixed legacy and indexed feature folders', () => {
    const projectRoot = createProject();
    writeFeature(projectRoot, 'legacy-feature', 'legacy-feature');
    writeFeature(projectRoot, '02_indexed-feature', 'indexed-feature');

    expect(listFeatures(projectRoot)).toEqual(['indexed-feature', 'legacy-feature']);
    expect(getFeatureData(projectRoot, 'indexed-feature')).toMatchObject({ name: 'indexed-feature' });
  });

  it('detects indexed worktree folders using the logical feature name', () => {
    const result = detectContext('/repo/.hive/.worktrees/03_indexed-feature/01-task');

    expect(result.isWorktree).toBe(true);
    expect(result.feature).toBe('indexed-feature');
    expect(result.task).toBe('01-task');
    expect(result.projectRoot).toBe('/repo');
  });
});
