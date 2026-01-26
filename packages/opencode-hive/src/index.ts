import * as path from 'path';
import * as fs from 'fs';
import { tool, type Plugin, type ToolDefinition } from "@opencode-ai/plugin";
import { getBuiltinSkills, getFilteredSkills, loadBuiltinSkill } from './skills/builtin.js';
import type { SkillDefinition } from './skills/types.js';
// Bee agents (lean, focused)
import { QUEEN_BEE_PROMPT } from './agents/hive.js';
import { ARCHITECT_BEE_PROMPT } from './agents/architect.js';
import { SWARM_BEE_PROMPT } from './agents/swarm.js';
import { SCOUT_BEE_PROMPT } from './agents/scout.js';
import { FORAGER_BEE_PROMPT } from './agents/forager.js';
import { HYGIENIC_BEE_PROMPT } from './agents/hygienic.js';
import { createBuiltinMcps } from './mcp/index.js';

// ============================================================================
// Skill Tool - Uses generated registry (no file-based discovery)
// ============================================================================

function formatSkillsXml(skills: SkillDefinition[]): string {
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

function createHiveSkillTool(filteredSkills: SkillDefinition[]): ToolDefinition {
  const base = `Load a Hive skill to get detailed instructions for a specific workflow.

Use this when a task matches an available skill's description. The descriptions below ("Use when...", "Use before...") are triggers; when one applies, you MUST load that skill before proceeding.`;
  const description = filteredSkills.length === 0
    ? base + '\n\nNo Hive skills available.'
    : base + formatSkillsXml(filteredSkills);

  // Build a set of available skill names for validation
  const availableNames = new Set(filteredSkills.map(s => s.name));

  return tool({
    description,
    args: {
      name: tool.schema.string().describe('The skill name from available_skills'),
    },
    async execute({ name }) {
      // Check if skill is available (not filtered out)
      if (!availableNames.has(name)) {
        const available = filteredSkills.map(s => s.name).join(', ');
        throw new Error(`Skill "${name}" not available. Available Hive skills: ${available || 'none'}`);
      }

      const result = loadBuiltinSkill(name);

      if (!result.found || !result.skill) {
        const available = filteredSkills.map(s => s.name).join(', ');
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
import { buildWorkerPrompt, type ContextFile, type CompletedTask } from "./utils/worker-prompt";
import { calculatePromptMeta, calculatePayloadMeta, checkWarnings } from "./utils/prompt-observability";
import { applyTaskBudget, applyContextBudget, DEFAULT_BUDGET, type TruncationEvent } from "./utils/prompt-budgeting";
import { writeWorkerPromptFile } from "./utils/prompt-file";
import { createBackgroundManager, type OpencodeClient } from "./background/index.js";
import { createBackgroundTools } from "./tools/background-tools.js";
import { HIVE_AGENT_NAMES, isHiveAgent, normalizeVariant } from "./hooks/variant-hook.js";

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

### Delegated Execution

\`hive_exec_start\` creates worktree and spawns worker automatically:

1. \`hive_exec_start(task)\` → Creates worktree + spawns Forager (Worker/Coder) worker
2. Worker executes → calls \`hive_exec_complete(status: "completed")\`
3. Worker blocked → calls \`hive_exec_complete(status: "blocked", blocker: {...})\`

**Handling blocked workers:**
1. Check blockers with \`hive_worker_status()\`
2. Read the blocker info (reason, options, recommendation, context)
3. Ask user via \`question()\` tool - NEVER plain text
4. Resume with \`hive_exec_start(task, continueFrom: "blocked", decision: answer)\`

**CRITICAL**: When resuming, a NEW worker spawns in the SAME worktree.
The previous worker's progress is preserved. Include the user's decision in the \`decision\` parameter.

**For research**, use MCP tools or parallel exploration:
- \`grep_app_searchGitHub\` - Find code in OSS
- \`context7_query-docs\` - Library documentation
- \`websearch_web_search_exa\` - Web search via Exa
- \`ast_grep_search\` - AST-based search
- For exploratory fan-out, load \`hive_skill("parallel-exploration")\` and use \`background_task(agent: "scout-researcher", sync: false, ...)\`

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
  const disabledMcps = configService.getDisabledMcps();
  const disabledSkills = configService.getDisabledSkills();
  const builtinMcps = createBuiltinMcps(disabledMcps);
  
  // Get filtered skills (globally disabled skills removed)
  // Per-agent skill filtering could be added here based on agent context
  const filteredSkills = getFilteredSkills(disabledSkills);
  const worktreeService = new WorktreeService({
    baseDir: directory,
    hiveDir: path.join(directory, '.hive'),
  });

  // Create BackgroundManager for delegated task execution
  const backgroundManager = createBackgroundManager({
    client: client as unknown as OpencodeClient,
    projectRoot: directory,
  });

  // Create background tools with ConfigService for per-agent variant resolution
  const backgroundTools = createBackgroundTools(
    backgroundManager,
    client as unknown as OpencodeClient,
    configService
  );

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

    // Apply per-agent variant to messages (covers built-in task() tool)
    // Type assertion needed because TypeScript's contravariance rules are too strict
    // for the hook's output parameter type. The hook only accesses output.message.variant
    // which exists on UserMessage.
    "chat.message": (async (
      input: {
        sessionID: string;
        agent?: string;
        model?: { providerID: string; modelID: string };
        messageID?: string;
        variant?: string;
      },
      output: {
        message: { variant?: string };
        parts: unknown[];
      },
    ): Promise<void> => {
      const { agent } = input;

      // Skip if no agent specified
      if (!agent) return;

      // Skip if not a Hive agent
      if (!isHiveAgent(agent)) return;

      // Skip if variant is already set (respect explicit selection)
      if (output.message.variant !== undefined) return;

      // Look up configured variant for this agent
      const agentConfig = configService.getAgentConfig(agent);
      const configuredVariant = normalizeVariant(agentConfig.variant);

      // Apply configured variant if present
      if (configuredVariant !== undefined) {
        output.message.variant = configuredVariant;
      }
    }) as any,

    mcp: builtinMcps,

    tool: {
      hive_skill: createHiveSkillTool(filteredSkills),

      // Background task tools for delegated execution
      background_task: backgroundTools.background_task,
      background_output: backgroundTools.background_output,
      background_cancel: backgroundTools.background_cancel,

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
        description: 'Create worktree and begin work on task. Spawns Forager worker automatically.',
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
          // NOTE: Use services once and derive all needed formats from the result (no duplicate reads)
          const planResult = planService.read(feature);
          const allTasks = taskService.list(feature);
          
          // Use contextService.list() instead of manual fs reads (Task 03 deduplication)
          // This replaces: fs.existsSync/readdirSync/readFileSync pattern
          const rawContextFiles = contextService.list(feature).map(f => ({
            name: f.name,
            content: f.content,
          }));
          
          // Collect previous tasks ONCE and derive both formats from it
          const rawPreviousTasks = allTasks
            .filter(t => t.status === 'done' && t.summary)
            .map(t => ({ name: t.folder, summary: t.summary! }));
          
          // Apply deterministic budgeting to bound prompt growth (Task 04)
          // - Limits to last N tasks with truncated summaries
          // - Truncates context files exceeding budget
          // - Emits truncation events for warnings
          const taskBudgetResult = applyTaskBudget(rawPreviousTasks, { ...DEFAULT_BUDGET, feature });
          const contextBudgetResult = applyContextBudget(rawContextFiles, { ...DEFAULT_BUDGET, feature });
          
          // Use budgeted versions for prompt construction
          const contextFiles: ContextFile[] = contextBudgetResult.files.map(f => ({
            name: f.name,
            content: f.content,
          }));
          const previousTasks: CompletedTask[] = taskBudgetResult.tasks.map(t => ({
            name: t.name,
            summary: t.summary,
          }));
          
          // Collect all truncation events for warnings
          const truncationEvents: TruncationEvent[] = [
            ...taskBudgetResult.truncationEvents,
            ...contextBudgetResult.truncationEvents,
          ];
          
          // Format previous tasks for spec (derived from budgeted previousTasks)
          const priorTasksFormatted = previousTasks
            .map(t => `- ${t.name}: ${t.summary}`)
            .join('\n');
          
          // Add hint about dropped tasks if any were omitted
          const droppedTasksHint = taskBudgetResult.droppedTasksHint;

          let specContent = `# Task: ${task}\n\n`;
          specContent += `## Feature: ${feature}\n\n`;

          if (planResult) {
            // Prefer raw planTitle for matching (preserves original casing/punctuation)
            const planTitle = taskInfo.planTitle ?? taskInfo.name;
            const escapedTitle = planTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const titleRegex = new RegExp(`###\\s*\\d+\\.\\s*${escapedTitle}[\\s\\S]*?(?=###|$)`, 'i');
            let taskMatch = planResult.content.match(titleRegex);
            
            // Fallback: if planTitle match fails, try matching by task order (e.g., "### 1.")
            if (!taskMatch) {
              const orderMatch = taskInfo.folder.match(/^(\d+)-/);
              if (orderMatch) {
                const orderRegex = new RegExp(`###\\s*${orderMatch[1]}\\.\\s*[^\\n]+[\\s\\S]*?(?=###|$)`, 'i');
                taskMatch = planResult.content.match(orderRegex);
              }
            }
            
            if (taskMatch) {
              specContent += `## Plan Section\n\n${taskMatch[0].trim()}\n\n`;
            }
          }

          // Build context section from contextFiles (already loaded via contextService.list)
          if (contextFiles.length > 0) {
            const contextCompiled = contextFiles.map(f => `## ${f.name}\n\n${f.content}`).join('\n\n---\n\n');
            specContent += `## Context\n\n${contextCompiled}\n\n`;
          }

          if (priorTasksFormatted) {
            specContent += `## Completed Tasks\n\n${priorTasksFormatted}\n\n`;
          }
          
          taskService.writeSpec(feature, task, specContent);

          // Delegated execution is always available via Hive-owned background_task tools.
          // OMO-Slim is optional and should not gate delegation.
          // NOTE: contextFiles and previousTasks are already collected above (no duplicate reads)

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

          // Always use Forager (forager-worker) for task execution
          // Forager knows Hive protocols (hive_exec_complete, blocker protocol, Iron Laws)
          // Forager can research via MCP tools (grep_app, context7, etc.)
          const agent = 'forager-worker';

          // Generate stable idempotency key for safe retries
          // Format: hive-<feature>-<task>-<attempt>
          const rawStatus = taskService.getRawStatus(feature, task);
          const attempt = (rawStatus?.workerSession?.attempt || 0) + 1;
          const idempotencyKey = `hive-${feature}-${task}-${attempt}`;

          // Persist idempotencyKey early for debugging. The workerSession will be
          // populated by background_task with the REAL OpenCode session_id/task_id.
          taskService.patchBackgroundFields(feature, task, { idempotencyKey });

          // Calculate observability metadata for prompt/payload sizes
          const contextContent = contextFiles.map(f => f.content).join('\n\n');
          const previousTasksContent = previousTasks.map(t => `- **${t.name}**: ${t.summary}`).join('\n');
          const promptMeta = calculatePromptMeta({
            plan: planResult?.content || '',
            context: contextContent,
            previousTasks: previousTasksContent,
            spec: specContent,
            workerPrompt,
          });

          // Write worker prompt to file to prevent tool output truncation (Task 05)
          // This keeps the tool output small while preserving full prompt content
          const hiveDir = path.join(directory, '.hive');
          const workerPromptPath = writeWorkerPromptFile(feature, task, workerPrompt, hiveDir);
          
          // Convert to relative path for portability in output
          const relativePromptPath = path.relative(directory, workerPromptPath);

          // Build workerPromptPreview (truncated for display, max 200 chars)
          const PREVIEW_MAX_LENGTH = 200;
          const workerPromptPreview = workerPrompt.length > PREVIEW_MAX_LENGTH
            ? workerPrompt.slice(0, PREVIEW_MAX_LENGTH) + '...'
            : workerPrompt;

          // Build the response object with canonical outermost fields
          // - agent: top-level only (NOT duplicated in backgroundTaskCall)
          // - workerPromptPath: file reference (NOT inlined prompt to prevent truncation)
          // - backgroundTaskCall: contains promptFile reference, NOT inline prompt
          const responseBase = {
            worktreePath: worktree.path,
            branch: worktree.branch,
            mode: 'delegate',
            agent, // Canonical: top-level only
            delegationRequired: true,
            workerPromptPath: relativePromptPath, // File reference (canonical)
            workerPromptPreview, // Truncated preview for display
            backgroundTaskCall: {
              // NOTE: Uses promptFile instead of prompt to prevent truncation
              promptFile: workerPromptPath, // Absolute path for background_task
              description: `Hive: ${task}`,
              sync: false,
              workdir: worktree.path,
              idempotencyKey,
              feature,
              task,
              attempt,
            },
            instructions: `## Delegation Required

You MUST now call the background_task tool to spawn a Forager (Worker/Coder) worker:

\`\`\`
background_task({
  agent: "${agent}",
  promptFile: "${workerPromptPath}",
  description: "Hive: ${task}",
  sync: false,
  workdir: "${worktree.path}",
  idempotencyKey: "${idempotencyKey}",
  feature: "${feature}",
  task: "${task}",
  attempt: ${attempt}
})
\`\`\`

**Note**: The prompt is stored in a file (workerPromptPath) to prevent tool output truncation.
Use 'promptFile' parameter instead of 'prompt' for large prompts.

After spawning:
- Wait for the completion notification (no polling required).
- Use hive_worker_status only for spot checks or diagnosing stuck tasks.
- Use background_output only if interim output is explicitly needed, or after the completion notification arrives.
- After receiving the <system-reminder> with the worker task_id, call background_output({ task_id: "<id>", block: false }) to fetch the final result.
- If you suspect notifications did not deliver, do a single hive_worker_status() spot check.
- Handle blockers when worker exits
- Merge completed work with hive_merge

DO NOT do the work yourself. Delegate it.

## Troubleshooting

If background_task rejects workdir/idempotencyKey/feature/task/attempt parameters or the worker runs in the wrong directory:

**Symptom**: "Unknown parameter: workdir" or worker operates on main repo instead of worktree
**Cause**: background_task tool is not Hive's provider (agent-hive plugin not loaded last)
**Fix**:
1. Ensure agent-hive loads AFTER any other plugin that registers background_* tools
2. Confirm tool outputs include \`provider: "hive"\`
3. Re-run hive_exec_start and then background_task`,
          };

          // Calculate payload meta (JSON size WITHOUT inlined prompt - file reference only)
          const jsonPayload = JSON.stringify(responseBase, null, 2);
          const payloadMeta = calculatePayloadMeta({
            jsonPayload,
            promptInlined: false, // Prompt is in file, not inlined
            promptReferencedByFile: true,
          });

          // Check for warnings about threshold exceedance
          const sizeWarnings = checkWarnings(promptMeta, payloadMeta);
          
          // Convert truncation events to warnings format for unified output
          const budgetWarnings = truncationEvents.map(event => ({
            type: event.type as string,
            severity: 'info' as const,
            message: event.message,
            affected: event.affected,
            count: event.count,
          }));
          
          // Combine all warnings
          const allWarnings = [...sizeWarnings, ...budgetWarnings];

          // Return delegation instructions with observability data
          return JSON.stringify({
            ...responseBase,
            promptMeta,
            payloadMeta,
            budgetApplied: {
              maxTasks: DEFAULT_BUDGET.maxTasks,
              maxSummaryChars: DEFAULT_BUDGET.maxSummaryChars,
              maxContextChars: DEFAULT_BUDGET.maxContextChars,
              maxTotalContextChars: DEFAULT_BUDGET.maxTotalContextChars,
              tasksIncluded: previousTasks.length,
              tasksDropped: rawPreviousTasks.length - previousTasks.length,
              droppedTasksHint,
            },
            warnings: allWarnings.length > 0 ? allWarnings : undefined,
          }, null, 2);
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
          const HEARTBEAT_STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes without heartbeat
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
            // Use getRawStatus to get full TaskStatus including workerSession
            const rawStatus = taskService.getRawStatus(feature, t.folder);
            const workerSession = rawStatus?.workerSession;

            // Calculate if stuck - prefer workerSession.lastHeartbeatAt, fall back to startedAt
            let maybeStuck = false;
            let lastActivityAt: number | null = null;

            if (workerSession?.lastHeartbeatAt) {
              lastActivityAt = new Date(workerSession.lastHeartbeatAt).getTime();
              // Consider stuck if no heartbeat for threshold AND no message activity
              const heartbeatStale = (now - lastActivityAt) > HEARTBEAT_STALE_THRESHOLD;
              const noRecentMessages = !workerSession.messageCount || workerSession.messageCount === 0;
              maybeStuck = heartbeatStale && t.status === 'in_progress';
            } else if (rawStatus?.startedAt) {
              lastActivityAt = new Date(rawStatus.startedAt).getTime();
              maybeStuck = (now - lastActivityAt) > STUCK_THRESHOLD && t.status === 'in_progress';
            }

            return {
              task: t.folder,
              name: t.name,
              status: t.status,
              workerSession: workerSession || null,
              // Surface workerSession fields
              sessionId: workerSession?.sessionId || null,
              agent: workerSession?.agent || 'inline',
              mode: workerSession?.mode || 'inline',
              attempt: workerSession?.attempt || 1,
              messageCount: workerSession?.messageCount || 0,
              lastHeartbeatAt: workerSession?.lastHeartbeatAt || null,
              workerId: workerSession?.workerId || null,
              worktreePath: worktree?.path || null,
              branch: worktree?.branch || null,
              maybeStuck,
              blocker: (rawStatus as any)?.blocker || null,
              summary: t.summary || null,
            };
          }));

          return JSON.stringify({
            feature,
            omoSlimEnabled: isOmoSlimEnabled(),
            backgroundTaskProvider: 'hive',
            workers,
            hint: workers.some(w => w.status === 'blocked')
              ? 'Use hive_exec_start(task, continueFrom: "blocked", decision: answer) to resume blocked workers'
              : workers.some(w => w.maybeStuck)
                ? 'Some workers may be stuck. Use background_output({ task_id }) to check output, or abort with hive_exec_abort.'
                : 'Workers in progress. Wait for the completion notification (no polling required). Use hive_worker_status for spot checks; use background_output only if interim output is explicitly needed.',
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

    // Event hook - handle session lifecycle events for background tasks
    event: async ({ event }: { event: { type: string; properties: Record<string, unknown> } }) => {
      // Handle session.idle - marks background tasks as completed
      if (event.type === 'session.idle') {
        const sessionId = event.properties.sessionID as string;
        if (sessionId) {
          backgroundManager.handleSessionIdle(sessionId);
        }
      }

      // Handle message.updated - track progress for running tasks
      if (event.type === 'message.updated') {
        const info = event.properties.info as { sessionID?: string } | undefined;
        const sessionId = info?.sessionID;
        if (sessionId) {
          backgroundManager.handleMessageEvent(sessionId);
        }
      }
    },

    // Config hook - merge agents into opencodeConfig.agent
    config: async (opencodeConfig: Record<string, unknown>) => {
      // Auto-generate config file with defaults if it doesn't exist
      configService.init();

      // Hive Agents (lean, focused - new architecture with kebab-case names)
      const hiveUserConfig = configService.getAgentConfig('hive-master');
      const hiveConfig = {
        model: hiveUserConfig.model,
        temperature: hiveUserConfig.temperature ?? 0.5,
        description: 'Hive (Hybrid) - Plans + orchestrates. Detects phase, loads skills on-demand.',
        prompt: QUEEN_BEE_PROMPT,
        permission: {
          question: "allow",
          skill: "allow",
          todowrite: "allow",
          todoread: "allow",
          background_task: "allow",
          background_output: "allow",
          background_cancel: "allow",
        },
      };

      const architectUserConfig = configService.getAgentConfig('architect-planner');
      const architectConfig = {
        model: architectUserConfig.model,
        temperature: architectUserConfig.temperature ?? 0.7,
        description: 'Architect (Planner) - Plans features, interviews, writes plans. NEVER executes.',
        prompt: ARCHITECT_BEE_PROMPT,
        permission: {
          edit: "deny",  // Planners don't edit code
          task: "deny",
          question: "allow",
          skill: "allow",
          todowrite: "allow",
          todoread: "allow",
          webfetch: "allow",
          background_task: "allow",
          background_output: "allow",
          background_cancel: "allow",
        },
      };

      const swarmUserConfig = configService.getAgentConfig('swarm-orchestrator');
      const swarmConfig = {
        model: swarmUserConfig.model,
        temperature: swarmUserConfig.temperature ?? 0.5,
        description: 'Swarm (Orchestrator) - Orchestrates execution. Delegates, spawns workers, verifies, merges.',
        prompt: SWARM_BEE_PROMPT,
        permission: {
          question: "allow",
          skill: "allow",
          todowrite: "allow",
          todoread: "allow",
          background_task: "allow",
          background_output: "allow",
          background_cancel: "allow",
        },
      };

      const scoutUserConfig = configService.getAgentConfig('scout-researcher');
      const scoutConfig = {
        model: scoutUserConfig.model,
        temperature: scoutUserConfig.temperature ?? 0.5,
        mode: 'subagent' as const,
        description: 'Scout (Explorer/Researcher/Retrieval) - Researches codebase + external docs/data.',
        prompt: SCOUT_BEE_PROMPT,
        permission: {
          edit: "deny",  // Researchers don't edit code
          skill: "allow",
          webfetch: "allow",
        },
      };

      const foragerUserConfig = configService.getAgentConfig('forager-worker');
      const foragerConfig = {
        model: foragerUserConfig.model,
        temperature: foragerUserConfig.temperature ?? 0.3,
        mode: 'subagent' as const,
        description: 'Forager (Worker/Coder) - Executes tasks directly in isolated worktrees. Never delegates.',
        prompt: FORAGER_BEE_PROMPT,
        permission: {
          skill: "allow",
        },
      };

      const hygienicUserConfig = configService.getAgentConfig('hygienic-reviewer');
      const hygienicConfig = {
        model: hygienicUserConfig.model,
        temperature: hygienicUserConfig.temperature ?? 0.3,
        mode: 'subagent' as const,
        description: 'Hygienic (Consultant/Reviewer/Debugger) - Reviews plan documentation quality. OKAY/REJECT verdict.',
        prompt: HYGIENIC_BEE_PROMPT,
        permission: {
          edit: "deny",  // Reviewers don't edit
          skill: "allow",
        },
      };

      // Build agents map with kebab-case names
      const allAgents = {
        'hive-master': hiveConfig,
        'architect-planner': architectConfig,
        'swarm-orchestrator': swarmConfig,
        'scout-researcher': scoutConfig,
        'forager-worker': foragerConfig,
        'hygienic-reviewer': hygienicConfig,
      };

      // Register agents directly in opencode.json (required for Task tool to find them)
      configService.registerAgentsInOpenCode(allAgents);

      // Also merge into opencodeConfig.agent (in case config hook works in future)
      const configAgent = opencodeConfig.agent as Record<string, unknown> | undefined;
      if (!configAgent) {
        opencodeConfig.agent = allAgents;
      } else {
        // Clean up old single-word agent names
        delete (configAgent as Record<string, unknown>).hive;
        delete (configAgent as Record<string, unknown>).architect;
        delete (configAgent as Record<string, unknown>).swarm;
        delete (configAgent as Record<string, unknown>).scout;
        delete (configAgent as Record<string, unknown>).forager;
        delete (configAgent as Record<string, unknown>).hygienic;
        delete (configAgent as Record<string, unknown>).receiver;
        // Clean up old kebab-case names (in case they exist)
        delete (configAgent as Record<string, unknown>)['hive-master'];
        delete (configAgent as Record<string, unknown>)['architect-planner'];
        delete (configAgent as Record<string, unknown>)['swarm-orchestrator'];
        delete (configAgent as Record<string, unknown>)['scout-researcher'];
        delete (configAgent as Record<string, unknown>)['forager-worker'];
        delete (configAgent as Record<string, unknown>)['hygienic-reviewer'];
        Object.assign(configAgent, allAgents);
      }

      // Set default agent
      (opencodeConfig as Record<string, unknown>).default_agent = 'hive-master';

      // Merge built-in MCP servers (OMO-style remote endpoints)
      const configMcp = opencodeConfig.mcp as Record<string, unknown> | undefined;
      if (!configMcp) {
        opencodeConfig.mcp = builtinMcps;
      } else {
        Object.assign(configMcp, builtinMcps);
      }

    },
  };
};

export default plugin;
