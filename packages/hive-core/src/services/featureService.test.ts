import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { FeatureService } from './featureService';

const TEST_DIR = `/tmp/hive-core-featureservice-test-${process.pid}`;

function cleanup(): void {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
}

function setupFeature(featureName: string): string {
  const featurePath = path.join(TEST_DIR, '.hive', 'features', featureName);
  fs.mkdirSync(path.join(featurePath, 'context'), { recursive: true });
  fs.writeFileSync(
    path.join(featurePath, 'feature.json'),
    JSON.stringify({ name: featureName, status: 'planning', createdAt: new Date().toISOString() })
  );
  fs.writeFileSync(path.join(featurePath, 'plan.md'), '# Plan\n');
  return featurePath;
}

function setupIndexedFeature(directoryName: string, logicalName: string): string {
  const featurePath = path.join(TEST_DIR, '.hive', 'features', directoryName);
  fs.mkdirSync(path.join(featurePath, 'context'), { recursive: true });
  fs.writeFileSync(
    path.join(featurePath, 'feature.json'),
    JSON.stringify({ name: logicalName, status: 'planning', createdAt: new Date().toISOString() })
  );
  fs.writeFileSync(path.join(featurePath, 'plan.md'), '# Plan\n');
  return featurePath;
}

function writeActiveFeature(name: string): void {
  fs.mkdirSync(path.join(TEST_DIR, '.hive'), { recursive: true });
  fs.writeFileSync(path.join(TEST_DIR, '.hive', 'active-feature'), name);
}

describe('FeatureService', () => {
  let service: FeatureService;

  beforeEach(() => {
    cleanup();
    fs.mkdirSync(TEST_DIR, { recursive: true });
    service = new FeatureService(TEST_DIR);
  });

  afterEach(() => {
    cleanup();
  });

  it('exposes overview presence and per-document review counts in getInfo', () => {
    const featureName = 'test-feature';
    const featurePath = setupFeature(featureName);

    fs.writeFileSync(path.join(featurePath, 'context', 'overview.md'), '# Overview\n');
    fs.mkdirSync(path.join(featurePath, 'comments'), { recursive: true });
    fs.writeFileSync(
      path.join(featurePath, 'comments', 'plan.json'),
      JSON.stringify({
        threads: [
          { id: 'plan-1', line: 1, body: 'Plan thread', replies: [] },
          { id: 'plan-2', line: 2, body: 'Plan thread 2', replies: ['reply'] },
        ],
      })
    );
    fs.writeFileSync(
      path.join(featurePath, 'comments', 'overview.json'),
      JSON.stringify({
        threads: [{ id: 'overview-1', line: 3, body: 'Overview thread', replies: [] }],
      })
    );

    expect(service.getInfo(featureName)).toMatchObject({
      name: featureName,
      hasPlan: true,
      hasOverview: true,
      commentCount: 3,
      reviewCounts: {
        plan: 2,
        overview: 1,
      },
    });
  });

  it('creates new features in the next indexed folder while keeping the logical name', () => {
    setupFeature('legacy-feature');
    setupIndexedFeature('02_existing-feature', 'existing-feature');

    const feature = service.create('new-feature');
    const indexedPath = path.join(TEST_DIR, '.hive', 'features', '03_new-feature');

    expect(feature.name).toBe('new-feature');
    expect(fs.existsSync(indexedPath)).toBe(true);
    expect(service.get('new-feature')).toMatchObject({ name: 'new-feature' });
    expect(service.list()).toEqual(['existing-feature', 'legacy-feature', 'new-feature']);
    expect(fs.readFileSync(path.join(TEST_DIR, '.hive', 'active-feature'), 'utf-8')).toBe('new-feature');
  });

  it('rejects duplicate logical feature names across legacy and indexed folders', () => {
    setupFeature('legacy-feature');
    setupIndexedFeature('01_duplicate-feature', 'duplicate-feature');

    expect(() => service.create('legacy-feature')).toThrow("Feature 'legacy-feature' already exists");
    expect(() => service.create('duplicate-feature')).toThrow("Feature 'duplicate-feature' already exists");
  });

  it('getActive prefers the active-feature pointer when it references a non-completed feature', () => {
    setupFeature('beta-feature');
    setupIndexedFeature('01_alpha-feature', 'alpha-feature');
    writeActiveFeature('beta-feature');

    expect(service.list()).toEqual(['alpha-feature', 'beta-feature']);
    expect(service.getActive()).toMatchObject({ name: 'beta-feature' });
  });

  it('getActive ignores stale and completed pointers and falls back deterministically', () => {
    setupFeature('zeta-feature');
    setupIndexedFeature('01_alpha-feature', 'alpha-feature');
    setupIndexedFeature('02_done-feature', 'done-feature');
    service.updateStatus('done-feature', 'completed');

    writeActiveFeature('missing-feature');
    expect(service.getActive()).toMatchObject({ name: 'alpha-feature' });

    writeActiveFeature('done-feature');
    expect(service.getActive()).toMatchObject({ name: 'alpha-feature' });
  });
});
