/**
 * Tests for prompt/payload observability utilities.
 * 
 * These utilities provide visibility into prompt sizes and detect
 * when thresholds are exceeded to prevent silent truncation risks.
 */

import { describe, it, expect } from 'bun:test';
import {
  calculatePromptMeta,
  calculatePayloadMeta,
  checkWarnings,
  type PromptMeta,
  type PayloadMeta,
  type PromptWarning,
  DEFAULT_THRESHOLDS,
} from './prompt-observability.js';

describe('calculatePromptMeta', () => {
  it('calculates character counts for all prompt components', () => {
    const meta = calculatePromptMeta({
      plan: 'This is a plan with some content.',
      context: 'Context file contents here.',
      previousTasks: 'Task 1: Done\nTask 2: Done',
      spec: 'The task specification.',
      workerPrompt: 'Full worker prompt with all sections combined.',
    });

    // Verify lengths match actual string lengths
    expect(meta.planChars).toBe('This is a plan with some content.'.length);
    expect(meta.contextChars).toBe('Context file contents here.'.length);
    expect(meta.previousTasksChars).toBe('Task 1: Done\nTask 2: Done'.length);
    expect(meta.specChars).toBe('The task specification.'.length);
    expect(meta.workerPromptChars).toBe('Full worker prompt with all sections combined.'.length);
  });

  it('handles empty strings', () => {
    const meta = calculatePromptMeta({
      plan: '',
      context: '',
      previousTasks: '',
      spec: '',
      workerPrompt: '',
    });

    expect(meta.planChars).toBe(0);
    expect(meta.contextChars).toBe(0);
    expect(meta.previousTasksChars).toBe(0);
    expect(meta.specChars).toBe(0);
    expect(meta.workerPromptChars).toBe(0);
  });

  it('handles undefined inputs gracefully', () => {
    const meta = calculatePromptMeta({
      plan: undefined as unknown as string,
      context: undefined as unknown as string,
      previousTasks: undefined as unknown as string,
      spec: 'spec only',
      workerPrompt: 'prompt only',
    });

    expect(meta.planChars).toBe(0);
    expect(meta.contextChars).toBe(0);
    expect(meta.previousTasksChars).toBe(0);
    expect(meta.specChars).toBe(9);
    expect(meta.workerPromptChars).toBe(11);
  });
});

describe('calculatePayloadMeta', () => {
  it('calculates JSON payload size for inlined prompt', () => {
    const payload = {
      worktreePath: '/path/to/worktree',
      branch: 'feature-branch',
      workerPrompt: 'Full worker prompt content',
    };
    const jsonString = JSON.stringify(payload, null, 2);

    const meta = calculatePayloadMeta({
      jsonPayload: jsonString,
      promptInlined: true,
    });

    expect(meta.jsonPayloadChars).toBe(jsonString.length);
    expect(meta.promptInlined).toBe(true);
    expect(meta.promptReferencedByFile).toBe(false);
  });

  it('calculates payload size for file-referenced prompt', () => {
    const payload = {
      worktreePath: '/path/to/worktree',
      branch: 'feature-branch',
      workerPromptPath: '/path/to/prompt.md',
    };
    const jsonString = JSON.stringify(payload, null, 2);

    const meta = calculatePayloadMeta({
      jsonPayload: jsonString,
      promptInlined: false,
    });

    expect(meta.jsonPayloadChars).toBe(jsonString.length);
    expect(meta.promptInlined).toBe(false);
    expect(meta.promptReferencedByFile).toBe(true);
  });
});

