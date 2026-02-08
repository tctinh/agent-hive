import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { AgentsMdService } from '../services/agentsMdService.js';

describe('AgentsMdService', () => {
  let testDir: string;
  let service: AgentsMdService;

  beforeEach(() => {
    // Create temp directory for each test
    testDir = fs.mkdtempSync(path.join('/tmp', 'agents-md-test-'));
    service = new AgentsMdService(testDir);
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
});
