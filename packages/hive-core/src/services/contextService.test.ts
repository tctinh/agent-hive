import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { ContextService } from './contextService.js';

const TEST_DIR = '/tmp/hive-core-contextservice-services-test-' + process.pid;
const PROJECT_ROOT = TEST_DIR;

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
}

function setupFeature(featureName: string): void {
  const featurePath = path.join(TEST_DIR, '.hive', 'features', featureName);
  fs.mkdirSync(featurePath, { recursive: true });
  fs.writeFileSync(
    path.join(featurePath, 'feature.json'),
    JSON.stringify({ name: featureName, status: 'executing', createdAt: new Date().toISOString() })
  );
}

describe('ContextService reserved overview context', () => {
  let service: ContextService;

  beforeEach(() => {
    cleanup();
    fs.mkdirSync(TEST_DIR, { recursive: true });
    service = new ContextService(PROJECT_ROOT);
  });

  afterEach(() => {
    cleanup();
  });

  it('returns overview as a reserved context file when present', () => {
    const featureName = 'reserved-overview';
    setupFeature(featureName);

    service.write(featureName, 'overview', 'Human-facing summary');
    service.write(featureName, 'decisions', 'Technical decisions');

    const overview = service.getOverview(featureName);

    expect(overview?.name).toBe('overview');
    expect(overview?.content).toBe('Human-facing summary');
  });

  it('excludes overview from execution context listings', () => {
    const featureName = 'execution-context';
    setupFeature(featureName);

    service.write(featureName, 'overview', 'Human-facing summary');
    service.write(featureName, 'decisions', 'Technical decisions');

    const executionContext = service.listExecutionContext(featureName);

    expect(executionContext?.map((file: { name: string }) => file.name)).toEqual(['decisions']);
  });

  it('classifies known context names without constraining unknown ones', () => {
    const featureName = 'classified-context';
    setupFeature(featureName);

    service.write(featureName, 'overview', 'Human-facing summary');
    service.write(featureName, 'draft', 'Scratchpad notes');
    service.write(featureName, 'execution-decisions', 'Operational note');
    service.write(featureName, 'learnings', 'Durable learning');

    expect(service.list(featureName).map(file => [
      file.name,
      file.role,
      file.includeInExecution,
      file.includeInAgentsMdSync,
    ])).toEqual([
      ['draft', 'scratchpad', false, false],
      ['execution-decisions', 'operational', false, false],
      ['learnings', 'durable', true, true],
      ['overview', 'human', false, false],
    ]);
  });
});
