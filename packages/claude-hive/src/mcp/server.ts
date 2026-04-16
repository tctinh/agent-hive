import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';
import {
  AgentsMdService,
  buildEffectiveDependencies,
  computeRunnableAndBlocked,
  ContextService,
  FeatureService,
  PlanService,
  TaskService,
  createWorktreeService,
  detectContext,
  findProjectRoot,
  resolveActiveFeatureName,
} from 'hive-core';

type ResultEnvelope = {
  success: boolean;
  data?: unknown;
  error?: string;
  hints?: string[];
};

type Services = {
  projectRoot: string;
  featureService: FeatureService;
  planService: PlanService;
  taskService: TaskService;
  contextService: ContextService;
  agentsMdService: AgentsMdService;
  worktreeService: ReturnType<typeof createWorktreeService>;
};

function createTextResult(payload: ResultEnvelope, isError = false) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
    structuredContent: payload,
    isError,
  };
}

function resolveProjectRoot(): string {
  const envProjectDir = process.env.CLAUDE_PROJECT_DIR?.trim();
  const candidate = envProjectDir || process.cwd();
  const discovered = findProjectRoot(candidate) || candidate;
  return detectContext(discovered).projectRoot;
}

function createServices(): Services {
  const projectRoot = resolveProjectRoot();
  const contextService = new ContextService(projectRoot);

  return {
    projectRoot,
    featureService: new FeatureService(projectRoot),
    planService: new PlanService(projectRoot),
    taskService: new TaskService(projectRoot),
    contextService,
    agentsMdService: new AgentsMdService(projectRoot, contextService),
    worktreeService: createWorktreeService(projectRoot),
  };
}

function resolveFeatureName(services: Services, feature?: string): string {
  const name = feature?.trim() || resolveActiveFeatureName(services.projectRoot);
  if (!name) {
    throw new Error('No feature specified and no active feature found');
  }
  return name;
}

function buildTaskGraph(services: Services, featureName: string) {
  const tasks = services.taskService.list(featureName).map((task) => {
    const raw = services.taskService.getRawStatus(featureName, task.folder);
    return {
      ...task,
      dependsOn: raw?.dependsOn,
      baseCommit: raw?.baseCommit,
    };
  });

  const runnableBlocked = computeRunnableAndBlocked(
    tasks.map((task) => ({
      folder: task.folder,
      status: task.status,
      dependsOn: task.dependsOn,
    })),
  );

  const effectiveDependencies = buildEffectiveDependencies(
    tasks.map((task) => ({
      folder: task.folder,
      status: task.status,
      dependsOn: task.dependsOn,
    })),
  );

  return {
    tasks: tasks.map((task) => ({
      ...task,
      dependsOn: effectiveDependencies.get(task.folder) ?? [],
    })),
    runnable: runnableBlocked.runnable,
    blocked: runnableBlocked.blocked,
  };
}

function getNextAction(featureName: string, planApproved: boolean, taskGraph: ReturnType<typeof buildTaskGraph>): string {
  if (!planApproved) {
    return `Plan '${featureName}' is still in planning. Write or revise the plan, then approve it before execution.`;
  }

  const inProgress = taskGraph.tasks.find((task) => task.status === 'in_progress');
  if (inProgress) {
    return `Continue work on task: ${inProgress.folder}`;
  }

  const blockedTask = taskGraph.tasks.find((task) => task.status === 'blocked');
  if (blockedTask) {
    return `Resolve blocker for task: ${blockedTask.folder}`;
  }

  if (taskGraph.runnable.length > 0) {
    return `Start next task: ${taskGraph.runnable[0]}`;
  }

  const pendingTasks = taskGraph.tasks.filter((task) => task.status === 'pending');
  if (pendingTasks.length > 0) {
    return 'Pending tasks remain, but their dependencies are not yet satisfied.';
  }

  return `Feature '${featureName}' has no pending runnable tasks.`;
}

