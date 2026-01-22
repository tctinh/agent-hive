import * as path from 'path';
import * as fs from 'fs';
import { tool, type Plugin, type ToolDefinition } from "@opencode-ai/plugin";
import { getBuiltinSkills, loadBuiltinSkill } from './skills/builtin.js';
import { SCOUT_PROMPT } from './agents/scout.js';
import { RECEIVER_PROMPT } from './agents/receiver.js';
import { FORAGER_PROMPT, foragerAgent } from './agents/forager.js';

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
  ConfigService,
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

When OMO-Slim is installed, \`hive_exec_start\` returns delegation instructions. You MUST call \`background_task\` to spawn the worker:

1. \`hive_exec_start(task)\` → Creates worktree + returns delegation instructions
2. Call \`background_task\` with those instructions → Worker appears in tmux pane
3. Worker completes → calls \`hive_exec_complete(status: "completed")\`
4. Worker blocked → calls \`hive_exec_complete(status: "blocked", blocker: {...})\`

**Handling blocked workers:**
1. Check blockers with \`hive_worker_status()\`
2. Read the blocker info (reason, options, recommendation, context)
3. Ask user via \`question()\` tool - NEVER plain text
4. Resume with \`hive_exec_start(task, continueFrom: "blocked", decision: answer)\`

**CRITICAL**: When resuming, a NEW worker spawns in the SAME worktree.
The previous worker's progress is preserved. Include the user's decision in the \`decision\` parameter.

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
  const { directory, client } = ctx;

  const featureService = new FeatureService(directory);
  const planService = new PlanService(directory);
  const taskService = new TaskService(directory);
  const contextService = new ContextService(directory);
  const configService = new ConfigService(); // User config at ~/.config/opencode/agent_hive.json
  const worktreeService = new WorktreeService({
    baseDir: directory,
    hiveDir: path.join(directory, '.hive'),
  });

  /**
   * Check if OMO-Slim delegation is enabled via user config.
   * Users enable this in ~/.config/opencode/agent_hive.json
   */
  const isOmoSlimEnabled = (): boolean => {
    return configService.isOmoSlimEnabled();
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
          return `Feature "${name}" created.

## Discovery Phase Required

