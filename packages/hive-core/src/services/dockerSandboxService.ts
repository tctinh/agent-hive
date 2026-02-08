import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

export interface SandboxConfig {
  mode: 'none' | 'docker';
  image?: string;
}

/**
 * DockerSandboxService handles Level 1 Docker sandboxing for Hive workers.
 * Uses ephemeral containers (docker run --rm) with volume mounts.
 * 
 * Level 1: Lightweight docker run (no devcontainer.json, no persistent containers)
 */
export class DockerSandboxService {
  /**
   * Detects appropriate Docker image based on project files in worktree.
   * 
   * @param worktreePath - Path to the worktree directory
   * @returns Docker image name, or null if Dockerfile exists (user manages their own)
   */
  static detectImage(worktreePath: string): string | null {
    // Dockerfile exists → user builds their own container
    if (existsSync(join(worktreePath, 'Dockerfile'))) {
      return null;
    }

    // Node.js project
    if (existsSync(join(worktreePath, 'package.json'))) {
      return 'node:22-slim';
    }

    // Python project
    if (existsSync(join(worktreePath, 'requirements.txt')) || 
        existsSync(join(worktreePath, 'pyproject.toml'))) {
      return 'python:3.12-slim';
    }

    // Go project
    if (existsSync(join(worktreePath, 'go.mod'))) {
      return 'golang:1.22-slim';
    }

    // Rust project
    if (existsSync(join(worktreePath, 'Cargo.toml'))) {
      return 'rust:1.77-slim';
    }

    // Fallback
    return 'ubuntu:24.04';
  }

  /**
   * Builds docker run command with volume mount and working directory.
   * 
   * @param worktreePath - Path to the worktree directory
   * @param command - Command to execute inside container
   * @param image - Docker image to use
   * @returns Complete docker run command string
   */
  static buildRunCommand(worktreePath: string, command: string, image: string): string {
    // Escape single quotes for shell safety: replace ' with '\''
    const escapedCommand = command.replace(/'/g, "'\\''");
    return `docker run --rm -v ${worktreePath}:/app -w /app ${image} sh -c '${escapedCommand}'`;
  }

  /**
   * Checks if Docker is available on the system.
   * 
   * @returns true if docker is available, false otherwise
   */
  static isDockerAvailable(): boolean {
    try {
      execSync('docker info', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wraps a command with Docker container execution based on config.
   * 
   * @param worktreePath - Path to the worktree directory
   * @param command - Command to execute
   * @param config - Sandbox configuration
   * @returns Wrapped command (or original if no wrapping needed)
   */
  static wrapCommand(worktreePath: string, command: string, config: SandboxConfig): string {
    // Escape hatch: HOST: prefix bypasses wrapping
    if (command.startsWith('HOST: ')) {
      return command.substring(6); // Strip "HOST: " prefix
    }

    // Mode: none → no wrapping
    if (config.mode === 'none') {
      return command;
    }

    // Mode: docker
    let image: string | null;

    if (config.image) {
      // Explicit image override (overrides null detection too)
      image = config.image;
    } else {
      // Auto-detect image
      image = this.detectImage(worktreePath);

      // Dockerfile exists and no override → user manages their own container
      if (image === null) {
        return command;
      }
    }

    return this.buildRunCommand(worktreePath, command, image);
  }
}