function buildTaskReport(params: {
  featureName: string;
  task: string;
  finalStatus: string;
  summary: string;
  commitSha: string;
  diff: Awaited<ReturnType<Services['worktreeService']['getDiff']>>;
}) {
  const { featureName, task, finalStatus, summary, commitSha, diff } = params;
  const lines = [
    `# Task Report: ${task}`,
    '',
    `**Feature:** ${featureName}`,
    `**Completed:** ${new Date().toISOString()}`,
    `**Status:** ${finalStatus}`,
    `**Commit:** ${commitSha || 'none'}`,
    '',
    '---',
    '',
    '## Summary',
    '',
    summary,
    '',
  ];

  if (diff.hasDiff) {
    lines.push(
      '---',
      '',
      '## Changes',
      '',
      `- **Files changed:** ${diff.filesChanged.length}`,
      `- **Insertions:** +${diff.insertions}`,
      `- **Deletions:** -${diff.deletions}`,
      '',
    );

    if (diff.filesChanged.length > 0) {
      lines.push('### Files Modified', '');
      for (const file of diff.filesChanged) {
        lines.push(`- \`${file}\``);
      }
      lines.push('');
    }
  } else {
    lines.push('---', '', '## Changes', '', '_No file changes detected_', '');
  }

  return lines.join('\n');
}

function withToolHandler<TArgs>(handler: (services: Services, args: TArgs) => Promise<ResultEnvelope> | ResultEnvelope) {
  return async (args: TArgs) => {
    try {
      const services = createServices();
      const result = await handler(services, args);
      return createTextResult(result, !result.success);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createTextResult({ success: false, error: message }, true);
    }
  };
}

const server = new McpServer({
  name: 'hive',
  version: '1.4.3',
});

server.registerTool(
  'feature_create',
  {
    description: 'Create a new Hive feature and make it active.',
    inputSchema: z.object({
      name: z.string().min(1).describe('Feature name'),
      ticket: z.string().optional().describe('Optional ticket or issue reference'),
    }),
  },
  withToolHandler(async ({ featureService }, args) => ({
    success: true,
    data: featureService.create(args.name, args.ticket),
  })),
);

server.registerTool(
  'feature_complete',
  {
    description: 'Mark a Hive feature as completed.',
    inputSchema: z.object({
      feature: z.string().optional().describe('Feature name, defaults to the active feature'),
    }),
  },
  withToolHandler(async (services, args) => {
    const featureName = resolveFeatureName(services, args.feature);
    return {
      success: true,
      data: services.featureService.complete(featureName),
    };
  }),
);

server.registerTool(
  'plan_write',
  {
    description: 'Write or rewrite the plan.md for a Hive feature.',
    inputSchema: z.object({
      feature: z.string().optional().describe('Feature name, defaults to the active feature'),
      content: z.string().min(1).describe('Markdown content for plan.md'),
    }),
  },
  withToolHandler(async (services, args) => {
    const featureName = resolveFeatureName(services, args.feature);
    return {
      success: true,
      data: { path: services.planService.write(featureName, args.content) },
    };
  }),
);

server.registerTool(
  'plan_read',
  {
    description: 'Read plan.md and review state for a Hive feature.',
    inputSchema: z.object({
      feature: z.string().optional().describe('Feature name, defaults to the active feature'),
    }),
  },
  withToolHandler(async (services, args) => {
    const featureName = resolveFeatureName(services, args.feature);
    const plan = services.planService.read(featureName);
    if (!plan) {
      return {
        success: false,
        error: `No plan.md found for feature '${featureName}'`,
      };
    }

    return {
      success: true,
      data: plan,
    };
  }),
);

server.registerTool(
  'plan_approve',
  {
    description: 'Approve a Hive plan for execution.',
    inputSchema: z.object({
      feature: z.string().optional().describe('Feature name, defaults to the active feature'),
    }),
  },
  withToolHandler(async (services, args) => {
    const featureName = resolveFeatureName(services, args.feature);
    services.planService.approve(featureName);
    return {
      success: true,
      data: { feature: featureName, approved: true },
    };
  }),
);

server.registerTool(
  'tasks_sync',
  {
    description: 'Generate or refresh Hive tasks from plan.md.',
    inputSchema: z.object({
      feature: z.string().optional().describe('Feature name, defaults to the active feature'),
      refreshPending: z.boolean().optional().describe('Refresh pending tasks from the current plan'),
    }),
  },
  withToolHandler(async (services, args) => {
    const featureName = resolveFeatureName(services, args.feature);
    if (!services.planService.isApproved(featureName)) {
      return {
        success: false,
        error: `Feature '${featureName}' does not have an approved plan`,
        hints: ['Approve the plan before syncing tasks.'],
      };
    }

    return {
      success: true,
      data: services.taskService.sync(featureName, { refreshPending: args.refreshPending }),
    };
  }),
);

