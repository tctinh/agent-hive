import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { AgentsMdService } from '../services/agentsMdService.js';
import { ContextService } from '../services/contextService.js';

describe('AgentsMdService', () => {
  let testDir: string;
  let service: AgentsMdService;
  let contextService: ContextService;

  beforeEach(() => {
    // Create temp directory for each test
    testDir = fs.mkdtempSync(path.join('/tmp', 'agents-md-test-'));
    contextService = new ContextService(testDir);
    service = new AgentsMdService(testDir, contextService);
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('init()', () => {
    test('with no existing AGENTS.md generates content string, does NOT write file', async () => {
      const result = await service.init();

      expect(result.existed).toBe(false);
      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe('string');
      expect(result.content.length).toBeGreaterThan(0);
      
      // Verify file was NOT written
      const agentsMdPath = path.join(testDir, 'AGENTS.md');
      expect(fs.existsSync(agentsMdPath)).toBe(false);
    });

    test('with existing AGENTS.md returns it unchanged, existed: true', async () => {
      const existingContent = '# Existing AGENTS.md\n\nThis is test content.';
      const agentsMdPath = path.join(testDir, 'AGENTS.md');
      fs.writeFileSync(agentsMdPath, existingContent);

      const result = await service.init();

      expect(result.existed).toBe(true);
      expect(result.content).toBe(existingContent);
      
      // Verify file was not modified
      const fileContent = fs.readFileSync(agentsMdPath, 'utf-8');
      expect(fileContent).toBe(existingContent);
    });
  });

  describe('scanAndGenerate()', () => {
    test('detects bun workspace monorepo from package.json', async () => {
      const packageJson = {
        name: 'test-repo',
        workspaces: ['packages/*'],
      };
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = await service.init();

      expect(result.content).toContain('bun');
      expect(result.content).toContain('monorepo');
      expect(result.content).toContain('workspaces');
    });

    test('detects package.json scripts (build, test, dev)', async () => {
      const packageJson = {
        name: 'test-repo',
        scripts: {
          build: 'bun run build',
          test: 'bun test',
          dev: 'bun run dev',
        },
      };
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );
      // Create bun.lockb to detect bun as package manager
      fs.writeFileSync(path.join(testDir, 'bun.lockb'), '');

      const result = await service.init();

      expect(result.content).toContain('bun run build');
      expect(result.content).toContain('bun test');
      expect(result.content).toContain('bun run dev');
    });
  });

  describe('sync()', () => {
    beforeEach(() => {
      // Create a feature with contexts directory
      const featurePath = path.join(testDir, '.hive', 'features', 'test-feature');
      fs.mkdirSync(featurePath, { recursive: true });
    });

    test('calls contextService.list() with feature name and extracts findings', async () => {
      // Setup context files with actionable findings
      contextService.write('test-feature', 'conventions', 
        'We use Zustand, not Redux\nAuth lives in /lib/auth, not /utils/auth');
      contextService.write('test-feature', 'decisions',
        'Build command: bun run build\nPrefer async/await over .then()');

      const result = await service.sync('test-feature');

      expect(result.proposals).toBeDefined();
      expect(Array.isArray(result.proposals)).toBe(true);
      expect(result.diff).toBeDefined();
      expect(typeof result.diff).toBe('string');
    });

    test('generates proposals only for findings NOT already in AGENTS.md', async () => {
      // Create AGENTS.md with existing content
      const existingContent = `# Agent Guidelines\n\n## Code Style\n\nWe use Zustand for state management.\n`;
      fs.writeFileSync(path.join(testDir, 'AGENTS.md'), existingContent);

      // Add context with duplicate and new findings
      contextService.write('test-feature', 'conventions',
        'We use Zustand for state management.\nWe use TypeScript strict mode.');

      const result = await service.sync('test-feature');

      // Should only propose the new finding (TypeScript strict mode)
      expect(result.proposals.length).toBe(1);
      expect(result.proposals[0]).toContain('TypeScript strict mode');
      expect(result.proposals[0]).not.toContain('Zustand');
    });

    test('returns empty proposals array when all findings already present', async () => {
      // Create AGENTS.md with existing content
      const existingContent = `# Agent Guidelines\n\nWe use Zustand for state management.\n`;
      fs.writeFileSync(path.join(testDir, 'AGENTS.md'), existingContent);

      // Add context with only duplicate finding
      contextService.write('test-feature', 'conventions',
        'We use Zustand for state management.');

      const result = await service.sync('test-feature');

      expect(result.proposals.length).toBe(0);
      expect(result.diff).toBe('');
    });
  });
});
