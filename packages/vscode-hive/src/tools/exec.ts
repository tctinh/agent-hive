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

  return [
    {
      name: 'hive_worktree_create',
      displayName: 'Create Task Worktree',
      modelDescription: 'Create a git worktree for a task. Isolates changes in a separate directory. Use when ready to implement a task.',
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
        
        // Check dependencies before creating worktree
        const depCheck = checkDependencies(taskService, feature, task);
        if (!depCheck.allowed) {
          return JSON.stringify({
            success: false,
            error: depCheck.error,
            hints: [
              'Complete the required dependencies before starting this task.',
              'Use hive_status to see current task states.',
            ]
          });
        }
        
        const worktree = await worktreeService.create(feature, task);
        return JSON.stringify({
          success: true,
          worktreePath: worktree.path,
          branch: worktree.branch,
            message: `Worktree created. Work in ${worktree.path}. When done, use hive_worktree_commit.`,
          hints: [
            'Do all work inside this worktree. Ensure any subagents do the same.',
            'Context files are in .hive/features/<feature>/context/ if you need background.'
          ]
        });
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
          message: `Worktree removed. Task status reset to pending. Can restart with hive_worktree_create.`,
        });
      },
    },
  ];
}
