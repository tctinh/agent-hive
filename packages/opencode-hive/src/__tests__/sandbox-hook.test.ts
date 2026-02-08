import { describe, test, expect } from 'bun:test';
import * as path from 'path';
import { DockerSandboxService } from 'hive-core';

/**
 * Tests for tool.execute.before hook bash interception with Docker sandboxing
 * 
 * The hook should:
 * - Only intercept bash tool calls
 * - Only wrap commands with explicit workdir inside .hive/.worktrees/
 * - Respect sandbox config mode ('none' = no wrapping, 'docker' = wrap)
 * - Support HOST: prefix escape hatch
 * - Clear workdir after wrapping (docker runs on host)
 * 
 * Note: These tests simulate the hook logic. The actual hook is in index.ts
 */

describe('tool.execute.before bash interception hook logic', () => {
  const mockDirectory = '/mock/project';
  const hiveWorktreeBase = path.join(mockDirectory, '.hive', '.worktrees');
  const worktreePath = path.join(hiveWorktreeBase, 'feature-x', 'task-1');

  /**
   * Simulates the hook logic from index.ts
   */
  const executeHook = (
    input: { tool: string; sessionID: string; callID: string },
    output: { args: any },
    sandboxConfig: { mode: 'none' | 'docker'; image?: string },
    directory: string
  ) => {
    if (input.tool !== "bash") return;
    
    if (sandboxConfig.mode === 'none') return;
    
    const command = output.args?.command?.trim();
    if (!command) return;
    
    // Escape hatch: HOST: prefix (case-insensitive)
    if (/^HOST:\s*/i.test(command)) {
      const strippedCommand = command.replace(/^HOST:\s*/i, '');
      console.warn(`[hive:sandbox] HOST bypass: ${strippedCommand.slice(0, 80)}${strippedCommand.length > 80 ? '...' : ''}`);
      output.args.command = strippedCommand;
      return;
    }
    
    // Only wrap commands with explicit workdir inside hive worktrees
    const workdir = output.args?.workdir;
    if (!workdir) return;
    
    const hiveWorktreeBase = path.join(directory, '.hive', '.worktrees');
    if (!workdir.startsWith(hiveWorktreeBase)) return;
    
    // Wrap command using static method
    const wrapped = DockerSandboxService.wrapCommand(workdir, command, sandboxConfig);
    output.args.command = wrapped;
    output.args.workdir = undefined; // docker command runs on host
  };

  describe('sandbox mode: docker', () => {
    test('wraps bash command with explicit workdir inside .hive/.worktrees/', () => {
      const sandboxConfig = { mode: 'docker' as const, image: 'node:22-slim' };
      
      const input = {
        tool: 'bash',
        sessionID: 'test-session',
        callID: 'test-call',
      };
      const output = {
        args: {
          command: 'bun test',
          workdir: worktreePath,
        },
      };

      executeHook(input, output, sandboxConfig, mockDirectory);

      // Command should be wrapped with docker run
      expect(output.args.command).toContain('docker run');
      expect(output.args.command).toContain('node:22-slim');
      expect(output.args.command).toContain('bun test');
      // Workdir should be cleared (docker runs on host)
      expect(output.args.workdir).toBeUndefined();
    });

    test('passes through bash command without workdir', () => {
      const sandboxConfig = { mode: 'docker' as const, image: 'node:22-slim' };
      
      const input = {
        tool: 'bash',
        sessionID: 'test-session',
        callID: 'test-call',
      };
      const output = {
        args: {
          command: 'git status',
        },
      };

      const originalCommand = output.args.command;
      executeHook(input, output, sandboxConfig, mockDirectory);

      // Command should be unchanged
      expect(output.args.command).toBe(originalCommand);
      expect(output.args.command).not.toContain('docker run');
    });

    test('passes through bash command with workdir outside .hive/.worktrees/', () => {
      const sandboxConfig = { mode: 'docker' as const, image: 'node:22-slim' };
      
      const input = {
        tool: 'bash',
        sessionID: 'test-session',
        callID: 'test-call',
      };
      const output = {
        args: {
          command: 'npm install',
          workdir: '/mock/project/packages/hive-core',
        },
      };

      const originalCommand = output.args.command;
      const originalWorkdir = output.args.workdir;
      executeHook(input, output, sandboxConfig, mockDirectory);

      // Command and workdir should be unchanged
      expect(output.args.command).toBe(originalCommand);
      expect(output.args.workdir).toBe(originalWorkdir);
      expect(output.args.command).not.toContain('docker run');
    });

    test('strips HOST: prefix and bypasses wrapping', () => {
      const sandboxConfig = { mode: 'docker' as const, image: 'node:22-slim' };
      
      const input = {
        tool: 'bash',
        sessionID: 'test-session',
        callID: 'test-call',
      };
      const output = {
        args: {
          command: 'HOST: git status',
          workdir: worktreePath,
        },
      };

      executeHook(input, output, sandboxConfig, mockDirectory);

      // HOST: should be stripped, no docker wrapping
      expect(output.args.command).toBe('git status');
      expect(output.args.command).not.toContain('docker run');
      expect(output.args.command).not.toContain('HOST:');
      // Workdir should remain (not wrapped)
      expect(output.args.workdir).toBe(worktreePath);
    });

    test('strips HOST: prefix with case insensitivity', () => {
      const sandboxConfig = { mode: 'docker' as const, image: 'node:22-slim' };
      
      const input = {
        tool: 'bash',
        sessionID: 'test-session',
        callID: 'test-call',
      };
      const output = {
        args: {
          command: 'host: git log',
          workdir: worktreePath,
        },
      };

      executeHook(input, output, sandboxConfig, mockDirectory);

      expect(output.args.command).toBe('git log');
      expect(output.args.command).not.toContain('docker run');
    });

    test('logs console.warn with [hive:sandbox] prefix when HOST: is used', () => {
      const sandboxConfig = { mode: 'docker' as const, image: 'node:22-slim' };
      
      const input = {
        tool: 'bash',
        sessionID: 'test-session',
        callID: 'test-call',
      };
      const output = {
        args: {
          command: 'HOST: bun test',
          workdir: worktreePath,
        },
      };

      const originalWarn = console.warn;
      const warnings: string[] = [];
      console.warn = (...args: any[]) => {
        warnings.push(args.join(' '));
      };

      executeHook(input, output, sandboxConfig, mockDirectory);

      console.warn = originalWarn;

      expect(warnings.length).toBe(1);
      expect(warnings[0]).toContain('[hive:sandbox]');
      expect(warnings[0]).toContain('HOST bypass:');
      expect(warnings[0]).toContain('bun test');
    });

    test('truncates long commands in HOST: audit log', () => {
      const sandboxConfig = { mode: 'docker' as const, image: 'node:22-slim' };
      const longCommand = 'HOST: echo ' + 'a'.repeat(100); // 106 chars after "HOST: "
      
      const input = {
        tool: 'bash',
        sessionID: 'test-session',
        callID: 'test-call',
      };
      const output = {
        args: {
          command: longCommand,
          workdir: worktreePath,
        },
      };

      const originalWarn = console.warn;
      const warnings: string[] = [];
      console.warn = (...args: any[]) => {
        warnings.push(args.join(' '));
      };

      executeHook(input, output, sandboxConfig, mockDirectory);

      console.warn = originalWarn;

      expect(warnings.length).toBe(1);
      const logMessage = warnings[0];
      expect(logMessage).toContain('[hive:sandbox]');
      expect(logMessage).toContain('...');
      // Verify it's truncated (should be ~80 chars + "..." after the prefix)
      const commandPart = logMessage.split('HOST bypass: ')[1];
      expect(commandPart.length).toBeLessThan(90); // 80 + "..." + some margin
    });
  });

  describe('sandbox mode: none', () => {
    test('passes through bash command unchanged', () => {
      const sandboxConfig = { mode: 'none' as const };
      
      const input = {
        tool: 'bash',
        sessionID: 'test-session',
        callID: 'test-call',
      };
      const output = {
        args: {
          command: 'bun test',
          workdir: worktreePath,
        },
      };

      const originalCommand = output.args.command;
      const originalWorkdir = output.args.workdir;
      executeHook(input, output, sandboxConfig, mockDirectory);

      // Nothing should change
      expect(output.args.command).toBe(originalCommand);
      expect(output.args.workdir).toBe(originalWorkdir);
      expect(output.args.command).not.toContain('docker run');
    });
  });

  describe('non-bash tools', () => {
    test('ignores read tool', () => {
      const sandboxConfig = { mode: 'docker' as const, image: 'node:22-slim' };
      
      const input = {
        tool: 'read',
        sessionID: 'test-session',
        callID: 'test-call',
      };
      const output = {
        args: {
          filePath: '/some/file.ts',
        },
      };

      executeHook(input, output, sandboxConfig, mockDirectory);

      // Nothing should change (no workdir or command to modify)
      expect(output.args.filePath).toBe('/some/file.ts');
    });

    test('ignores write tool', () => {
      const sandboxConfig = { mode: 'docker' as const, image: 'node:22-slim' };
      
      const input = {
        tool: 'write',
        sessionID: 'test-session',
        callID: 'test-call',
      };
      const output = {
        args: {
          filePath: '/some/file.ts',
          content: 'test',
        },
      };

      executeHook(input, output, sandboxConfig, mockDirectory);

      // Nothing should change
      expect(output.args.filePath).toBe('/some/file.ts');
      expect(output.args.content).toBe('test');
    });
  });

  describe('edge cases', () => {
    test('handles empty command', () => {
      const sandboxConfig = { mode: 'docker' as const, image: 'node:22-slim' };
      
      const input = {
        tool: 'bash',
        sessionID: 'test-session',
        callID: 'test-call',
      };
      const output = {
        args: {
          command: '   ',
          workdir: worktreePath,
        },
      };

      const originalWorkdir = output.args.workdir;
      executeHook(input, output, sandboxConfig, mockDirectory);

      // Empty command should not be wrapped
      expect(output.args.command).toBe('   ');
      expect(output.args.workdir).toBe(originalWorkdir);
      expect(output.args.command).not.toContain('docker run');
    });

    test('handles missing args', () => {
      const sandboxConfig = { mode: 'docker' as const, image: 'node:22-slim' };
      
      const input = {
        tool: 'bash',
        sessionID: 'test-session',
        callID: 'test-call',
      };
      const output = {
        args: undefined,
      };

      // Should not throw, just return early
      expect(() => executeHook(input, output, sandboxConfig, mockDirectory)).not.toThrow();
    });

    test('handles command with special characters', () => {
      const sandboxConfig = { mode: 'docker' as const, image: 'node:22-slim' };
      
      const input = {
        tool: 'bash',
        sessionID: 'test-session',
        callID: 'test-call',
      };
      const output = {
        args: {
          command: 'echo "hello world" && ls -la',
          workdir: worktreePath,
        },
      };

      executeHook(input, output, sandboxConfig, mockDirectory);

      // Command should be wrapped with proper escaping
      expect(output.args.command).toContain('docker run');
      expect(output.args.command).toContain('echo "hello world" && ls -la');
      expect(output.args.workdir).toBeUndefined();
    });
  });
});
