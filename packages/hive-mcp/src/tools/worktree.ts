/**
 * hive_worktree_commit — Worker completion gate (P7).
 * The Forager's ONLY MCP tool. Validates and records task completion.
 *
 * Iron law: Workers MUST call this to signal done. No other exit path.
 * The `terminal` flag controls whether the worker stops or continues.
 */
import type { ToolDefinition } from '../server.js';
import { getServices, resolveFeature } from '../services.js';

const VERIFICATION_KEYWORDS = [
  'test', 'build', 'lint', 'vitest', 'jest', 'npm run', 'pnpm',
  'cargo', 'pytest', 'verified', 'passes', 'succeeds', 'ast-grep',
  'scan', 'bun test', 'bun run',
];

function hasVerificationEvidence(summary: string): boolean {
  const lower = summary.toLowerCase();
  return VERIFICATION_KEYWORDS.some((kw) => lower.includes(kw));
}

export const worktreeTools: ToolDefinition[] = [
  {
    name: 'hive_worktree_commit',
    description:
      'Signal task completion, failure, or blocker. This is the ONLY way for a worker to ' +
      'finish. Validates the submission and returns a terminal/non-terminal flag that ' +
      'controls whether the worker should stop or continue.\n\n' +
      'CRITICAL: If the response has terminal=true, STOP IMMEDIATELY. ' +
      'If terminal=false, follow nextAction and call this tool again.',
    inputSchema: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description: 'Task folder name (e.g. "01-auth-service")',
        },
        feature: {
          type: 'string',
          description: 'Feature name. Defaults to active feature.',
        },
        status: {
          type: 'string',
          enum: ['completed', 'blocked', 'failed', 'partial'],
          description: 'Task outcome status',
        },
        summary: {
          type: 'string',
          description:
            'What was accomplished (2-4 sentences). Include: files changed, ' +
            'why, verification evidence, or "Not run: <reason>".',
        },
        message: {
          type: 'string',
          description: 'Optional git commit message. Auto-generated if omitted.',
        },
        blocker: {
          type: 'object',
          description: 'Required when status is "blocked". Blocker details for user decision.',
          properties: {
            reason: { type: 'string', description: 'Why blocked — be specific' },
            options: {
              type: 'array',
              items: { type: 'string' },
              description: 'Available options for the user',
            },
            recommendation: {
              type: 'string',
              description: 'Your suggested choice with reasoning',
            },
            context: {
              type: 'string',
              description: 'Additional context the user needs to decide',
            },
          },
          required: ['reason'],
        },
      },
      required: ['task', 'status', 'summary'],
    },
    handler: async (args) => {
      const task = args.task as string;
      const status = args.status as 'completed' | 'blocked' | 'failed' | 'partial';
      const summary = args.summary as string;
      const message = args.message as string | undefined;
      const blocker = args.blocker as {
        reason: string;
        options?: string[];
        recommendation?: string;
        context?: string;
      } | undefined;

      const services = getServices();
      const feature = resolveFeature(services, args.feature as string | undefined);

      if (!feature) {
        return JSON.stringify({
          ok: false,
          terminal: false,
          reason: 'feature_required',
          error: 'No active feature found.',
          nextAction: 'Ensure the feature is set as active.',
        });
      }

      const taskInfo = services.taskService.get(feature, task);
      if (!taskInfo) {
        return JSON.stringify({
          ok: false,
          terminal: false,
          reason: 'task_not_found',
          error: `Task "${task}" not found in feature "${feature}".`,
          nextAction: 'Check the task name matches your assignment.',
        });
      }

      // Gate: Only in_progress or blocked tasks can be committed
      const allowedStates = ['in_progress', 'blocked', 'pending'];
      if (!allowedStates.includes(taskInfo.status)) {
        const isAlreadyDone = taskInfo.status === 'done';
        return JSON.stringify({
          ok: false,
          terminal: isAlreadyDone,
          reason: isAlreadyDone ? 'already_done' : 'invalid_state',
          error: `Task "${task}" has status "${taskInfo.status}".`,
          nextAction: isAlreadyDone
            ? 'Task already completed. Stop working.'
            : 'Task is in an unexpected state. Report to orchestrator.',
        });
      }

      // Handle blocked status
      if (status === 'blocked') {
        services.taskService.update(feature, task, {
          status: 'blocked',
          summary,
        });

        return JSON.stringify({
          ok: true,
          terminal: true,
          status: 'blocked',
          feature,
          task,
          summary,
          blocker: blocker ?? { reason: summary },
          message: 'Blocker recorded. The orchestrator will ask the user for a decision.',
          nextAction: 'STOP. Do not continue. The orchestrator handles blockers.',
        });
      }

      // For completed/failed/partial: attempt git commit
      let commitResult: { committed: boolean; sha?: string; message?: string } = {
        committed: false,
      };

      try {
        const commitMessage =
          message ?? `hive(${task}): ${summary.slice(0, 72)}`;
        const result = await services.worktreeService.commitChanges(
          feature,
          task,
          commitMessage,
        );
        commitResult = {
          committed: true,
          sha: result.sha ?? undefined,
          message: commitMessage,
        };
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const isNoChanges =
          errMsg.includes('nothing to commit') ||
          errMsg.includes('No changes');

        if (status === 'completed' && !isNoChanges) {
          // Completed tasks must have a successful commit
          return JSON.stringify({
            ok: false,
            terminal: false,
            reason: 'commit_failed',
            error: `Git commit failed: ${errMsg}`,
            nextAction: 'Fix the commit issue (stage files, resolve conflicts) and retry.',
          });
        }

        // For failed/partial, commit failure is acceptable
        commitResult = { committed: false, message: errMsg };
      }

      // Map status to task state
      const taskState = status === 'completed' ? 'done' : status;
      services.taskService.update(feature, task, {
        status: taskState as 'done' | 'failed' | 'partial',
        summary,
      });

      // Write task report
      const reportLines = [
        `# Task Report: ${task}`,
        '',
        `**Status:** ${status}`,
        `**Feature:** ${feature}`,
        '',
        '## Summary',
        '',
        summary,
        '',
      ];

      if (commitResult.committed && commitResult.sha) {
        reportLines.push('## Commit', '', `SHA: ${commitResult.sha}`, '');
      }

      services.taskService.writeReport(feature, task, reportLines.join('\n'));

      // Verification advisory (P6)
      const verificationNote =
        status === 'completed' && !hasVerificationEvidence(summary)
          ? 'No verification evidence in summary. Orchestrator should run build+test after merge.'
          : undefined;

      return JSON.stringify({
        ok: true,
        terminal: true,
        status,
        feature,
        task,
        taskState,
        summary,
        commit: commitResult,
        verificationNote,
        message: `Task ${status}. Worker session complete.`,
        nextAction: 'STOP. Do not continue working. The orchestrator takes over.',
      });
    },
  },
];