server.registerTool(
  'task_create',
  {
    description: 'Create an append-only manual Hive task outside plan.md.',
    inputSchema: z.object({
      feature: z.string().optional().describe('Feature name, defaults to the active feature'),
      name: z.string().min(1).describe('Task name'),
      order: z.number().int().positive().optional().describe('Explicit task order, if needed'),
      description: z.string().optional().describe('What the task should accomplish'),
      goal: z.string().optional().describe('Why this task exists'),
      acceptanceCriteria: z.array(z.string()).optional().describe('Observable completion criteria'),
      references: z.array(z.string()).optional().describe('Relevant file paths or references'),
      files: z.array(z.string()).optional().describe('Files likely to change'),
      dependsOn: z.array(z.string()).optional().describe('Completed task folders this task depends on'),
      reason: z.string().optional().describe('Why the task was created'),
      source: z.enum(['review', 'operator', 'ad_hoc']).optional().describe('Origin of this manual task'),
    }),
  },
  withToolHandler(async (services, args) => {
    const featureName = resolveFeatureName(services, args.feature);
    const folder = services.taskService.create(featureName, args.name, args.order, {
      description: args.description,
      goal: args.goal,
      acceptanceCriteria: args.acceptanceCriteria,
      references: args.references,
      files: args.files,
      dependsOn: args.dependsOn,
      reason: args.reason,
      source: args.source,
    });

    return {
      success: true,
      data: {
        feature: featureName,
        task: folder,
      },
    };
  }),
);

server.registerTool(
  'task_update',
  {
    description: 'Update a Hive task status or summary.',
    inputSchema: z.object({
      feature: z.string().optional().describe('Feature name, defaults to the active feature'),
      task: z.string().min(1).describe('Task folder name'),
      status: z.enum(['pending', 'in_progress', 'done', 'cancelled', 'blocked', 'failed', 'partial']).optional(),
      summary: z.string().optional().describe('Short work summary'),
      baseCommit: z.string().optional().describe('Optional base commit metadata'),
    }),
  },
  withToolHandler(async (services, args) => {
    const featureName = resolveFeatureName(services, args.feature);
    return {
      success: true,
      data: services.taskService.update(featureName, args.task, {
        status: args.status,
        summary: args.summary,
        baseCommit: args.baseCommit,
      }),
    };
  }),
);

server.registerTool(
  'context_write',
  {
    description: 'Write a Hive context markdown file.',
    inputSchema: z.object({
      feature: z.string().optional().describe('Feature name, defaults to the active feature'),
      name: z.string().min(1).describe('Context file name without .md'),
      content: z.string().min(1).describe('Markdown content'),
    }),
  },
  withToolHandler(async (services, args) => {
    const featureName = resolveFeatureName(services, args.feature);
    return {
      success: true,
      data: { path: services.contextService.write(featureName, args.name, args.content) },
    };
  }),
);

server.registerTool(
  'status',
  {
    description: 'Get summary status for the active or specified Hive feature.',
    inputSchema: z.object({
      feature: z.string().optional().describe('Feature name, defaults to the active feature'),
    }),
  },
  withToolHandler(async (services, args) => {
    const featureName = resolveFeatureName(services, args.feature);
    const feature = services.featureService.get(featureName);
    if (!feature) {
      return {
        success: false,
        error: `Feature '${featureName}' not found`,
      };
    }

    const taskGraph = buildTaskGraph(services, featureName);
    const planApproved = services.planService.isApproved(featureName);

    return {
      success: true,
      data: {
        feature,
        info: services.featureService.getInfo(featureName),
        planApproved,
        tasks: {
          total: taskGraph.tasks.length,
          pending: taskGraph.tasks.filter((task) => task.status === 'pending').length,
          inProgress: taskGraph.tasks.filter((task) => task.status === 'in_progress').length,
          done: taskGraph.tasks.filter((task) => task.status === 'done').length,
          list: taskGraph.tasks,
          runnable: taskGraph.runnable,
          blockedBy: taskGraph.blocked,
        },
        contexts: services.contextService.list(featureName).map((context) => ({
          name: context.name,
          role: context.role,
          updatedAt: context.updatedAt,
        })),
        nextAction: getNextAction(featureName, planApproved, taskGraph),
      },
    };
  }),
);

