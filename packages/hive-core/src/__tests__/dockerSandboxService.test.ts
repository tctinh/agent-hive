import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { DockerSandboxService } from '../services/dockerSandboxService.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as child_process from 'child_process';

describe('DockerSandboxService', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docker-sandbox-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('detectImage', () => {
    test('returns null when Dockerfile exists', async () => {
      await fs.writeFile(path.join(tempDir, 'Dockerfile'), '# test');
      const result = DockerSandboxService.detectImage(tempDir);
      expect(result).toBe(null);
    });

    test('returns node:22-slim when package.json exists', async () => {
      await fs.writeFile(path.join(tempDir, 'package.json'), '{}');
      const result = DockerSandboxService.detectImage(tempDir);
      expect(result).toBe('node:22-slim');
    });

    test('returns python:3.12-slim when requirements.txt exists', async () => {
      await fs.writeFile(path.join(tempDir, 'requirements.txt'), 'pytest');
      const result = DockerSandboxService.detectImage(tempDir);
      expect(result).toBe('python:3.12-slim');
    });

    test('returns python:3.12-slim when pyproject.toml exists', async () => {
      await fs.writeFile(path.join(tempDir, 'pyproject.toml'), '[tool.poetry]');
      const result = DockerSandboxService.detectImage(tempDir);
      expect(result).toBe('python:3.12-slim');
    });

    test('returns golang:1.22-slim when go.mod exists', async () => {
      await fs.writeFile(path.join(tempDir, 'go.mod'), 'module test');
      const result = DockerSandboxService.detectImage(tempDir);
      expect(result).toBe('golang:1.22-slim');
    });

    test('returns rust:1.77-slim when Cargo.toml exists', async () => {
      await fs.writeFile(path.join(tempDir, 'Cargo.toml'), '[package]');
      const result = DockerSandboxService.detectImage(tempDir);
      expect(result).toBe('rust:1.77-slim');
    });

    test('returns ubuntu:24.04 as fallback when no project files exist', () => {
      const result = DockerSandboxService.detectImage(tempDir);
      expect(result).toBe('ubuntu:24.04');
    });

    test('prioritizes Dockerfile over other files', async () => {
      await fs.writeFile(path.join(tempDir, 'Dockerfile'), '# test');
      await fs.writeFile(path.join(tempDir, 'package.json'), '{}');
      const result = DockerSandboxService.detectImage(tempDir);
      expect(result).toBe(null);
    });
  });

  describe('buildRunCommand', () => {
    test('builds basic docker run command', () => {
      const result = DockerSandboxService.buildRunCommand('/path/to/worktree', 'npm test', 'node:22-slim');
      expect(result).toBe("docker run --rm -v /path/to/worktree:/app -w /app node:22-slim sh -c 'npm test'");
    });

    test('handles commands with single quotes', () => {
      const result = DockerSandboxService.buildRunCommand('/path/to/worktree', "echo 'hello'", 'node:22-slim');
      expect(result).toBe("docker run --rm -v /path/to/worktree:/app -w /app node:22-slim sh -c 'echo '\\''hello'\\'''");
    });

    test('handles complex commands', () => {
      const result = DockerSandboxService.buildRunCommand('/path/to/worktree', 'bun test && echo done', 'node:22-slim');
      expect(result).toBe("docker run --rm -v /path/to/worktree:/app -w /app node:22-slim sh -c 'bun test && echo done'");
    });
  });

  describe('isDockerAvailable', () => {
    test('returns boolean based on docker availability', () => {
      const result = DockerSandboxService.isDockerAvailable();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('wrapCommand', () => {
    test('returns command unchanged when mode is none', async () => {
      await fs.writeFile(path.join(tempDir, 'package.json'), '{}');
      const result = DockerSandboxService.wrapCommand(tempDir, 'npm test', { mode: 'none' });
      expect(result).toBe('npm test');
    });

    test('returns command unchanged when Dockerfile exists and no image override', async () => {
      await fs.writeFile(path.join(tempDir, 'Dockerfile'), '# test');
      const result = DockerSandboxService.wrapCommand(tempDir, 'npm test', { mode: 'docker' });
      expect(result).toBe('npm test');
    });

    test('wraps command when image is detected', async () => {
      await fs.writeFile(path.join(tempDir, 'package.json'), '{}');
      const result = DockerSandboxService.wrapCommand(tempDir, 'npm test', { mode: 'docker' });
      expect(result).toBe(`docker run --rm -v ${tempDir}:/app -w /app node:22-slim sh -c 'npm test'`);
    });

    test('uses explicit image override even when Dockerfile exists', async () => {
      await fs.writeFile(path.join(tempDir, 'Dockerfile'), '# test');
      const result = DockerSandboxService.wrapCommand(tempDir, 'npm test', { mode: 'docker', image: 'node:20' });
      expect(result).toBe(`docker run --rm -v ${tempDir}:/app -w /app node:20 sh -c 'npm test'`);
    });

    test('strips HOST: prefix and returns unwrapped command', async () => {
      await fs.writeFile(path.join(tempDir, 'package.json'), '{}');
      const result = DockerSandboxService.wrapCommand(tempDir, 'HOST: npm test', { mode: 'docker' });
      expect(result).toBe('npm test');
    });

    test('handles HOST: prefix with mode none', () => {
      const result = DockerSandboxService.wrapCommand(tempDir, 'HOST: ls -la', { mode: 'none' });
      expect(result).toBe('ls -la');
    });

    test('uses docker exec when persistent mode enabled', async () => {
      await fs.writeFile(path.join(tempDir, 'package.json'), '{}');
      const execSyncSpy = spyOn(child_process, 'execSync').mockImplementation(() => '' as any);
      
      const worktreePath = '/repo/.hive/.worktrees/my-feature/my-task';
      const result = DockerSandboxService.wrapCommand(worktreePath, 'npm test', { mode: 'docker', persistent: true });
      
      // Should contain docker exec instead of docker run
      expect(result).toContain('docker exec');
      expect(result).toContain('hive-my-feature-my-task');
      
      execSyncSpy.mockRestore();
    });

    test('uses docker run when persistent mode disabled', async () => {
      await fs.writeFile(path.join(tempDir, 'package.json'), '{}');
      const result = DockerSandboxService.wrapCommand(tempDir, 'npm test', { mode: 'docker', persistent: false });
      expect(result).toContain('docker run --rm');
    });
  });

  describe('containerName', () => {
    test('extracts feature and task from worktree path', () => {
      const worktreePath = '/home/user/project/.hive/.worktrees/my-feature/my-task';
      const result = DockerSandboxService.containerName(worktreePath);
      expect(result).toBe('hive-my-feature-my-task');
    });

    test('handles complex feature and task names', () => {
      const worktreePath = '/repo/.hive/.worktrees/v1.2.0-tighten-gates/07-implement-persistent-sandbox';
      const result = DockerSandboxService.containerName(worktreePath);
      expect(result).toBe('hive-v1-2-0-tighten-gates-07-implement-persistent-sandbox');
    });

    test('handles non-worktree paths gracefully', () => {
      const worktreePath = '/some/random/path';
      const result = DockerSandboxService.containerName(worktreePath);
      expect(result).toMatch(/^hive-sandbox-\d+$/);
    });

    test('truncates names longer than 63 characters', () => {
      const worktreePath = '/repo/.hive/.worktrees/very-long-feature-name-that-goes-on-and-on/another-very-long-task-name';
      const result = DockerSandboxService.containerName(worktreePath);
      expect(result.length).toBeLessThanOrEqual(63);
    });
  });

  describe('ensureContainer', () => {
    test('returns existing container name when already running', () => {
      const execSyncSpy = spyOn(child_process, 'execSync').mockImplementation((cmd) => {
        if (typeof cmd === 'string' && cmd.includes('docker inspect')) {
          return 'true' as any;
        }
        return '' as any;
      });

      const worktreePath = '/repo/.hive/.worktrees/my-feature/my-task';
      const result = DockerSandboxService.ensureContainer(worktreePath, 'node:22-slim');
      
      expect(result).toBe('hive-my-feature-my-task');
      expect(execSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining('docker inspect'),
        expect.any(Object)
      );
      
      execSyncSpy.mockRestore();
    });

    test('creates new container when not found', () => {
      const execSyncSpy = spyOn(child_process, 'execSync').mockImplementation((cmd) => {
        if (typeof cmd === 'string' && cmd.includes('docker inspect')) {
          throw new Error('container not found');
        }
        return '' as any;
      });

      const worktreePath = '/repo/.hive/.worktrees/my-feature/my-task';
      const result = DockerSandboxService.ensureContainer(worktreePath, 'node:22-slim');
      
      expect(result).toBe('hive-my-feature-my-task');
      expect(execSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining('docker run -d'),
        expect.any(Object)
      );
      expect(execSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining('tail -f /dev/null'),
        expect.any(Object)
      );
      
      execSyncSpy.mockRestore();
    });
  });

  describe('buildExecCommand', () => {
    test('produces correct docker exec command', () => {
      const result = DockerSandboxService.buildExecCommand('hive-my-feature-my-task', 'npm test');
      expect(result).toBe("docker exec hive-my-feature-my-task sh -c 'npm test'");
    });

    test('escapes single quotes in commands', () => {
      const result = DockerSandboxService.buildExecCommand('my-container', "echo 'hello world'");
      expect(result).toBe("docker exec my-container sh -c 'echo '\\''hello world'\\'''");
    });

    test('handles complex commands with pipes and redirects', () => {
      const result = DockerSandboxService.buildExecCommand('my-container', 'cat file.txt | grep test');
      expect(result).toBe("docker exec my-container sh -c 'cat file.txt | grep test'");
    });
  });

  describe('stopContainer', () => {
    test('calls docker rm -f with correct container name', () => {
      const execSyncSpy = spyOn(child_process, 'execSync').mockImplementation(() => '' as any);

      const worktreePath = '/repo/.hive/.worktrees/my-feature/my-task';
      DockerSandboxService.stopContainer(worktreePath);
      
      expect(execSyncSpy).toHaveBeenCalledWith(
        'docker rm -f hive-my-feature-my-task',
        { stdio: 'ignore' }
      );
      
      execSyncSpy.mockRestore();
    });

    test('silently ignores errors when container does not exist', () => {
      const execSyncSpy = spyOn(child_process, 'execSync').mockImplementation(() => {
        throw new Error('container not found');
      });

      const worktreePath = '/repo/.hive/.worktrees/my-feature/my-task';
      expect(() => DockerSandboxService.stopContainer(worktreePath)).not.toThrow();
      
      execSyncSpy.mockRestore();
    });
  });
});
