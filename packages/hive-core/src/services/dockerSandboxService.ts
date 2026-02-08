import { existsSync } from 'fs';
import { join, sep } from 'path';
import { execSync } from 'child_process';

export interface SandboxConfig {
  mode: 'none' | 'docker';
  image?: string;
  persistent?: boolean;
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
   * Generates a container name from a worktree path.
   * Extracts feature and task from .hive/.worktrees/<feature>/<task> pattern.
   * 
   * @param worktreePath - Path to the worktree directory
   * @returns Container name (e.g., 'hive-my-feature-my-task')
   */
  static containerName(worktreePath: string): string {
    const parts = worktreePath.split(sep);
    const worktreeIdx = parts.indexOf('.worktrees');
    
    if (worktreeIdx === -1 || worktreeIdx + 2 >= parts.length) {
      // Not a standard worktree path, use timestamp
      return `hive-sandbox-${Date.now()}`;
    }
    
    const feature = parts[worktreeIdx + 1];
    const task = parts[worktreeIdx + 2];
    
    // Sanitize for Docker container name (only alphanumeric and hyphens)
    const name = `hive-${feature}-${task}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    
    // Docker container names must be <= 63 characters
    return name.slice(0, 63);
  }

  /**
   * Ensures a persistent container exists for the worktree.
   * If container already running, returns its name.
   * Otherwise, creates a new detached container.
   * 
   * @param worktreePath - Path to the worktree directory
   * @param image - Docker image to use
   * @returns Container name
   */
  static ensureContainer(worktreePath: string, image: string): string {
    const name = this.containerName(worktreePath);
    
    try {
      // Check if container exists and is running
      execSync(`docker inspect --format='{{.State.Running}}' ${name}`, { stdio: 'pipe' });
      return name; // Already running
    } catch {
      // Container doesn't exist, create it
      execSync(
        `docker run -d --name ${name} -v ${worktreePath}:/app -w /app ${image} tail -f /dev/null`,
        { stdio: 'pipe' }
      );
      return name;
    }
  }

  /**
   * Builds a docker exec command for persistent containers.
   * 
   * @param containerName - Name of the running container
   * @param command - Command to execute
   * @returns Complete docker exec command string
   */
  static buildExecCommand(containerName: string, command: string): string {
    // Escape single quotes for shell safety: replace ' with '\''
    const escapedCommand = command.replace(/'/g, "'\\''");
    return `docker exec ${containerName} sh -c '${escapedCommand}'`;
  }

  /**
   * Stops and removes a persistent container for a worktree.
   * 
   * @param worktreePath - Path to the worktree directory
   */
  static stopContainer(worktreePath: string): void {
    const name = this.containerName(worktreePath);
    try {
      execSync(`docker rm -f ${name}`, { stdio: 'ignore' });
    } catch {
      // Ignore errors (container may not exist)
    }
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

    // Use persistent container (docker exec) or ephemeral (docker run --rm)
    if (config.persistent) {
      const containerName = this.ensureContainer(worktreePath, image);
      return this.buildExecCommand(containerName, command);
    } else {
      return this.buildRunCommand(worktreePath, command, image);
    }
  }
}