server.registerTool(
  'worktree_start',
  {
    description: 'Create or reuse a task worktree and mark the task as in progress.',
    inputSchema: z.object({
      feature: z.string().optional().describe('Feature name, defaults to the active feature'),
      task: z.string().min(1).describe('Task folder name'),
    }),
  },
  withToolHandler(async (services, args) => {
    const featureName = resolveFeatureName(services, args.feature);
    const task = services.taskService.get(featureName, args.task);
    if (!task) {
      return {
        success: false,
        error: `Task '${args.task}' not found`,
      };
    }

    if (task.status === 'blocked') {
      return {
        success: false,
        error: `Task '${args.task}' is blocked and must be resumed with worktree_create.`,
      };
    }

    if (task.status === 'done' || task.status === 'cancelled') {
      return {
        success: false,
        error: `Task '${args.task}' is ${task.status} and cannot be started.`,
      };
    }

    const worktree = await services.worktreeService.create(featureName, args.task);
    services.taskService.update(featureName, args.task, {
      status: 'in_progress',
      baseCommit: worktree.commit,
    });

    return {
      success: true,
      data: {
        feature: featureName,
        task: args.task,
        worktree,
        nextAction: `Work inside ${worktree.path}, then finalize with worktree_commit and merge when ready.`,
      },
    };
  }),
);

server.registerTool(
  'worktree_create',
  {
    description: 'Resume a blocked task in its existing worktree.',
    inputSchema: z.object({
      feature: z.string().optional().describe('Feature name, defaults to the active feature'),
      task: z.string().min(1).describe('Task folder name'),
      continueFrom: z.literal('blocked').describe('Resume a blocked task'),
      decision: z.string().optional().describe('Decision used to unblock the task'),
    }),
  },
  withToolHandler(async (services, args) => {
    const featureName = resolveFeatureName(services, args.feature);
    const task = services.taskService.get(featureName, args.task);
    if (!task) {
      return {
        success: false,
        error: `Task '${args.task}' not found`,
      };
    }

    if (task.status !== 'blocked') {
      return {
        success: false,
        error: `Task '${args.task}' is not blocked. Use worktree_start for normal execution.`,
      };
    }

    const worktree = await services.worktreeService.get(featureName, args.task);
    if (!worktree) {
      return {
        success: false,
        error: `No existing worktree found for task '${args.task}'.`,
        hints: ['Use worktree_discard to reset the task, then start it again with worktree_start.'],
      };
    }

    services.taskService.update(featureName, args.task, {
      status: 'in_progress',
      summary: args.decision ? `Resumed after decision: ${args.decision}` : task.summary,
    });

    return {
      success: true,
      data: {
        feature: featureName,
        task: args.task,
        worktree,
        decision: args.decision,
      },
    };
  }),
);

server.registerTool(
  'worktree_commit',
  {
    description: 'Commit or report the outcome of task work in a Hive worktree.',
    inputSchema: z.object({
      feature: z.string().optional().describe('Feature name, defaults to the active feature'),
      task: z.string().min(1).describe('Task folder name'),
      summary: z.string().min(1).describe('Summary of the completed work'),
      message: z.string().optional().describe('Optional git commit message'),
      status: z.enum(['completed', 'blocked', 'failed', 'partial']).optional().describe('Task completion status'),
      blocker: z.object({
        reason: z.string(),
        options: z.array(z.string()).optional(),
        recommendation: z.string().optional(),
        context: z.string().optional(),
      }).optional().describe('Blocker details when the task cannot continue'),
    }),
  },
  withToolHandler(async (services, args) => {
    const featureName = resolveFeatureName(services, args.feature);
    const task = services.taskService.get(featureName, args.task);
    if (!task) {
      return {
        success: false,
        error: `Task '${args.task}' not found`,
      };
    }

    if (task.status !== 'in_progress' && task.status !== 'blocked') {
      return {
        success: false,
        error: `Task '${args.task}' is ${task.status}. Only in-progress or blocked tasks can be committed.`,
      };
    }

    const finalStatus = args.status ?? 'completed';
    const existingStatus = services.taskService.getRawStatus(featureName, args.task);
    const worktree = await services.worktreeService.get(featureName, args.task);

    if (finalStatus === 'blocked') {
      services.taskService.update(featureName, args.task, {
        status: 'blocked',
        summary: args.summary,
      });

      return {
        success: true,
        data: {
          feature: featureName,
          task: args.task,
          status: 'blocked',
          blocker: args.blocker,
          worktree,
        },
      };
    }

    const commitMessage = args.message || `hive(${args.task}): ${args.summary.slice(0, 72)}`;
    const commit = await services.worktreeService.commitChanges(featureName, args.task, commitMessage);

    if (finalStatus === 'completed' && !commit.committed && commit.message !== 'No changes to commit') {
      return {
        success: false,
        error: commit.message || 'Commit failed',
      };
    }

    const diff = await services.worktreeService.getDiff(featureName, args.task, existingStatus?.baseCommit);
    const report = buildTaskReport({
      featureName,
      task: args.task,
      finalStatus: finalStatus === 'completed' ? 'done' : finalStatus,
      summary: args.summary,
      commitSha: commit.sha,
      diff,
    });
    const reportPath = services.taskService.writeReport(featureName, args.task, report);

    services.taskService.update(featureName, args.task, {
      status: finalStatus === 'completed' ? 'done' : finalStatus,
      summary: args.summary,
    });

    return {
      success: true,
      data: {
        feature: featureName,
        task: args.task,
        status: finalStatus === 'completed' ? 'done' : finalStatus,
        commit,
        diff,
        worktree,
        reportPath,
      },
    };
  }),
);

