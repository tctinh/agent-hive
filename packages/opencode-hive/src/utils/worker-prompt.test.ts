/**
 * Unit tests for worker prompt builder.
 * 
 * Tests:
 * - No duplicate plan/context/previous-task headings in final prompt
 * - Spec content is not duplicated with separate sections
 */

import { describe, it, expect } from 'bun:test';
import { buildWorkerPrompt, type WorkerPromptParams } from './worker-prompt.js';

// ============================================================================
// Test helpers
// ============================================================================

function createTestParams(overrides: Partial<WorkerPromptParams> = {}): WorkerPromptParams {
  return {
    feature: 'test-feature',
    task: '01-test-task',
    taskOrder: 1,
    worktreePath: '/tmp/worktree',
    branch: 'hive/test-feature/01-test-task',
    plan: '# Test Plan\n\n## Discovery\n\nQ&A here\n\n## Tasks\n\n### 1. Test Task\n\nDo the thing.',
    contextFiles: [
      { name: 'decisions', content: 'We decided to use TypeScript.' },
      { name: 'research', content: 'Found existing patterns in src/lib.' },
    ],
    spec: `# Task: 01-test-task

## Feature: test-feature

## Plan Section

### 1. Test Task

Do the thing.

## Context

## decisions

We decided to use TypeScript.

---

## research

Found existing patterns in src/lib.

## Completed Tasks

- **00-setup**: Initial setup done.
`,
    previousTasks: [
      { name: '00-setup', summary: 'Initial setup done.' },
    ],
    ...overrides,
  };
}

// ============================================================================
// Deduplication tests
// ============================================================================

describe('buildWorkerPrompt deduplication', () => {
  it('does not include separate "Plan Context" section (plan is in spec)', () => {
    const params = createTestParams();
    const prompt = buildWorkerPrompt(params);
    
    // Should NOT have a separate "## Plan Context" section since spec already has plan section
    const planContextMatches = prompt.match(/## Plan Context/g);
    expect(planContextMatches).toBeNull();
  });

  it('does not include separate "Context Files" section (context is in spec)', () => {
    const params = createTestParams();
    const prompt = buildWorkerPrompt(params);
    
    // Should NOT have a separate "## Context Files" section since spec already has context
    const contextFilesMatches = prompt.match(/## Context Files/g);
    expect(contextFilesMatches).toBeNull();
  });

  it('does not include separate "Previous Tasks Completed" section (previous tasks in spec)', () => {
    const params = createTestParams();
    const prompt = buildWorkerPrompt(params);
    
    // Should NOT have a separate "## Previous Tasks Completed" section since spec already has it
    const previousTasksMatches = prompt.match(/## Previous Tasks Completed/g);
    expect(previousTasksMatches).toBeNull();
  });

  it('includes spec content exactly once under "Your Mission"', () => {
    const params = createTestParams();
    const prompt = buildWorkerPrompt(params);
    
    // Should have exactly one "## Your Mission" section
    const missionMatches = prompt.match(/## Your Mission/g);
    expect(missionMatches?.length).toBe(1);
    
    // Spec content should appear once
    expect(prompt).toContain('## Plan Section');
    expect(prompt).toContain('## Context');
    expect(prompt).toContain('## Completed Tasks');
  });

  it('does not duplicate context file content', () => {
    const params = createTestParams({
      contextFiles: [
        { name: 'unique-context', content: 'UNIQUE_MARKER_12345' },
      ],
      spec: `# Task: test

## Context

## unique-context

UNIQUE_MARKER_12345
`,
    });
    const prompt = buildWorkerPrompt(params);
    
    // The unique marker should appear exactly once (in the spec)
    const markerMatches = prompt.match(/UNIQUE_MARKER_12345/g);
    expect(markerMatches?.length).toBe(1);
  });

  it('does not duplicate previous task summaries', () => {
    const params = createTestParams({
      previousTasks: [
        { name: '00-setup', summary: 'UNIQUE_SUMMARY_67890' },
      ],
      spec: `# Task: test

## Completed Tasks

- **00-setup**: UNIQUE_SUMMARY_67890
`,
    });
    const prompt = buildWorkerPrompt(params);
    
    // The unique summary should appear exactly once (in the spec)
    const summaryMatches = prompt.match(/UNIQUE_SUMMARY_67890/g);
    expect(summaryMatches?.length).toBe(1);
  });

  it('preserves safety/protocol sections', () => {
    const params = createTestParams();
    const prompt = buildWorkerPrompt(params);
    
    // Must keep these critical sections
    expect(prompt).toContain('## Blocker Protocol');
    expect(prompt).toContain('## Completion Protocol');
    expect(prompt).toContain('## Assignment Details');
    expect(prompt).toContain('CRITICAL');
    expect(prompt).toContain('hive_worktree_commit');
  });

  it('requires terminal commit result before stopping', () => {
    const params = createTestParams();
    const prompt = buildWorkerPrompt(params);

    expect(prompt).toContain('ok=true and terminal=true');
    expect(prompt).toContain('DO NOT STOP');
    expect(prompt).toContain('result.nextAction');
  });

  it('includes worktree restriction warning', () => {
    const params = createTestParams();
    const prompt = buildWorkerPrompt(params);
    
    expect(prompt).toContain('All file operations MUST be within this worktree path');
    expect(prompt).toContain(params.worktreePath);
  });
});

// ============================================================================
// Continuation from blocked state
// ============================================================================

describe('buildWorkerPrompt continuation', () => {
  it('includes continuation section when resuming from blocked', () => {
    const params = createTestParams({
      continueFrom: {
        status: 'blocked',
        previousSummary: 'Got halfway through implementation',
        decision: 'Use option A',
      },
    });
    const prompt = buildWorkerPrompt(params);
    
    expect(prompt).toContain('## Continuation from Blocked State');
    expect(prompt).toContain('Got halfway through implementation');
    expect(prompt).toContain('Use option A');
  });

  it('omits continuation section when not resuming', () => {
    const params = createTestParams();
    const prompt = buildWorkerPrompt(params);
    
    expect(prompt).not.toContain('## Continuation from Blocked State');
  });
});

// ============================================================================
// Edge cases
// ============================================================================

describe('buildWorkerPrompt edge cases', () => {
  it('handles empty context files gracefully', () => {
    const params = createTestParams({
      contextFiles: [],
      spec: '# Task: test\n\n## Context\n\n_No context available._',
    });
    const prompt = buildWorkerPrompt(params);
    
    // Should not throw and should contain spec
    expect(prompt).toContain('# Task: test');
  });

  it('handles empty previous tasks gracefully', () => {
    const params = createTestParams({
      previousTasks: [],
      spec: '# Task: test\n\n## Completed Tasks\n\n_This is the first task._',
    });
    const prompt = buildWorkerPrompt(params);
    
    // Should not throw and should contain spec
    expect(prompt).toContain('# Task: test');
  });

  it('handles missing plan section in spec', () => {
    const params = createTestParams({
      plan: '',
      spec: '# Task: test\n\nNo plan section available.',
    });
    const prompt = buildWorkerPrompt(params);
    
    // Should not throw
    expect(prompt).toContain('# Task: test');
  });
});
