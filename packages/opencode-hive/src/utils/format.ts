/**
 * Time formatting utilities.
 */

// ============================================================================
// Elapsed Time Formatting
// ============================================================================

/**
 * Format elapsed time in milliseconds.
 *
 * Rules:
 * - < 60s → "Xs"
 * - < 60m → "Xm Ys"
 * - ≥ 60m → "Xh Ym"
 */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (totalMinutes < 60) {
    return `${totalMinutes}m ${seconds}s`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

// ============================================================================
// Relative Time Formatting
// ============================================================================

/**
 * Format relative time from an ISO date string to now.
 */
export function formatRelativeTime(isoDate: string): string {
  const timestamp = new Date(isoDate).getTime();
  const now = Date.now();
  const elapsedMs = Math.max(0, now - timestamp);

  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));

  if (totalSeconds < 60) {
    return `${totalSeconds}s ago`;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes}m ago`;
  }

  const totalHours = Math.floor(totalMinutes / 60);
  return `${totalHours}h ago`;
}
