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
import {
  BackgroundManager,
  BackgroundTaskRecord,
  isTerminalStatus,
  type OpencodeClient,
} from '../background/index.js';

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
 * Create background task tools.
 * 
 * @param manager - The BackgroundManager instance for task lifecycle
 * @param client - OpenCode client for session operations
 */
export function createBackgroundTools(
  manager: BackgroundManager,
  client: OpencodeClient
): {
  background_task: ToolDefinition;
  background_output: ToolDefinition;
  background_cancel: ToolDefinition;
} {
  return {
    /**
     * Spawn a new background task.
     */
    background_task: tool({
      description: 'Spawn a background agent task. Returns task_id for tracking. Use sync=true to wait for completion.',
      args: {
        agent: tool.schema.string().describe('Agent to use (e.g., "forager", "explorer")'),
        prompt: tool.schema.string().describe('Task instructions/prompt'),
        description: tool.schema.string().describe('Human-readable task description'),
        sync: tool.schema.boolean().optional().describe('Wait for completion (default: false)'),
        idempotencyKey: tool.schema.string().optional().describe('Key for safe retries'),
        workdir: tool.schema.string().optional().describe('Working directory for task'),
        feature: tool.schema.string().optional().describe('Hive feature name (for Hive-linked tasks)'),
        task: tool.schema.string().optional().describe('Hive task folder (for Hive-linked tasks)'),
      },
      async execute(
        {
          agent,
          prompt,
          description,
          sync = false,
          idempotencyKey,
          workdir,
          feature,
          task: hiveTask,
        },
        toolContext
      ): Promise<string> {
        const ctx = toolContext as ToolContext;

        // Spawn the task
        const result = await manager.spawn({
          agent,
          prompt,
          description,
          idempotencyKey,
          workdir,
          parentSessionId: ctx?.sessionID,
          parentMessageId: ctx?.messageID,
          hiveFeature: feature,
          hiveTaskFolder: hiveTask,
          sync,
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
          const current = manager.getTask(taskRecord.taskId);
          if (!current) {
            return JSON.stringify({
              provider: 'hive',
              task_id: taskRecord.taskId,
              session_id: taskRecord.sessionId,
              status: 'error',
              error: 'Task disappeared from store',
            } satisfies BackgroundTaskOutput, null, 2);
          }

          if (isTerminalStatus(current.status)) {
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
              task_id: current.taskId,
              session_id: current.sessionId,
              status: current.status,
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
      description: 'Get output from background task. Use block=true to wait for new output.',
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
          const pollInterval = 500;

          while (Date.now() - startTime < timeout) {
            const current = manager.getTask(task_id);
            if (!current) break;

            // Check if we have new messages
            const currentCount = current.progress?.messageCount ?? 0;
            if (currentCount > cursorCount || isTerminalStatus(current.status)) {
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

        // Get messages from session
        const output = await getTaskOutput(client, current.sessionId, cursorCount);
        const messageCount = current.progress?.messageCount ?? 0;

        return JSON.stringify({
          task_id: current.taskId,
          session_id: current.sessionId,
          status: current.status,
          done: isTerminalStatus(current.status),
          output,
          cursor: messageCount.toString(),
          progress: current.progress,
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
