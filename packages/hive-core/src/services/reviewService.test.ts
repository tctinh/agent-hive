import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { ReviewService } from './reviewService';

const TEST_DIR = `/tmp/hive-core-reviewservice-test-${process.pid}`;

function cleanup(): void {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
}

function setupFeature(featureName: string): string {
  const featurePath = path.join(TEST_DIR, '.hive', 'features', featureName);
  fs.mkdirSync(featurePath, { recursive: true });
  fs.writeFileSync(
    path.join(featurePath, 'feature.json'),
    JSON.stringify({ name: featureName, status: 'planning', createdAt: new Date().toISOString() })
  );
  fs.writeFileSync(path.join(featurePath, 'plan.md'), '# Plan\n');
  return featurePath;
}

describe('ReviewService', () => {
  let service: ReviewService;

  beforeEach(() => {
    cleanup();
    fs.mkdirSync(TEST_DIR, { recursive: true });
    service = new ReviewService(TEST_DIR);
  });

  afterEach(() => {
    cleanup();
  });

  it('treats any remaining thread in overview comments as unresolved', () => {
    const featureName = 'test-feature';
    setupFeature(featureName);

    service.saveThreads(featureName, 'overview', [
      {
        id: 'thread-1',
        line: 3,
        body: 'Needs clarification',
        replies: ['Please tighten wording'],
      },
    ]);

    expect(service.countByDocument(featureName)).toEqual({
      plan: 0,
      overview: 1,
    });
    expect(service.hasUnresolvedThreads(featureName)).toBe(true);
    expect(service.hasUnresolvedThreads(featureName, 'overview')).toBe(true);
  });

  it('falls back to legacy comments.json for plan reviews', () => {
    const featureName = 'legacy-feature';
    const featurePath = setupFeature(featureName);

    fs.writeFileSync(
      path.join(featurePath, 'comments.json'),
      JSON.stringify({
        threads: [
          {
            id: 'legacy-1',
            line: 2,
            body: 'Legacy plan comment',
            replies: ['legacy reply'],
          },
        ],
      })
    );

    expect(service.getThreads(featureName, 'plan')).toEqual([
      {
        id: 'legacy-1',
        line: 2,
        body: 'Legacy plan comment',
        replies: ['legacy reply'],
      },
    ]);
    expect(service.countByDocument(featureName)).toEqual({
      plan: 1,
      overview: 0,
    });
  });
});