server.registerTool(
  'worktree_discard',
  {
    description: 'Discard a task worktree and reset the task back to pending.',
    inputSchema: z.object({
      feature: z.string().optional().describe('Feature name, defaults to the active feature'),
      task: z.string().min(1).describe('Task folder name'),
    }),
  },
  withToolHandler(async (services, args) => {
    const featureName = resolveFeatureName(services, args.feature);
    const task = services.taskService.get(featureName, args.task);
    if (!task) {
      return {
        success: false,
        error: `Task '${args.task}' not found`,
      };
    }

    const cleanup = await services.worktreeService.remove(featureName, args.task);
    services.taskService.update(featureName, args.task, {
      status: 'pending',
      summary: 'Task reset to pending after discarding worktree state.',
    });

    return {
      success: true,
      data: {
        feature: featureName,
        task: args.task,
        cleanup,
      },
    };
  }),
);

server.registerTool(
  'merge',
  {
    description: 'Merge a completed task branch into the current branch.',
    inputSchema: z.object({
      feature: z.string().optional().describe('Feature name, defaults to the active feature'),
      task: z.string().min(1).describe('Task folder name'),
      strategy: z.enum(['merge', 'squash', 'rebase']).optional().describe('Merge strategy'),
      message: z.string().optional().describe('Optional merge message for merge or squash'),
      preserveConflicts: z.boolean().optional().describe('Keep conflicts in place instead of aborting'),
      cleanup: z.enum(['none', 'worktree', 'worktree+branch']).optional().describe('Cleanup mode after a successful merge'),
    }),
  },
  withToolHandler(async (services, args) => {
    const featureName = resolveFeatureName(services, args.feature);
    const task = services.taskService.get(featureName, args.task);
    if (!task) {
      return {
        success: false,
        error: `Task '${args.task}' not found`,
      };
    }

    if (task.status !== 'done') {
      return {
        success: false,
        error: `Task '${args.task}' must be completed before merging.`,
      };
    }

    const result = await services.worktreeService.merge(featureName, args.task, args.strategy, args.message, {
      preserveConflicts: args.preserveConflicts,
      cleanup: args.cleanup,
    });

    return {
      success: result.success,
      data: result,
      ...(result.success ? {} : { error: result.error || 'Merge failed' }),
    };
  }),
);

server.registerTool(
  'agents_md_init',
  {
    description: 'Initialize AGENTS.md draft content from the current repository.',
    inputSchema: z.object({}),
  },
  withToolHandler(async ({ agentsMdService }) => ({
    success: true,
    data: await agentsMdService.init(),
  })),
);

server.registerTool(
  'agents_md_sync',
  {
    description: 'Generate AGENTS.md sync proposals from feature context.',
    inputSchema: z.object({
      feature: z.string().optional().describe('Feature name, defaults to the active feature'),
    }),
  },
  withToolHandler(async (services, args) => {
    const featureName = resolveFeatureName(services, args.feature);
    return {
      success: true,
      data: await services.agentsMdService.sync(featureName),
    };
  }),
);

server.registerTool(
  'agents_md_apply',
  {
    description: 'Write approved AGENTS.md content into the repository root.',
    inputSchema: z.object({
      content: z.string().min(1).describe('Approved AGENTS.md content'),
    }),
  },
  withToolHandler(async ({ agentsMdService }, args) => ({
    success: true,
    data: agentsMdService.apply(args.content),
  })),
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('claude-hive MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in claude-hive MCP server:', error);
  process.exit(1);
});