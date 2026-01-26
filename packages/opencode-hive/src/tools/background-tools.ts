/**
 * Background task tools for Hive worker delegation.
 * 
 * Provides user-facing tools for spawning, monitoring, and cancelling
 * background tasks that execute in separate OpenCode sessions.
 * 
 * Tools:
 * - background_task: Spawn a new background task
 * - background_output: Get output from a running/completed task
 * - background_cancel: Cancel running task(s)
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin';
import { type ConfigService } from 'hive-core';
import {
  BackgroundManager,
  BackgroundTaskRecord,
  isTerminalStatus,
  type OpencodeClient,
} from '../background/index.js';
import { isHiveAgent, normalizeVariant } from '../hooks/variant-hook.js';
import { resolvePromptFromFile, findWorkspaceRoot } from '../utils/prompt-file.js';

/**
 * Output format for background_task tool.
 */
interface BackgroundTaskOutput {
  provider: 'hive';
  task_id: string;
  session_id: string;
  status: string;
  error?: string;
  // When sync=true, also include:
  output?: string;
  done?: boolean;
}

/**
 * Context passed to tool execute functions.
 */
interface ToolContext {
  sessionID: string;
  messageID: string;
  agent: string;
  abort: AbortSignal;
}

/**
 * Options for creating background tools.
 */
export interface BackgroundToolsOptions {
  /** The BackgroundManager instance for task lifecycle */
  manager: BackgroundManager;
  /** OpenCode client for session operations */
  client: OpencodeClient;
  /** Optional ConfigService for resolving per-agent variants */
  configService?: ConfigService;
}

/**
 * Create background task tools.
 * 
 * @param manager - The BackgroundManager instance for task lifecycle
 * @param client - OpenCode client for session operations
 * @param configService - Optional ConfigService for resolving per-agent variants
 */
