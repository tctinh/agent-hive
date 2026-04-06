import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { WorktreeService } from 'hive-core';
import { getMergeTools } from './merge';

const TEST_ROOT_BASE = `/tmp/vscode-hive-merge-test-${process.pid}`;

describe('getMergeTools', () => {
  let testRoot: string;

  beforeEach(() => {
    fs.rmSync(TEST_ROOT_BASE, { recursive: true, force: true });
    fs.mkdirSync(TEST_ROOT_BASE, { recursive: true });
    testRoot = fs.mkdtempSync(path.join(TEST_ROOT_BASE, 'workspace-'));
  });

  afterEach(() => {
    fs.rmSync(TEST_ROOT_BASE, { recursive: true, force: true });
  });

  it('registers helper-friendly merge inputs and result payload', async () => {
    const tool = getMergeTools(testRoot).find(candidate => candidate.name === 'hive_merge');
    if (!tool) {
      throw new Error('hive_merge tool not found');
    }

    expect(tool.inputSchema).toEqual({
      type: 'object',
      properties: {
        feature: { type: 'string', description: 'Feature name' },
        task: { type: 'string', description: 'Task folder name' },
        strategy: {
          type: 'string',
          enum: ['merge', 'squash', 'rebase'],
          description: 'Merge strategy (default: merge)',
        },
        message: {
          type: 'string',
          description: 'Optional merge commit message for merge/squash only. Empty uses default.',
        },
        preserveConflicts: {
          type: 'boolean',
          description: 'Keep merge conflict state intact instead of auto-aborting (default: false).',
        },
        cleanup: {
          type: 'string',
          enum: ['none', 'worktree', 'worktree+branch'],
          description: 'Cleanup mode after a successful merge (default: none).',
        },
      },
      required: ['feature', 'task'],
    });
  });

  it('returns the shared merge result contract plus a concise message', async () => {
    const mergeTool = getMergeTools(testRoot).find(candidate => candidate.name === 'hive_merge');
    if (!mergeTool) {
      throw new Error('hive_merge tool not found');
    }

    const originalMerge = WorktreeService.prototype.merge;
    WorktreeService.prototype.merge = async () => ({
      success: true,
      merged: true,
      strategy: 'merge',
      sha: 'abc123',
      filesChanged: ['task-note.txt'],
      conflicts: [],
      conflictState: 'none',
      cleanup: {
        worktreeRemoved: true,
        branchDeleted: false,
        pruned: true,
      },
    });

    try {
      const output = JSON.parse(await mergeTool.invoke({
        feature: 'demo',
        task: '01-task',
        strategy: 'merge',
        cleanup: 'worktree',
      }, {} as any)) as Record<string, unknown>;

      expect(output).toEqual({
        success: true,
        merged: true,
        strategy: 'merge',
        sha: 'abc123',
        filesChanged: ['task-note.txt'],
        conflicts: [],
        conflictState: 'none',
        cleanup: {
          worktreeRemoved: true,
          branchDeleted: false,
          pruned: true,
        },
        message: 'Merge completed.',
      });
    } finally {
      WorktreeService.prototype.merge = originalMerge;
    }
  });

  it('drops LM tool manifest entries while keeping merge-related extension commands', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf-8')
    ) as {
      contributes?: {
        languageModelTools?: Array<unknown>;
        commands?: Array<{ command?: string }>;
      };
    };

    const commandNames = packageJson.contributes?.commands?.map(command => command.command) ?? [];

    expect(packageJson.contributes?.languageModelTools).toBeUndefined();
    expect(commandNames).toContain('hive.startTask');
    expect(commandNames).toContain('hive.regenerateAgents');
  });
});
