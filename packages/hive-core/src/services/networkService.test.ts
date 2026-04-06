import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DIR = `/tmp/hive-core-networkservice-test-${process.pid}`;

interface QueryResult {
  feature: string;
  sourceType: 'plan' | 'context';
  sourceName: string;
  path: string;
  updatedAt: string;
  snippet: string;
}

function cleanup(): void {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
}

function writeFeatureJson(featurePath: string, featureName: string): void {
  fs.writeFileSync(
    path.join(featurePath, 'feature.json'),
    JSON.stringify({ name: featureName, status: 'planning', createdAt: '2026-01-01T00:00:00.000Z' })
  );
}

function setupFeature(featureName: string, directoryName = featureName): string {
  const featurePath = path.join(TEST_DIR, '.hive', 'features', directoryName);
  fs.mkdirSync(path.join(featurePath, 'context'), { recursive: true });
  writeFeatureJson(featurePath, featureName);
  return featurePath;
}

function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function setMtime(filePath: string, isoString: string): void {
  const date = new Date(isoString);
  fs.utimesSync(filePath, date, date);
}

describe('NetworkService', () => {
  beforeEach(() => {
    cleanup();
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    cleanup();
  });

  it('returns deterministic plan-first and context-sorted matches across legacy and indexed features', async () => {
    const alphaFeaturePath = setupFeature('alpha-feature', '02_alpha-feature');
    const betaFeaturePath = setupFeature('beta-feature');
    const currentFeaturePath = setupFeature('current-feature', '01_current-feature');

    writeFile(path.join(alphaFeaturePath, 'plan.md'), 'Alpha plan introduces network design through plan details.');
    writeFile(path.join(alphaFeaturePath, 'context', 'zeta.md'), 'Later notes mention network design after the main plan.');
    writeFile(path.join(alphaFeaturePath, 'context', 'alpha.md'), 'Alpha context captures network design constraints.');
    writeFile(path.join(alphaFeaturePath, 'context', 'overview.md'), 'network design hidden in overview');
    writeFile(path.join(alphaFeaturePath, 'report.md'), 'network design hidden in report');
    writeFile(path.join(alphaFeaturePath, 'comments.json'), '{"threads":[{"body":"network design hidden in comments"}]}');

    writeFile(path.join(betaFeaturePath, 'plan.md'), 'Beta plan covers network design and retrieval rules.');
    writeFile(path.join(betaFeaturePath, 'context', 'beta-notes.md'), 'Beta notes discuss network design rollout.');
    writeFile(path.join(betaFeaturePath, 'context', 'draft.md'), 'network design hidden in draft');

    writeFile(path.join(currentFeaturePath, 'plan.md'), 'Current feature also says network design.');
    writeFile(path.join(currentFeaturePath, 'context', 'learnings.md'), 'Current feature learnings say network design.');

    setMtime(path.join(alphaFeaturePath, 'plan.md'), '2026-01-02T00:00:00.000Z');
    setMtime(path.join(alphaFeaturePath, 'context', 'alpha.md'), '2026-01-03T00:00:00.000Z');
    setMtime(path.join(alphaFeaturePath, 'context', 'zeta.md'), '2026-01-04T00:00:00.000Z');
    setMtime(path.join(betaFeaturePath, 'plan.md'), '2026-01-05T00:00:00.000Z');
    setMtime(path.join(betaFeaturePath, 'context', 'beta-notes.md'), '2026-01-06T00:00:00.000Z');

    const module = await import('./networkService.js');
    const service = new module.NetworkService(TEST_DIR);

    const results = service.query({
      currentFeature: 'current-feature',
      query: 'NETWORK   design',
      maxFeatures: 10,
      maxSnippetsPerFeature: 10,
      maxSnippetChars: 160,
    }) as QueryResult[];

    expect(results.map(result => [result.feature, result.sourceType, result.sourceName])).toEqual([
      ['alpha-feature', 'plan', 'plan.md'],
      ['alpha-feature', 'context', 'alpha'],
      ['alpha-feature', 'context', 'zeta'],
      ['beta-feature', 'plan', 'plan.md'],
      ['beta-feature', 'context', 'beta-notes'],
    ]);

    expect(results.every(result => result.feature !== 'current-feature')).toBe(true);
    expect(results.every(result => !result.path.endsWith('overview.md'))).toBe(true);
    expect(results.every(result => !result.path.endsWith('report.md'))).toBe(true);
    expect(results.every(result => !result.path.endsWith('comments.json'))).toBe(true);
    expect(results.every(result => typeof result.updatedAt === 'string' && result.updatedAt.length > 0)).toBe(true);
  });

  it('preserves the first matching window, normalizes whitespace, truncates snippets, and skips missing files safely', async () => {
    const featurePath = setupFeature('alpha-feature');
    const longPrefix = 'prefix '.repeat(30);
    const matchingContent = `${longPrefix}network\n\n\tdesign appears here with extra spacing and additional trailing text for truncation checks`;

    writeFile(path.join(featurePath, 'plan.md'), 'Plan does not match.');
    writeFile(path.join(featurePath, 'context', 'notes.md'), matchingContent);
    writeFile(path.join(featurePath, 'context', 'draft.md'), 'network design hidden in excluded draft');

    fs.rmSync(path.join(featurePath, 'plan.md'));

    const module = await import('./networkService.js');
    const service = new module.NetworkService(TEST_DIR);

    const results = service.query({
      currentFeature: 'other-feature',
      query: 'network design',
      maxFeatures: 10,
      maxSnippetsPerFeature: 10,
      maxSnippetChars: 45,
    }) as QueryResult[];

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      feature: 'alpha-feature',
      sourceType: 'context',
      sourceName: 'notes',
      path: path.join(featurePath, 'context', 'notes.md'),
    });
    expect(results[0].snippet).toBe('network design appears here with extra spacin');
  });

  it('applies feature and per-feature snippet limits deterministically', async () => {
    const alphaFeaturePath = setupFeature('alpha-feature');
    const betaFeaturePath = setupFeature('beta-feature');

    writeFile(path.join(alphaFeaturePath, 'plan.md'), 'alpha network design plan');
    writeFile(path.join(alphaFeaturePath, 'context', 'b.md'), 'alpha network design b');
    writeFile(path.join(alphaFeaturePath, 'context', 'a.md'), 'alpha network design a');
    writeFile(path.join(betaFeaturePath, 'plan.md'), 'beta network design plan');

    const module = await import('./networkService.js');
    const service = new module.NetworkService(TEST_DIR);

    const results = service.query({
      currentFeature: 'current-feature',
      query: 'network design',
      maxFeatures: 1,
      maxSnippetsPerFeature: 2,
      maxSnippetChars: 80,
    }) as QueryResult[];

    expect(results.map(result => [result.feature, result.sourceType, result.sourceName])).toEqual([
      ['alpha-feature', 'plan', 'plan.md'],
      ['alpha-feature', 'context', 'a'],
    ]);
  });
});
