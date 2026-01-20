import * as path from 'path';
import * as fs from 'fs';
import { tool, type Plugin, type ToolDefinition } from "@opencode-ai/plugin";
import { getBuiltinSkills, loadBuiltinSkill } from './skills/builtin.js';

// ============================================================================
// Skill Tool - Uses generated registry (no file-based discovery)
// ============================================================================

function formatSkillsXml(): string {
  const skills = getBuiltinSkills();
  if (skills.length === 0) return '';
  
  const skillsXml = skills.map(skill => {
    return [
      '  <skill>',
      `    <name>${skill.name}</name>`,
      `    <description>(hive - Skill) ${skill.description}</description>`,
      '  </skill>',
    ].join('\n');
  }).join('\n');
  
  return `\n\n<available_skills>\n${skillsXml}\n</available_skills>`;
}

function createHiveSkillTool(): ToolDefinition {
  const base = 'Load a Hive skill to get detailed instructions for a specific workflow.';
  const skills = getBuiltinSkills();
  const description = skills.length === 0 
    ? base + '\n\nNo Hive skills available.'
    : base + formatSkillsXml();
  
  return tool({
    description,
    args: {
      name: tool.schema.string().describe('The skill name from available_skills'),
    },
    async execute({ name }) {
      const result = loadBuiltinSkill(name);
      
      if (!result.found || !result.skill) {
        const available = skills.map(s => s.name).join(', ');
        throw new Error(`Skill "${name}" not found. Available Hive skills: ${available || 'none'}`);
      }
      
      const skill = result.skill;
      return [
        `## Hive Skill: ${skill.name}`,
        '',
        `**Description**: ${skill.description}`,
        '',
        skill.template,
      ].join('\n');
    },
  });
}

// ============================================================================
import {
  WorktreeService,
  FeatureService,
  PlanService,
  TaskService,
  ContextService,
  detectContext,
  listFeatures,
} from "hive-core";
import { selectAgent, type OmoSlimAgent } from "./utils/agent-selector";
import { buildWorkerPrompt, type ContextFile, type CompletedTask } from "./utils/worker-prompt";
import { buildHiveAgentPrompt, type FeatureContext } from "./agents/hive";

const HIVE_SYSTEM_PROMPT = `
## Hive - Feature Development System

Plan-first development: Write plan → User reviews → Approve → Execute tasks

### Tools (19 total)

| Domain | Tools |
|--------|-------|
| Feature | hive_feature_create, hive_feature_list, hive_feature_complete |
| Plan | hive_plan_write, hive_plan_read, hive_plan_approve |
| Task | hive_tasks_sync, hive_task_create, hive_task_update |
| Exec | hive_exec_start, hive_exec_complete, hive_exec_abort |
| Worker | hive_worker_status |
| Merge | hive_merge, hive_worktree_list |
| Context | hive_context_write |
| Status | hive_status |
| Skill | hive_skill |

### Workflow

1. \`hive_feature_create(name)\` - Create feature
2. \`hive_plan_write(content)\` - Write plan.md
3. User adds comments in VSCode → \`hive_plan_read\` to see them
4. Revise plan → User approves
5. \`hive_tasks_sync()\` - Generate tasks from plan
6. \`hive_exec_start(task)\` → work in worktree → \`hive_exec_complete(task, summary)\`
7. \`hive_merge(task)\` - Merge task branch into main (when ready)

**Important:** \`hive_exec_complete\` commits changes to task branch but does NOT merge.
Use \`hive_merge\` to explicitly integrate changes. Worktrees persist until manually removed.

### Delegated Execution (OMO-Slim Integration)

When OMO-Slim is installed, \`hive_exec_start\` spawns worker agents in tmux panes:

1. \`hive_exec_start(task)\` → Creates worktree + spawns worker via \`background_task\`
2. Worker appears in tmux pane - watch it work in real-time
3. Worker completes → calls \`hive_exec_complete(status: "completed")\`
4. Worker blocked → calls \`hive_exec_complete(status: "blocked", blocker: {...})\`

**Handling blocked workers:**
1. Check blockers with \`hive_worker_status()\`
2. Read the blocker info (reason, options, recommendation)
3. Ask user via \`question()\` tool
4. Resume with \`hive_exec_start(task, continueFrom: "blocked", decision: answer)\`

**Agent auto-selection** based on task content:
| Pattern | Agent |
|---------|-------|
| find, search, explore | explorer |
| research, docs | librarian |
| ui, component, react | designer |
| architect, decision | oracle |
| (default) | general |

Without OMO-Slim: \`hive_exec_start\` falls back to inline mode (work in same session).

### Planning Phase - Context Management REQUIRED

As you research and plan, CONTINUOUSLY save findings using \`hive_context_write\`:
- Research findings (API patterns, library docs, codebase structure)
- User preferences ("we use Zustand, not Redux")
- Rejected alternatives ("tried X, too complex")
- Architecture decisions ("auth lives in /lib/auth")

**Update existing context files** when new info emerges - dont create duplicates.
Workers depend on context for background. Without it, they work blind.

\`hive_tasks_sync\` parses \`### N. Task Name\` headers.

### Execution Phase - Stay Aligned

During execution, call \`hive_status\` periodically to:
- Check current progress and pending work
- See context files to read
- Get reminded of next actions
`;

