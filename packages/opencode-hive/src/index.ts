import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { tool, type Plugin, type ToolDefinition } from "@opencode-ai/plugin";

// ============================================================================
// Skill Discovery & Loading
// ============================================================================

interface HiveSkillMeta {
  name: string;
  description: string;
}

interface HiveSkill {
  name: string;
  description: string;
  path: string;
  body: string;
}

function parseFrontmatter(content: string): { meta: Record<string, string>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { meta: {}, body: content.trim() };
  }
  
  const meta: Record<string, string> = {};
  const frontmatter = match[1];
  const body = match[2];
  
  for (const line of frontmatter.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      meta[key] = value;
    }
  }
  
  return { meta, body: body.trim() };
}

function getSkillsDir(): string {
  // In ESM, use import.meta.url to find the skills directory relative to this file
  // At runtime, we're in dist/index.js, so skills/ is ../skills/ from dist/
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    // From dist/, go up to package root, then into skills/
    return path.join(__dirname, '..', 'skills');
  } catch {
    // Fallback for CJS or test environments
    return path.join(__dirname, '..', 'skills');
  }
}

function discoverHiveSkills(): HiveSkill[] {
  const skillsDir = getSkillsDir();
  const skills: HiveSkill[] = [];
  
  if (!fs.existsSync(skillsDir)) {
    return skills;
  }
  
  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillPath)) continue;
    
    try {
      const content = fs.readFileSync(skillPath, 'utf-8');
      const { meta, body } = parseFrontmatter(content);
      
      skills.push({
        name: meta.name || entry.name,
        description: meta.description || '',
        path: skillPath,
        body,
      });
    } catch {
      // Skip skills that fail to parse
    }
  }
  
  return skills;
}

