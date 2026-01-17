import { findProjectRoot } from 'hive-core';

// Get project root - either from CWD or walk up to find .hive
export function getProjectRoot(): string {
  const root = findProjectRoot(process.cwd());
  if (!root) {
    throw new Error('Could not find .hive directory. Run from within a Hive project.');
  }
  return root;
}
