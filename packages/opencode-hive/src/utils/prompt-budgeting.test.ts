/**
 * Tests for deterministic prompt budgeting utilities.
 *
 * These utilities limit history/context included in prompts to bound growth:
 * - Include only last N completed tasks
 * - Truncate each task summary to max M chars
 * - Apply max budget for inlined context
 * - Emit warnings when budgets cause truncation
 */

import { describe, it, expect } from 'bun:test';
import {
  applyTaskBudget,
  applyContextBudget,
  DEFAULT_BUDGET,
  type BudgetConfig,
  type BudgetedTask,
  type BudgetedContext,
  type TruncationEvent,
} from './prompt-budgeting.js';

// ============================================================================
// Task Budgeting Tests
// ============================================================================

describe('applyTaskBudget', () => {
  it('limits to last N completed tasks', () => {
    const tasks = [
      { name: '01-task', summary: 'First task' },
      { name: '02-task', summary: 'Second task' },
      { name: '03-task', summary: 'Third task' },
      { name: '04-task', summary: 'Fourth task' },
      { name: '05-task', summary: 'Fifth task' },
    ];

    const result = applyTaskBudget(tasks, { maxTasks: 3 });

    expect(result.tasks.length).toBe(3);
    // Should keep the LAST 3 tasks (most recent)
    expect(result.tasks.map(t => t.name)).toEqual(['03-task', '04-task', '05-task']);
  });

  it('truncates task summaries exceeding max chars', () => {
    const longSummary = 'A'.repeat(500);
    const tasks = [{ name: '01-task', summary: longSummary }];

    const result = applyTaskBudget(tasks, { maxSummaryChars: 100 });

    expect(result.tasks[0].summary.length).toBeLessThanOrEqual(100 + 20); // Allow for truncation marker
    expect(result.tasks[0].summary).toContain('...[truncated]');
    expect(result.tasks[0].truncated).toBe(true);
  });

  it('preserves short summaries unchanged', () => {
    const tasks = [{ name: '01-task', summary: 'Short summary' }];

    const result = applyTaskBudget(tasks, { maxSummaryChars: 100 });

    expect(result.tasks[0].summary).toBe('Short summary');
    expect(result.tasks[0].truncated).toBe(false);
  });

  it('emits truncation events when tasks are dropped', () => {
    const tasks = [
      { name: '01-task', summary: 'First' },
      { name: '02-task', summary: 'Second' },
      { name: '03-task', summary: 'Third' },
    ];

    const result = applyTaskBudget(tasks, { maxTasks: 2 });

    expect(result.truncationEvents.length).toBeGreaterThan(0);
    expect(result.truncationEvents.some(e => e.type === 'tasks_dropped')).toBe(true);
    const dropEvent = result.truncationEvents.find(e => e.type === 'tasks_dropped');
    expect(dropEvent?.count).toBe(1); // 1 task dropped
  });

  it('emits truncation events when summaries are truncated', () => {
    const longSummary = 'A'.repeat(500);
    const tasks = [{ name: '01-task', summary: longSummary }];

    const result = applyTaskBudget(tasks, { maxSummaryChars: 100 });

    expect(result.truncationEvents.some(e => e.type === 'summary_truncated')).toBe(true);
  });

  it('returns all tasks when under limit', () => {
    const tasks = [
      { name: '01-task', summary: 'First' },
      { name: '02-task', summary: 'Second' },
    ];

    const result = applyTaskBudget(tasks, { maxTasks: 10 });

    expect(result.tasks.length).toBe(2);
    expect(result.truncationEvents.length).toBe(0);
  });

  it('handles empty task list', () => {
    const result = applyTaskBudget([], { maxTasks: 5 });

    expect(result.tasks.length).toBe(0);
    expect(result.truncationEvents.length).toBe(0);
  });

  it('includes file path hint for dropped tasks', () => {
    const tasks = [
      { name: '01-task', summary: 'First' },
      { name: '02-task', summary: 'Second' },
      { name: '03-task', summary: 'Third' },
    ];

    const result = applyTaskBudget(tasks, { maxTasks: 2, feature: 'test-feature' });

    expect(result.droppedTasksHint).toContain('01-task');
    expect(result.droppedTasksHint).toContain('.hive/features/test-feature/tasks');
  });
});

// ============================================================================
// Context Budgeting Tests
// ============================================================================

