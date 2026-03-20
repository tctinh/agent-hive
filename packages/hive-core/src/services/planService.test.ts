import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { PlanService } from './planService';

const TEST_DIR = `/tmp/hive-core-planservice-test-${process.pid}`;

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

describe('PlanService', () => {
  let service: PlanService;

  beforeEach(() => {
    cleanup();
    fs.mkdirSync(TEST_DIR, { recursive: true });
    service = new PlanService(TEST_DIR);
  });

  afterEach(() => {
    cleanup();
  });

  it('blocks approval when either plan or overview has unresolved comments', () => {
    const featureName = 'test-feature';
    const featurePath = setupFeature(featureName);

    fs.mkdirSync(path.join(featurePath, 'comments'), { recursive: true });
    fs.writeFileSync(path.join(featurePath, 'comments', 'plan.json'), JSON.stringify({ threads: [] }));
    fs.writeFileSync(
      path.join(featurePath, 'comments', 'overview.json'),
      JSON.stringify({
        threads: [
          {
            id: 'overview-thread',
            line: 1,
            body: 'Overview still needs edits',
            replies: [],
          },
        ],
      })
    );

    expect(() => service.approve(featureName)).toThrow(/unresolved review comments/i);
  });
});