Before writing a plan, you MUST:
1. Ask clarifying questions about the feature
2. Document Q&A in plan.md with a \`## Discovery\` section
3. Research the codebase (grep, read existing code)
4. Save findings with hive_context_write

Example discovery section:
\`\`\`markdown
## Discovery

**Q: What authentication system do we use?**
A: JWT with refresh tokens, see src/auth/

**Q: Should this work offline?**
A: No, online-only is fine

**Research:**
- Found existing theme system in src/theme/
- Uses CSS variables pattern
\`\`\`

## Planning Guidelines

When writing your plan, include:
- \`## Non-Goals\` - What we're explicitly NOT building (scope boundaries)
- \`## Ghost Diffs\` - Alternatives you considered but rejected

These prevent scope creep and re-proposing rejected solutions.

NEXT: Ask your first clarifying question about this feature.`;
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

      hive_journal_append: tool({
        description: 'Append entry to .hive/journal.md for audit trail',
        args: {
          feature: tool.schema.string().describe('Feature name for context'),
          trouble: tool.schema.string().describe('What went wrong'),
          resolution: tool.schema.string().describe('How it was fixed'),
          constraint: tool.schema.string().optional().describe('Never/Always rule derived'),
        },
        async execute({ feature, trouble, resolution, constraint }) {
          const journalPath = path.join(directory, '.hive', 'journal.md');

          if (!fs.existsSync(journalPath)) {
            return `Error: journal.md not found. Create a feature first to initialize the journal.`;
          }

          const date = new Date().toISOString().split('T')[0];
          const entry = `
### ${date}: ${feature}

**Trouble**: ${trouble}
**Resolution**: ${resolution}
${constraint ? `**Constraint**: ${constraint}` : ''}
**See**: .hive/features/${feature}/plan.md

---
`;
          fs.appendFileSync(journalPath, entry);
          return `Journal entry added for ${feature}. ${constraint ? `Constraint: "${constraint}"` : ''}`;
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

          // GATE: Check for discovery section
          const hasDiscovery = content.toLowerCase().includes('## discovery');
          if (!hasDiscovery) {
            return `BLOCKED: Discovery section required before planning.

Your plan must include a \`## Discovery\` section documenting:
- Questions you asked and answers received
- Research findings from codebase exploration
- Key decisions made

Add this section to your plan content and try again.`;
          }

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
        description: 'Create worktree and begin work on task. In OMO-Slim, returns delegation instructions; call background_task to spawn worker.',
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

          // Check if OMO-Slim delegation is enabled in config
          if (isOmoSlimEnabled()) {
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

            // Always use Forager for task execution
            // Forager knows Hive protocols (hive_exec_complete, blocker protocol, Iron Laws)
            // Forager can delegate research to explorer/librarian via background_task
            const agent = 'forager';

            // Return delegation instructions for the agent
            // Agent will call background_task tool itself
            return JSON.stringify({
              worktreePath: worktree.path,
              branch: worktree.branch,
              mode: 'delegate',
              agent,
              delegationRequired: true,
              backgroundTaskCall: {
                agent,
                prompt: workerPrompt,
                description: `Hive: ${task}`,
                sync: false,
              },
              instructions: `## Delegation Required

You MUST now call background_task to spawn a Forager worker:

\`\`\`
background_task({
  agent: "forager",
  prompt: <the workerPrompt below>,
  description: "Hive: ${task}",
  sync: false
})
\`\`\`

After spawning:
- Monitor with hive_worker_status
- Handle blockers when worker exits
- Merge completed work with hive_merge

DO NOT do the work yourself. Delegate it.`,
              workerPrompt,
            }, null, 2);
          }

          // Inline mode (no OMO-Slim)
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

          // GATE: Check for verification mention when completing
          if (status === 'completed') {
            const verificationKeywords = ['test', 'build', 'lint', 'vitest', 'jest', 'npm run', 'pnpm', 'cargo', 'pytest', 'verified', 'passes', 'succeeds'];
            const summaryLower = summary.toLowerCase();
            const hasVerificationMention = verificationKeywords.some(kw => summaryLower.includes(kw));

            if (!hasVerificationMention) {
              return `BLOCKED: No verification detected in summary.

Before claiming completion, you must:
1. Run tests (vitest, jest, pytest, etc.)
2. Run build (npm run build, cargo build, etc.)
3. Include verification results in summary

Example summary: "Implemented auth flow. Tests pass (vitest). Build succeeds."

Re-run with updated summary showing verification results.`;
            }
          }

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

          const omoSlimEnabled = isOmoSlimEnabled();
          return JSON.stringify({
            feature,
            omoSlimEnabled,
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

    // Hive Agents - Colony Model with Phase-Aware Main Agent
    agent: {
      // Main agent - auto-switches Scout/Receiver based on feature state
      hive: {
        model: undefined,
        temperature: 0.7,
        description: 'Hive Master - phase-aware planner+orchestrator. Auto-switches Scout/Receiver mode.',
        prompt: buildHiveAgentPrompt(undefined, false),
        permission: {
          question: "allow",
          skill: "allow",
          todowrite: "allow",
          todoread: "allow",
          webfetch: "allow"
        }
      },
      // Explicit Scout - use when you want planning ONLY
      scout: {
        model: undefined,
        temperature: 0.7,
        description: 'Scout (explicit) - Discovery and planning only. Use @hive for automatic mode.',
        prompt: SCOUT_PROMPT,
        permission: {
          edit: "deny",
          question: "allow",
          skill: "allow",
          todowrite: "allow",
          todoread: "allow",
          webfetch: "allow"
        }
      },
      // Explicit Receiver - use when you want orchestration ONLY
      receiver: {
        model: undefined,
        temperature: 0.5,
        description: 'Receiver (explicit) - Orchestration only. Use @hive for automatic mode.',
        prompt: RECEIVER_PROMPT,
        permission: {
          question: "allow",
          skill: "allow",
          todowrite: "allow",
          todoread: "allow"
        }
      },
      // Forager - Worker subagent (spawned by Receiver/hive_exec_start)
      forager: {
        model: undefined,
        temperature: 0.3,
        description: 'Forager - Task executor (subagent). Spawned automatically, not for direct use.',
        prompt: FORAGER_PROMPT,
        permission: {
          skill: "allow"
        }
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
        if (feature && ['planning', 'approved', 'executing'].includes(feature.status)) {
          const tasks = taskService.list(featureName);
          const pendingTasks = tasks.filter(t => t.status === 'pending').map(t => t.folder);
          const blockedTasks = tasks.filter(t => t.status === 'blocked').map(t => t.folder);
          const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
          const doneCount = tasks.filter(t => t.status === 'done').length;

          const contextDir = path.join(directory, '.hive', 'features', featureName, 'context');
          const contextList = fs.existsSync(contextDir)
            ? fs.readdirSync(contextDir).filter(f => f.endsWith('.md'))
            : [];

          const planResult = planService.read(featureName);
          const planApproved = planResult?.status === 'approved' || planResult?.status === 'executing' || feature.status === 'approved' || feature.status === 'executing';

          // Map feature status to context status
          const status: 'none' | 'planning' | 'approved' | 'executing' | 'completed' = 
            feature.status === 'completed' ? 'completed' :
            feature.status === 'approved' ? 'approved' :
            feature.status === 'executing' ? 'executing' :
            'planning';

          featureContext = {
            name: featureName,
            status,
            planApproved,
            tasksSummary: `${doneCount} done, ${inProgressCount} in progress, ${pendingTasks.length} pending`,
            contextList,
            pendingTasks,
            blockedTasks,
          };
          break;
        }
      }

      // If we have feature context or OMO-Slim, rebuild with dynamic content
      if (featureContext || isOmoSlimEnabled()) {
        return buildHiveAgentPrompt(featureContext, isOmoSlimEnabled());
      }

      return existingPrompt;
    },

    // Config hook - merge agents into opencodeConfig.agent (like OMO-Slim does)
    config: async (opencodeConfig: Record<string, unknown>) => {
      // Auto-generate config file with defaults if it doesn't exist
      configService.init();

      // Get user config for agents (now merged with defaults)
      const hiveUserConfig = configService.getAgentConfig('hive');
      const foragerUserConfig = configService.getAgentConfig('forager');

      // Define hive agent config
      const hiveAgentConfig = {
        model: hiveUserConfig.model,  // From ~/.config/opencode/agent_hive.json
        temperature: hiveUserConfig.temperature ?? 0.7,
        description: 'Hive Master - plan-first development with structured workflow and worker delegation',
        prompt: buildHiveAgentPrompt(undefined, false),
        // Enable question tool via permission (per OMO-Slim pattern)
        permission: {
          question: "allow",
          skill: "allow",
          todowrite: "allow",
          todoread: "allow",
          webfetch: "allow",
        },
      };

      // Define forager agent config (worker for task execution)
      const foragerAgentConfig = {
        model: foragerUserConfig.model,  // From ~/.config/opencode/agent_hive.json
        temperature: foragerUserConfig.temperature ?? 0.3,  // Low temperature for focused implementation
        description: 'Forager - Task executor (worker). Spawned by Hive Master for isolated task execution.',
        prompt: foragerAgent.prompt,
        permission: {
          skill: "allow",
        },
      };

      // Merge hive and forager agents into opencodeConfig.agent
      const configAgent = opencodeConfig.agent as Record<string, unknown> | undefined;
      if (!configAgent) {
        opencodeConfig.agent = { hive: hiveAgentConfig, forager: foragerAgentConfig };
      } else {
        (configAgent as Record<string, unknown>).hive = hiveAgentConfig;
        (configAgent as Record<string, unknown>).forager = foragerAgentConfig;
      }

      // Note: Don't override default_agent if OMO-Slim is also installed
      // Let user choose via @hive or config
    },
  };
};

export default plugin;
