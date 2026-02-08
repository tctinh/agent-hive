import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { DockerSandboxService } from '../services/dockerSandboxService.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

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
  });
});
