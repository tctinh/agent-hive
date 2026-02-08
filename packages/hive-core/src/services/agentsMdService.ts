import * as fs from 'fs';
import * as path from 'path';
import { fileExists, readText } from '../utils/paths.js';

export interface InitResult {
  content: string;
  existed: boolean;
}

export class AgentsMdService {
  constructor(private readonly rootDir: string) {}

  async init(): Promise<InitResult> {
    const agentsMdPath = path.join(this.rootDir, 'AGENTS.md');
    const existed = fileExists(agentsMdPath);

    if (existed) {
      const existing = readText(agentsMdPath);
      return { content: existing || '', existed: true };
    }

    // Scan codebase for bootstrap content — DO NOT write to disk
    const content = await this.scanAndGenerate();
    return { content, existed: false };
  }

  private async scanAndGenerate(): Promise<string> {
    const detections = await this.detectProjectInfo();
    return this.generateTemplate(detections);
  }

  private async detectProjectInfo(): Promise<ProjectInfo> {
    const packageJsonPath = path.join(this.rootDir, 'package.json');
    let packageJson: PackageJson | null = null;

    if (fileExists(packageJsonPath)) {
      try {
        const content = readText(packageJsonPath);
        packageJson = content ? JSON.parse(content) : null;
      } catch {
        // Invalid JSON, skip
      }
    }

    const info: ProjectInfo = {
      packageManager: this.detectPackageManager(),
      language: this.detectLanguage(),
      testFramework: this.detectTestFramework(packageJson),
      buildCommand: packageJson?.scripts?.build || null,
      testCommand: packageJson?.scripts?.test || null,
      devCommand: packageJson?.scripts?.dev || null,
      isMonorepo: this.detectMonorepo(packageJson),
    };

    return info;
  }

  private detectPackageManager(): string {
    // Check for lock files
    if (fileExists(path.join(this.rootDir, 'bun.lockb'))) return 'bun';
    if (fileExists(path.join(this.rootDir, 'pnpm-lock.yaml'))) return 'pnpm';
    if (fileExists(path.join(this.rootDir, 'yarn.lock'))) return 'yarn';
    if (fileExists(path.join(this.rootDir, 'package-lock.json'))) return 'npm';
    return 'npm'; // default
  }

  private detectLanguage(): string {
    if (fileExists(path.join(this.rootDir, 'tsconfig.json'))) return 'TypeScript';
    if (fileExists(path.join(this.rootDir, 'package.json'))) return 'JavaScript';
    if (fileExists(path.join(this.rootDir, 'requirements.txt'))) return 'Python';
    if (fileExists(path.join(this.rootDir, 'go.mod'))) return 'Go';
    if (fileExists(path.join(this.rootDir, 'Cargo.toml'))) return 'Rust';
    return 'Unknown';
  }

  private detectTestFramework(packageJson: PackageJson | null): string | null {
    if (!packageJson) return null;

    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    if (deps?.vitest) return 'vitest';
    if (deps?.jest) return 'jest';
    if (this.detectPackageManager() === 'bun') return 'bun test';
    if (deps?.pytest) return 'pytest';
    return null;
  }

  private detectMonorepo(packageJson: PackageJson | null): boolean {
    if (!packageJson) return false;
    return !!packageJson.workspaces;
  }

  private generateTemplate(info: ProjectInfo): string {
    const sections: string[] = [];

    // Header
    sections.push('# Agent Guidelines\n');
    sections.push('## Overview\n');
    sections.push('This project uses AI-assisted development. Follow these guidelines.\n');

    // Build & Test Commands
    sections.push('## Build & Test Commands\n');
    sections.push('```bash');

    if (info.isMonorepo) {
      sections.push('# This is a monorepo using bun workspaces');
    }

    if (info.buildCommand) {
      sections.push(`# Build`);
      sections.push(`${info.packageManager} run build`);
      sections.push('');
    }

    if (info.testCommand) {
      sections.push(`# Run tests`);
      sections.push(`${info.packageManager} ${info.testCommand === 'bun test' ? 'test' : 'run test'}`);
      sections.push('');
    }

    if (info.devCommand) {
      sections.push(`# Development mode`);
      sections.push(`${info.packageManager} run dev`);
    }

    sections.push('```\n');

    // Technology Stack
    sections.push('## Technology Stack\n');
    sections.push(`- **Language**: ${info.language}`);
    sections.push(`- **Package Manager**: ${info.packageManager}`);
    if (info.testFramework) {
      sections.push(`- **Test Framework**: ${info.testFramework}`);
    }
    if (info.isMonorepo) {
      sections.push(`- **Structure**: Monorepo with workspaces`);
    }
    sections.push('');

    // Code Style
    sections.push('## Code Style\n');
    sections.push('Follow existing patterns in the codebase.\n');

    // Architecture
    sections.push('## Architecture Principles\n');
    sections.push('Document key architectural decisions here.\n');

    return sections.join('\n');
  }
}

interface PackageJson {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  workspaces?: string[] | { packages: string[] };
}

interface ProjectInfo {
  packageManager: string;
  language: string;
  testFramework: string | null;
  buildCommand: string | null;
  testCommand: string | null;
  devCommand: string | null;
  isMonorepo: boolean;
}
