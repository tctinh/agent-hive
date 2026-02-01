import { describe, expect, it } from 'bun:test';
import { computeRunnableAndBlocked, TaskWithDeps } from './taskDependencyGraph.js';

describe('computeRunnableAndBlocked', () => {
  it('returns all pending tasks with no deps as runnable', () => {
    const tasks: TaskWithDeps[] = [
      { folder: '01-task-a', status: 'pending', dependsOn: [] },
      { folder: '02-task-b', status: 'pending', dependsOn: [] },
    ];

    const result = computeRunnableAndBlocked(tasks);

    expect(result.runnable).toEqual(['01-task-a', '02-task-b']);
    expect(result.blocked).toEqual({});
  });

  it('marks tasks with unmet deps as blocked', () => {
    const tasks: TaskWithDeps[] = [
      { folder: '01-task-a', status: 'pending', dependsOn: [] },
      { folder: '02-task-b', status: 'pending', dependsOn: ['01-task-a'] },
    ];

    const result = computeRunnableAndBlocked(tasks);

    expect(result.runnable).toEqual(['01-task-a']);
    expect(result.blocked).toEqual({
      '02-task-b': ['01-task-a'],
    });
  });

  it('marks tasks as runnable when all deps are done', () => {
    const tasks: TaskWithDeps[] = [
      { folder: '01-task-a', status: 'done', dependsOn: [] },
      { folder: '02-task-b', status: 'pending', dependsOn: ['01-task-a'] },
    ];

    const result = computeRunnableAndBlocked(tasks);

    expect(result.runnable).toEqual(['02-task-b']);
    expect(result.blocked).toEqual({});
  });

  it('excludes in_progress and done tasks from runnable list', () => {
    const tasks: TaskWithDeps[] = [
      { folder: '01-task-a', status: 'done', dependsOn: [] },
      { folder: '02-task-b', status: 'in_progress', dependsOn: [] },
      { folder: '03-task-c', status: 'pending', dependsOn: [] },
    ];

    const result = computeRunnableAndBlocked(tasks);

    // Only pending tasks can be runnable
    expect(result.runnable).toEqual(['03-task-c']);
    expect(result.blocked).toEqual({});
  });

  it('handles multiple dependencies correctly', () => {
    const tasks: TaskWithDeps[] = [
      { folder: '01-task-a', status: 'done', dependsOn: [] },
      { folder: '02-task-b', status: 'pending', dependsOn: [] },
      { folder: '03-task-c', status: 'pending', dependsOn: ['01-task-a', '02-task-b'] },
    ];

    const result = computeRunnableAndBlocked(tasks);

    // Task C is blocked because task B is not done yet
    expect(result.runnable).toEqual(['02-task-b']);
    expect(result.blocked).toEqual({
      '03-task-c': ['02-task-b'],
    });
  });

  it('reports only unmet dependencies in blocked list', () => {
    const tasks: TaskWithDeps[] = [
      { folder: '01-task-a', status: 'done', dependsOn: [] },
      { folder: '02-task-b', status: 'in_progress', dependsOn: [] },
      { folder: '03-task-c', status: 'pending', dependsOn: ['01-task-a', '02-task-b'] },
    ];

    const result = computeRunnableAndBlocked(tasks);

    // Only 02-task-b is unmet (in_progress is not done)
    expect(result.blocked).toEqual({
      '03-task-c': ['02-task-b'],
    });
  });

  it('handles diamond dependency pattern', () => {
    const tasks: TaskWithDeps[] = [
      { folder: '01-base', status: 'done', dependsOn: [] },
      { folder: '02-left', status: 'pending', dependsOn: ['01-base'] },
      { folder: '03-right', status: 'pending', dependsOn: ['01-base'] },
      { folder: '04-merge', status: 'pending', dependsOn: ['02-left', '03-right'] },
    ];

    const result = computeRunnableAndBlocked(tasks);

    // Tasks 2 and 3 are runnable (base is done)
    expect(result.runnable).toContain('02-left');
    expect(result.runnable).toContain('03-right');
    expect(result.runnable).toHaveLength(2);
    
    // Task 4 is blocked on both 2 and 3
    expect(result.blocked).toEqual({
      '04-merge': ['02-left', '03-right'],
    });
  });

  it('applies implicit sequential fallback when dependsOn is undefined', () => {
    const tasks: TaskWithDeps[] = [
      { folder: '01-task-a', status: 'pending', dependsOn: undefined },
      { folder: '02-task-b', status: 'pending', dependsOn: undefined },
    ];

    const result = computeRunnableAndBlocked(tasks);

    expect(result.runnable).toEqual(['01-task-a']);
    expect(result.blocked).toEqual({
      '02-task-b': ['01-task-a'],
    });
  });

  it('marks implicit sequential tasks runnable once prior task is done', () => {
    const tasks: TaskWithDeps[] = [
      { folder: '01-task-a', status: 'done', dependsOn: undefined },
      { folder: '02-task-b', status: 'pending', dependsOn: undefined },
    ];

    const result = computeRunnableAndBlocked(tasks);

    expect(result.runnable).toEqual(['02-task-b']);
    expect(result.blocked).toEqual({});
  });

  it('excludes cancelled/failed/blocked/partial from satisfying deps', () => {
    // These statuses do NOT satisfy dependencies
    const tasks: TaskWithDeps[] = [
      { folder: '01-cancelled', status: 'cancelled', dependsOn: [] },
      { folder: '02-failed', status: 'failed', dependsOn: [] },
      { folder: '03-blocked', status: 'blocked', dependsOn: [] },
      { folder: '04-partial', status: 'partial', dependsOn: [] },
      { folder: '05-dependent', status: 'pending', dependsOn: ['01-cancelled', '02-failed', '03-blocked', '04-partial'] },
    ];

    const result = computeRunnableAndBlocked(tasks);

    // Task 5 is blocked on all of them (none are 'done')
    expect(result.runnable).toEqual([]);
    expect(result.blocked['05-dependent']).toContain('01-cancelled');
    expect(result.blocked['05-dependent']).toContain('02-failed');
    expect(result.blocked['05-dependent']).toContain('03-blocked');
    expect(result.blocked['05-dependent']).toContain('04-partial');
  });

  it('returns empty arrays for no tasks', () => {
    const result = computeRunnableAndBlocked([]);

    expect(result.runnable).toEqual([]);
    expect(result.blocked).toEqual({});
  });
});
