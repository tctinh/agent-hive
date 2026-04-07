import { describe, expect, it } from 'bun:test';
import {
  classifyTaskToolLaunch,
  extractTaskToolChildSessionId,
  normalizeHiveFeatureName,
  type TaskToolLaunchState,
} from './task-session-binding.js';

describe('task session binding helpers', () => {
  it('classifies worker-prompt launches as Hive task-worker handoffs', () => {
    const state = classifyTaskToolLaunch({
      sessionID: 'sess-parent',
      args: {
        subagent_type: 'forager-worker',
        description: 'Hive: 01-task',
        prompt: 'Follow instructions in @.hive/features/demo/tasks/01-task/worker-prompt.md',
      },
    });

    expect(state.kind).toBe('task-worker');
    expect(state.parentSessionId).toBe('sess-parent');
    expect(state.taskFolder).toBe('01-task');
    expect(state.delegatedAgent).toBe('forager-worker');
    expect(state.workerPromptPath).toBe('.hive/features/demo/tasks/01-task/worker-prompt.md');
  });

  it('classifies other Hive task() launches as general subagent launches', () => {
    const state = classifyTaskToolLaunch({
      sessionID: 'sess-parent',
      args: {
        subagent_type: 'scout-researcher',
        description: 'Research runtime mismatch',
        prompt: 'Inspect the runtime mismatch and report back.',
      },
    });

    expect(state.kind).toBe('subagent');
    expect(state.parentSessionId).toBe('sess-parent');
    expect(state.delegatedAgent).toBe('scout-researcher');
    expect(state.taskFolder).toBeUndefined();
    expect(state.workerPromptPath).toBeUndefined();
  });

  it('extracts child session id from structured task metadata only', () => {
    expect(extractTaskToolChildSessionId({ metadata: { sessionId: 'ses-child-123' } })).toBe('ses-child-123');
    expect(extractTaskToolChildSessionId({ output: '<task_metadata>session_id: ses-free-text</task_metadata>' })).toBeUndefined();
  });

  it('clears stale pending state for unrelated non-task tool calls', () => {
    const prior: TaskToolLaunchState = {
      parentSessionId: 'sess-parent',
      delegatedAgent: 'forager-worker',
      kind: 'task-worker',
      featureName: 'demo-feature',
      taskFolder: '01-task',
      workerPromptPath: '.hive/features/demo-feature/tasks/01-task/worker-prompt.md',
      source: 'opencode-task-tool',
    };

    const next = classifyTaskToolLaunch({
      sessionID: 'sess-parent',
      tool: 'bash',
      args: { command: 'pwd' },
      previous: prior,
    });

    expect(next).toBeUndefined();
  });

  it('normalizes indexed feature directory names back to logical feature names', () => {
    expect(normalizeHiveFeatureName('01-demo-feature')).toBe('demo-feature');
    expect(normalizeHiveFeatureName('demo-feature')).toBe('demo-feature');
  });
});