describe('applyContextBudget', () => {
  it('truncates context files exceeding max chars', () => {
    const longContent = 'B'.repeat(10000);
    const files = [{ name: 'decisions', content: longContent }];

    const result = applyContextBudget(files, { maxContextChars: 1000 });

    expect(result.files[0].content.length).toBeLessThanOrEqual(1000 + 50); // Allow for marker
    expect(result.files[0].content).toContain('...[truncated]');
    expect(result.files[0].truncated).toBe(true);
  });

  it('switches to name-only listing when total exceeds budget', () => {
    const files = [
      { name: 'file1', content: 'A'.repeat(5000) },
      { name: 'file2', content: 'B'.repeat(5000) },
      { name: 'file3', content: 'C'.repeat(5000) },
    ];

    const result = applyContextBudget(files, { maxTotalContextChars: 5000 });

    // Should include some files in full/truncated form, then switch to name-only
    expect(result.truncationEvents.some(e => e.type === 'context_names_only')).toBe(true);
  });

  it('preserves small context files unchanged', () => {
    const files = [{ name: 'small', content: 'Short content' }];

    const result = applyContextBudget(files, { maxContextChars: 10000 });

    expect(result.files[0].content).toBe('Short content');
    expect(result.files[0].truncated).toBe(false);
  });

  it('emits truncation events when context is truncated', () => {
    const longContent = 'X'.repeat(10000);
    const files = [{ name: 'large', content: longContent }];

    const result = applyContextBudget(files, { maxContextChars: 500 });

    expect(result.truncationEvents.some(e => e.type === 'context_truncated')).toBe(true);
  });

  it('handles empty context list', () => {
    const result = applyContextBudget([], { maxContextChars: 10000 });

    expect(result.files.length).toBe(0);
    expect(result.truncationEvents.length).toBe(0);
  });

  it('includes file path hints for truncated context', () => {
    const longContent = 'Y'.repeat(10000);
    const files = [{ name: 'decisions', content: longContent }];

    const result = applyContextBudget(files, { maxContextChars: 500, feature: 'my-feature' });

    expect(result.files[0].pathHint).toContain('.hive/features/my-feature/context/decisions.md');
  });
});

// ============================================================================
// Default Budget Tests
// ============================================================================

describe('DEFAULT_BUDGET', () => {
  it('has reasonable default values', () => {
    expect(DEFAULT_BUDGET.maxTasks).toBeGreaterThan(0);
    expect(DEFAULT_BUDGET.maxSummaryChars).toBeGreaterThan(0);
    expect(DEFAULT_BUDGET.maxContextChars).toBeGreaterThan(0);
    expect(DEFAULT_BUDGET.maxTotalContextChars).toBeGreaterThan(0);
  });

  it('has maxTasks that allows meaningful history', () => {
    // Should allow at least 5 tasks for context
    expect(DEFAULT_BUDGET.maxTasks).toBeGreaterThanOrEqual(5);
  });

  it('has summary limit that allows useful summaries', () => {
    // Should allow at least 200 chars for a useful summary
    expect(DEFAULT_BUDGET.maxSummaryChars).toBeGreaterThanOrEqual(200);
  });
});

// ============================================================================
// Integration: Bound Prompt Growth
// ============================================================================

describe('prompt budgeting bounds growth', () => {
  it('keeps total previous tasks content under threshold with many tasks', () => {
    // Simulate a feature with many completed tasks
    const tasks = Array.from({ length: 50 }, (_, i) => ({
      name: `${String(i + 1).padStart(2, '0')}-task-${i}`,
      summary: `This is task ${i + 1} summary. `.repeat(20), // ~500 chars each
    }));

    const result = applyTaskBudget(tasks, DEFAULT_BUDGET);

    // Calculate total chars in result
    const totalChars = result.tasks.reduce((sum, t) => sum + t.summary.length, 0);

    // Should be bounded by maxTasks * maxSummaryChars
    const maxExpected = DEFAULT_BUDGET.maxTasks * (DEFAULT_BUDGET.maxSummaryChars + 50);
    expect(totalChars).toBeLessThanOrEqual(maxExpected);
  });

  it('keeps total context content under threshold with large context files', () => {
    // Simulate large context files
    const files = Array.from({ length: 10 }, (_, i) => ({
      name: `context-${i}`,
      content: `Context file ${i} content. `.repeat(1000), // ~20KB each
    }));

    const result = applyContextBudget(files, DEFAULT_BUDGET);

    // Calculate total chars in result
    const totalChars = result.files.reduce((sum, f) => sum + f.content.length, 0);

    // Should be bounded
    expect(totalChars).toBeLessThanOrEqual(DEFAULT_BUDGET.maxTotalContextChars + 500);
  });
});
