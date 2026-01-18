import * as path from 'path';
import * as fs from 'fs';
import { tool, type Plugin } from "@opencode-ai/plugin";
import {
  WorktreeService,
  FeatureService,
  PlanService,
  TaskService,
  ContextService,
  detectContext,
  listFeatures,
} from "hive-core";

const HIVE_SYSTEM_PROMPT = `
## Hive - Feature Development System

Plan-first development: Write plan → User reviews → Approve → Execute tasks

### Tools (18 total)

| Domain | Tools |
|--------|-------|
| Feature | hive_feature_create, hive_feature_list, hive_feature_complete |
| Plan | hive_plan_write, hive_plan_read, hive_plan_approve |
| Task | hive_tasks_sync, hive_task_create, hive_task_update |
| Exec | hive_exec_start, hive_exec_complete, hive_exec_abort |
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

### Plan Format

\`\`\`markdown
# Feature Name

## Overview
What we're building and why.

## Tasks

### 1. Task Name
Description of what to do.

### 2. Another Task
Description.
\`\`\`

### Planning Phase - Context Management REQUIRED

As you research and plan, CONTINUOUSLY save findings using \`hive_context_write\`:
- Research findings (API patterns, library docs, codebase structure)
- User preferences ("we use Zustand, not Redux")
- Rejected alternatives ("tried X, too complex")
- Architecture decisions ("auth lives in /lib/auth")

**Update existing context files** when new info emerges - dont create duplicates.
Workers depend on context for background. Without it, they work blind.

Save context BEFORE writing the plan, and UPDATE it as planning iterates.

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
        description: 'Create worktree and begin work on task',
        args: { 
          task: tool.schema.string().describe('Task folder name'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to detection or single feature)'),
        },
        async execute({ task, feature: explicitFeature }) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";

          const blocked = checkBlocked(feature);
          if (blocked) return blocked;

          const taskInfo = taskService.get(feature, task);
          if (!taskInfo) return `Error: Task "${task}" not found`;
          if (taskInfo.status === 'done') return "Error: Task already completed";

          const worktree = await worktreeService.create(feature, task);
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
            const taskMatch = planResult.content.match(new RegExp(`###\\s*\\d+\\.\\s*${taskInfo.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?(?=###|$)`, 'i'));
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

          return `Worktree created at ${worktree.path}\nBranch: ${worktree.branch}\nBase commit: ${worktree.commit}\nSpec: ${task}/spec.md generated\nReminder: do all work inside this worktree and ensure any subagents do the same.`;
        },
      }),

      hive_exec_complete: tool({
        description: 'Complete task: commit changes to branch, write report (does NOT merge or cleanup)',
        args: {
          task: tool.schema.string().describe('Task folder name'),
          summary: tool.schema.string().describe('Summary of what was done'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to detection or single feature)'),
        },
        async execute({ task, summary, feature: explicitFeature }) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";

          const taskInfo = taskService.get(feature, task);
          if (!taskInfo) return `Error: Task "${task}" not found`;
          if (taskInfo.status !== 'in_progress') return "Error: Task not in progress";

          const commitResult = await worktreeService.commitChanges(feature, task, `hive(${task}): ${summary.slice(0, 50)}`);
          
          const diff = await worktreeService.getDiff(feature, task);

          const reportLines: string[] = [
            `# Task Report: ${task}`,
            '',
            `**Feature:** ${feature}`,
            `**Completed:** ${new Date().toISOString()}`,
            `**Status:** success`,
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
          taskService.update(feature, task, { status: 'done', summary });

          const worktree = await worktreeService.get(feature, task);
          return `Task "${task}" completed. Changes committed to branch ${worktree?.branch || 'unknown'}.\nUse hive_merge to integrate changes. Worktree preserved at ${worktree?.path || 'unknown'}.`;
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

      hive_skill: tool({
        description: `Load a Hive skill for detailed workflow instructions.

Available skills:
- hive: Complete Hive workflow (plan -> review -> execute -> merge)

Skills are discovered from:
- .hive/skills/<name>/SKILL.md
- .opencode/skill/<name>/SKILL.md
- .claude/skills/<name>/SKILL.md`,
        args: {
          name: tool.schema.string().describe('Skill name to load (e.g., "hive")'),
        },
        async execute({ name }) {
          const skillLocations = [
            path.join(directory, '.hive', 'skills'),
            path.join(directory, '.opencode', 'skill'),
            path.join(directory, '.claude', 'skills'),
          ];

          for (const skillsDir of skillLocations) {
            const skillPath = path.join(skillsDir, name, 'SKILL.md');
            if (fs.existsSync(skillPath)) {
              const content = fs.readFileSync(skillPath, 'utf-8');
              const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
              const body = match ? match[1].trim() : content;
              return body;
            }
          }

          const available: string[] = [];
          for (const skillsDir of skillLocations) {
            if (fs.existsSync(skillsDir)) {
              const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
              for (const entry of entries) {
                if (entry.isDirectory()) {
                  const skillMd = path.join(skillsDir, entry.name, 'SKILL.md');
                  if (fs.existsSync(skillMd)) {
                    available.push(entry.name);
                  }
                }
              }
            }
          }

          if (available.length === 0) {
            return `No skills found. Run "Init Hive Nest" in VS Code to create skills, or create .opencode/skill/${name}/SKILL.md manually.`;
          }

          return `Skill "${name}" not found. Available: ${[...new Set(available)].join(', ')}`;
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
  };
};

export default plugin;