type ToolContext = {
  sessionID: string;
  messageID: string;
  agent: string;
  abort: AbortSignal;
};

const plugin: Plugin = async (ctx) => {
  const { directory } = ctx;

  const featureService = new FeatureService(directory);
  const planService = new PlanService(directory);
  const taskService = new TaskService(directory);
  const contextService = new ContextService(directory);
  const worktreeService = new WorktreeService({
    baseDir: directory,
    hiveDir: path.join(directory, '.hive'),
  });

  // OMO-Slim detection state
  let omoSlimDetected = false;
  let detectionDone = false;

  /**
   * Detect OMO-Slim by checking for background_task tool.
   * Called lazily on first tool invocation that needs delegation.
   */
  const detectOmoSlim = (toolContext: unknown): boolean => {
    if (detectionDone) return omoSlimDetected;
    
    const ctx = toolContext as any;
    // Check if background_task is available in tool registry
    // This indicates OMO-Slim is installed
    if (ctx?.tools?.includes?.('background_task') || 
        ctx?.background_task || 
        typeof ctx?.callTool === 'function') {
      // We'll verify on first actual use
      omoSlimDetected = true;
    }
    detectionDone = true;
    
    if (omoSlimDetected) {
      console.log('[Hive] OMO-Slim detected: delegated execution with tmux panes enabled');
    }
    
    return omoSlimDetected;
  };

  const resolveFeature = (explicit?: string): string | null => {
    if (explicit) return explicit;
    
    const context = detectContext(directory);
    if (context.feature) return context.feature;
    
    const features = listFeatures(directory);
    if (features.length === 1) return features[0];
    
    return null;
  };

  const captureSession = (feature: string, toolContext: unknown) => {
    const ctx = toolContext as ToolContext;
    if (ctx?.sessionID) {
      const currentSession = featureService.getSession(feature);
      if (currentSession !== ctx.sessionID) {
        featureService.setSession(feature, ctx.sessionID);
      }
    }
  };

  /**
   * Check if a feature is blocked by the Beekeeper.
   * Returns the block message if blocked, null otherwise.
   * 
   * File protocol: .hive/features/<name>/BLOCKED
   * - If file exists, feature is blocked
   * - File contents = reason for blocking
   */
  const checkBlocked = (feature: string): string | null => {
    const fs = require('fs');
    const blockedPath = path.join(directory, '.hive', 'features', feature, 'BLOCKED');
    if (fs.existsSync(blockedPath)) {
      const reason = fs.readFileSync(blockedPath, 'utf-8').trim();
      return `⛔ BLOCKED by Beekeeper

${reason || '(No reason provided)'}

The human has blocked this feature. Wait for them to unblock it.
To unblock: Remove .hive/features/${feature}/BLOCKED`;
    }
    return null;
  };

  return {
    "experimental.chat.system.transform": async (_input: unknown, output: { system: string[] }) => {
      output.system.push(HIVE_SYSTEM_PROMPT);

      const activeFeature = resolveFeature();
      if (activeFeature) {
        const info = featureService.getInfo(activeFeature);
        if (info) {
          let statusHint = `\n### Current Hive Status\n`;
          statusHint += `**Active Feature**: ${info.name} (${info.status})\n`;
          statusHint += `**Progress**: ${info.tasks.filter(t => t.status === 'done').length}/${info.tasks.length} tasks\n`;

          if (info.commentCount > 0) {
            statusHint += `**Comments**: ${info.commentCount} unresolved - address with hive_plan_read\n`;
          }

          output.system.push(statusHint);
        }
      }
    },

    tool: {
      hive_skill: createHiveSkillTool(),

      hive_feature_create: tool({
        description: 'Create a new feature and set it as active',
        args: {
          name: tool.schema.string().describe('Feature name'),
          ticket: tool.schema.string().optional().describe('Ticket reference'),
        },
        async execute({ name, ticket }) {
          const feature = featureService.create(name, ticket);
          return `Feature "${name}" created. Status: ${feature.status}. Write a plan with hive_plan_write.`;
        },
      }),

      hive_feature_list: tool({
        description: 'List all features',
        args: {},
        async execute() {
          const features = featureService.list();
          const active = resolveFeature();
          if (features.length === 0) return "No features found.";
          const list = features.map(f => {
            const info = featureService.getInfo(f);
            return `${f === active ? '* ' : '  '}${f} (${info?.status || 'unknown'})`;
          });
          return list.join('\n');
        },
      }),

      hive_feature_complete: tool({
        description: 'Mark feature as completed (irreversible)',
        args: { name: tool.schema.string().optional().describe('Feature name (defaults to active)') },
        async execute({ name }) {
          const feature = resolveFeature(name);
          if (!feature) return "Error: No feature specified. Create a feature or provide name.";
          featureService.complete(feature);
          return `Feature "${feature}" marked as completed`;
        },
      }),

      hive_plan_write: tool({
        description: 'Write plan.md (clears existing comments)',
        args: { 
          content: tool.schema.string().describe('Plan markdown content'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to detection or single feature)'),
        },
        async execute({ content, feature: explicitFeature }, toolContext) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";
          captureSession(feature, toolContext);
          const planPath = planService.write(feature, content);
          return `Plan written to ${planPath}. Comments cleared for fresh review.`;
        },
      }),

      hive_plan_read: tool({
        description: 'Read plan.md and user comments',
        args: { 
          feature: tool.schema.string().optional().describe('Feature name (defaults to detection or single feature)'),
        },
        async execute({ feature: explicitFeature }, toolContext) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";
          captureSession(feature, toolContext);
          const result = planService.read(feature);
          if (!result) return "Error: No plan.md found";
          return JSON.stringify(result, null, 2);
        },
      }),

      hive_plan_approve: tool({
        description: 'Approve plan for execution',
        args: { 
          feature: tool.schema.string().optional().describe('Feature name (defaults to detection or single feature)'),
        },
        async execute({ feature: explicitFeature }, toolContext) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";
          captureSession(feature, toolContext);
          const comments = planService.getComments(feature);
          if (comments.length > 0) {
            return `Error: Cannot approve - ${comments.length} unresolved comment(s). Address them first.`;
          }
          planService.approve(feature);
          return "Plan approved. Run hive_tasks_sync to generate tasks.";
        },
      }),

      hive_tasks_sync: tool({
        description: 'Generate tasks from approved plan',
        args: { 
          feature: tool.schema.string().optional().describe('Feature name (defaults to detection or single feature)'),
        },
        async execute({ feature: explicitFeature }) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";
          const featureData = featureService.get(feature);
          if (!featureData || featureData.status === 'planning') {
            return "Error: Plan must be approved first";
          }
          const result = taskService.sync(feature);
          if (featureData.status === 'approved') {
            featureService.updateStatus(feature, 'executing');
          }
          return `Tasks synced: ${result.created.length} created, ${result.removed.length} removed, ${result.kept.length} kept`;
        },
      }),

      hive_task_create: tool({
        description: 'Create manual task (not from plan)',
        args: {
          name: tool.schema.string().describe('Task name'),
          order: tool.schema.number().optional().describe('Task order'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to detection or single feature)'),
        },
        async execute({ name, order, feature: explicitFeature }) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";
          const folder = taskService.create(feature, name, order);
          return `Manual task created: ${folder}\nReminder: start work with hive_exec_start to use its worktree, and ensure any subagents work in that worktree too.`;
        },
      }),

      hive_task_update: tool({
        description: 'Update task status or summary',
        args: {
          task: tool.schema.string().describe('Task folder name'),
          status: tool.schema.string().optional().describe('New status: pending, in_progress, done, cancelled'),
          summary: tool.schema.string().optional().describe('Summary of work'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to detection or single feature)'),
        },
        async execute({ task, status, summary, feature: explicitFeature }) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";
          const updated = taskService.update(feature, task, {
            status: status as any,
            summary,
          });
          return `Task "${task}" updated: status=${updated.status}`;
        },
      }),

      hive_exec_start: tool({
        description: 'Create worktree and begin work on task. When OMO-Slim is installed, spawns worker agent in tmux pane.',
        args: { 
          task: tool.schema.string().describe('Task folder name'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to detection or single feature)'),
          continueFrom: tool.schema.enum(['blocked']).optional().describe('Resume a blocked task'),
          decision: tool.schema.string().optional().describe('Answer to blocker question when continuing'),
        },
        async execute({ task, feature: explicitFeature, continueFrom, decision }, toolContext) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";

          const blocked = checkBlocked(feature);
          if (blocked) return blocked;

          const taskInfo = taskService.get(feature, task);
          if (!taskInfo) return `Error: Task "${task}" not found`;
          
          // Allow continuing blocked tasks, but not completed ones
          if (taskInfo.status === 'done') return "Error: Task already completed";
          if (continueFrom === 'blocked' && taskInfo.status !== 'blocked') {
            return "Error: Task is not in blocked state. Use without continueFrom.";
          }

          // Check if we're continuing from blocked - reuse existing worktree
          let worktree;
          if (continueFrom === 'blocked') {
            worktree = await worktreeService.get(feature, task);
            if (!worktree) return "Error: No worktree found for blocked task";
          } else {
            worktree = await worktreeService.create(feature, task);
          }
          
          taskService.update(feature, task, { 
            status: 'in_progress',
            baseCommit: worktree.commit,
          });

          // Generate spec.md with context for task
          const planResult = planService.read(feature);
          const contextCompiled = contextService.compile(feature);
          const allTasks = taskService.list(feature);
          const priorTasks = allTasks
            .filter(t => t.status === 'done')
            .map(t => `- ${t.folder}: ${t.summary || 'No summary'}`);

          let specContent = `# Task: ${task}\n\n`;
          specContent += `## Feature: ${feature}\n\n`;
          
          if (planResult) {
            const taskMatch = planResult.content.match(new RegExp(`###\\s*\\d+\\.\\s*${taskInfo.name.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}[\\s\\S]*?(?=###|$)`, 'i'));
            if (taskMatch) {
              specContent += `## Plan Section\n\n${taskMatch[0].trim()}\n\n`;
            }
          }

          if (contextCompiled) {
            specContent += `## Context\n\n${contextCompiled}\n\n`;
          }

          if (priorTasks.length > 0) {
            specContent += `## Completed Tasks\n\n${priorTasks.join('\n')}\n\n`;
          }

          taskService.writeSpec(feature, task, specContent);

          // Check for OMO-Slim and delegate if available
          detectOmoSlim(toolContext);
          
          if (omoSlimDetected) {
            // Prepare context for worker prompt
            const contextFiles: ContextFile[] = [];
            const contextDir = path.join(directory, '.hive', 'features', feature, 'context');
            if (fs.existsSync(contextDir)) {
              const files = fs.readdirSync(contextDir).filter(f => f.endsWith('.md'));
              for (const file of files) {
                const content = fs.readFileSync(path.join(contextDir, file), 'utf-8');
                contextFiles.push({ name: file, content });
              }
            }

            const previousTasks: CompletedTask[] = allTasks
              .filter(t => t.status === 'done' && t.summary)
              .map(t => ({ name: t.folder, summary: t.summary! }));

            // Build worker prompt
            const workerPrompt = buildWorkerPrompt({
              feature,
              task,
              taskOrder: parseInt(taskInfo.folder.match(/^(\d+)/)?.[1] || '0', 10),
              worktreePath: worktree.path,
              branch: worktree.branch,
              plan: planResult?.content || 'No plan available',
              contextFiles,
              spec: specContent,
              previousTasks,
              continueFrom: continueFrom === 'blocked' ? {
                status: 'blocked',
                previousSummary: (taskInfo as any).summary || 'No previous summary',
                decision: decision || 'No decision provided',
              } : undefined,
            });

            // Select appropriate agent based on task content
            const agent = selectAgent(taskInfo.name, specContent);

            // Call OMO-Slim's background_task
            try {
              const ctx = toolContext as any;
              if (ctx.callTool) {
                const result = await ctx.callTool('background_task', {
                  agent,
                  prompt: workerPrompt,
                  description: `Hive: ${task}`,
                  sync: false,
                });

                // Store worker info in task
                taskService.update(feature, task, {
                  status: 'in_progress',
                  workerId: result?.task_id,
                  agent,
                  mode: 'omo-slim',
                } as any);

                return JSON.stringify({
                  worktreePath: worktree.path,
                  branch: worktree.branch,
                  mode: 'delegated',
                  agent,
                  taskId: result?.task_id,
                  message: `Worker spawned via OMO-Slim (${agent} agent). Watch in tmux pane. Use hive_worker_status to check progress.`,
                }, null, 2);
              }
            } catch (e: any) {
              // Fall through to inline mode if delegation fails
              console.log('[Hive] OMO-Slim delegation failed, falling back to inline:', e.message);
            }
          }

          // Inline mode (no OMO-Slim or delegation failed)
          return `Worktree created at ${worktree.path}\nBranch: ${worktree.branch}\nBase commit: ${worktree.commit}\nSpec: ${task}/spec.md generated\nReminder: do all work inside this worktree and ensure any subagents do the same.`;
        },
      }),

      hive_exec_complete: tool({
        description: 'Complete task: commit changes to branch, write report. Supports blocked/failed/partial status for worker communication.',
        args: {
          task: tool.schema.string().describe('Task folder name'),
          summary: tool.schema.string().describe('Summary of what was done'),
          status: tool.schema.enum(['completed', 'blocked', 'failed', 'partial']).optional().default('completed').describe('Task completion status'),
          blocker: tool.schema.object({
            reason: tool.schema.string().describe('Why the task is blocked'),
            options: tool.schema.array(tool.schema.string()).optional().describe('Available options for the user'),
            recommendation: tool.schema.string().optional().describe('Your recommended choice'),
            context: tool.schema.string().optional().describe('Additional context for the decision'),
          }).optional().describe('Blocker info when status is blocked'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to detection or single feature)'),
        },
        async execute({ task, summary, status = 'completed', blocker, feature: explicitFeature }) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";

          const taskInfo = taskService.get(feature, task);
          if (!taskInfo) return `Error: Task "${task}" not found`;
          if (taskInfo.status !== 'in_progress' && taskInfo.status !== 'blocked') return "Error: Task not in progress";

          // Handle blocked status - don't commit, just update status
          if (status === 'blocked') {
            taskService.update(feature, task, { 
              status: 'blocked', 
              summary,
              blocker: blocker as any,
            } as any);

            const worktree = await worktreeService.get(feature, task);
            return JSON.stringify({
              status: 'blocked',
              task,
              summary,
              blocker,
              worktreePath: worktree?.path,
              message: 'Task blocked. Hive Master will ask user and resume with hive_exec_start(continueFrom: "blocked", decision: answer)',
            }, null, 2);
          }

          // For failed/partial, still commit what we have
          const commitResult = await worktreeService.commitChanges(feature, task, `hive(${task}): ${summary.slice(0, 50)}`);
          
          const diff = await worktreeService.getDiff(feature, task);

          const statusLabel = status === 'completed' ? 'success' : status;
          const reportLines: string[] = [
            `# Task Report: ${task}`,
            '',
            `**Feature:** ${feature}`,
            `**Completed:** ${new Date().toISOString()}`,
            `**Status:** ${statusLabel}`,
            `**Commit:** ${commitResult.sha || 'none'}`,
            '',
            '---',
            '',
            '## Summary',
            '',
            summary,
            '',
          ];

          if (diff?.hasDiff) {
            reportLines.push(
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
              reportLines.push('### Files Modified', '');
              for (const file of diff.filesChanged) {
                reportLines.push(`- \`${file}\``);
              }
              reportLines.push('');
            }
          } else {
            reportLines.push('---', '', '## Changes', '', '_No file changes detected_', '');
          }

          taskService.writeReport(feature, task, reportLines.join('\n'));
          
          const finalStatus = status === 'completed' ? 'done' : status;
          taskService.update(feature, task, { status: finalStatus as any, summary });

          const worktree = await worktreeService.get(feature, task);
          return `Task "${task}" ${status}. Changes committed to branch ${worktree?.branch || 'unknown'}.\nUse hive_merge to integrate changes. Worktree preserved at ${worktree?.path || 'unknown'}.`;
        },
      }),

      hive_exec_abort: tool({
        description: 'Abort task: discard changes, reset status',
        args: { 
          task: tool.schema.string().describe('Task folder name'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to detection or single feature)'),
        },
        async execute({ task, feature: explicitFeature }) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";

          await worktreeService.remove(feature, task);
          taskService.update(feature, task, { status: 'pending' });

          return `Task "${task}" aborted. Status reset to pending.`;
        },
      }),

      hive_worker_status: tool({
        description: 'Check status of delegated workers. Shows running workers, blockers, and progress.',
        args: {
          task: tool.schema.string().optional().describe('Specific task to check, or omit for all'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to active)'),
        },
        async execute({ task: specificTask, feature: explicitFeature }) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";

          const STUCK_THRESHOLD = 10 * 60 * 1000; // 10 minutes
          const now = Date.now();

          const tasks = taskService.list(feature);
          const inProgressTasks = tasks.filter(t => 
            (t.status === 'in_progress' || t.status === 'blocked') &&
            (!specificTask || t.folder === specificTask)
          );

          if (inProgressTasks.length === 0) {
            return specificTask 
              ? `No active worker for task "${specificTask}"`
              : "No active workers.";
          }

          const workers = await Promise.all(inProgressTasks.map(async (t) => {
            const worktree = await worktreeService.get(feature, t.folder);
            const taskData = t as any;
            
            // Calculate if stuck (if we have startedAt)
            const startedAt = taskData.startedAt ? new Date(taskData.startedAt).getTime() : now;
            const maybeStuck = (now - startedAt) > STUCK_THRESHOLD && t.status === 'in_progress';

            return {
              task: t.folder,
              name: t.name,
              status: t.status,
              agent: taskData.agent || 'inline',
              mode: taskData.mode || 'inline',
              workerId: taskData.workerId || null,
              worktreePath: worktree?.path || null,
              branch: worktree?.branch || null,
              maybeStuck,
              blocker: taskData.blocker || null,
              summary: t.summary || null,
            };
          }));

          return JSON.stringify({
            feature,
            omoSlimDetected,
            workers,
            hint: workers.some(w => w.status === 'blocked')
              ? 'Use hive_exec_start(task, continueFrom: "blocked", decision: answer) to resume blocked workers'
              : workers.some(w => w.maybeStuck)
              ? 'Some workers may be stuck. Check tmux panes or abort with hive_exec_abort.'
              : 'Workers in progress. Watch tmux panes for live updates.',
          }, null, 2);
        },
      }),

      hive_merge: tool({
        description: 'Merge completed task branch into current branch (explicit integration)',
        args: {
          task: tool.schema.string().describe('Task folder name to merge'),
          strategy: tool.schema.enum(['merge', 'squash', 'rebase']).optional().describe('Merge strategy (default: merge)'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to active)'),
        },
        async execute({ task, strategy = 'merge', feature: explicitFeature }) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";

          const taskInfo = taskService.get(feature, task);
          if (!taskInfo) return `Error: Task "${task}" not found`;
          if (taskInfo.status !== 'done') return "Error: Task must be completed before merging. Use hive_exec_complete first.";

          const result = await worktreeService.merge(feature, task, strategy);
          
          if (!result.success) {
            if (result.conflicts && result.conflicts.length > 0) {
              return `Merge failed with conflicts in:\n${result.conflicts.map(f => `- ${f}`).join('\n')}\n\nResolve conflicts manually or try a different strategy.`;
            }
            return `Merge failed: ${result.error}`;
          }

          return `Task "${task}" merged successfully using ${strategy} strategy.\nCommit: ${result.sha}\nFiles changed: ${result.filesChanged?.length || 0}`;
        },
      }),

      hive_worktree_list: tool({
        description: 'List all worktrees for current feature',
        args: {
          feature: tool.schema.string().optional().describe('Feature name (defaults to active)'),
        },
        async execute({ feature: explicitFeature }) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";

          const worktrees = await worktreeService.list(feature);
          if (worktrees.length === 0) return "No worktrees found for this feature.";

          const lines: string[] = ['| Task | Branch | Has Changes |', '|------|--------|-------------|'];
          for (const wt of worktrees) {
            const hasChanges = await worktreeService.hasUncommittedChanges(wt.feature, wt.step);
            lines.push(`| ${wt.step} | ${wt.branch} | ${hasChanges ? 'Yes' : 'No'} |`);
          }
          return lines.join('\n');
        },
      }),

      // Context Tools
      hive_context_write: tool({
        description: 'Write a context file for the feature. Context files store persistent notes, decisions, and reference material.',
        args: {
          name: tool.schema.string().describe('Context file name (e.g., "decisions", "architecture", "notes")'),
          content: tool.schema.string().describe('Markdown content to write'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to active)'),
        },
        async execute({ name, content, feature: explicitFeature }) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";

          const filePath = contextService.write(feature, name, content);
          return `Context file written: ${filePath}`;
        },
      }),

      // Status Tool
      hive_status: tool({
        description: 'Get comprehensive status of a feature including plan, tasks, and context. Returns JSON with all relevant state for resuming work.',
        args: {
          feature: tool.schema.string().optional().describe('Feature name (defaults to active)'),
        },
        async execute({ feature: explicitFeature }) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) {
            return JSON.stringify({
              error: 'No feature specified and no active feature found',
              hint: 'Use hive_feature_create to create a new feature',
            });
          }

          const featureData = featureService.get(feature);
          if (!featureData) {
            return JSON.stringify({
              error: `Feature '${feature}' not found`,
              availableFeatures: featureService.list(),
            });
          }

          const blocked = checkBlocked(feature);
          if (blocked) return blocked;

          const plan = planService.read(feature);
          const tasks = taskService.list(feature);
          const contextFiles = contextService.list(feature);

          const tasksSummary = tasks.map(t => ({
            folder: t.folder,
            name: t.name,
            status: t.status,
            origin: t.origin || 'plan',
          }));

          const contextSummary = contextFiles.map(c => ({
            name: c.name,
            chars: c.content.length,
            updatedAt: c.updatedAt,
          }));

          const pendingTasks = tasksSummary.filter(t => t.status === 'pending');
          const inProgressTasks = tasksSummary.filter(t => t.status === 'in_progress');
          const doneTasks = tasksSummary.filter(t => t.status === 'done');

          const getNextAction = (planStatus: string | null, tasks: Array<{ status: string; folder: string }>): string => {
            if (!planStatus || planStatus === 'draft') {
              return 'Write or revise plan with hive_plan_write, then get approval';
            }
            if (planStatus === 'review') {
              return 'Wait for plan approval or revise based on comments';
            }
            if (tasks.length === 0) {
              return 'Generate tasks from plan with hive_tasks_sync';
            }
            const inProgress = tasks.find(t => t.status === 'in_progress');
            if (inProgress) {
              return `Continue work on task: ${inProgress.folder}`;
            }
            const pending = tasks.find(t => t.status === 'pending');
            if (pending) {
              return `Start next task with hive_exec_start: ${pending.folder}`;
            }
            return 'All tasks complete. Review and merge or complete feature.';
          };

          const planStatus = featureData.status === 'planning' ? 'draft' : 
                            featureData.status === 'approved' ? 'approved' : 
                            featureData.status === 'executing' ? 'locked' : 'none';

          return JSON.stringify({
            feature: {
              name: feature,
              status: featureData.status,
              ticket: featureData.ticket || null,
              createdAt: featureData.createdAt,
            },
            plan: {
              exists: !!plan,
              status: planStatus,
              approved: planStatus === 'approved' || planStatus === 'locked',
            },
            tasks: {
              total: tasks.length,
              pending: pendingTasks.length,
              inProgress: inProgressTasks.length,
              done: doneTasks.length,
              list: tasksSummary,
            },
            context: {
              fileCount: contextFiles.length,
              files: contextSummary,
            },
            nextAction: getNextAction(planStatus, tasksSummary),
          });
        },
      }),

      hive_request_review: tool({
        description: 'Request human review of completed task. BLOCKS until human approves or requests changes. Call after completing work, before merging.',
        args: {
          task: tool.schema.string().describe('Task folder name'),
          summary: tool.schema.string().describe('Summary of what you did for human to review'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to active)'),
        },
        async execute({ task, summary, feature: explicitFeature }) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified.";

          const taskDir = path.join(directory, '.hive', 'features', feature, 'tasks', task);
          if (!fs.existsSync(taskDir)) {
            return `Error: Task '${task}' not found in feature '${feature}'`;
          }

          const reportPath = path.join(taskDir, 'report.md');
          const existingReport = fs.existsSync(reportPath) 
            ? fs.readFileSync(reportPath, 'utf-8') 
            : '# Task Report\n';
          
          const attemptCount = (existingReport.match(/## Attempt \d+/g) || []).length + 1;
          const timestamp = new Date().toISOString();
          
          const newContent = existingReport + `
## Attempt ${attemptCount}

**Requested**: ${timestamp}

### Summary

${summary}

`;
          fs.writeFileSync(reportPath, newContent);

          const pendingPath = path.join(taskDir, 'PENDING_REVIEW');
          fs.writeFileSync(pendingPath, JSON.stringify({
            attempt: attemptCount,
            requestedAt: timestamp,
            summary: summary.substring(0, 200) + (summary.length > 200 ? '...' : ''),
          }, null, 2));

          const pollInterval = 2000;
          const maxWait = 30 * 60 * 1000;
          const startTime = Date.now();

          while (fs.existsSync(pendingPath)) {
            if (Date.now() - startTime > maxWait) {
              return 'Review timed out after 30 minutes. Human did not respond.';
            }
            await new Promise(resolve => setTimeout(resolve, pollInterval));
          }

          const resultPath = path.join(taskDir, 'REVIEW_RESULT');
          if (!fs.existsSync(resultPath)) {
            return 'Review cancelled (PENDING_REVIEW removed but no REVIEW_RESULT).';
          }

          const result = fs.readFileSync(resultPath, 'utf-8').trim();

          fs.appendFileSync(reportPath, `### Review Result

${result}

---

`);

          if (result.toUpperCase() === 'APPROVED') {
            return `✅ APPROVED

Your work has been approved. You may now merge:

  hive_merge(task="${task}")

After merging, proceed to the next task.`;
          } else {
            return `🔄 Changes Requested

${result}

Make the requested changes, then call hive_request_review again.`;
          }
        },
      }),

    },

    command: {
      hive: {
        description: "Create a new feature: /hive <feature-name>",
        async run(args: string) {
          const name = args.trim();
          if (!name) return "Usage: /hive <feature-name>";
          return `Create feature "${name}" using hive_feature_create tool.`;
        },
      },
    },

    // Hive Agent - hybrid planner-orchestrator
    // Agent config follows OpenCode SDK format: model, prompt, temperature
    agent: {
      hive: {
        model: undefined, // Use default model
        temperature: 0.7,
        description: 'Hive Master - plan-first development with structured workflow and worker delegation',
        // Static base prompt - dynamic context injected via systemPrompt hook
        prompt: buildHiveAgentPrompt(undefined, false),
      },
    },

    // Dynamic context injection - this runs on every message
    systemPrompt: (existingPrompt: string) => {
      // Only enhance if using hive agent (check if our prompt is in there)
      if (!existingPrompt.includes('Hive Master')) {
        return existingPrompt;
      }

      // Build feature context if active
      const featureNames = listFeatures(directory);
      let featureContext: FeatureContext | undefined;
      
      for (const featureName of featureNames) {
        const feature = featureService.get(featureName);
        if (feature && ['planning', 'executing'].includes(feature.status)) {
          const tasks = taskService.list(featureName);
          const pendingCount = tasks.filter(t => t.status === 'pending').length;
          const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
          const doneCount = tasks.filter(t => t.status === 'done').length;
          
          const contextDir = path.join(directory, '.hive', 'features', featureName, 'context');
          const contextList = fs.existsSync(contextDir)
            ? fs.readdirSync(contextDir).filter(f => f.endsWith('.md'))
            : [];

          const planResult = planService.read(featureName);
          let planStatus: 'none' | 'draft' | 'approved' = 'none';
          if (planResult) {
            planStatus = planResult.status === 'approved' || planResult.status === 'executing' 
              ? 'approved' 
              : 'draft';
          }

          featureContext = {
            name: featureName,
            planStatus,
            tasksSummary: `${doneCount} done, ${inProgressCount} in progress, ${pendingCount} pending`,
            contextList,
          };
          break;
        }
      }

      // If we have feature context or OMO-Slim, rebuild with dynamic content
      if (featureContext || omoSlimDetected) {
        return buildHiveAgentPrompt(featureContext, omoSlimDetected);
      }

      return existingPrompt;
    },

    // Config hook - merge agents into opencodeConfig.agent (like OMO-Slim does)
    config: async (opencodeConfig: Record<string, unknown>) => {
      // Define hive agent config
      const hiveAgentConfig = {
        model: undefined,
        temperature: 0.7,
        description: 'Hive Master - plan-first development with structured workflow and worker delegation',
        prompt: buildHiveAgentPrompt(undefined, false),
      };

      // Merge hive agent into opencodeConfig.agent
      const configAgent = opencodeConfig.agent as Record<string, unknown> | undefined;
      if (!configAgent) {
        opencodeConfig.agent = { hive: hiveAgentConfig };
      } else {
        (configAgent as Record<string, unknown>).hive = hiveAgentConfig;
      }

      // Note: Don't override default_agent if OMO-Slim is also installed
      // Let user choose via @hive or config
    },
  };
};

export default plugin;