describe('checkWarnings', () => {
  it('returns empty array when all sizes are under thresholds', () => {
    const promptMeta: PromptMeta = {
      planChars: 1000,
      contextChars: 2000,
      previousTasksChars: 500,
      specChars: 1000,
      workerPromptChars: 10000,
    };
    const payloadMeta: PayloadMeta = {
      jsonPayloadChars: 15000,
      promptInlined: true,
      promptReferencedByFile: false,
    };

    const warnings = checkWarnings(promptMeta, payloadMeta);
    expect(warnings).toEqual([]);
  });

  it('warns when worker prompt exceeds threshold', () => {
    const promptMeta: PromptMeta = {
      planChars: 1000,
      contextChars: 2000,
      previousTasksChars: 500,
      specChars: 1000,
      workerPromptChars: 200000, // Over default threshold
    };
    const payloadMeta: PayloadMeta = {
      jsonPayloadChars: 210000,
      promptInlined: true,
      promptReferencedByFile: false,
    };

    const warnings = checkWarnings(promptMeta, payloadMeta);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some(w => w.type === 'workerPromptSize')).toBe(true);
  });

  it('warns when JSON payload exceeds threshold', () => {
    const promptMeta: PromptMeta = {
      planChars: 1000,
      contextChars: 2000,
      previousTasksChars: 500,
      specChars: 1000,
      workerPromptChars: 50000,
    };
    const payloadMeta: PayloadMeta = {
      jsonPayloadChars: 300000, // Over default threshold
      promptInlined: true,
      promptReferencedByFile: false,
    };

    const warnings = checkWarnings(promptMeta, payloadMeta);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some(w => w.type === 'jsonPayloadSize')).toBe(true);
  });

  it('warns when context size exceeds threshold', () => {
    const promptMeta: PromptMeta = {
      planChars: 1000,
      contextChars: 100000, // Over default threshold
      previousTasksChars: 500,
      specChars: 1000,
      workerPromptChars: 110000,
    };
    const payloadMeta: PayloadMeta = {
      jsonPayloadChars: 120000,
      promptInlined: true,
      promptReferencedByFile: false,
    };

    const warnings = checkWarnings(promptMeta, payloadMeta);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some(w => w.type === 'contextSize')).toBe(true);
  });

  it('uses custom thresholds when provided', () => {
    const promptMeta: PromptMeta = {
      planChars: 1000,
      contextChars: 2000,
      previousTasksChars: 500,
      specChars: 1000,
      workerPromptChars: 5000,
    };
    const payloadMeta: PayloadMeta = {
      jsonPayloadChars: 6000,
      promptInlined: true,
      promptReferencedByFile: false,
    };

    // Use very low thresholds
    const warnings = checkWarnings(promptMeta, payloadMeta, {
      workerPromptMaxChars: 1000,
      jsonPayloadMaxChars: 2000,
      contextMaxChars: 500,
      previousTasksMaxChars: 100,
    });

    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some(w => w.type === 'workerPromptSize')).toBe(true);
    expect(warnings.some(w => w.type === 'jsonPayloadSize')).toBe(true);
    expect(warnings.some(w => w.type === 'contextSize')).toBe(true);
    expect(warnings.some(w => w.type === 'previousTasksSize')).toBe(true);
  });

  it('includes severity level in warnings', () => {
    const promptMeta: PromptMeta = {
      planChars: 1000,
      contextChars: 2000,
      previousTasksChars: 500,
      specChars: 1000,
      workerPromptChars: 200000,
    };
    const payloadMeta: PayloadMeta = {
      jsonPayloadChars: 210000,
      promptInlined: true,
      promptReferencedByFile: false,
    };

    const warnings = checkWarnings(promptMeta, payloadMeta);
    expect(warnings.every(w => ['info', 'warning', 'critical'].includes(w.severity))).toBe(true);
  });
});

describe('DEFAULT_THRESHOLDS', () => {
  it('exports reasonable default thresholds', () => {
    expect(DEFAULT_THRESHOLDS.workerPromptMaxChars).toBeGreaterThan(0);
    expect(DEFAULT_THRESHOLDS.jsonPayloadMaxChars).toBeGreaterThan(0);
    expect(DEFAULT_THRESHOLDS.contextMaxChars).toBeGreaterThan(0);
    expect(DEFAULT_THRESHOLDS.previousTasksMaxChars).toBeGreaterThan(0);
  });

  it('has JSON payload threshold higher than worker prompt threshold', () => {
    // JSON payload includes worker prompt plus other fields
    expect(DEFAULT_THRESHOLDS.jsonPayloadMaxChars).toBeGreaterThanOrEqual(
      DEFAULT_THRESHOLDS.workerPromptMaxChars
    );
  });
});
