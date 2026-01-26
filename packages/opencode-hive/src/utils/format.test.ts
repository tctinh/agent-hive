import { describe, it, expect, afterEach } from 'bun:test';
import { formatElapsed, formatRelativeTime } from './format.js';

describe('formatElapsed', () => {
  it('formats seconds under one minute', () => {
    expect(formatElapsed(0)).toBe('0s');
    expect(formatElapsed(59_000)).toBe('59s');
  });

  it('formats minutes and seconds under one hour', () => {
    expect(formatElapsed(60_000)).toBe('1m 0s');
    expect(formatElapsed(65_000)).toBe('1m 5s');
    expect(formatElapsed(3_599_000)).toBe('59m 59s');
  });

  it('formats hours and minutes for longer durations', () => {
    expect(formatElapsed(3_600_000)).toBe('1h 0m');
    expect(formatElapsed(3_660_000)).toBe('1h 1m');
    expect(formatElapsed(7_200_000)).toBe('2h 0m');
  });
});

describe('formatRelativeTime', () => {
  const realNow = Date.now;

  afterEach(() => {
    Date.now = realNow;
  });

  it('formats seconds under one minute', () => {
    const now = new Date('2024-01-01T00:00:10.000Z').getTime();
    Date.now = () => now;

    expect(formatRelativeTime('2024-01-01T00:00:10.000Z')).toBe('0s ago');
    expect(formatRelativeTime('2024-01-01T00:00:05.000Z')).toBe('5s ago');
  });

  it('formats minutes under one hour', () => {
    const now = new Date('2024-01-01T01:00:00.000Z').getTime();
    Date.now = () => now;

    expect(formatRelativeTime('2024-01-01T00:59:00.000Z')).toBe('1m ago');
    expect(formatRelativeTime('2024-01-01T00:00:00.000Z')).toBe('60m ago');
  });

  it('formats hours for longer durations', () => {
    const now = new Date('2024-01-01T05:00:00.000Z').getTime();
    Date.now = () => now;

    expect(formatRelativeTime('2024-01-01T04:00:00.000Z')).toBe('1h ago');
    expect(formatRelativeTime('2024-01-01T00:00:00.000Z')).toBe('5h ago');
  });
});