export function createBackgroundTools(
  manager: BackgroundManager,
  client: OpencodeClient,
  configService?: ConfigService
): {
  background_task: ToolDefinition;
  background_output: ToolDefinition;
  background_cancel: ToolDefinition;
} {
  async function maybeFinalizeIfIdle(sessionId: string): Promise<void> {
    // Fast-path: if the client exposes batch status, use it.
    try {
      const statusFn = (client.session as unknown as { status?: () => Promise<{ data?: unknown }> }).status;
      if (statusFn) {
        const statusResult = await statusFn();
        const entry = (statusResult.data as Record<string, { type?: string }> | undefined)?.[sessionId];
        const type = entry?.type;
        if (type === 'idle' || type === 'completed') {
          manager.handleSessionIdle(sessionId);
          return;
        }
      }
    } catch {
      // Ignore and fall back to session.get
    }

    // Fallback: check the specific session.
    try {
      const sessionResult = await client.session.get({ path: { id: sessionId } });
      const data = sessionResult.data as { status?: string; type?: string } | undefined;
      const status = data?.status ?? data?.type;
      if (status === 'idle' || status === 'completed') {
        manager.handleSessionIdle(sessionId);
      }
    } catch {
      // Best-effort only.
    }
  }

  return {
    /**
     * Spawn a new background task.
     */
    background_task: tool({
      description: 'Spawn a background agent task. Use sync=true to wait for completion (returns output). If sync=false (default), the parent session receives a completion <system-reminder> and you can call background_output to fetch the result.',
      args: {
        agent: tool.schema.string().describe('Agent to use (e.g., "forager-worker", "scout-researcher")'),
        prompt: tool.schema.string().optional().describe('Task instructions/prompt (required if promptFile not provided)'),
        promptFile: tool.schema.string().optional().describe('Path to file containing prompt (alternative to inline prompt)'),
        description: tool.schema.string().describe('Human-readable task description'),
        sync: tool.schema.boolean().optional().describe('Wait for completion (default: false)'),
        idempotencyKey: tool.schema.string().optional().describe('Key for safe retries'),
        workdir: tool.schema.string().optional().describe('Working directory for task'),
        feature: tool.schema.string().optional().describe('Hive feature name (for Hive-linked tasks)'),
        task: tool.schema.string().optional().describe('Hive task folder (for Hive-linked tasks)'),
        attempt: tool.schema.number().optional().describe('Hive attempt number (for Hive-linked tasks)'),
      },
      async execute(
        {
          agent,
          prompt,
          promptFile,
          description,
          sync = false,
          idempotencyKey,
          workdir,
          feature,
          task: hiveTask,
          attempt,
        },
        toolContext
      ): Promise<string> {
        const ctx = toolContext as ToolContext;

        // Resolve prompt from file if promptFile is provided
        let resolvedPrompt = prompt;
        if (promptFile) {
          // Determine workspace root for security validation
          const baseDir = workdir || process.cwd();
          const workspaceRoot = findWorkspaceRoot(baseDir) ?? baseDir;
          const fileResult = await resolvePromptFromFile(promptFile, workspaceRoot);
          
          if (fileResult.error) {
            const output: BackgroundTaskOutput = {
              provider: 'hive',
              task_id: '',
              session_id: '',
              status: 'error',
              error: `Failed to read prompt file: ${fileResult.error}`,
            };
            return JSON.stringify(output, null, 2);
          }
          
          resolvedPrompt = fileResult.content;
        }

        // Validate that we have a prompt (either inline or from file)
        if (!resolvedPrompt) {
          const output: BackgroundTaskOutput = {
            provider: 'hive',
            task_id: '',
            session_id: '',
            status: 'error',
            error: 'Either prompt or promptFile is required',
          };
          return JSON.stringify(output, null, 2);
        }

        // Resolve configured variant for Hive agents
        let variant: string | undefined;
        if (configService && isHiveAgent(agent)) {
          const agentConfig = configService.getAgentConfig(agent);
          variant = normalizeVariant(agentConfig.variant);
        }

        // Spawn the task
        const result = await manager.spawn({
          agent,
          prompt: resolvedPrompt,
          description,
          idempotencyKey,
          workdir,
          parentSessionId: ctx?.sessionID,
          parentMessageId: ctx?.messageID,
          parentAgent: ctx?.agent,
          notifyParent: !sync,
          hiveFeature: feature,
          hiveTaskFolder: hiveTask,
          sync,
          attempt,
          variant,
        });

        // Handle spawn errors
        if (result.error) {
          const output: BackgroundTaskOutput = {
            provider: 'hive',
            task_id: '',
            session_id: '',
            status: 'error',
            error: result.error,
          };
          return JSON.stringify(output, null, 2);
        }

        const taskRecord = result.task;

        // If not sync, return immediately
        if (!sync) {
          const output: BackgroundTaskOutput = {
            provider: 'hive',
            task_id: taskRecord.taskId,
            session_id: taskRecord.sessionId,
            status: taskRecord.status,
          };
          return JSON.stringify(output, null, 2);
        }

        // Sync mode: poll until completion
        const pollInterval = 1000; // 1 second
        const maxWait = 30 * 60 * 1000; // 30 minutes
        const startTime = Date.now();

        while (true) {
          let current = manager.getTask(taskRecord.taskId);
          if (!current) {
            return JSON.stringify({
              provider: 'hive',
              task_id: taskRecord.taskId,
              session_id: taskRecord.sessionId,
              status: 'error',
              error: 'Task disappeared from store',
            } satisfies BackgroundTaskOutput, null, 2);
          }

          // Sync mode: proactively detect completion using session status.
          // This avoids waiting for the background poller/backoff loop.
          // Note: maybeFinalizeIfIdle may update the task status via handleSessionIdle.
          if (!isTerminalStatus(current.status)) {
            await maybeFinalizeIfIdle(current.sessionId);
            // Re-fetch task after finalization attempt - status may have changed
            // This is critical because handleSessionIdle updates the store asynchronously
            // and the event hook may have also updated the status
            current = manager.getTask(taskRecord.taskId)!;
          }

          if (current && isTerminalStatus(current.status)) {
            // Get output
            const outputText = await getTaskOutput(client, current.sessionId);
            const output: BackgroundTaskOutput = {
              provider: 'hive',
              task_id: current.taskId,
              session_id: current.sessionId,
              status: current.status,
              output: outputText,
              done: true,
            };
            if (current.errorMessage) {
              output.error = current.errorMessage;
            }
            return JSON.stringify(output, null, 2);
          }

          // Check timeout
          if (Date.now() - startTime > maxWait) {
            return JSON.stringify({
              provider: 'hive',
              task_id: current?.taskId ?? taskRecord.taskId,
              session_id: current?.sessionId ?? taskRecord.sessionId,
              status: current?.status ?? 'unknown',
              error: 'Sync wait timed out after 30 minutes',
              done: false,
            } satisfies BackgroundTaskOutput, null, 2);
          }

          // Wait before next poll
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
      },
    }),

    /**
     * Get output from a background task.
     */
    background_output: tool({
      description: 'Get output from a background task. For sync=false tasks, wait for the completion <system-reminder> and then call with block=false to fetch the result; use block=true only when you need interim output.',
      args: {
        task_id: tool.schema.string().describe('Task ID to get output from'),
        block: tool.schema.boolean().optional().describe('Block waiting for new output (default: false)'),
        timeout: tool.schema.number().optional().describe('Timeout in ms when blocking (default: 30000)'),
        cursor: tool.schema.string().optional().describe('Cursor for incremental output (message count)'),
      },
      async execute({ task_id, block = false, timeout = 30000, cursor }): Promise<string> {
        const task = manager.getTask(task_id);
        if (!task) {
          return JSON.stringify({
            error: `Task "${task_id}" not found`,
            task_id,
          }, null, 2);
        }

        // Parse cursor (message count)
        const cursorCount = cursor ? parseInt(cursor, 10) : 0;

        // If blocking, wait for new messages or completion
        if (block && !isTerminalStatus(task.status)) {
          const startTime = Date.now();
          const pollInterval = 1000;

          while (Date.now() - startTime < timeout) {
            const current = manager.getTask(task_id);
            if (!current) break;

            // Check if we have new messages
            const currentCount = current.progress?.messageCount ?? 0;
            if (currentCount > cursorCount || isTerminalStatus(current.status)) {
              break;
            }

            // If the session is already idle, finalize and return promptly.
            await maybeFinalizeIfIdle(current.sessionId);
            const afterFinalize = manager.getTask(task_id);
            if (afterFinalize && isTerminalStatus(afterFinalize.status)) {
              break;
            }

            await new Promise(resolve => setTimeout(resolve, pollInterval));
          }
        }

        // Get current state
        const current = manager.getTask(task_id);
        if (!current) {
          return JSON.stringify({
            error: `Task "${task_id}" disappeared`,
            task_id,
          }, null, 2);
        }

        // Ensure we don't report a completed session as "running".
        if (!isTerminalStatus(current.status)) {
          await maybeFinalizeIfIdle(current.sessionId);
        }

        const finalized = manager.getTask(task_id);
        if (!finalized) {
          return JSON.stringify({
            error: `Task "${task_id}" disappeared`,
            task_id,
          }, null, 2);
        }

        // Get messages from session
        const output = await getTaskOutput(client, finalized.sessionId, cursorCount);
        const messageCount = finalized.progress?.messageCount ?? 0;

        return JSON.stringify({
          task_id: finalized.taskId,
          session_id: finalized.sessionId,
          status: finalized.status,
          done: isTerminalStatus(finalized.status),
          output,
          cursor: messageCount.toString(),
          progress: finalized.progress,
        }, null, 2);
      },
    }),

    /**
     * Cancel background task(s).
     */
    background_cancel: tool({
      description: 'Cancel running background task(s). Use all=true to cancel all tasks for current session.',
      args: {
        task_id: tool.schema.string().optional().describe('Specific task ID to cancel'),
        idempotencyKey: tool.schema.string().optional().describe('Cancel task by idempotency key'),
        all: tool.schema.boolean().optional().describe('Cancel all tasks for current session'),
      },
      async execute({ task_id, idempotencyKey, all }, toolContext): Promise<string> {
        const ctx = toolContext as ToolContext;

        // Cancel all tasks
        if (all) {
          if (!ctx?.sessionID) {
            return JSON.stringify({
              error: 'Cannot cancel all: no parent session context',
              cancelled: 0,
            }, null, 2);
          }

          const cancelled = await manager.cancelAll(ctx.sessionID);
          return JSON.stringify({
            cancelled: cancelled.length,
            tasks: cancelled.map(t => ({
              task_id: t.taskId,
              status: t.status,
            })),
          }, null, 2);
        }

        // Find task by ID or idempotency key
        let task: BackgroundTaskRecord | undefined;

        if (task_id) {
          task = manager.getTask(task_id);
        } else if (idempotencyKey) {
          task = manager.getTaskByIdempotencyKey(idempotencyKey);
        }

        if (!task) {
          return JSON.stringify({
            error: task_id
              ? `Task "${task_id}" not found`
              : idempotencyKey
                ? `No task found with idempotency key "${idempotencyKey}"`
                : 'Must provide task_id, idempotencyKey, or all=true',
          }, null, 2);
        }

        // Check if already terminal
        if (isTerminalStatus(task.status)) {
          return JSON.stringify({
            task_id: task.taskId,
            status: task.status,
            message: `Task already in terminal status: ${task.status}`,
          }, null, 2);
        }

        // Cancel the task
        const cancelled = await manager.cancel(task.taskId);
        return JSON.stringify({
          task_id: cancelled.taskId,
          status: cancelled.status,
          message: 'Task cancelled successfully',
        }, null, 2);
      },
    }),
  };
}

/**
 * Get output text from a task's session messages.
 * 
 * @param client - OpenCode client
 * @param sessionId - Session ID to get messages from
 * @param afterCount - Only get messages after this count (for incremental)
 */
async function getTaskOutput(
  client: OpencodeClient,
  sessionId: string,
  afterCount = 0
): Promise<string> {
  try {
    const messagesResult = await client.session.messages({
      path: { id: sessionId },
    });

    const messages = messagesResult.data ?? [];
    
    // Skip messages we've already seen
    const newMessages = messages.slice(afterCount);
    
    // Extract text content from messages
    const outputParts: string[] = [];
    
    for (const msg of newMessages) {
      const message = msg as {
        role?: string;
        parts?: Array<{ type: string; text?: string; name?: string; result?: string }>;
      };
      
      if (!message.parts) continue;
      
      for (const part of message.parts) {
        if (part.type === 'text' && part.text) {
          outputParts.push(part.text);
        } else if (part.type === 'tool-result' && part.result) {
          // Include tool results (truncated)
          const result = typeof part.result === 'string' 
            ? part.result 
            : JSON.stringify(part.result);
          if (result.length > 500) {
            outputParts.push(`[Tool: ${part.name}] ${result.slice(0, 500)}...`);
          } else {
            outputParts.push(`[Tool: ${part.name}] ${result}`);
          }
        }
      }
    }
    
    return outputParts.join('\n\n');
  } catch (error) {
    return `[Error fetching output: ${error instanceof Error ? error.message : 'Unknown'}]`;
  }
}
