import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import {
  finalizeTaskCheckpoint,
  readTaskCheckpoint,
  updateTaskCheckpoint,
} from './task-checkpoint.js';

const TEST_ROOT = `/tmp/opencode-hive-task-checkpoint-${process.pid}`;

function cleanup(): void {
  fs.rmSync(TEST_ROOT, { recursive: true, force: true });
}

describe('task checkpoint lifecycle', () => {
  beforeEach(() => {
    cleanup();
    fs.mkdirSync(TEST_ROOT, { recursive: true });
  });

  afterEach(() => {
    cleanup();
  });

  it('writes bounded semantic checkpoint content without prompt or transcript dumps', () => {
    const checkpoint = updateTaskCheckpoint(TEST_ROOT, {
      featureName: 'checkpoint-feature',
      taskFolder: '01-checkpoint-task',
      currentObjective: 'Capture child session provenance.',
      stateSummary: 'Waiting for delegated subagent session binding.',
      importantDecisions: ['Use structured task() metadata sessionId.'],
      filesInPlay: ['packages/opencode-hive/src/index.ts'],
      verificationState: 'Not run yet.',
      nextAction: 'Bind the returned child session.',
      childSession: {
        sessionId: 'ses_child_1',
        parentSessionId: 'ses_parent_1',
        delegatedAgent: 'scout-researcher',
        source: 'opencode-task-tool',
        kind: 'subagent',
      },
    });

    expect(checkpoint.taskFolder).toBe('01-checkpoint-task');
    expect(checkpoint.currentObjective).toBe('Capture child session provenance.');
    expect((checkpoint as Record<string, unknown>).directivePrompt).toBeUndefined();
    expect((checkpoint as Record<string, unknown>).messages).toBeUndefined();
    expect((checkpoint as Record<string, unknown>).prompt).toBeUndefined();

    const checkpointPath = path.join(
      TEST_ROOT,
      '.hive',
      'features',
      'checkpoint-feature',
      'tasks',
      '01-checkpoint-task',
      'checkpoint.json',
    );
    const raw = fs.readFileSync(checkpointPath, 'utf-8');
    expect(raw).not.toContain('worker-prompt.md');
    expect(raw).not.toContain('transcript');
    expect(raw).not.toContain('messageID');
  });

  it('updates one live checkpoint in place and finalizes it without creating history files', () => {
    updateTaskCheckpoint(TEST_ROOT, {
      featureName: 'checkpoint-feature',
      taskFolder: '01-checkpoint-task',
      currentObjective: 'First objective.',
      stateSummary: 'Starting work.',
      importantDecisions: ['First decision'],
      filesInPlay: ['packages/opencode-hive/src/index.ts'],
      verificationState: 'Not run',
      nextAction: 'Continue',
    });

    const updated = updateTaskCheckpoint(TEST_ROOT, {
      featureName: 'checkpoint-feature',
      taskFolder: '01-checkpoint-task',
      currentObjective: 'Updated objective.',
      stateSummary: 'Bound child session.',
      importantDecisions: ['First decision', 'Second decision'],
      filesInPlay: ['packages/opencode-hive/src/index.ts', 'packages/hive-core/src/types.ts'],
      verificationState: 'Session tests added.',
      nextAction: 'Run plugin tests.',
    });

    expect(updated.currentObjective).toBe('Updated objective.');
    expect(updated.importantDecisions).toEqual(['First decision', 'Second decision']);

    const finalized = finalizeTaskCheckpoint(TEST_ROOT, 'checkpoint-feature', '01-checkpoint-task', {
      status: 'completed',
      stateSummary: 'Finished and committed.',
      verificationState: 'Tests pass.',
      nextAction: 'Await merge.',
    });

    expect(finalized.status).toBe('completed');
    expect(finalized.stateSummary).toBe('Finished and committed.');
    expect(finalized.nextAction).toBe('Await merge.');

    const taskDir = path.join(
      TEST_ROOT,
      '.hive',
      'features',
      'checkpoint-feature',
      'tasks',
      '01-checkpoint-task',
    );
    expect(fs.readdirSync(taskDir).filter((entry) => entry.startsWith('checkpoint')).sort()).toEqual(['checkpoint.json']);
  });

  it('returns undefined when no checkpoint exists yet', () => {
    expect(readTaskCheckpoint(TEST_ROOT, 'missing-feature', '01-missing-task')).toBeUndefined();
  });
});
