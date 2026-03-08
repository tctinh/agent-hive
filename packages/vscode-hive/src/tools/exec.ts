import * as path from 'path';
import { WorktreeService, TaskService, buildEffectiveDependencies } from 'hive-core';
import type { ToolRegistration } from './base';

/**
 * Check if a task's dependencies are satisfied.
 * 
 * Hybrid enforcement:
 * 1. If task has explicit dependsOn array, check all deps have status 'done'
 * 2. If task has no dependsOn (legacy/undefined), fall back to numeric sequential ordering
 * 
 * Only 'done' status satisfies a dependency - cancelled/failed/blocked/partial do NOT.
 */
function checkDependencies(
  taskService: TaskService,
  feature: string,
  taskFolder: string
): { allowed: boolean; error?: string } {
  const taskStatus = taskService.getRawStatus(feature, taskFolder);

  if (!taskStatus) {
    return { allowed: true };
  }

  const tasks = taskService.list(feature).map(task => {
    const status = taskService.getRawStatus(feature, task.folder);
    return {
      folder: task.folder,
      status: task.status,
      dependsOn: status?.dependsOn,
    };
  });

  const effectiveDeps = buildEffectiveDependencies(tasks);
  const deps = effectiveDeps.get(taskFolder) ?? [];

  if (deps.length === 0) {
    return { allowed: true };
  }

  const unmetDeps: Array<{ folder: string; status: string }> = [];

  for (const depFolder of deps) {
    const depStatus = taskService.getRawStatus(feature, depFolder);

    if (!depStatus || depStatus.status !== 'done') {
      unmetDeps.push({
        folder: depFolder,
        status: depStatus?.status ?? 'unknown',
      });
    }
  }
  
  if (unmetDeps.length > 0) {
    const depList = unmetDeps
      .map(d => `"${d.folder}" (${d.status})`)
      .join(', ');
    
    return {
      allowed: false,
      error: `Dependency constraint: Task "${taskFolder}" cannot start - dependencies not done: ${depList}. ` +
        `Only tasks with status 'done' satisfy dependencies.`,
    };
  }
  
  return { allowed: true };
}

