/**
 * Prompt file utilities for preventing tool output truncation.
 * 
 * Instead of inlining large prompts in tool outputs, we write them to files
 * and pass file references. This keeps tool output sizes bounded while
 * preserving full prompt content for workers.
 * 
 * Security: All file operations are restricted to workspace/.hive paths.
 */

import * as fs from 'fs';
import * as path from 'path';
import { normalizePath } from 'hive-core';

/**
 * Result of resolving prompt content from a file.
 */
export interface PromptFileResult {
  /** The prompt content if successfully read */
  content?: string;
  /** Error message if reading failed */
  error?: string;
}

/**
 * Find the workspace root by walking up from a start directory.
 *
 * The workspace root is identified as the directory that contains a .hive folder.
 * Returns null if no .hive directory is found.
 */
export function findWorkspaceRoot(startDir: string): string | null {
  try {
    let current = path.resolve(startDir);
    while (true) {
      const hivePath = path.join(current, '.hive');
      if (fs.existsSync(hivePath) && fs.statSync(hivePath).isDirectory()) {
        return current;
      }

      const parent = path.dirname(current);
      if (parent === current) {
        return null;
      }
      current = parent;
    }
  } catch {
    return null;
  }
}

/**
 * Check if a file path is valid for prompt file operations.
 * 
 * Security: Only allows paths within the workspace directory.
 * Rejects path traversal attempts (../).
 * 
 * @param filePath - The path to validate
 * @param workspaceRoot - The workspace root directory
 * @returns true if the path is valid and safe
 */
export function isValidPromptFilePath(filePath: string, workspaceRoot: string): boolean {
  try {
    // Normalize both paths to resolve any .. or . segments
    const normalizedFilePath = path.resolve(filePath);
    const normalizedWorkspace = path.resolve(workspaceRoot);
    const normalizedFilePathForCompare = normalizePath(normalizedFilePath);
    const normalizedWorkspaceForCompare = normalizePath(normalizedWorkspace);

    // Check that the file path starts with the workspace root
    // This prevents path traversal attacks
    if (!normalizedFilePathForCompare.startsWith(normalizedWorkspaceForCompare + '/') &&
        normalizedFilePathForCompare !== normalizedWorkspaceForCompare) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve prompt content from a file.
 * 
 * Security: Validates that the file path is within the workspace.
 * 
 * @param promptFilePath - Path to the prompt file
 * @param workspaceRoot - The workspace root directory for security validation
 * @returns The prompt content or an error
 */
export async function resolvePromptFromFile(
  promptFilePath: string,
  workspaceRoot: string
): Promise<PromptFileResult> {
  // Security check: ensure path is within workspace
  if (!isValidPromptFilePath(promptFilePath, workspaceRoot)) {
    return {
      error: `Prompt file path "${promptFilePath}" is outside the workspace. ` +
             `Only files within "${workspaceRoot}" are allowed.`,
    };
  }

  // Check if file exists
  const resolvedPath = path.resolve(promptFilePath);
  if (!fs.existsSync(resolvedPath)) {
    return {
      error: `Prompt file not found: "${resolvedPath}"`,
    };
  }

  // Read file content
  try {
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    return { content };
  } catch (err) {
    return {
      error: `Failed to read prompt file: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

/**
 * Write worker prompt to a file and return the path.
 * 
 * Creates the directory structure if it doesn't exist.
 * 
 * @param feature - Feature name
 * @param task - Task folder name
 * @param prompt - The full worker prompt content
 * @param hiveDir - The .hive directory path
 * @returns The path to the written prompt file
 */
export function writeWorkerPromptFile(
  feature: string,
  task: string,
  prompt: string,
  hiveDir: string
): string {
  const promptDir = path.join(hiveDir, 'features', feature, 'tasks', task);
  const promptPath = path.join(promptDir, 'worker-prompt.md');

  // Ensure directory exists
  if (!fs.existsSync(promptDir)) {
    fs.mkdirSync(promptDir, { recursive: true });
  }

  // Write prompt to file
  fs.writeFileSync(promptPath, prompt, 'utf-8');

  return promptPath;
}
