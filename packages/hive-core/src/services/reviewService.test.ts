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

  it('ignores overview comments when counting unresolved review threads', () => {
    const featureName = 'test-feature';
    const featurePath = setupFeature(featureName);

    fs.mkdirSync(path.join(featurePath, 'comments'), { recursive: true });
    fs.writeFileSync(
      path.join(featurePath, 'comments', 'overview.json'),
      JSON.stringify({
        threads: [
          {
            id: 'thread-1',
            line: 3,
            body: 'Needs clarification',
            replies: ['Please tighten wording'],
          },
        ],
      })
    );

    expect(service.countByDocument(featureName)).toEqual({
      plan: 0,
    });
    expect(service.hasUnresolvedThreads(featureName)).toBe(false);
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
    });
  });
});