export function getExecTools(workspaceRoot: string): ToolRegistration[] {
  const worktreeService = new WorktreeService({
    baseDir: workspaceRoot,
    hiveDir: path.join(workspaceRoot, '.hive'),
  });
  const taskService = new TaskService(workspaceRoot);

  const startWorktree = async ({ feature, task }: { feature: string; task: string }) => {
    const taskInfo = taskService.get(feature, task);
    if (!taskInfo) {
      return JSON.stringify({
        success: false,
        terminal: true,
        reason: 'task_not_found',
        feature,
        task,
        error: `Task "${task}" not found`,
        hints: [
          'Check the task folder name in tasks.json or hive_status output.',
          'Run hive_tasks_sync if the approved plan has changed and tasks need regeneration.',
        ],
      });
    }

    if (taskInfo.status === 'done') {
      return JSON.stringify({
        success: false,
        terminal: true,
        reason: 'task_already_done',
        feature,
        task,
        currentStatus: 'done',
        error: `Task "${task}" is already completed (status: done). It cannot be restarted.`,
        hints: [
          'Use hive_merge to integrate the completed task branch if not already merged.',
          'Use hive_status to see all task states and find the next runnable task.',
        ],
      });
    }

    if (taskInfo.status === 'blocked') {
      return JSON.stringify({
        success: false,
        terminal: true,
        reason: 'blocked_resume_required',
        feature,
        task,
        currentStatus: 'blocked',
        error: `Task "${task}" is blocked and must be resumed with hive_worktree_create using continueFrom: 'blocked'.`,
        hints: [
          'Ask the user the blocker question, then call hive_worktree_create({ task, continueFrom: "blocked", decision }).',
          'Use hive_status to inspect blocker details before retrying.',
        ],
      });
    }

    // Check dependencies before creating worktree
    const depCheck = checkDependencies(taskService, feature, task);
    if (!depCheck.allowed) {
      return JSON.stringify({
        success: false,
        terminal: true,
        reason: 'dependencies_not_done',
        feature,
        task,
        error: depCheck.error,
        hints: [
          'Complete the required dependencies before starting this task.',
          'Use hive_status to see current task states.',
        ]
      });
    }

    const worktree = await worktreeService.create(feature, task);
    taskService.update(feature, task, { status: 'in_progress' });
    return JSON.stringify({
      success: true,
      terminal: false,
      feature,
      task,
      worktreePath: worktree.path,
      branch: worktree.branch,
      message: `Worktree created. Work in ${worktree.path}. When done, use hive_worktree_commit.`,
      hints: [
        'Do all work inside this worktree. Ensure any subagents do the same.',
        'Context files are in .hive/features/<feature>/context/ if you need background.'
      ]
    });
  };

  const resumeBlockedWorktree = async ({
    feature,
    task,
    continueFrom,
    decision,
  }: {
    feature: string;
    task: string;
    continueFrom?: 'blocked';
    decision?: string;
  }) => {
    const taskInfo = taskService.get(feature, task);
    if (!taskInfo) {
      return JSON.stringify({
        success: false,
        terminal: true,
        reason: 'task_not_found',
        feature,
        task,
        error: `Task "${task}" not found`,
        hints: [
          'Check the task folder name in tasks.json or hive_status output.',
          'Run hive_tasks_sync if the approved plan has changed and tasks need regeneration.',
        ],
      });
    }

    if (continueFrom !== 'blocked') {
      return JSON.stringify({
        success: false,
        terminal: true,
        reason: 'blocked_resume_required',
        feature,
        task,
        currentStatus: taskInfo.status,
        error: 'hive_worktree_create is only for resuming blocked tasks.',
        hints: [
          'Use hive_worktree_start({ feature, task }) to start a pending or in-progress task normally.',
          'Use hive_worktree_create({ task, continueFrom: "blocked", decision }) only after hive_status confirms the task is blocked.',
        ],
      });
    }

    if (taskInfo.status !== 'blocked') {
      return JSON.stringify({
        success: false,
        terminal: true,
        reason: 'task_not_blocked',
        feature,
        task,
        currentStatus: taskInfo.status,
        error: `continueFrom: 'blocked' was specified but task "${task}" is not in blocked state (current status: ${taskInfo.status}).`,
        hints: [
          'Use hive_worktree_start({ feature, task }) for normal starts or re-dispatch.',
          'Use hive_status to verify the current task status before retrying.',
        ],
      });
    }

    const worktree = await worktreeService.get(feature, task);
    if (!worktree) {
      return JSON.stringify({
        success: false,
        terminal: true,
        reason: 'missing_worktree',
        feature,
        task,
        currentStatus: taskInfo.status,
        error: `Cannot resume blocked task "${task}": no existing worktree record found.`,
        hints: [
          'The worktree may have been removed manually. Use hive_worktree_discard to reset the task to pending, then restart it with hive_worktree_start.',
          'Use hive_status to inspect the current state of the task and its worktree.',
        ],
      });
    }

    taskService.update(feature, task, { status: 'in_progress' });
    return JSON.stringify({
      success: true,
      terminal: false,
      feature,
      task,
      currentStatus: 'in_progress',
      resumedFrom: 'blocked',
      decision: decision ?? null,
      worktreePath: worktree.path,
      branch: worktree.branch,
      message: `Blocked task resumed. Continue work in ${worktree.path}. When done, use hive_worktree_commit.`,
      hints: [
        'Continue from the existing worktree state and incorporate the user decision.',
        'Do all work inside this worktree. Ensure any subagents do the same.',
      ],
    });
  };

  return [
    {
      name: 'hive_worktree_start',
      displayName: 'Start Task Worktree',
      modelDescription: 'Create a git worktree for a pending/in-progress task. Use for normal task starts.',
      inputSchema: {
        type: 'object',
        properties: {
          feature: { type: 'string', description: 'Feature name' },
          task: { type: 'string', description: 'Task folder name' },
        },
        required: ['feature', 'task'],
      },
      invoke: async (input) => {
        const { feature, task } = input as { feature: string; task: string };
        return startWorktree({ feature, task });
      },
    },
    {
      name: 'hive_worktree_create',
      displayName: 'Resume Blocked Task Worktree',
      modelDescription: 'Resume a blocked task in its existing worktree. Requires continueFrom: "blocked" and a decision.',
      inputSchema: {
        type: 'object',
        properties: {
          feature: { type: 'string', description: 'Feature name' },
          task: { type: 'string', description: 'Task folder name' },
          continueFrom: { type: 'string', enum: ['blocked'], description: 'Resume a blocked task' },
          decision: { type: 'string', description: 'Answer to blocker question when continuing' },
        },
        required: ['feature', 'task', 'continueFrom'],
      },
      invoke: async (input) => {
        const { feature, task, continueFrom, decision } = input as {
          feature: string;
          task: string;
          continueFrom?: 'blocked';
          decision?: string;
        };
        return resumeBlockedWorktree({ feature, task, continueFrom, decision });
      },
    },
    {
      name: 'hive_worktree_commit',
      displayName: 'Commit Task Worktree',
      modelDescription: 'Commit changes in worktree and mark task done. Does NOT merge - use hive_merge for that. Use when task implementation is finished.',
      inputSchema: {
        type: 'object',
        properties: {
          feature: { type: 'string', description: 'Feature name' },
          task: { type: 'string', description: 'Task folder name' },
          summary: { type: 'string', description: 'Summary of what was done' },
        },
        required: ['feature', 'task', 'summary'],
      },
      invoke: async (input) => {
        const { feature, task, summary } = input as { feature: string; task: string; summary: string };
        const result = await worktreeService.commitChanges(feature, task, summary);
        
        // Mark task as done and create report if commit succeeded
        if (result.committed) {
          taskService.update(feature, task, { status: 'done', summary });
          
          // Generate report
          const reportContent = `# Task Completion Report\n\n**Task:** ${task}\n**Status:** Done\n**Completed:** ${new Date().toISOString()}\n**Commit:** ${result.sha}\n\n## Summary\n\n${summary}\n`;
          taskService.writeReport(feature, task, reportContent);
        }
        
        return JSON.stringify({
          success: true,
          commitHash: result.sha,
          committed: result.committed,
          message: result.committed 
            ? `Changes committed. Use hive_merge to integrate into main branch.`
            : result.message || 'No changes to commit',
          hints: result.committed ? [
            'Proceed to next task or use hive_merge to integrate changes.'
          ] : []
        });
      },
    },
    {
      name: 'hive_worktree_discard',
      displayName: 'Discard Task Worktree',
      modelDescription: 'Discard all changes and remove worktree. Use when task approach is wrong and needs restart. This is destructive and irreversible.',
      destructive: true,
      inputSchema: {
        type: 'object',
        properties: {
          feature: { type: 'string', description: 'Feature name' },
          task: { type: 'string', description: 'Task folder name' },
        },
        required: ['feature', 'task'],
      },
      invoke: async (input) => {
        const { feature, task } = input as { feature: string; task: string };
        await worktreeService.remove(feature, task);
        // Reset task status to pending
        taskService.update(feature, task, { status: 'pending', summary: '' });
        return JSON.stringify({
          success: true,
          message: `Worktree removed. Task status reset to pending. Can restart with hive_worktree_start.`,
        });
      },
    },
  ];
}
