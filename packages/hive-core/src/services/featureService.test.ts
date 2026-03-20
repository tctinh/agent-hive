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
});
