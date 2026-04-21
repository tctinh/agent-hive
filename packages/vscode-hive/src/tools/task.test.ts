import { describe, expect, it } from 'bun:test';
import * as fs from 'fs';

const source = fs.readFileSync(new URL('./task.ts', import.meta.url), 'utf-8');

describe('getTaskTools', () => {
  it('guides task sync toward direct forager execution and task updates', () => {
    expect(source).toContain('@forager');
    expect(source).toContain('hive_task_update');
    expect(source).not.toContain('hive_worktree_start');
    expect(source).not.toContain('hive_merge');
  });

  it('keeps manual task messaging free of worktree and merge guidance', () => {
    expect(source).not.toContain('hive_worktree_start');
    expect(source).not.toContain('hive_merge');
  });
});