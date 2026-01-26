/**
 * Tests for time formatting utilities.
 *
 * Verifies elapsed time and relative time formatting rules.
 */

import { describe, it, expect } from 'bun:test';
import { formatElapsed, formatRelativeTime } from './format.js';

// ============================================================================
// formatElapsed
// ============================================================================

describe('formatElapsed', () => {
  it('formats seconds under a minute', () => {
    expect(formatElapsed(0)).toBe('0s');
    expect(formatElapsed(45_000)).toBe('45s');
    expect(formatElapsed(59_999)).toBe('59s');
  });

  it('formats minutes and seconds under an hour', () => {
    expect(formatElapsed(60_000)).toBe('1m 0s');
    expect(formatElapsed(150_000)).toBe('2m 30s');
    expect(formatElapsed(3_599_999)).toBe('59m 59s');
  });

  it('formats hours and minutes at or above an hour', () => {
    expect(formatElapsed(3_600_000)).toBe('1h 0m');
    expect(formatElapsed(4_500_000)).toBe('1h 15m');
    expect(formatElapsed(7_230_000)).toBe('2h 0m');
  });
});

// ============================================================================
// formatRelativeTime
// ============================================================================

describe('formatRelativeTime', () => {
  const fixedNow = 1_700_000_000_000;
  const realDateNow = Date.now;

  const withFixedNow = (fn: () => void) => {
    Date.now = () => fixedNow;
    try {
      fn();
    } finally {
      Date.now = realDateNow;
    }
  };

  it('formats seconds ago', () => {
    withFixedNow(() => {
      const iso = new Date(fixedNow - 45_000).toISOString();
      expect(formatRelativeTime(iso)).toBe('45s ago');
    });
  });

  it('formats minutes ago', () => {
    withFixedNow(() => {
      const iso = new Date(fixedNow - 150_000).toISOString();
      expect(formatRelativeTime(iso)).toBe('2m ago');
    });
  });

  it('formats hours ago', () => {
    withFixedNow(() => {
      const iso = new Date(fixedNow - 3_750_000).toISOString();
      expect(formatRelativeTime(iso)).toBe('1h ago');
    });
  });

  it('handles boundary values', () => {
    withFixedNow(() => {
      const oneMinute = new Date(fixedNow - 60_000).toISOString();
      const oneHour = new Date(fixedNow - 3_600_000).toISOString();
      expect(formatRelativeTime(oneMinute)).toBe('1m ago');
      expect(formatRelativeTime(oneHour)).toBe('1h ago');
    });
  });
});