function formatSkillsXml(skills: HiveSkill[]): string {
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
  let cachedSkills: HiveSkill[] | null = null;
  let cachedDescription: string | null = null;
  
  const getSkills = (): HiveSkill[] => {
    if (cachedSkills) return cachedSkills;
    cachedSkills = discoverHiveSkills();
    return cachedSkills;
  };
  
  const getDescription = (): string => {
    if (cachedDescription) return cachedDescription;
    const skills = getSkills();
    const base = 'Load a Hive skill to get detailed instructions for a specific workflow.';
    if (skills.length === 0) {
      cachedDescription = base + '\n\nNo Hive skills available.';
    } else {
      cachedDescription = base + formatSkillsXml(skills);
    }
    return cachedDescription;
  };
  
  // Eagerly compute description
  getDescription();
  
  return tool({
    get description() {
      return cachedDescription ?? 'Load a Hive skill to get detailed instructions for a specific workflow.';
    },
    args: {
      name: tool.schema.string().describe('The skill name from available_skills'),
    },
    async execute({ name }) {
      const skills = getSkills();
      const skill = skills.find(s => s.name === name);
      
      if (!skill) {
        const available = skills.map(s => s.name).join(', ');
        throw new Error(`Skill "${name}" not found. Available Hive skills: ${available || 'none'}`);
      }
      
      return [
        `## Hive Skill: ${skill.name}`,
        '',
        `**Description**: ${skill.description}`,
        '',
        skill.body,
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
  SubtaskService,
  ContextService,
  SessionService,
  detectContext,
  listFeatures,
} from "hive-core";

const HIVE_SYSTEM_PROMPT = `
## Hive - Feature Development System

Plan-first development: Write plan → User reviews → Approve → Execute tasks

### Tools (24 total)

| Domain | Tools |
|--------|-------|
| Feature | hive_feature_create, hive_feature_list, hive_feature_complete |
| Plan | hive_plan_write, hive_plan_read, hive_plan_approve |
| Task | hive_tasks_sync, hive_task_create, hive_task_update |
| Subtask | hive_subtask_create, hive_subtask_update, hive_subtask_list, hive_subtask_spec_write, hive_subtask_report_write |
| Exec | hive_exec_start, hive_exec_complete, hive_exec_abort |
| Merge | hive_merge, hive_worktree_list |
| Context | hive_context_write, hive_context_read, hive_context_list |
| Session | hive_session_open, hive_session_list |

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

### Subtasks & TDD

For complex tasks, break work into subtasks:

\`\`\`
hive_subtask_create(task, "Write failing tests", "test")
hive_subtask_create(task, "Implement until green", "implement")
hive_subtask_create(task, "Run test suite", "verify")
\`\`\`

Subtask types: test, implement, review, verify, research, debug, custom

**Test-Driven Development**: For implementation tasks, consider writing tests first.
Tests define "done" and provide feedback loops that improve quality.

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
  const subtaskService = new SubtaskService(directory);
  const contextService = new ContextService(directory);
  const sessionService = new SessionService(directory);
  const worktreeService = new WorktreeService({
    baseDir: directory,
    hiveDir: path.join(directory, '.hive'),
  });

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
          return `Manual task created: ${folder}`;
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

          return `Worktree created at ${worktree.path}\nBranch: ${worktree.branch}\nBase commit: ${worktree.commit}\nSpec: ${task}/spec.md generated`;
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

      hive_context_read: tool({
        description: 'Read a specific context file or all context for the feature',
        args: {
          name: tool.schema.string().optional().describe('Context file name. If omitted, returns all context compiled.'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to active)'),
        },
        async execute({ name, feature: explicitFeature }) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";

          if (name) {
            const content = contextService.read(feature, name);
            if (!content) return `Error: Context file '${name}' not found`;
            return content;
          }

          const compiled = contextService.compile(feature);
          if (!compiled) return "No context files found";
          return compiled;
        },
      }),

      hive_context_list: tool({
        description: 'List all context files for the feature',
        args: {
          feature: tool.schema.string().optional().describe('Feature name (defaults to active)'),
        },
        async execute({ feature: explicitFeature }) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";

          const files = contextService.list(feature);
          if (files.length === 0) return "No context files";

          return files.map(f => `${f.name} (${f.content.length} chars, updated ${f.updatedAt})`).join('\n');
        },
      }),

      // Session Tools
      hive_session_open: tool({
        description: 'Open session, return full context for a feature',
        args: {
          feature: tool.schema.string().optional().describe('Feature name (defaults to active)'),
          task: tool.schema.string().optional().describe('Task folder to focus on'),
        },
        async execute({ feature: explicitFeature, task }, toolContext) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";

          const featureData = featureService.get(feature);
          if (!featureData) return `Error: Feature '${feature}' not found`;

          // Track session
          const ctx = toolContext as { sessionID?: string };
          if (ctx?.sessionID) {
            sessionService.track(feature, ctx.sessionID, task);
          }

          const planResult = planService.read(feature);
          const tasks = taskService.list(feature);
          const contextCompiled = contextService.compile(feature);
          const sessions = sessionService.list(feature);

          let output = `## Feature: ${feature} [${featureData.status}]\n\n`;
          
          if (planResult) {
            output += `### Plan\n${planResult.content.substring(0, 500)}...\n\n`;
          }

          output += `### Tasks (${tasks.length})\n`;
          tasks.forEach(t => {
            output += `- ${t.folder}: ${t.name} [${t.status}]\n`;
          });

          if (contextCompiled) {
            output += `\n### Context\n${contextCompiled.substring(0, 500)}...\n`;
          }

          output += `\n### Sessions (${sessions.length})\n`;
          sessions.forEach(s => {
            output += `- ${s.sessionId} (${s.taskFolder || 'no task'})\n`;
          });

          return output;
        },
      }),

      hive_session_list: tool({
        description: 'List all sessions for the feature',
        args: {
          feature: tool.schema.string().optional().describe('Feature name (defaults to active)'),
        },
        async execute({ feature: explicitFeature }) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";

          const sessions = sessionService.list(feature);
          const master = sessionService.getMaster(feature);

          if (sessions.length === 0) return "No sessions";

          return sessions.map(s => {
            const masterMark = s.sessionId === master ? ' (master)' : '';
            return `${s.sessionId}${masterMark} - ${s.taskFolder || 'no task'} - ${s.lastActiveAt}`;
          }).join('\n');
        },
      }),

      hive_subtask_create: tool({
        description: 'Create a subtask within a task. Use for TDD: create test/implement/verify subtasks.',
        args: {
          task: tool.schema.string().describe('Task folder name'),
          name: tool.schema.string().describe('Subtask description'),
          type: tool.schema.enum(['test', 'implement', 'review', 'verify', 'research', 'debug', 'custom']).optional().describe('Subtask type'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to active)'),
        },
        async execute({ task, name, type, feature: explicitFeature }) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";

          try {
            const subtask = subtaskService.create(feature, task, name, type as any);
            return `Subtask created: ${subtask.id} - ${subtask.name} [${subtask.type || 'custom'}]`;
          } catch (e: any) {
            return `Error: ${e.message}`;
          }
        },
      }),

      hive_subtask_update: tool({
        description: 'Update subtask status',
        args: {
          task: tool.schema.string().describe('Task folder name'),
          subtask: tool.schema.string().describe('Subtask ID (e.g., "1.1")'),
          status: tool.schema.enum(['pending', 'in_progress', 'done', 'cancelled']).describe('New status'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to active)'),
        },
        async execute({ task, subtask, status, feature: explicitFeature }) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";

          try {
            const updated = subtaskService.update(feature, task, subtask, status as any);
            return `Subtask ${updated.id} updated: ${updated.status}`;
          } catch (e: any) {
            return `Error: ${e.message}`;
          }
        },
      }),

      hive_subtask_list: tool({
        description: 'List all subtasks for a task',
        args: {
          task: tool.schema.string().describe('Task folder name'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to active)'),
        },
        async execute({ task, feature: explicitFeature }) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";

          try {
            const subtasks = subtaskService.list(feature, task);
            if (subtasks.length === 0) return "No subtasks for this task.";

            return subtasks.map(s => {
              const typeTag = s.type ? ` [${s.type}]` : '';
              const statusIcon = s.status === 'done' ? '✓' : s.status === 'in_progress' ? '→' : '○';
              return `${statusIcon} ${s.id}: ${s.name}${typeTag}`;
            }).join('\n');
          } catch (e: any) {
            return `Error: ${e.message}`;
          }
        },
      }),

      hive_subtask_spec_write: tool({
        description: 'Write spec.md for a subtask (detailed instructions)',
        args: {
          task: tool.schema.string().describe('Task folder name'),
          subtask: tool.schema.string().describe('Subtask ID (e.g., "1.1")'),
          content: tool.schema.string().describe('Spec content (markdown)'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to active)'),
        },
        async execute({ task, subtask, content, feature: explicitFeature }) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";

          try {
            const specPath = subtaskService.writeSpec(feature, task, subtask, content);
            return `Subtask spec written: ${specPath}`;
          } catch (e: any) {
            return `Error: ${e.message}`;
          }
        },
      }),

      hive_subtask_report_write: tool({
        description: 'Write report.md for a subtask (what was done)',
        args: {
          task: tool.schema.string().describe('Task folder name'),
          subtask: tool.schema.string().describe('Subtask ID (e.g., "1.1")'),
          content: tool.schema.string().describe('Report content (markdown)'),
          feature: tool.schema.string().optional().describe('Feature name (defaults to active)'),
        },
        async execute({ task, subtask, content, feature: explicitFeature }) {
          const feature = resolveFeature(explicitFeature);
          if (!feature) return "Error: No feature specified. Create a feature or provide feature param.";

          try {
            const reportPath = subtaskService.writeReport(feature, task, subtask, content);
            return `Subtask report written: ${reportPath}`;
          } catch (e: any) {
            return `Error: ${e.message}`;
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
  };
};

export default plugin;
