import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { ContextService } from '../services/contextService.js';

const TEST_DIR = '/tmp/hive-core-contextservice-test-' + process.pid;
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

describe('ContextService', () => {
  let service: ContextService;

  beforeEach(() => {
    cleanup();
    fs.mkdirSync(TEST_DIR, { recursive: true });
    service = new ContextService(PROJECT_ROOT);
  });

  afterEach(() => {
    cleanup();
  });

  describe('archive()', () => {
    it('moves context files to archive/ with timestamp prefix', () => {
      const featureName = 'test-feature';
      setupFeature(featureName);

      // Create some context files
      service.write(featureName, 'research', 'Research findings here');
      service.write(featureName, 'decisions', 'Decision log here');

      // Archive them
      const result = service.archive(featureName);

      // Check returned data
      expect(result.archived).toContain('research');
      expect(result.archived).toContain('decisions');
      expect(result.archived.length).toBe(2);
      expect(result.archivePath).toContain('archive');

      // Verify archive directory exists
      expect(fs.existsSync(result.archivePath)).toBe(true);

      // Verify original files are gone
      const contexts = service.list(featureName);
      expect(contexts.length).toBe(0);

      // Verify archived files exist
      const archiveFiles = fs.readdirSync(result.archivePath);
      expect(archiveFiles.length).toBe(2);
      expect(archiveFiles.some(f => f.endsWith('_research.md'))).toBe(true);
      expect(archiveFiles.some(f => f.endsWith('_decisions.md'))).toBe(true);

      // Verify content preserved
      const researchArchive = archiveFiles.find(f => f.endsWith('_research.md'))!;
      const content = fs.readFileSync(path.join(result.archivePath, researchArchive), 'utf-8');
      expect(content).toBe('Research findings here');
    });

    it('returns empty array when no contexts exist', () => {
      const featureName = 'empty-feature';
      setupFeature(featureName);

      const result = service.archive(featureName);

      expect(result.archived).toEqual([]);
      expect(result.archivePath).toBe('');
    });
  });

  describe('stats()', () => {
    it('returns correct count, totalChars, oldest, newest', () => {
      const featureName = 'stats-feature';
      setupFeature(featureName);

      // Create contexts
      service.write(featureName, 'first', 'a'.repeat(100));
      service.write(featureName, 'second', 'b'.repeat(200));
      service.write(featureName, 'third', 'c'.repeat(300));
      
      // Manually adjust timestamps to ensure ordering
      const contextPath = path.join(TEST_DIR, '.hive', 'features', featureName, 'context');
      const now = Date.now();
      
      fs.utimesSync(path.join(contextPath, 'first.md'), (now - 2000) / 1000, (now - 2000) / 1000); // oldest
      fs.utimesSync(path.join(contextPath, 'second.md'), (now - 1000) / 1000, (now - 1000) / 1000); // middle
      fs.utimesSync(path.join(contextPath, 'third.md'), now / 1000, now / 1000); // newest

      const result = service.stats(featureName);

      expect(result.count).toBe(3);
      expect(result.totalChars).toBe(600);
      expect(result.oldest).toBe('first');
      expect(result.newest).toBe('third');
    });

    it('returns zero stats when no contexts exist', () => {
      const featureName = 'empty-stats';
      setupFeature(featureName);

      const result = service.stats(featureName);

      expect(result.count).toBe(0);
      expect(result.totalChars).toBe(0);
      expect(result.oldest).toBeUndefined();
      expect(result.newest).toBeUndefined();
    });
  });

  describe('write() with size warning', () => {
    it('returns warning when context total exceeds 20,000 chars', () => {
      const featureName = 'large-context';
      setupFeature(featureName);

      // Write contexts totaling > 20,000 chars
      service.write(featureName, 'large1', 'x'.repeat(15000));
      const result = service.write(featureName, 'large2', 'y'.repeat(6000));

      // Should contain warning
      expect(result).toContain('⚠️');
      expect(result).toContain('21000');
      expect(result).toContain('exceeds 20,000');
      expect(result).toContain('archive');
    });

    it('does not return warning when context total is under 20,000 chars', () => {
      const featureName = 'small-context';
      setupFeature(featureName);

      service.write(featureName, 'small1', 'x'.repeat(5000));
      const result = service.write(featureName, 'small2', 'y'.repeat(5000));

      // Should not contain warning
      expect(result).not.toContain('⚠️');
      expect(result).not.toContain('exceeds');
    });
  });
});
